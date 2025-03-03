import express, { Request, Response, Router, NextFunction } from 'express';
import Quote from '../models/Quotes';
import { validateApiKey } from '../middleware/auth';
import { ApiResponse, PaginationInfo, IQuote } from '../types';

const router: Router = express.Router();

/**
 * GET /api/quotes/random
 * Get a random quote
 */
router.get('/random', validateApiKey, async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
        const count = await Quote.countDocuments({ isPublished: true });
        
        if (count === 0) {
            const response: ApiResponse<null> = {
                status: 'error',
                message: 'No quotes found'
            };
            
            _res.status(404).json(response);
        }
        
        const random = Math.floor(Math.random() * count);
        const quote = await Quote.findOne({ isPublished: true }).skip(random);
        
        const response: ApiResponse<IQuote> = {
            status: 'success',
            data: quote as IQuote
        };
        
        _res.json(response);
    } catch (error) {
        console.error('Error fetching random quote:', error);
        
        const response: ApiResponse<null> = {
            status: 'error',
            message: 'Failed to fetch random quote'
        };
        
        next(response);
    }
});

/**
 * GET /api/quotes
 * Get all quotes (with pagination)
 */
router.get('/', validateApiKey, async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(_req.query.page as string) || 1;
        const limit = parseInt(_req.query.limit as string) || 10;
        const skip = (page - 1) * limit;
        
        const quotes = await Quote.find({ isPublished: true })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

        const total = await Quote.countDocuments({ isPublished: true });
        
        const pagination: PaginationInfo = {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };
        
        const response: ApiResponse<IQuote[]> = {
            status: 'success',
            data: quotes as IQuote[],
            pagination
        };
        
        _res.json(response);
    } catch (error) {
        console.error('Error fetching quotes:', error);
        
        const response: ApiResponse<null> = {
            status: 'error',
            message: 'Failed to fetch quotes'
        };
        
        next(response);
    }
});

/**
 * GET /api/quotes/:id
 * Get a specific quote by ID
 */
router.get('/:id', validateApiKey, async (_req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
        const quote = await Quote.findOne({ 
            _id: _req.params.id,
            isPublished: true
        });
        
        if (!quote) {
            const response: ApiResponse<null> = {
                status: 'error',
                message: 'Quote not found'
            };
            
            _res.status(404).json(response);
        }
        
        const response: ApiResponse<IQuote> = {
            status: 'success',
            data: quote as IQuote
        };
        
        _res.json(response);
    } catch (error) {
        console.error('Error fetching quote:', error);
        
        const response: ApiResponse<null> = {
            status: 'error',
            message: 'Failed to fetch quote'
        };
        
        next(response);
    }
});

export default router;
