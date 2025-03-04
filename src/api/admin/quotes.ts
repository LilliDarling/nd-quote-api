import express, { Request, Response, Router, NextFunction } from 'express';
import { ObjectId } from 'mongodb';
import { requireAdmin } from '../../middleware/auth';
import { ApiResponse, IQuote } from '../../types';

const router: Router = express.Router();

interface CreateQuoteRequest {
  text: string;
  author: string;
  source?: string;
  tags?: string[];
  isPublished?: boolean;
}

interface UpdateQuoteRequest {
  text?: string;
  author?: string;
  source?: string;
  tags?: string[];
  isPublished?: boolean;
}

/**
 * POST /api/admin/quotes
 * Create a new quote
 */
router.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { text, author, source, tags, isPublished = true } = req.body as CreateQuoteRequest;
    
    if (!text || !author) {
      const response: ApiResponse<null> = {
        status: 'error',
        message: 'Text and author are required fields'
      };

      res.status(400).json(response);
      return;
    }

    // @ts-ignore - Added by middleware in the Netlify function
    const db = await req.getDatabase();
    const collection = db.collection('quotes');

    const existingQuote = await collection.findOne({ 
      text: { $regex: new RegExp('^' + text.trim() + '$', 'i') }
    });
    
    if (existingQuote) {
      res.status(409).json({ status: 'error', message: 'A quote with this text already exists' });
      return;
    }

    const newQuote = {
      text,
      author,
      source,
      tags: tags || [],
      isPublished,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    const result = await collection.insertOne(newQuote);

    const quote = await collection.findOne({ _id: result.insertedId });
    
    const response: ApiResponse<IQuote> = { 
      status: 'success',
      message: 'Quote created successfully',
      data: quote as unknown as IQuote
    };
    
    res.status(201).json(response);
    return;
  } catch (error) {
    console.error('Error creating quote:', error);
    
    const response: ApiResponse<null> = {
      status: 'error',
      message: 'Failed to create quote'
    };
    
    next(response);
  }
});

/**
 * GET /api/admin/quotes
 * Get all quotes (including unpublished) with pagination
 */
router.get('/', requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (req.query.isPublished !== undefined) {
      filter.isPublished = req.query.isPublished === 'true';
    }

    if (req.query.tag) {
      filter.tags = req.query.tag;
    }

    // @ts-ignore - Added by middleware in the Netlify function
    const db = await req.getDatabase();
    const collection = db.collection('quotes');

    const quotes = await collection.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .toArray();

    const total = await collection.countDocuments(filter);
    
    const response: ApiResponse<IQuote[]> = {
      status: 'success',
      data: quotes as unknown as IQuote[],
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
    
    res.json(response);
    return;
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
 * GET /api/admin/quotes/:id
 * Get a specific quote by ID (admin access)
 */
router.get('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // @ts-ignore - Added by middleware in the Netlify function
    const db = await req.getDatabase();
    const collection = db.collection('quotes');

    const quote = await collection.findOne({ _id: new ObjectId(req.params.id) });
    
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
    return;
  } catch (error) {
    console.error('Error fetching quote:', error);
    
    const response: ApiResponse<null> = {
      status: 'error',
      message: 'Failed to fetch quote'
    };
    
    next(response);
  }
});

/**
 * PUT /api/admin/quotes/:id
 * Update a quote
 */
router.put('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { text, author, source, tags, isPublished } = req.body as UpdateQuoteRequest;

    const updates: any = {
      $set: {
        updatedAt: new Date()
      }
    };
    
    if (text !== undefined) updates.$set.text = text;
    if (author !== undefined) updates.$set.author = author;
    if (source !== undefined) updates.$set.source = source;
    if (tags !== undefined) updates.$set.tags = tags;
    if (isPublished !== undefined) updates.$set.isPublished = isPublished;

    // @ts-ignore - Added by middleware in the Netlify function
    const db = await req.getDatabase();
    const collection = db.collection('quotes');

    const result = await collection.findOneAndUpdate(
      { _id: new ObjectId(req.params.id) },
      updates,
      { returnDocument: 'after' }
    );
    
    if (!result.value) {
      const response: ApiResponse<null> = {
        status: 'error',
        message: 'Quote not found'
      };
      
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse<IQuote> = {
      status: 'success',
      message: 'Quote updated successfully',
      data: result.value as unknown as IQuote
    };

    res.json(response);
  } catch (error) {
    console.error('Error updating quote:', error);
    
    const response: ApiResponse<null> = {
      status: 'error',
      message: 'Failed to update quote'
    };
    
    next(response);
  }
});

/**
 * DELETE /api/admin/quotes/:id
 * Delete a quote
 */
router.delete('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // @ts-ignore - Added by middleware in the Netlify function
    const db = await req.getDatabase();
    const collection = db.collection('quotes');

    const result = await collection.findOneAndDelete({ _id: new ObjectId(req.params.id) });
    
    if (!result.value) {
      const response: ApiResponse<null> = {
        status: 'error',
        message: 'Quote not found'
      };
      
      res.status(404).json(response);
      return;
    }
    
    const response: ApiResponse<null> = {
      status: 'success',
      message: 'Quote deleted successfully'
    };
    
    res.json(response);
    return;
  } catch (error) {
    console.error('Error deleting quote:', error);
    
    const response: ApiResponse<null> = {
      status: 'error',
      message: 'Failed to delete quote'
    };
    
    next(response);
  }
});

/**
 * GET /api/admin/quotes/tags/all
 * Get all unique tags
 */
router.get('/tags/all', requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // @ts-ignore - Added by middleware in the Netlify function
    const db = await req.getDatabase();
    const collection = db.collection('quotes');
    
    const tags = await collection.distinct('tags');
    
    const response: ApiResponse<string[]> = {
      status: 'success',
      data: tags
    };
    
    res.json(response);
    return;
  } catch (error) {
    console.error('Error fetching tags:', error);
    
    const response: ApiResponse<null> = {
      status: 'error',
      message: 'Failed to fetch tags'
    };
    
    next(response);
  }
});

export default router;