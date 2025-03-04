import nodemailer from 'nodemailer';

let cachedTransporter: nodemailer.Transporter | null = null;

/**
 * Get or create a nodemailer transporter
 * Uses a cached instance for better performance in serverless
 */
const getTransporter = async (): Promise<nodemailer.Transporter> => {
  if (cachedTransporter) {
    return cachedTransporter;
  }

  if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
    console.error('Missing SMTP credentials in environment variables');
    throw new Error('Email service configuration error');
  }

  console.log('Creating email transporter...');
  
  const newTransporter = nodemailer.createTransport({
    host: 'mail.smtp2go.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD
    },

    connectionTimeout: 5000,
    socketTimeout: 10000
  });

  try {
    await newTransporter.verify();
    console.log('Email service initialized successfully');
    cachedTransporter = newTransporter;
    return newTransporter;
  } catch (error) {
    console.error('Email service verification failed:', error);
    throw error;
  }
};

/**
 * Email Service for Netlify Functions
 */
export class EmailService {
  /**
   * Send an email with error handling
   */
  async sendEmail(options: nodemailer.SendMailOptions): Promise<boolean> {
    try {
      console.log(`📧 Sending email to ${options.to}`);

      const transporter = await getTransporter();

      const info = await transporter.sendMail({
        from: process.env.EMAIL_FROM || '"Neurodivergent Quotes API" <noreply@yvalkyrieremedy.com>',
        ...options
      });
      
      console.log(`✅ Email sent: ${info.messageId}`);
      return true;
    } catch (error) {
      console.error('❌ Failed to send email:', error);
      return false;
    }
  }
  
  /**
   * Send API key email
   */
  async sendApiKeyEmail(email: string, name: string, key: string): Promise<boolean> {
    return this.sendEmail({
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
fetch("${process.env.BASE_URL || 'https://nd-quote-api.netlify.app'}/api/quotes/random", {
  headers: {
    "X-API-Key": "${key}"
  }
})
.then(response => response.json())
.then(data => console.log(data));
        </pre>
        <p>For more information, please visit our <a href="${process.env.BASE_URL || 'https://nd-quote-api.netlify.app'}/docs">documentation</a>.</p>
        <p>Best regards,<br>The Neurodivergent Quotes API Team</p>
      `
    });
  }
  
  /**
   * Send rejection email
   */
  async sendRejectionEmail(email: string, name: string): Promise<boolean> {
    return this.sendEmail({
      to: email,
      subject: 'Update on Your Neurodivergent Quotes API Key Request',
      html: `
        <h1>API Key Request Update</h1>
        <p>Hello ${name},</p>
        <p>Thank you for your interest in the Neurodivergent Quotes API.</p>
        <p>After reviewing your request, we are unable to provide an API key at this time.</p>
        <p>If you have any questions or would like to provide additional information about your use case, please reply to this email.</p>
        <p>Best regards,<br>The Neurodivergent Quotes API Team</p>
      `
    });
  }
  
  /**
   * Send admin notification
   */
  async sendAdminNotification(keyRequest: any): Promise<boolean> {
    if (!process.env.ADMIN_EMAIL) {
      console.log('Admin email not set, skipping notification');
      return false;
    }
    
    return this.sendEmail({
      to: process.env.ADMIN_EMAIL,
      subject: 'New API Key Request',
      html: `
        <h1>New API Key Request</h1>
        <p><strong>Name:</strong> ${keyRequest.name}</p>
        <p><strong>Email:</strong> ${keyRequest.email}</p>
        <p><strong>Usage Description:</strong> ${keyRequest.usage}</p>
        <p><strong>Request ID:</strong> ${keyRequest._id}</p>
        <p><a href="${process.env.BASE_URL || 'https://nd-quote-api.netlify.app'}/admin">Review in Admin Dashboard</a></p>
      `
    });
  }
}

export const emailService = new EmailService();
export default emailService;