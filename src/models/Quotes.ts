import mongoose, { Schema } from 'mongoose';
import { IQuote } from '../types';

const quoteSchema = new Schema<IQuote>({
    text: {
        type: String,
        required: true,
        trim: true
    },
    author: {
        type: String,
        required: true,
        trim: true
    },
    source: {
        type: String,
        trim: true
    },
    tags: [{
        type: String,
        trim: true
    }],
    isPublished: {
        type: Boolean,
        default: true
    }
}, {
  timestamps: true
});

quoteSchema.index({ isPublished: 1 });

const Quote = mongoose.model<IQuote>('Quote', quoteSchema);

export default Quote;