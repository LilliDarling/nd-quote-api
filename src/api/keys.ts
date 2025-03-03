import express, { Request, Response, Router, NextFunction } from 'express';
import ApiKey from '../models/ApiKey';
import { requireAdmin } from '../middleware/auth';
import { ApiResponse, IApiKey } from '../types';

const router: Router = express.Router();

interface CreateKeyRequest {
    name: string;
    description?: string;
}

interface UpdateKeyRequest {
    name?: string;
    description?: string;
    active?: boolean;
}

/**
 * POST /api/keys
 * Generate a new API key
 */
router.post('/', requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const { name, description } = req.body as CreateKeyRequest;
        
        if (!name) {
            const response: ApiResponse<null> = {
                status: 'error',
                message: 'Name is required for API key'
            };
            
            res.status(400).json(response);
        }
        
        const apiKey = await ApiKey.generateKey(name, description);
        
        const response: ApiResponse<{
            id: string;
            key: string;
            name: string;
            createdAt: Date;
        }> = {
            status: 'success',
            message: 'API key generated successfully',
            data: {
                id: apiKey._id.toString(),
                key: apiKey.key,
                name: apiKey.name,
                createdAt: apiKey.createdAt
            }
        };
        
        res.status(201).json(response);
    } catch (error) {
        console.error('Error generating API key:', error);
        
        const response: ApiResponse<null> = {
            status: 'error',
            message: 'Failed to generate API key',
        };
        
        next(response);
    }
});

/**
 * GET /api/keys
 * List all API keys (admin only)
 */ 
router.get('/', requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const keys = await ApiKey.find().select('-key');
        
        const response: ApiResponse<Omit<IApiKey, 'key'>[]> = {
            status: 'success',
            data: keys as Omit<IApiKey, 'key'>[]
        };
        
        res.json(response);
    } catch (error) {
        console.error('Error listing API keys:', error);
        
        const response: ApiResponse<null> = {
            status: 'error',
            message: 'Failed to list API keys'
        };
        
        res.status(500).json(response);
    }
});

/**
 * PATCH /api/keys/:id
 * Update API key (e.g., disable/enable)
 */
router.patch('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const updates: Partial<Omit<IApiKey, '_id'>> = {};
        const { active, name, description } = req.body as UpdateKeyRequest;

        if (active !== undefined) {
            updates.active = Boolean(active);
        }
        
        if (name) {
            updates.name = name;
        }
        
        if (description !== undefined) {
            updates.description = description;
        }
        
        const key = await ApiKey.findByIdAndUpdate(
            req.params.id.toString(),
            { $set: updates },
            { new: true }
        ).select('-key');
        
        if (!key) {
            const response: ApiResponse<null> = {
                status: 'error',
                message: 'API key not found'
            };
            
            res.status(404).json(response);
        }
        
        const response: ApiResponse<Omit<IApiKey, 'key'>> = {
            status: 'success',
            message: 'API key updated successfully',
            data: key as Omit<IApiKey, 'key'>
        };
        
        res.json(response);
    } catch (error) {
        console.error('Error updating API key:', error);
        
        const response: ApiResponse<null> = {
            status: 'error',
            message: 'Failed to update API key'
        };
        
        next(response);
    }
});

/**
 * DELETE /api/keys/:id
 * Delete an API key
 */ 
router.delete('/:id', requireAdmin, async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
        const key = await ApiKey.findByIdAndDelete(req.params.id.toString());
        
        if (!key) {
            const response: ApiResponse<null> = {
                status: 'error',
                message: 'API key not found'
            };
            
            res.status(404).json(response);
        }
        
        const response: ApiResponse<null> = {
            status: 'success',
            message: 'API key deleted successfully'
        };
        
        res.json(response);
    } catch (error) {
        console.error('Error deleting API key:', error);
        
        const response: ApiResponse<null> = {
            status: 'error',
            message: 'Failed to delete API key'
        };
        
        next(response);
    }
});

export default router;
