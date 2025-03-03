import { Request, Response, NextFunction } from 'express';
import ApiKey from '../models/ApiKey';
import { ApiResponse } from '../types';

/**
 * Middleware to validate API key
 */
export const validateApiKey = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const apiKey = req.header('X-API-Key');
    
    if (!apiKey) {
      const response: ApiResponse<null> = {
        status: 'error',
        message: 'API key is required'
      };
      
      res.status(401).json(response);
      return;
    }
    
    const keyDoc = await ApiKey.findOne({ key: apiKey, active: true });
    
    if (!keyDoc) {
      const response: ApiResponse<null> = {
        status: 'error',
        message: 'Invalid or inactive API key'
      };
      
      res.status(401).json(response);
      return;
    }
    
    await ApiKey.findByIdAndUpdate(keyDoc._id, {
      $inc: { 'usage.count': 1 },
      $set: { 'usage.lastUsed': new Date() }
    });
    
    req.apiKey = keyDoc;
    
    next();
  } catch (error) {
    console.error('API key validation error:', error);
    
    const response: ApiResponse<null> = {
      status: 'error',
      message: 'Authentication error'
    };
    
    res.status(500).json(response);
  }
};

/**
 * Middleware to check admin access (for key management)
 * This is a simple implementation - in production you'd want more robust admin authentication
 */
export const requireAdmin = (req: Request, res: Response, next: NextFunction): void => {
  const adminSecret = req.header('X-Admin-Secret');
  
  if (!adminSecret || adminSecret !== process.env.ADMIN_SECRET) {
    const response: ApiResponse<null> = {
      status: 'error',
      message: 'Admin access required'
    };
    
    res.status(403).json(response);
    return;
  }
  
  next();
};