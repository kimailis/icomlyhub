import nodemailer from 'nodemailer';

export class EmailService {
    private transporter: nodemailer.Transporter;
    private fromEmail: string;

    constructor() {
        this.fromEmail = process.env.SMTP_FROM || 'noreply@icomly.com';

        const smtpConfig = {
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '1025'),
            secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
            auth: undefined as any,
            tls: {
                rejectUnauthorized: false // Helpful for local dev/self-signed certs
            }
        };

        // Only add auth if user/pass are provided and not 'none'
        if (process.env.SMTP_USER && process.env.SMTP_USER !== 'none') {
            smtpConfig.auth = {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            };
        }

        this.transporter = nodemailer.createTransport(smtpConfig);

        console.log(`[EmailService] Initialized with host: ${smtpConfig.host}:${smtpConfig.port}`);
    }

    /**
     * Verify SMTP connection
     */
    async verifyConnection(): Promise<boolean> {
        try {
            await this.transporter.verify();
            console.log('[EmailService] SMTP connection established successfully');
            return true;
        } catch (error) {
            console.error('[EmailService] SMTP connection failed:', error);
            return false;
        }
    }

    /**
     * Send a generic email
     */
    async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
        try {
            const info = await this.transporter.sendMail({
                from: `"Icomly" <${this.fromEmail}>`,
                to,
                subject,
                html,
            });
            console.log(`[EmailService] Email sent to ${to}. MessageId: ${info.messageId}`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Failed to send email to ${to}:`, error);
            return false;
        }
    }

    /**
     * Send Password Reset OTP
     */
    async sendPasswordResetOTP(to: string, otp: string): Promise<boolean> {
        const subject = 'Password Reset OTP - Icomly';
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Password Reset Request</h2>
                <p>You requested a password reset for your Icomly account.</p>
                <p>Your One-Time Password (OTP) is:</p>
                <h1 style="color: #ff4081; letter-spacing: 5px;">${otp}</h1>
                <p>This code is valid for 10 minutes.</p>
                <p>If you did not request this, please ignore this email.</p>
            </div>
        `;
        return this.sendEmail(to, subject, html);
    }

    /**
     * Send Welcome Email
     */
    async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
        const subject = 'Welcome to Icomly! 🌟';
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Welcome, ${name}!</h2>
                <p>We're thrilled to have you join the Icomly community.</p>
                <p>Get ready to track your favorite celebrities and stay updated with the latest sightings!</p>
                <br/>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
                   style="background-color: #ff4081; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
                   Go to Dashboard
                </a>
            </div>
        `;
        return this.sendEmail(to, subject, html);
    }

    /**
     * Send Weekly Digest
     */
    async sendWeeklyDigest(to: string, userName: string, highlights: any[]): Promise<boolean> {
        const subject = 'Your Weekly Icomly Digest 📰';

        let highlightsHtml = '';
        if (highlights.length === 0) {
            highlightsHtml = '<p>No major updates this week.</p>';
        } else {
            highlightsHtml = '<ul>' + highlights.map(h => `<li><strong>${h.celebName}</strong>: ${h.summary}</li>`).join('') + '</ul>';
        }

        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333;">
                <h2>Weekly Digest for ${userName}</h2>
                <p>Here's what happened this week with the celebrities you follow:</p>
                ${highlightsHtml}
                <br/>
                <p>Log in to see more details!</p>
            </div>
        `;
        return this.sendEmail(to, subject, html);
    }
}

export const emailService = new EmailService();
