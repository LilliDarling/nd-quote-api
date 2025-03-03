import { Document, Types } from 'mongoose';
import { Model } from 'mongoose';

export interface IQuote extends Document {
  _id: Types.ObjectId;
  text: string;
  author: string;
  source?: string;
  tags: string[];
  isPublished: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface IApiKey extends Document {
  _id: Types.ObjectId;
  key: string;
  name: string;
  description?: string;
  usage: {
    count: number;
    lastUsed?: Date;
  };
  active: boolean;
  permissions: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface IApiKeyModel extends Model<IApiKey> {
  generateKey(name: string, description?: string): Promise<IApiKey>;
}

export interface ApiResponse<T> {
  status: 'success' | 'error';
  message?: string;
  data?: T;
  pagination?: PaginationInfo;
}

export interface PaginationInfo {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

