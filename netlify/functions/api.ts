import express from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';

dotenv.config();

import quotesRouter from '../../src/api/quotes';
import keysRouter from '../../src/api/keys';
import adminQuotesRouter from '../../src/api/admin/quotes';
import keyRequestsRouter from '../../src/api/keyRequests';

import { getConnection } from '../../src/utils/db';

import '../../src/utils/db';

const app = express();

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
app.use(cors());
app.use(express.json());

app.use(async (req, res, next) => {
    try {
      const conn = await getConnection();
      if (!conn) {
        console.error('⚠️ No database connection available');
      }
      next();
    } catch (err) {
      console.error('❌ Error connecting to database:', err);
      next();
    }
});

app.use('/api/quotes', quotesRouter);
app.use('/api/keys', keysRouter);
app.use('/api/admin/quotes', adminQuotesRouter);
app.use('/api/key-requests', keyRequestsRouter);

app.get('/api', (req, res) => {
  res.json({
    status: 'success',
    data: {
      name: 'Neurodivergent Quotes API',
      version: '1.0.0',
      documentation: '/docs'
    }
  });
});

app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

export const handler = serverless(app);