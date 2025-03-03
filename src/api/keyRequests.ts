import express, { Request, Response, Router } from 'express';
import mongoose from 'mongoose';
import { ApiResponse } from '../types';
import ApiKey from '../models/ApiKey';
import { requireAdmin } from '../middleware/auth';
import nodemailer from 'nodemailer';
import KeyRequest from '../models/KeyRequest';

const router: Router = express.Router();

interface KeyRequestData {
  name: string;
  email: string;
  usage: string;
  status?: 'pending' | 'approved' | 'rejected';
  apiKeyId?: mongoose.Types.ObjectId;
  createdAt?: Date;
}

const transporter = nodemailer.createTransport({
  host: 'mail.smtp2go.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD
  }
});

/**
 * POST /api/key-requests
 * Create a new API key request
 */
router.post('/', async (req: Request, res: Response): Promise<void> => {
  try {
    const { name, email, usage } = req.body as KeyRequestData;
    
    if (!name || !email || !usage) {
      const response: ApiResponse<null> = {
        status: 'error',
        message: 'Name, email, and usage description are required'
      };
      
      res.status(400).json(response);
      return;
    }

    const keyRequest = await KeyRequest.create({
      name,
      email,
      usage,
      status: 'pending'
    });

    if (process.env.AUTO_APPROVE_KEYS === 'true') {
      await approveAndSendKey(keyRequest._id.toString());
    } else {
      await sendAdminNotification(keyRequest);
    }
    
    const response: ApiResponse<{id: string}> = {
      status: 'success',
      message: 'API key request submitted successfully',
      data: { 
        id: keyRequest._id.toString()
      }
    };
    
    res.status(201).json(response);
  } catch (error) {
    console.error('Error submitting key request:', error);
    
    const response: ApiResponse<null> = {
      status: 'error',
      message: 'Failed to submit API key request'
    };
    
    res.status(500).json(response);
  }
});

/**
 * GET /api/key-requests
 * Get all key requests (admin only)
 */
router.get('/', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const keyRequests = await KeyRequest.find()
      .sort({ createdAt: -1 });
    
    const response: ApiResponse<typeof keyRequests> = {
      status: 'success',
      data: keyRequests
    };
    
    res.json(response);
  } catch (error) {
    console.error('Error fetching key requests:', error);
    
    const response: ApiResponse<null> = {
      status: 'error',
      message: 'Failed to fetch key requests'
    };
    
    res.status(500).json(response);
  }
});

/**
 * PATCH /api/key-requests/:id/approve
 * Approve a key request and generate API key
 */
router.patch('/:id/approve', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const result = await approveAndSendKey(req.params.id);
    
    if (!result.success) {
      res.status(404).json({
        status: 'error',
        message: result.message || 'Failed to approve key request'
      });
      return;
    }
    
    res.json({
      status: 'success',
      message: 'Key request approved and API key sent',
      data: {
        requestId: req.params.id,
        apiKeyId: result.apiKeyId
      }
    });
  } catch (error) {
    console.error('Error approving key request:', error);
    
    const response: ApiResponse<null> = {
      status: 'error',
      message: 'Failed to approve key request'
    };
    
    res.status(500).json(response);
  }
});

/**
 * PATCH /api/key-requests/:id/reject
 * Reject a key request
 */
router.patch('/:id/reject', requireAdmin, async (req: Request, res: Response): Promise<void> => {
  try {
    const keyRequest = await KeyRequest.findByIdAndUpdate(
      req.params.id,
      { status: 'rejected' },
      { new: true }
    );
    
    if (!keyRequest) {
      res.status(404).json({
        status: 'error',
        message: 'Key request not found'
      });
      return;
    }

    await sendRejectionEmail(keyRequest);
    
    res.json({
      status: 'success',
      message: 'Key request rejected',
      data: {
        requestId: req.params.id
      }
    });
  } catch (error) {
    console.error('Error rejecting key request:', error);
    
    const response: ApiResponse<null> = {
      status: 'error',
      message: 'Failed to reject key request'
    };
    
    res.status(500).json(response);
  }
});

/**
 * Function to approve a key request, generate an API key, and send email
 */
