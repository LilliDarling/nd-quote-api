import express, { Request, Response, Router, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { validateApiKey } from '../middleware/auth';
import { ApiResponse, PaginationInfo, IQuote } from '../types';

const router: Router = express.Router();

/**
 * GET /api/quotes/random
 * Get a random quote
 */
router.get('/random', validateApiKey, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // @ts-ignore - Added by middleware in the Netlify function
        const db = await req.getDatabase();
        const collection = db.collection('quotes');

        const count = await collection.countDocuments({ isPublished: true });
        
        if (count === 0) {
            const response: ApiResponse<null> = {
                status: 'error',
                message: 'No quotes found'
            };
            
            res.status(404).json(response);
            return;
        }

        const random = Math.floor(Math.random() * count);
        const quote = await collection.findOne(
            { isPublished: true },
            { skip: random }
        );
        
        const response: ApiResponse<IQuote> = {
            status: 'success',
            data: quote as unknown as IQuote
        };
        
        res.json(response);
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
router.get('/', validateApiKey, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const page = parseInt(req.query.page as string) || 1;
        const limit = parseInt(req.query.limit as string) || 10;
        const skip = (page - 1) * limit;

        // @ts-ignore - Added by middleware in the Netlify function
        const db = await req.getDatabase();
        const collection = db.collection('quotes');

        const quotes = await collection.find({ isPublished: true })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .toArray();

        const total = await collection.countDocuments({ isPublished: true });
        
        const pagination: PaginationInfo = {
            total,
            page,
            limit,
            pages: Math.ceil(total / limit)
        };
        
        const response: ApiResponse<IQuote[]> = {
            status: 'success',
            data: quotes as unknown as IQuote[],
            pagination
        };
        
        res.json(response);
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
router.get('/:id', validateApiKey, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        // @ts-ignore - Added by middleware in the Netlify function
        const db = await req.getDatabase();
        const collection = db.collection('quotes');

        const quote = await collection.findOne({ 
            _id: new ObjectId(req.params.id),
            isPublished: true
        });
        
        if (!quote) {
            const response: ApiResponse<null> = {
                status: 'error',
                message: 'Quote not found'
            };
            
            res.status(404).json(response);
            return;
        }
        
        const response: ApiResponse<IQuote> = {
            status: 'success',
            data: quote as unknown as IQuote
        };
        
        res.json(response);
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