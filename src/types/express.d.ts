import { Express } from 'express-serve-static-core';
import { IApiKey } from './index';

declare global {
  namespace Express {
    interface Request {
      apiKey?: IApiKey;
    }
  }
}