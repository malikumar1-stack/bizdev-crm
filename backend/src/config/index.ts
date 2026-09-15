import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'js_investments_bd_crm_secret_key_2026',
  appTimezone: process.env.APP_TIMEZONE || 'Asia/Karachi',
  appName: 'JS Investments – Business Development CRM',
  appShortName: 'JS Investments BD CRM',
  frontendUrl: process.env.FRONTEND_URL || 'http://localhost:5173',
  databaseUrl: process.env.DATABASE_URL || 'file:./dev.db',
  
  // Email
  email: {
    host: process.env.SMTP_HOST || process.env.EMAIL_HOST || '',
    port: parseInt(process.env.SMTP_PORT || process.env.EMAIL_PORT || '587', 10),
    secure: process.env.EMAIL_SECURE === 'true',
    user: process.env.SMTP_USER || process.env.EMAIL_USER || '',
    password: process.env.SMTP_PASS || process.env.EMAIL_PASSWORD || '',
    from: process.env.SMTP_FROM || process.env.EMAIL_FROM || 'JS Investments BD CRM <crm@jsil.com>'
  },

  // WhatsApp
  whatsapp: {
    enabled: process.env.WHATSAPP_ENABLED !== 'false',
    apiUrl: process.env.WHATSAPP_API_URL || 'https://graph.facebook.com/v19.0',
    apiKey: process.env.WHATSAPP_API_KEY || '',
    phoneNumberId: process.env.WHATSAPP_PHONE_NUMBER_ID || '',
    templateName: process.env.WHATSAPP_TEMPLATE_NAME || ''
  },

  // AI Engine
  ai: {
    provider: process.env.AI_PROVIDER || 'gemini',
    apiKey: process.env.AI_API_KEY || ''
  },

  // Google Calendar
  google: {
    clientId: process.env.GOOGLE_CLIENT_ID || '',
    clientSecret: process.env.GOOGLE_CLIENT_SECRET || '',
    redirectUri: process.env.GOOGLE_REDIRECT_URI || ''
  }
};
