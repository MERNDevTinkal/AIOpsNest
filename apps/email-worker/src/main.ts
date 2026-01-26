import { consumeWithRetries } from '../../src/common/messaging';
import * as nodemailer from 'nodemailer';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import * as dotenv from 'dotenv';

dotenv.config();

const EMAIL_ENABLED = process.env.EMAIL_ENABLED === 'true';
const EMAIL_USE_SES = process.env.EMAIL_USE_SES === 'true';
const SMTP_HOST = process.env.SMTP_HOST || '';
const SMTP_PORT = parseInt(process.env.SMTP_PORT || '587', 10);
const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';
const AUTH_URL = process.env.AUTH_URL || 'http://localhost:3001';

let transporter: nodemailer.Transporter | null = null;
if (EMAIL_ENABLED && !EMAIL_USE_SES) {
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: SMTP_PORT,
    secure: false,
    auth: SMTP_USER ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
  });
}

const sesClient = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' });

async function handler(payload: any) {
  console.log('Email worker received', payload);
  if (!EMAIL_ENABLED) {
    console.log('Email sending disabled - skipping');
    return;
  }

  const to = payload.email;
  const verificationToken = payload.emailVerificationToken;
  const url = `${AUTH_URL}/auth/verify?token=${verificationToken}`;

  const mail = {
    from: process.env.EMAIL_FROM || '',
    to,
    subject: 'Verify your email',
    text: `Please verify your email by visiting: ${url}`,
    html: `<p>Please verify your email by clicking <a href="${url}">here</a></p>`,
  };

  try {
    if (EMAIL_USE_SES) {
      const params = {
        Destination: { ToAddresses: [to] },
        Message: {
          Body: { Html: { Charset: 'UTF-8', Data: mail.html }, Text: { Charset: 'UTF-8', Data: mail.text } },
          Subject: { Charset: 'UTF-8', Data: mail.subject },
        },
        Source: process.env.EMAIL_FROM || '',
      };
      await sesClient.send(new SendEmailCommand(params));
      console.log('Verification email sent via SES to', to);
      return;
    }

    if (!transporter) throw new Error('No transporter configured');
    await transporter.sendMail(mail);
    console.log('Verification email sent to', to);
  } catch (err) {
    console.error('Failed to send email', err);
    // throw to trigger retry / DLQ logic
    throw err;
  }
}

export async function startWorker() {
  console.log('Starting email worker with retries...');
  await consumeWithRetries('email.worker', 'user.created', handler, { maxRetries: 3, retryDelayMs: 10000 });
  console.log('Consumer with retry registered');
}

// allow running directly: node dist/main.js
if (require.main === module) {
  startWorker().catch((err) => {
    console.error('Email worker failed', err);
    process.exit(1);
  });
}

export { handler };