async function approveAndSendKey(requestId: string): Promise<{
  success: boolean;
  apiKeyId?: string;
  message?: string;
}> {
  try {
    const keyRequest = await KeyRequest.findById(requestId);
    
    if (!keyRequest) {
      return { success: false, message: 'Key request not found' };
    }
    
    if (keyRequest.status === 'approved') {
      return { success: false, message: 'Key request already approved' };
    }

    const apiKey = await ApiKey.generateKey(
      `${keyRequest.name}'s Key`, 
      `Requested by ${keyRequest.email} for: ${keyRequest.usage}`
    );

    keyRequest.status = 'approved';
    keyRequest.apiKeyId = apiKey._id;
    await keyRequest.save();

    await sendApiKeyEmail(keyRequest.email, keyRequest.name, apiKey.key);
    
    return { 
      success: true,
      apiKeyId: apiKey._id.toString()
    };
  } catch (error) {
    console.error('Error in approveAndSendKey:', error);
    return { success: false, message: (error as Error).message };
  }
}

/**
 * Function to send API key via email
 */
async function sendApiKeyEmail(email: string, name: string, key: string): Promise<void> {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Neurodivergent Quotes API" <noreply@yourdomain.com>',
      to: email,
      subject: 'Your Neurodivergent Quotes API Key',
      html: `
        <h1>Your API Key is Ready</h1>
        <p>Hello ${name},</p>
        <p>Thanks for your interest in the Neurodivergent Quotes API! Your API key has been generated:</p>
        <p style="background-color: #f0f0f0; padding: 15px; font-family: monospace; word-break: break-all;">
          ${key}
        </p>
        <h2>Quick Start</h2>
        <p>Add this key to your request headers:</p>
        <pre style="background-color: #f0f0f0; padding: 10px;">
{
  "X-API-Key": "${key}"
}
        </pre>
        <p>Example API request:</p>
        <pre style="background-color: #f0f0f0; padding: 10px;">
fetch("https://your-api-domain.com/api/quotes/random", {
  headers: {
    "X-API-Key": "${key}"
  }
})
.then(response => response.json())
.then(data => console.log(data));
        </pre>
        <p>For more information, please visit our <a href="https://your-api-domain.com/docs">documentation</a>.</p>
        <p>Best regards,<br>The Neurodivergent Quotes API Team</p>
      `
    };
    
    const info = await transporter.sendMail(mailOptions);
    console.log('Email sent: %s', info.messageId);
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

/**
 * Function to send rejection email
 */
async function sendRejectionEmail(keyRequest: any): Promise<void> {
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Neurodivergent Quotes API" <noreply@yourdomain.com>',
      to: keyRequest.email,
      subject: 'Update on Your Neurodivergent Quotes API Key Request',
      html: `
        <h1>API Key Request Update</h1>
        <p>Hello ${keyRequest.name},</p>
        <p>Thank you for your interest in the Neurodivergent Quotes API.</p>
        <p>After reviewing your request, we are unable to provide an API key at this time.</p>
        <p>If you have any questions or would like to provide additional information about your use case, please reply to this email.</p>
        <p>Best regards,<br>The Neurodivergent Quotes API Team</p>
      `
    };
    
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending rejection email:', error);
  }
}

/**
 * Function to notify admin of new key request
 */
async function sendAdminNotification(keyRequest: any): Promise<void> {
  if (!process.env.ADMIN_EMAIL) return;
  
  try {
    const mailOptions = {
      from: process.env.EMAIL_FROM || '"Neurodivergent Quotes API" <noreply@yourdomain.com>',
      to: process.env.ADMIN_EMAIL,
      subject: 'New API Key Request',
      html: `
        <h1>New API Key Request</h1>
        <p><strong>Name:</strong> ${keyRequest.name}</p>
        <p><strong>Email:</strong> ${keyRequest.email}</p>
        <p><strong>Usage Description:</strong> ${keyRequest.usage}</p>
        <p><strong>Request ID:</strong> ${keyRequest._id}</p>
        <p><a href="${process.env.BASE_URL || 'http://localhost:3000'}/admin">Review in Admin Dashboard</a></p>
      `
    };
    
    await transporter.sendMail(mailOptions);
  } catch (error) {
    console.error('Error sending admin notification:', error);
  }
}

export default router;