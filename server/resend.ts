// Email sending via Gmail SMTP (free, no domain verification needed)
import nodemailer from 'nodemailer';

export interface SendEmailParams {
  to: string;
  subject: string;
  body: string;
}

export async function sendEmail(params: SendEmailParams): Promise<{ success: boolean; error?: string }> {
  try {
    const gmailUser = process.env.GMAIL_USER;
    const gmailAppPassword = process.env.GMAIL_APP_PASSWORD;

    if (!gmailUser || !gmailAppPassword) {
      return { success: false, error: "Gmail credentials not configured. Please add GMAIL_USER and GMAIL_APP_PASSWORD." };
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: gmailUser,
        pass: gmailAppPassword,
      },
    });

    await transporter.sendMail({
      from: gmailUser,
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
