const nodemailer = require('nodemailer');

let transporter;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

const FROM = process.env.EMAIL_FROM || 'VoiceAI <noreply@sterlingaiacademy.com>';

const emailService = {
  /**
   * Send welcome email to new client
   */
  async sendWelcome({ to, businessName, loginEmail, tempPassword, loginUrl }) {
    await getTransporter().sendMail({
      from: FROM,
      to,
      subject: `Welcome to VoiceAI — Your AI Phone Agent is Ready`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#6C47FF;">Welcome to VoiceAI, ${businessName}!</h2>
          <p>Your AI phone agent account has been created.</p>
          <table style="border-collapse:collapse;width:100%;">
            <tr><td style="padding:8px;font-weight:bold;">Login Email</td><td style="padding:8px;">${loginEmail}</td></tr>
            <tr><td style="padding:8px;font-weight:bold;">Temporary Password</td><td style="padding:8px;font-family:monospace;">${tempPassword}</td></tr>
          </table>
          <p style="margin-top:24px;">
            <a href="${loginUrl}" style="background:#6C47FF;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
              Login to Dashboard
            </a>
          </p>
          <p style="color:#888;font-size:13px;margin-top:32px;">Please change your password after first login.</p>
        </div>
      `,
    });
  },

  /**
   * Send invoice email with PDF attachment
   */
  async sendInvoice({ to, businessName, invoiceNumber, amount, dueDate, pdfBuffer }) {
    await getTransporter().sendMail({
      from: FROM,
      to,
      subject: `VoiceAI Invoice #${invoiceNumber} — ₹${amount}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#6C47FF;">Invoice #${invoiceNumber}</h2>
          <p>Dear ${businessName},</p>
          <p>Please find your invoice attached. Amount due: <strong>₹${amount}</strong> by <strong>${dueDate}</strong>.</p>
          <p style="color:#888;font-size:13px;">VoiceAI — AI Phone Agents for Indian Businesses</p>
        </div>
      `,
      attachments: pdfBuffer
        ? [{ filename: `invoice-${invoiceNumber}.pdf`, content: pdfBuffer, contentType: 'application/pdf' }]
        : [],
    });
  },

  /**
   * Send payment reminder
   */
  async sendPaymentReminder({ to, businessName, invoiceNumber, amount, dueDate, paymentLink }) {
    await getTransporter().sendMail({
      from: FROM,
      to,
      subject: `Reminder: VoiceAI Invoice #${invoiceNumber} Due ${dueDate}`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#F59E0B;">Payment Reminder</h2>
          <p>Dear ${businessName},</p>
          <p>Invoice <strong>#${invoiceNumber}</strong> for <strong>₹${amount}</strong> is due on <strong>${dueDate}</strong>.</p>
          ${paymentLink ? `<p><a href="${paymentLink}" style="background:#6C47FF;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">Pay Now</a></p>` : ''}
          <p style="color:#888;font-size:13px;">Please contact support if you have any questions.</p>
        </div>
      `,
    });
  },

  /**
   * Send password reset email
   */
  async sendPasswordReset({ to, resetLink, expiresIn = '1 hour' }) {
    await getTransporter().sendMail({
      from: FROM,
      to,
      subject: `VoiceAI — Reset Your Password`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#6C47FF;">Reset Your Password</h2>
          <p>Click the button below to reset your password. This link expires in ${expiresIn}.</p>
          <p>
            <a href="${resetLink}" style="background:#6C47FF;color:#fff;padding:12px 24px;border-radius:6px;text-decoration:none;">
              Reset Password
            </a>
          </p>
          <p style="color:#888;font-size:13px;">If you did not request this, you can safely ignore this email.</p>
        </div>
      `,
    });
  },

  /**
   * Send low balance / plan expiry alert
   */
  async sendPlanAlert({ to, businessName, type, details }) {
    const subjects = {
      low_minutes: `VoiceAI — Low Call Minutes Warning`,
      plan_expiry: `VoiceAI — Your Plan Expires Soon`,
      suspended: `VoiceAI — Account Suspended`,
    };
    await getTransporter().sendMail({
      from: FROM,
      to,
      subject: subjects[type] || `VoiceAI — Account Alert`,
      html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
          <h2 style="color:#EF4444;">Account Alert</h2>
          <p>Dear ${businessName},</p>
          <p>${details}</p>
          <p style="color:#888;font-size:13px;">Please contact your VoiceAI account manager for assistance.</p>
        </div>
      `,
    });
  },
};

module.exports = { emailService };
