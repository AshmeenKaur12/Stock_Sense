import nodemailer, { type Transporter } from 'nodemailer';
import { env, isTest } from './env';
import { logger } from './logger';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

let transporter: Transporter | null = null;

function getTransporter(): Transporter | null {
  if (!env.SMTP_HOST) return null;
  transporter ??= nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_PORT === 465,
    auth: env.SMTP_USER ? { user: env.SMTP_USER, pass: env.SMTP_PASS } : undefined,
  });
  return transporter;
}

/** Sends via SMTP when configured; otherwise prints the message to the console (dev). */
export async function sendMail(message: MailMessage): Promise<void> {
  const t = getTransporter();
  if (!t) {
    if (!isTest) {
      logger.info(`\n📧  Mail to ${message.to} — ${message.subject}\n${message.text}\n`);
    }
    return;
  }
  await t.sendMail({ from: env.MAIL_FROM, ...message });
}
