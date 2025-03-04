import express, { Request, Response, NextFunction } from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import helmet from 'helmet';
import { MongoClient, Db } from 'mongodb';
import dotenv from 'dotenv';

dotenv.config();

import quotesRouter from '../../src/api/quotes';
import keysRouter from '../../src/api/keys';
import adminQuotesRouter from '../../src/api/admin/quotes';
import keyRequestsRouter from '../../src/api/keyRequests';

const mongoClient = new MongoClient(process.env.MONGODB_URI as string);

const clientPromise = mongoClient.connect()
  .then(client => {
    console.log('MongoDB Connected');
    return client;
  })
  .catch(err => {
    console.error('MongoDB connection error:', err);
    throw err;
  });

const getDatabase = async (): Promise<Db> => {
  const client = await clientPromise;
  return client.db('nd-quotes');
};

const app = express();

app.use(cors());
app.use(express.json());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      styleSrc: ["'self'", "'unsafe-inline'", "cdn.jsdelivr.net"],
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"]
    }
  }
}));

app.use((req: Request, res: Response, next: NextFunction) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  next();
});

app.use(async (req: Request, res: Response, next: NextFunction) => {
  try {
    // @ts-ignore - Extending the Request type
    req.getDatabase = getDatabase;
    next();
  } catch (error) {
    console.error('Database middleware error:', error);
    next(error);
  }
});

app.use('/api/quotes', quotesRouter);
app.use('/api/keys', keysRouter);
app.use('/api/admin/quotes', adminQuotesRouter);
app.use('/api/key-requests', keyRequestsRouter);

app.get('/api', (req: Request, res: Response) => {
  res.json({
    status: 'success',
    data: {
      name: 'Neurodivergent Quotes API',
      version: '1.0.0',
      documentation: '/docs'
    }
  });
});

app.get('/api/debug', async (req: Request, res: Response) => {
  try {
    // @ts-ignore
    const db = await req.getDatabase();
    const collections = await db.listCollections().toArray();
    
    res.json({
      status: 'success',
      data: {
        mongodb: 'Connected',
        collections: collections.map(c => c.name),
        environment: process.env.NODE_ENV || 'development',
        env_variables: {
          mongodb_uri: !!process.env.MONGODB_URI,
          smtp_user: !!process.env.SMTP_USER,
          smtp_password: !!process.env.SMTP_PASSWORD,
          admin_secret: !!process.env.ADMIN_SECRET
        }
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: 'Failed to connect to database',
      error: (error as Error).message
    });
  }
});

app.get('/api/health', async (_req: Request, res: Response) => {
  try {
    const client = await clientPromise;
    const pingResult = await client.db().admin().ping();
    
    res.json({
      status: 'success',
      data: {
        mongodb: pingResult.ok === 1 ? 'healthy' : 'unhealthy',
        api: 'healthy',
        timestamp: new Date().toISOString()
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      data: {
        mongodb: 'unhealthy',
        api: 'healthy',
        error: (error as Error).message,
        timestamp: new Date().toISOString()
      }
    });
  }
});

app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('API Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

export const handler = serverless(app);