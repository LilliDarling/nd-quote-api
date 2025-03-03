import express, { Router } from 'express';
import serverless from 'serverless-http';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

import quotesRouter from '../../src/api/quotes';
import keysRouter from '../../src/api/keys';
import adminQuotesRouter from '../../src/api/admin/quotes';
import keyRequestsRouter from '../../src/api/keyRequests';

import '../../src/utils/db';

const app = express();
const router = Router();

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

router.use('/quotes', quotesRouter);
router.use('/keys', keysRouter);
router.use('/admin/quotes', adminQuotesRouter);
router.use('/key-requests', keyRequestsRouter);

router.get('/', (req, res) => {
  res.json({
    status: 'success',
    data: {
      name: 'Neurodivergent Quotes API',
      version: '1.0.0',
      documentation: '/docs'
    }
  });
});

app.use('/api', router);

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: 'Something went wrong!'
  });
});

export const handler = serverless(app);