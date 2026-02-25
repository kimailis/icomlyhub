import axios from 'axios';

export class EmailService {
    private mailServiceUrl: string;

    constructor() {
        // Points to the new SMTP microservice container
        this.mailServiceUrl = process.env.MAIL_SERVICE_URL || 'http://mail:3025/send-email';
        console.log(`[EmailService] Initialized with Mail Service URL: ${this.mailServiceUrl}`);
    }

    /**
     * Send generic email via HTTP API
     */
    async sendEmail(to: string, subject: string, html: string): Promise<boolean> {
        try {
            await axios.post(this.mailServiceUrl, {
                type: 'generic',
                recipient: to,
                subject,
                body: html, // Plain text fallback
                html
            });
            console.log(`[EmailService] Email sent to ${to} via Mail Service`);
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
        try {
            await axios.post(this.mailServiceUrl, {
                type: 'password_reset',
                recipient: to,
                code: otp,
                expires: Date.now() + 10 * 60 * 1000
            });
            console.log(`[EmailService] OTP sent to ${to} via Mail Service`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Failed to send OTP to ${to}:`, error);
            return false;
        }
    }

    /**
     * Send Weekly Digest
     */
    async sendWeeklyDigest(to: string, userName: string, highlights: any[]): Promise<boolean> {
        try {
            await axios.post(this.mailServiceUrl, {
                type: 'weekly_digest',
                recipient: to,
                userName,
                highlights
            });
            console.log(`[EmailService] Weekly digest sent to ${to} via Mail Service`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Failed to send weekly digest to ${to}:`, error);
            return false;
        }
    }

    /**
     * Send Welcome Email
     */
    async sendWelcomeEmail(to: string, name: string): Promise<boolean> {
        try {
            await axios.post(this.mailServiceUrl, {
                type: 'notification',
                recipient: to,
                title: `Welcome to Icomly, ${name}! 🌟`,
                message: "We're thrilled to have you join the Icomly community. Get ready to track your favorite celebrities and stay updated with the latest sightings!",
                link: process.env.FRONTEND_URL || 'http://localhost:3000'
            });
            console.log(`[EmailService] Welcome email sent to ${to} via Mail Service`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Failed to send welcome email to ${to}:`, error);
            return false;
        }
    }
}

export const emailService = new EmailService();
