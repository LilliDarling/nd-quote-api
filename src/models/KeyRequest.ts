import mongoose from 'mongoose';

const keyRequestSchema = new mongoose.Schema({
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    usage: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending'
    },
    apiKeyId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ApiKey'
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
});
  
const KeyRequest = mongoose.model('KeyRequest', keyRequestSchema);
  
export default KeyRequest;