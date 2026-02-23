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
        const subject = 'Welcome to Icomly! 🌟';
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 10px;">
                <h2 style="color: #ff4081;">Welcome, ${name}!</h2>
                <p style="color: #e0e0e0;">We're thrilled to have you join the Icomly community.</p>
                <p style="color: #e0e0e0;">Get ready to track your favorite celebrities and stay updated with the latest sightings!</p>
                <br/>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
                   style="background: linear-gradient(135deg, #ff4081 0%, #ec4899 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                   🚀 Go to Dashboard
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
            highlightsHtml = '<p style="color: #9ca3af;">No major updates this week.</p>';
        } else {
            highlightsHtml = '<ul style="color: #e0e0e0;">' + highlights.map(h =>
                `<li style="margin-bottom: 8px;"><strong style="color: #ff4081;">${h.celebName}</strong>: ${h.summary}</li>`
            ).join('') + '</ul>';
        }

        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; color: #333; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 10px;">
                <h2 style="color: #ff4081;">📰 Weekly Digest for ${userName}</h2>
                <p style="color: #e0e0e0;">Here's what happened this week with the celebrities you follow:</p>
                ${highlightsHtml}
                <br/>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
                   style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                   View Full Details
                </a>
            </div>
        `;
        return this.sendEmail(to, subject, html);
    }

    /**
     * Send Celebrity Alert (when followed celeb has news)
     */
    async sendCelebrityAlert(to: string, celebName: string, headline: string, summary: string): Promise<boolean> {
        const subject = `🔔 ${celebName} is making headlines!`;
        const html = `
            <div style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 10px;">
                <h2 style="color: #ff4081;">🔔 Alert: ${celebName}</h2>
                <h3 style="color: #e0e0e0;">${headline}</h3>
                <p style="color: #9ca3af;">${summary}</p>
                <br/>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/profile/${celebName.toLowerCase().replace(/\s+/g, '-')}" 
                   style="background: linear-gradient(135deg, #f97316 0%, #ef4444 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                   View Profile
                </a>
            </div>
        `;
        return this.sendEmail(to, subject, html);
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
