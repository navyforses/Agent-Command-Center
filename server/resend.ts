// Email sending via Gmail SMTP (free, no domain verification needed)
import nodemailer from 'nodemailer';

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailWithAttachmentsParams {
  to: string;
  subject: string;
  body: string;
  html?: string;
  attachments?: EmailAttachment[];
}

function getTransporter() {
  const gmailUser = process.env.GMAIL_USER;
  const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

  if (!gmailUser || !gmailAppPassword) {
    return null;
  }

  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: gmailUser,
      pass: gmailAppPassword,
    },
  });
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      return { success: false, error: "Gmail credentials not configured. Please add GMAIL_USER and GMAIL_APP_PASSWORD." };
    }

    await transporter.sendMail({
      from: process.env.GMAIL_USER,
      to: params.to.trim(),
      subject: params.subject,
      text: params.body,
    });

    return { success: true };
  } catch (error: any) {
    console.error("Error sending email:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}

export async function sendEmailWithAttachments(params: SendEmailWithAttachmentsParams): Promise<{ success: boolean; error?: string }> {
  try {
    const transporter = getTransporter();
    if (!transporter) {
      return { success: false, error: "Gmail credentials not configured. Please add GMAIL_USER and GMAIL_APP_PASSWORD." };
    }

    const mailOptions: nodemailer.SendMailOptions = {
      from: process.env.GMAIL_USER,
      to: params.to.trim(),
      subject: params.subject,
      text: params.body,
      html: params.html,
      attachments: params.attachments?.map(att => ({
        filename: att.filename,
        content: att.content,
        contentType: att.contentType || 'application/pdf',
      })),
    };

    await transporter.sendMail(mailOptions);
    console.log(`[Email] Successfully sent email with ${params.attachments?.length || 0} attachments to ${params.to}`);

    return { success: true };
  } catch (error: any) {
    console.error("Error sending email with attachments:", error);
    return { success: false, error: error.message || "Failed to send email" };
  }
}
