const { db } = require('./db');
const nodemailer = require('nodemailer');
const directTransport = require('nodemailer-direct-transport');
const { exec } = require('child_process');
const path = require('path');
const fs = require('fs');
const express = require('express');

class EmailManager {
    constructor(logger) {
        this.logger = logger;
        this.systemAddresses = new Map(); // Changed to Map to store full address info
        this.loadSystemAddresses();

        // Outgoing email: use Mailgun/Brevo SMTP
        this.transport = nodemailer.createTransport({
            host: process.env.SMTP_HOST || 'localhost',
            port: parseInt(process.env.SMTP_PORT || '587', 10),
            auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASS
            },
            secure: false // upgrade later with STARTTLS
        });
        // Email templates
        this.templates = {
            passwordReset: {
                subject: 'Password Reset Code - Icomly',
                createHtml: (code) => `
                    <!DOCTYPE html>
                    <html>
                    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0f172a; color: #e2e8f0;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 20px;">
                            <tr>
                                <td align="center">
                                    <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; border: 1px solid #334155; max-width: 600px;">
                                        <tr>
                                            <td style="padding: 40px 40px 20px 40px; text-align: center;">
                                                <h1 style="margin: 0; color: #f472b6; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">ICOMLY</h1>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 20px 40px 30px 40px;">
                                                <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 22px; font-weight: 700;">Reset your password</h2>
                                                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #94a3b8;">
                                                    We received a request to reset the password for your Icomly account. Use the code below to proceed. This code is valid for 10 minutes.
                                                </p>
                                                <div style="background-color: #1e293b; border-radius: 12px; padding: 24px; text-align: center; border: 1px solid #334155; margin-bottom: 24px;">
                                                    <span style="font-family: 'Courier New', Courier, monospace; font-size: 36px; font-weight: 800; letter-spacing: 8px; color: #f472b6;">${code}</span>
                                                </div>
                                                <p style="margin: 0 0 24px 0; font-size: 14px; line-height: 20px; color: #64748b; text-align: center;">
                                                    If you didn't request this, you can safely ignore this email.
                                                </p>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0 40px 40px 40px; text-align: center;">
                                                <div style="height: 1px; background-color: #334155; margin-bottom: 24px;"></div>
                                                <p style="margin: 0; font-size: 12px; color: #475569;">
                                                    &copy; 2026 Icomly Hub. All rights reserved.
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                `,
                createText: (code) => `
ICOMLY - Password Reset

We received a request to reset your password.
Your reset code is: ${code}

This code will expire in 10 minutes.

If you didn't request this, please ignore this email.
`
            },
            weeklyDigest: {
                subject: 'Your Weekly Icomly Digest 📰',
                createHtml: (userName, highlights) => `
                    <!DOCTYPE html>
                    <html>
                    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0f172a; color: #e2e8f0;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 20px;">
                            <tr>
                                <td align="center">
                                    <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; border: 1px solid #334155; max-width: 600px;">
                                        <tr>
                                            <td style="padding: 40px 40px 20px 40px; text-align: center;">
                                                <h1 style="margin: 0; color: #f472b6; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">ICOMLY</h1>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 20px 40px 10px 40px;">
                                                <h2 style="margin: 0 0 10px 0; color: #ffffff; font-size: 22px; font-weight: 700;">Weekly Digest</h2>
                                                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #94a3b8;">
                                                    Hi ${userName}, here's a look at what happened with the celebrities you follow this week:
                                                </p>
                                                
                                                ${highlights && highlights.length > 0 ? 
                                                    highlights.map(h => `
                                                        <div style="background-color: #1e293b; border-radius: 12px; padding: 16px; border-left: 4px solid #f472b6; margin-bottom: 16px;">
                                                            <div style="font-weight: 800; color: #f472b6; margin-bottom: 4px; font-size: 14px; text-transform: uppercase;">${h.celebName}</div>
                                                            <div style="color: #f8fafc; font-size: 16px; font-weight: 500;">${h.summary}</div>
                                                        </div>
                                                    `).join('') : 
                                                    '<p style="text-align: center; color: #64748b; font-style: italic;">No major updates this week.</p>'
                                                }

                                                <div style="text-align: center; margin-top: 30px; margin-bottom: 10px;">
                                                    <a href="https://icomly.com/feed" style="background-color: #f472b6; color: #ffffff; padding: 14px 28px; text-decoration: none; border-radius: 10px; font-weight: 700; display: inline-block; transition: background-color 0.2s;">
                                                        View Your Full Feed
                                                    </a>
                                                </div>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0 40px 40px 40px; text-align: center;">
                                                <div style="height: 1px; background-color: #334155; margin-bottom: 24px;"></div>
                                                <p style="margin: 0; font-size: 12px; color: #475569;">
                                                    You are receiving this because you follow these celebrities on Icomly.
                                                    <br><br>
                                                    <a href="https://icomly.com/settings" style="color: #f472b6; text-decoration: none;">Unsubscribe</a> or <a href="https://icomly.com/settings" style="color: #f472b6; text-decoration: none;">Manage Preferences</a>
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                `,
                createText: (userName, highlights) => `
ICOMLY - Weekly Digest for ${userName}

${highlights && highlights.length > 0 ? 
    highlights.map(h => `${h.celebName.toUpperCase()}: ${h.summary}`).join('\n\n') : 
    'No major updates this week.'
}

View your full feed at: https://icomly.com/feed
`
            },
            notification: {
                subject: 'New Notification from Icomly',
                createHtml: (title, message, link) => `
                    <!DOCTYPE html>
                    <html>
                    <body style="margin: 0; padding: 0; font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background-color: #0f172a; color: #e2e8f0;">
                        <table width="100%" border="0" cellspacing="0" cellpadding="0" style="background-color: #0f172a; padding: 40px 20px;">
                            <tr>
                                <td align="center">
                                    <table width="100%" max-width="600" border="0" cellspacing="0" cellpadding="0" style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); border-radius: 16px; overflow: hidden; border: 1px solid #334155; max-width: 600px;">
                                        <tr>
                                            <td style="padding: 40px 40px 20px 40px; text-align: center;">
                                                <h1 style="margin: 0; color: #f472b6; font-size: 28px; font-weight: 800; letter-spacing: -0.025em;">ICOMLY</h1>
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 20px 40px 30px 40px;">
                                                <h2 style="margin: 0 0 20px 0; color: #ffffff; font-size: 22px; font-weight: 700;">${title}</h2>
                                                <p style="margin: 0 0 24px 0; font-size: 16px; line-height: 24px; color: #94a3b8;">
                                                    ${message}
                                                </p>
                                                ${link ? `
                                                <div style="text-align: center; margin-top: 10px;">
                                                    <a href="${link}" style="background-color: #f472b6; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: 600; display: inline-block;">
                                                        View Details
                                                    </a>
                                                </div>` : ''}
                                            </td>
                                        </tr>
                                        <tr>
                                            <td style="padding: 0 40px 40px 40px; text-align: center;">
                                                <div style="height: 1px; background-color: #334155; margin-bottom: 24px;"></div>
                                                <p style="margin: 0; font-size: 12px; color: #475569;">
                                                    &copy; 2026 Icomly Hub. All rights reserved.
                                                </p>
                                            </td>
                                        </tr>
                                    </table>
                                </td>
                            </tr>
                        </table>
                    </body>
                    </html>
                `,
                createText: (title, message, link) => `
ICOMLY - ${title}

${message}

${link ? `View details at: ${link}` : ''}
`
            }
        };
    }

    loadSystemAddresses() {
        const database = db(); // Get the database connection
        if (!database) {
            this.logger.error('Database not initialized');
            return;
        }

        database.all('SELECT * FROM system_addresses', [], (err, rows) => {
            if (err) {
                this.logger.error('Error loading system addresses:', err);
                return;
            }

            rows.forEach(row => {
                this.systemAddresses.set(row.email, {
                    type: row.type,
                    hasInbox: row.has_inbox,
                    redirectTo: row.redirect_to,
                    description: row.description
                });
            });

            this.logger.info('System addresses loaded', {
                addresses: Array.from(this.systemAddresses.keys())
            });
        });
    }

    isSystemAddress(email) {
        return this.systemAddresses.has(email);
    }

    hasInbox(email) {
        const address = this.systemAddresses.get(email);
        return address && address.hasInbox;
    }

    getRedirectAddress(email) {
        const address = this.systemAddresses.get(email);
        return address ? address.redirectTo : null;
    }

    getAddressType(email) {
        const address = this.systemAddresses.get(email);
        return address ? address.type.toUpperCase() : null;
    }

    // Deliver email to Maildir for IMAP access
    deliverToMaildir(username, emailContent) {
        const maildir = `/var/mail/${username}/Maildir/new`;
        if (!fs.existsSync(maildir)) fs.mkdirSync(maildir, { recursive: true });
        const filename = path.join(maildir, `${Date.now()}.${Math.random().toString(36).slice(2)}.eml`);
        fs.writeFileSync(filename, emailContent);
        this.logger.info('Delivered email to Maildir', { username, filename });
    }

    isInternalAddress(email) {
        return email.endsWith('@icomly.com');
    }

    async deliverEmail(from, to, subject, body, html) {
        // For internal addresses, deliver to Maildir
        if (this.isInternalAddress(to)) {
            const username = to.split('@')[0];
            const emailContent = `From: ${from}
To: ${to}
Subject: ${subject}
Content-Type: ${html ? 'text/html' : 'text/plain'}; charset=utf-8

${html || body}`;
            this.deliverToMaildir(username, emailContent);
            return;
        }

        // For external addresses, use nodemailer
        try {
            await this.transport.sendMail({
                from,
                to,
                subject,
                text: body,
                html: html || undefined
            });
            this.logger.info('Email sent via nodemailer', { from, to, subject });
        } catch (error) {
            this.logger.error('Nodemailer send failed, queueing for retry', { error: error.message, to, subject });
            // On error, queue for retry
            const database = db();
            if (database) {
                await new Promise((resolve, reject) => {
                    database.run(
                        'INSERT INTO mail_queue (to_address, from_address, subject, body, status, attempts, last_attempt, error) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                        [to, from, subject, html || body, 'pending', 1, new Date().toISOString(), error.message],
                        (err) => {
                            if (err) reject(err);
                            else resolve();
                        }
                    );
                });
            }
            throw error;
        }
    }

    async handleIncomingEmail(session, emailData) {
        const database = db();
        if (!database) {
            throw new Error('Database not initialized');
        }

        const toAddress = session.envelope.rcptTo[0].address;
        const fromAddress = session.envelope.mailFrom.address;

        // Check if this is a system address
        if (!this.isSystemAddress(toAddress)) {
            throw new Error('Invalid recipient address');
        }

        // Check if the address has an inbox
        if (!this.hasInbox(toAddress)) {
            throw new Error('This address does not accept incoming mail');
        }

        // Deliver to Maildir for IMAP access
        const username = toAddress.split('@')[0];
        const fullEmail = `From: ${fromAddress}\nTo: ${toAddress}\nSubject: ${emailData.subject || ''}\n\n${emailData.body}`;
        this.deliverToMaildir(username, fullEmail);

        // Handle special system messages
        if (fromAddress === 'noreply@icomly.com' && toAddress === 'support@icomly.com') {
            try {
                const data = JSON.parse(emailData.body);
                if (data.type === 'password_reset') {
                    await this.handlePasswordReset(data);
                    return;
                }
            } catch (e) {
                // Not a JSON message, proceed with normal email handling
            }
        }

        // Store in database
        await new Promise((resolve, reject) => {
            const query = `INSERT INTO emails (from_address, to_address, subject, body, status) 
                          VALUES (?, ?, ?, ?, ?)`;

            database.run(query, [
                fromAddress,
                toAddress,
                emailData.subject || '',
                emailData.body,
                'received'
            ], (err) => {
                if (err) {
                    this.logger.error('Error storing email:', err);
                    reject(err);
                    return;
                }
                resolve();
            });
        });

        // Handle redirect if configured
        const redirectTo = this.getRedirectAddress(toAddress);
        if (redirectTo) {
            const addressType = this.getAddressType(toAddress);
            const redirectSubject = `[${addressType}] ${emailData.subject || 'No Subject'}`;

            try {
                await this.deliverEmail(toAddress, redirectTo, redirectSubject, emailData.body);

                this.logger.info('Email redirected successfully', {
                    from: toAddress,
                    to: redirectTo,
                    originalFrom: fromAddress,
                    subject: redirectSubject
                });
            } catch (error) {
                this.logger.error('Error redirecting email:', error);
                throw error;
            }
        }
    }

    // Spam filter stub (replace with real SpamAssassin integration)
    async checkSpam(subject, body, from = '') {
        // Simplified spam check for brevity
        return false;
    }

    static startQueueProcessor(logger) {
        // Process queue every 30 seconds
        setInterval(async () => {
            const database = db();
            if (!database) return;

            // Fetch a batch of pending emails
            database.all('SELECT * FROM mail_queue WHERE status = "pending" AND attempts < 5 LIMIT 50', async (err, rows) => {
                if (err) {
                    logger.error('Queue processor DB error:', err);
                    return;
                }

                if (rows.length === 0) return;

                logger.info(`Processing ${rows.length} emails from queue...`);

                for (const mail of rows) {
                    try {
                        // Mark as processing to avoid double-send
                        await new Promise((resolve) => {
                            database.run('UPDATE mail_queue SET status = "processing", last_attempt = CURRENT_TIMESTAMP WHERE id = ?', [mail.id], resolve);
                        });

                        // For external addresses, we might prefer using the transport we have
                        // but if the system is configured to use postfix sendmail, we use it.
                        // Actually, looking at deliverEmail, it uses transport for external.
                        // Let's use the same logic here or just rely on a unified delivery method.

                        // If it's internal, we handle it separately.
                        const isInternal = mail.to_address.endsWith('@icomly.com');

                        if (isInternal) {
                            const username = mail.to_address.split('@')[0];
                            const maildir = `/var/mail/${username}/Maildir/new`;
                            if (!fs.existsSync(maildir)) fs.mkdirSync(maildir, { recursive: true });
                            const filename = path.join(maildir, `${Date.now()}.${Math.random().toString(36).slice(2)}.eml`);
                            fs.writeFileSync(filename, `From: ${mail.from_address}\nTo: ${mail.to_address}\nSubject: ${mail.subject}\n\n${mail.body}`);
                            
                            database.run('UPDATE mail_queue SET status = "sent" WHERE id = ?', [mail.id]);
                        } else {
                            // External delivery
                            const transport = nodemailer.createTransport({
                                host: process.env.SMTP_HOST || 'localhost',
                                port: parseInt(process.env.SMTP_PORT || '587', 10),
                                auth: {
                                    user: process.env.SMTP_USER,
                                    pass: process.env.SMTP_PASS
                                },
                                secure: false
                            });

                            await transport.sendMail({
                                from: mail.from_address,
                                to: mail.to_address,
                                subject: mail.subject,
                                html: mail.body.includes('<') ? mail.body : undefined,
                                text: mail.body.includes('<') ? undefined : mail.body
                            });

                            database.run('UPDATE mail_queue SET status = "sent" WHERE id = ?', [mail.id]);
                        }

                        logger.info('Queued email sent successfully', {
                            to: mail.to_address,
                            subject: mail.subject
                        });

                        // Small delay between sends to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 1000));
                        
                    } catch (error) {
                        logger.error('Error processing queued email:', { id: mail.id, error: error.message });
                        database.run(
                            'UPDATE mail_queue SET status = "pending", attempts = attempts + 1, error = ? WHERE id = ?',
                            [error.message, mail.id]
                        );
                    }
                }
            });
        }, 30000); // Check every 30 seconds
    }

    async handlePasswordReset(data) {
        const { recipient, token, expires } = data;
        if (!recipient || !token || !expires) {
            throw new Error('Invalid password reset data');
        }

        try {
            const from = '"Icomly - No Reply" <noreply@icomly.com>';
            const subject = this.templates.passwordReset.subject;
            const text = this.templates.passwordReset.createText(token);
            const html = this.templates.passwordReset.createHtml(token);

            await this.deliverEmail(from, recipient, subject, text, html);

            this.logger.info('Password reset email delivered successfully', {
                to: recipient,
                expires: new Date(expires).toISOString()
            });

            // Store in database...
        } catch (error) {
            this.logger.error('Error delivering password reset email:', error);
            throw error;
        }
    }
}

// Basic webmail router for Maildir access (demo only, not secure for production)
function createWebmailRouter() {
    const router = express.Router();
    const mailRoot = '/var/mail';

    // List emails for a user
    router.get('/webmail/:username', (req, res) => {
        const username = req.params.username.replace(/[^a-zA-Z0-9_-]/g, '');
        const userDir = path.join(mailRoot, username, 'Maildir', 'new');
        if (!fs.existsSync(userDir)) return res.status(404).json({ error: 'No mailbox found' });
        const files = fs.readdirSync(userDir).filter(f => f.endsWith('.eml'));
        res.json({ emails: files });
    });

    // Get email content
    router.get('/webmail/:username/:filename', (req, res) => {
        const username = req.params.username.replace(/[^a-zA-Z0-9_-]/g, '');
        const filename = req.params.filename.replace(/[^a-zA-Z0-9._-]/g, '');
        const filePath = path.join(mailRoot, username, 'Maildir', 'new', filename);
        if (!fs.existsSync(filePath)) return res.status(404).json({ error: 'Email not found' });
        const content = fs.readFileSync(filePath, 'utf8');
        res.type('text/plain').send(content);
    });

    return router;
}

module.exports = { EmailManager, createWebmailRouter };
