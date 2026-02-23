require('dotenv').config();
const SMTPServer = require('smtp-server').SMTPServer;
const winston = require('winston');
const { EmailManager, createWebmailRouter } = require('./emailManager');
const { db, hashPassword } = require('./db');
const express = require('express');
const cors = require('cors');
const fs = require('fs');

// Configure logger
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
    ),
    transports: [
        new winston.transports.File({ filename: 'error.log', level: 'error' }),
        new winston.transports.File({ filename: 'combined.log' }),
        new winston.transports.Console({
            format: winston.format.simple()
        })
    ]
});

// Create Express app for handling HTTP requests
const app = express();
app.use(express.json());
app.use(cors());

// Wait for database to be initialized before starting servers
const startServers = async () => {
    // Wait for database to be ready
    let database;
    let retries = 0;
    const maxRetries = 10;

    while (!database && retries < maxRetries) {
        database = db();
        if (!database) {
            retries++;
            logger.info(`Waiting for database to initialize... (attempt ${retries}/${maxRetries})`);
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
    }

    if (!database) {
        logger.error('Failed to initialize database after maximum retries');
        process.exit(1);
    }

    // Initialize email manager
    const emailManager = new EmailManager(logger);

    // Start outgoing mail queue processor (using postfix sendmail)
    EmailManager.startQueueProcessor(logger);

    // Mount basic webmail router
    app.use('/webmail', createWebmailRouter());

    // Health Check
    app.get('/health', (req, res) => res.json({ status: 'ok' }));

    // HTTP endpoint for password reset requests (used by Backend)
    app.post('/send-email', async (req, res) => {
        try {
            const { type, recipient, code, expires, subject, body, html, userName, highlights } = req.body;

            // Handle Password Reset type
            if (type === 'password_reset') {
                if (!recipient || !code || !expires) {
                    return res.status(400).json({ error: 'Missing required fields for password_reset' });
                }
                const token = code; // map code to token
                await emailManager.handlePasswordReset({ recipient, token, expires });
                return res.json({ message: 'Password reset code sent successfully' });
            }

            // Handle Weekly Digest type
            if (type === 'weekly_digest') {
                if (!recipient || !userName) {
                    return res.status(400).json({ error: 'Missing required fields for weekly_digest' });
                }

                // Build digest HTML
                const highlightsList = highlights || [];
                let highlightsHtml = '';
                if (highlightsList.length === 0) {
                    highlightsHtml = '<p style="color: #9ca3af;">No major updates this week.</p>';
                } else {
                    highlightsHtml = '<ul style="color: #e0e0e0;">' +
                        highlightsList.map(h => `<li style="margin-bottom: 8px;"><strong style="color: #ff4081;">${h.celebName}</strong>: ${h.summary}</li>`).join('') +
                        '</ul>';
                }

                const digestSubject = 'Your Weekly Icomly Digest 📰';
                const digestHtml = `
                    <div style="font-family: Arial, sans-serif; padding: 20px; background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); border-radius: 10px;">
                        <h2 style="color: #ff4081;">📰 Weekly Digest for ${userName}</h2>
                        <p style="color: #e0e0e0;">Here's what happened this week with the celebrities you follow:</p>
                        ${highlightsHtml}
                        <br/>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" 
                           style="background: linear-gradient(135deg, #6366f1 0%, #a855f7 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                           View Full Details
                        </a>
                    </div>
                `;

                const from = '"Icomly" <noreply@icomly.com>';
                await emailManager.deliverEmail(from, recipient, digestSubject, digestHtml, digestHtml);
                return res.json({ message: 'Weekly digest sent successfully' });
            }

            // Handle Generic type (Welcome, Alerts)
            if (type === 'generic') {
                if (!recipient || !subject || !body) {
                    return res.status(400).json({ error: 'Missing required fields for generic email' });
                }
                const from = '"Icomly" <noreply@icomly.com>';
                await emailManager.deliverEmail(from, recipient, subject, body, html);
                return res.json({ message: 'Email sent successfully' });
            }

            return res.status(400).json({ error: 'Invalid email type' });

        } catch (error) {
            logger.error('Error handling send-email request:', error);
            res.status(500).json({ error: 'Failed to send email' });
        }
    });

    // Start HTTP server
    const HTTP_PORT = process.env.HTTP_PORT || 3025;
    app.listen(HTTP_PORT, '0.0.0.0', () => {
        logger.info(`HTTP Server running on port ${HTTP_PORT}`);
    });

    // SMTP Server configuration
    const smtpOptions = {
        secure: false, // false enables STARTTLS
        name: 'icomly.com',
        banner: 'Welcome to Icomly SMTP Server',
        size: 10 * 1024 * 1024, // Max message size 10MB
        authOptional: true, // Allow auth optional for internal relay
        allowInsecureAuth: true, // Allow authentication over non-TLS connections

        // Handle incoming emails
        onData(stream, session, callback) {
            let emailData = {
                body: '',
                subject: ''
            };

            stream.on('data', (chunk) => {
                emailData.body += chunk;
            });

            stream.on('end', async () => {
                try {
                    // Extract subject from email data if present
                    const subjectMatch = emailData.body.match(/Subject: (.*)\r\n/);
                    if (subjectMatch) {
                        emailData.subject = subjectMatch[1];
                    }

                    await emailManager.handleIncomingEmail(session, emailData);
                    callback();
                } catch (error) {
                    logger.error('Error processing email:', error);
                    callback(error);
                }
            });
        },

        onConnect(session, callback) {
            logger.info('New connection:', {
                remoteAddress: session.remoteAddress,
                clientHostname: session.clientHostname
            });
            callback();
        },

        onRcptTo(address, session, callback) {
            // Simplified check for now - accept all to handle forwarding/relay logic later
            // Real logic should use emailManager.isSystemAddress() etc.
            callback();
        },

        async onAuth(auth, session, callback) {
            // Allow simple auth for now
            callback(null, { user: auth.username });
        }
    };

    // Add TLS key/cert if provided
    if (process.env.SMTP_TLS_KEY && process.env.SMTP_TLS_CERT) {
        if (fs.existsSync(process.env.SMTP_TLS_KEY) && fs.existsSync(process.env.SMTP_TLS_CERT)) {
            smtpOptions.key = fs.readFileSync(process.env.SMTP_TLS_KEY);
            smtpOptions.cert = fs.readFileSync(process.env.SMTP_TLS_CERT);
        }
    }
    const server = new SMTPServer(smtpOptions);

    const SMTP_PORT = process.env.SMTP_PORT_INTERNAL || 2525;
    // Listen on all interfaces
    server.listen(SMTP_PORT, '0.0.0.0', () => {
        logger.info(`SMTP Server running on port ${SMTP_PORT}`);
    });

    // Error handling
    server.on('error', err => {
        logger.error('SMTP Server error:', err);
    });
};

// Start the servers
startServers().catch(err => {
    logger.error('Failed to start servers:', err);
    process.exit(1);
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
    logger.error('Uncaught Exception:', err);
    process.exit(1);
});
