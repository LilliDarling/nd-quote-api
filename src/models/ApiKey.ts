import mongoose, { Schema } from 'mongoose';
import crypto from 'crypto';
import { IApiKey, IApiKeyModel } from '../types';

const apiKeySchema = new Schema<IApiKey>({
    key: {
        type: String,
        required: true,
        unique: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    usage: {
        count: {
        type: Number,
        default: 0
        },
        lastUsed: {
            type: Date
        }
    },
    active: {
        type: Boolean,
        default: true
    },
    permissions: {
        type: [String],
        default: ['read']
    }
}, {
    timestamps: true
});

apiKeySchema.statics.generateKey = async function(name: string, description: string = ''): Promise<IApiKey> {
    const key = crypto.randomBytes(32).toString('hex');
    
    return await this.create({
        key,
        name,
        description
    }) as IApiKey;
};

const ApiKey = mongoose.model<IApiKey, IApiKeyModel>('ApiKey', apiKeySchema);

export default ApiKey;