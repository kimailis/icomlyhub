import axios from 'axios';

export class EmailService {
    private mailServiceUrl: string;

    constructor() {
        // Points to the new SMTP microservice container
        this.mailServiceUrl = process.env.MAIL_SERVICE_URL || 'http://mail:3025/send-email';
        console.log(`[EmailService] Initialized with Mail Service URL: ${this.mailServiceUrl}`);
    }

    /**
     * Verify connection (Basic health check)
     */
    async verifyConnection(): Promise<boolean> {
        try {
            await axios.get(this.mailServiceUrl.replace('/send-email', '/health'));
            return true;
        } catch {
            return false;
        }
    }

    /**
     * Subscribe user to email updates in the SMTP microservice
     */
    async subscribe(email: string, userName: string, preferences?: any): Promise<boolean> {
        try {
            await axios.post(this.mailServiceUrl.replace('/send-email', '/subscribe'), {
                email,
                userName,
                preferences
            });
            console.log(`[EmailService] User ${email} subscribed in Mail Service`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Failed to subscribe user ${email}:`, error);
            return false;
        }
    }

    /**
     * Unsubscribe user from email updates in the SMTP microservice
     */
    async unsubscribe(email: string): Promise<boolean> {
        try {
            await axios.post(this.mailServiceUrl.replace('/send-email', '/unsubscribe'), {
                email
            });
            console.log(`[EmailService] User ${email} unsubscribed in Mail Service`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Failed to unsubscribe user ${email}:`, error);
            return false;
        }
    }

    /**
     * Trigger a broadcast (gossip update or manual digest)
     */
    async broadcast(type: 'weekly_digest' | 'gossip_update', subject: string, body: string, options: { highlights?: any[], link?: string } = {}): Promise<boolean> {
        try {
            await axios.post(this.mailServiceUrl.replace('/send-email', '/broadcast'), {
                type,
                subject,
                body,
                ...options
            });
            console.log(`[EmailService] Broadcast ${type} initiated`);
            return true;
        } catch (error) {
            console.error(`[EmailService] Failed to initiate broadcast:`, error);
            return false;
        }
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
                body: html,
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
     * Send Celebrity Alert (when followed celeb has news)
     */
    async sendCelebrityAlert(to: string, celebName: string, headline: string, summary: string): Promise<boolean> {
        try {
            await axios.post(this.mailServiceUrl, {
                type: 'notification',
                recipient: to,
                title: `🔔 Alert: ${celebName}`,
                message: `${headline}. ${summary}`,
                link: `${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/${celebName.toLowerCase().replace(/\s+/g, '-')}`
            });
            return true;
        } catch (error) {
            console.error(`[EmailService] Failed to send alert to ${to}:`, error);
            return false;
        }
    }

    /**
     * Send Subscription Upgrade Notification
     */
    async sendSubscriptionUpgrade(to: string, userName: string, planName: string): Promise<boolean> {
        const subject = `🎉 Welcome to Icomly ${planName}!`;
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 10px;">
                <h2 style="color: #ff4081;">🎉 Congratulations, ${userName}!</h2>
                <p style="color: #e0e0e0;">You've been upgraded to <strong style="color: #facc15;">${planName}</strong>!</p>
                <p style="color: #9ca3af;">You now have access to:</p>
                <ul style="color: #e0e0e0;">
                    <li>🔓 Exclusive sightings data</li>
                    <li>📍 Real-time location updates</li>
                    <li>📊 Advanced analytics</li>
                    <li>🔔 Priority alerts</li>
                </ul>
                <br/>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
                   style="background: linear-gradient(135deg, #d946ef 0%, #ec4899 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                   Explore Your New Features
                </a>
            </div>
        `;
        return this.sendEmail(to, subject, html);
    }

    /**
     * Send Subscription Downgrade Notification
     */
    async sendSubscriptionDowngrade(to: string, userName: string): Promise<boolean> {
        const subject = 'Your Icomly subscription has ended';
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 10px;">
                <h2 style="color: #9ca3af;">We're sorry to see you go, ${userName}</h2>
                <p style="color: #e0e0e0;">Your premium subscription has ended and you've been moved to the Free plan.</p>
                <p style="color: #9ca3af;">You can still enjoy:</p>
                <ul style="color: #e0e0e0;">
                    <li>✅ Basic celebrity tracking</li>
                    <li>✅ Public news feed</li>
                    <li>✅ Following up to 5 celebrities</li>
                </ul>
                <p style="color: #9ca3af;">Miss the premium features? Come back anytime!</p>
                <br/>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/pricing" 
                   style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                   View Plans
                </a>
            </div>
        `;
        return this.sendEmail(to, subject, html);
    }

    /**
     * Send Unsubscribe Confirmation
     */
    async sendUnsubscribeConfirmation(to: string, userName: string): Promise<boolean> {
        const subject = 'You\'ve been unsubscribed from Icomly emails';
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 10px;">
                <h2 style="color: #e0e0e0;">Unsubscribed Successfully</h2>
                <p style="color: #9ca3af;">Hi ${userName}, you've been unsubscribed from Icomly marketing emails.</p>
                <p style="color: #9ca3af;">You'll still receive important account-related emails (e.g., password resets).</p>
                <p style="color: #9ca3af;">Changed your mind? Update your preferences in your account settings.</p>
            </div>
        `;
        return this.sendEmail(to, subject, html);
    }
}

export const emailService = new EmailService();
