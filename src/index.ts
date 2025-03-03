import express, { Request, Response, NextFunction, Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import path from 'path';
import { ApiResponse } from './types';

dotenv.config();

const app: Express = express();

import './utils/db';

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

// Serve static files from public directory
app.use(express.static(path.join(__dirname, '../public')));

// API routes
app.use('/api/quotes', require('./api/quotes').default);
app.use('/api/keys', require('./api/keys').default);
app.use('/api/admin/quotes', require('./api/admin/quotes').default);

// Admin dashboard route
app.get('/admin', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/admin.html'));
});

// API info route
app.get('/api', (req: Request, res: Response) => {
  const apiInfo: ApiResponse<{ name: string; version: string; documentation: string }> = {
    status: 'success',
    data: {
      name: 'Neurodivergent Quotes API',
      version: '1.0.0',
      documentation: '/docs'
    }
  };
  
  res.json(apiInfo);
});

// Home route (demo UI)
app.get('/', (req: Request, res: Response) => {
  res.sendFile(path.join(__dirname, '../public/index.html'));
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  
  const errorResponse: ApiResponse<null> = {
    status: 'error',
    message: 'Something went wrong!'
  };
  
  res.status(500).json(errorResponse);
});

const PORT = process.env.PORT || 3000;
if (process.env.NODE_ENV !== 'serverless') {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

export default app;