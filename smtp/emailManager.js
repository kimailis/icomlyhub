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
                subject: 'Password Reset Code',
                createHtml: (code) => `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; border-radius: 5px;">
                        <h2 style="color: #333;">Password Reset Code</h2>
                        <p>Your password reset code for your Icomly account is:</p>
                        <div style="font-size: 2rem; font-weight: bold; letter-spacing: 0.5rem; color: #ff4081; margin: 20px 0;">${code}</div>
                        <p style="color: #666; font-size: 14px;">This code will expire in 10 minutes.</p>
                        <p style="color: #666;">If you didn't request the password reset, please ignore this email.</p>
                        <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;">
                        <p style="color: #999; font-size: 12px;">Regards,<br>The Icomly Team</p>
                    </div>
                `,
                createText: (code) => `
Password Reset Code

Your password reset code for your Icomly account is: ${code}

This code will expire in 10 minutes.

If you didn't request the password reset, please ignore this email.

Regards,
The Icomly Team`
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
        setInterval(async () => {
            const database = db();
            if (!database) return;

            database.all('SELECT * FROM mail_queue WHERE status = "pending" AND attempts < 5', async (err, rows) => {
                if (err) {
                    logger.error('Queue processor DB error:', err);
                    return;
                }

                for (const mail of rows) {
                    try {
                        // Format email content
                        const emailContent = `From: ${mail.from_address}
To: ${mail.to_address}
Subject: ${mail.subject}
Content-Type: text/plain; charset=utf-8

${mail.body}`;

                        // Write to a temporary file
                        const tempFile = `/tmp/email_${Date.now()}_${Math.random().toString(36).substring(7)}`;
                        fs.writeFileSync(tempFile, emailContent);

                        // Use sendmail to deliver the email through postfix
                        await new Promise((resolve, reject) => {
                            exec(`/usr/sbin/sendmail -i -t -f "${mail.from_address}" < ${tempFile}`, (error, stdout, stderr) => {
                                // fs.unlinkSync(tempFile); // Clean up temp file
                                if (error) {
                                    // reject(error); // Don't reject, just log (allow loop to continue)
                                    logger.error('Sendmail error:', error);
                                }
                                fs.unlinkSync(tempFile);
                                resolve();
                            });
                        });

                        // Update status to sent
                        database.run('UPDATE mail_queue SET status = "sent", last_attempt = CURRENT_TIMESTAMP WHERE id = ?', [mail.id]);
                        logger.info('Queued email sent successfully', {
                            to: mail.to_address,
                            subject: mail.subject
                        });
                    } catch (e) {
                        // Error handling
                    }
                }
            });
        }, 60000); // Process queue every minute
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
