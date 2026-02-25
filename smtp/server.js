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

    // Subscriber Management
    app.post('/subscribe', (req, res) => {
        const { email, userName, preferences } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const prefs = JSON.stringify(preferences || { weekly_digest: true, gossip_updates: true });
        const dbConn = db();

        dbConn.run(
            `INSERT INTO subscribers (email, user_name, preferences, subscribed_at, unsubscribed_at) 
             VALUES (?, ?, ?, CURRENT_TIMESTAMP, NULL)
             ON CONFLICT(email) DO UPDATE SET 
                user_name = excluded.user_name,
                preferences = excluded.preferences,
                unsubscribed_at = NULL`,
            [email, userName, prefs],
            function(err) {
                if (err) {
                    logger.error('Error subscribing user:', err);
                    return res.status(500).json({ error: 'Failed to subscribe' });
                }
                res.json({ message: 'Subscribed successfully' });
            }
        );
    });

    app.post('/unsubscribe', (req, res) => {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email is required' });

        const dbConn = db();
        dbConn.run(
            'UPDATE subscribers SET unsubscribed_at = CURRENT_TIMESTAMP WHERE email = ?',
            [email],
            function(err) {
                if (err) {
                    logger.error('Error unsubscribing user:', err);
                    return res.status(500).json({ error: 'Failed to unsubscribe' });
                }
                res.json({ message: 'Unsubscribed successfully' });
            }
        );
    });

    // Broadcast endpoint for gossip updates or manual digests
    app.post('/broadcast', (req, res) => {
        const { type, subject, body, html, highlights } = req.body;
        if (!type || !subject) return res.status(400).json({ error: 'Type and subject are required' });

        const dbConn = db();
        const from = '"Icomly" <noreply@icomly.com>';

        // Get all active subscribers
        dbConn.all('SELECT email, user_name, preferences FROM subscribers WHERE unsubscribed_at IS NULL', [], async (err, subscribers) => {
            if (err) {
                logger.error('Error fetching subscribers:', err);
                return res.status(500).json({ error: 'Failed to fetch subscribers' });
            }

            logger.info(`Starting broadcast for ${subscribers.length} subscribers`);

            // Queue emails one by one
            for (const sub of subscribers) {
                try {
                    const prefs = JSON.parse(sub.preferences || '{}');
                    // Check if user has subscribed to this type of update
                    if (type === 'gossip_update' && prefs.gossip_updates === false) continue;
                    if (type === 'weekly_digest' && prefs.weekly_digest === false) continue;

                    let emailHtml = html;
                    let emailText = body;

                    if (type === 'weekly_digest') {
                        emailHtml = emailManager.templates.weeklyDigest.createHtml(sub.user_name || 'there', highlights || []);
                        emailText = emailManager.templates.weeklyDigest.createText(sub.user_name || 'there', highlights || []);
                    } else if (type === 'gossip_update') {
                        emailHtml = emailManager.templates.notification.createHtml(subject, body, req.body.link);
                        emailText = emailManager.templates.notification.createText(subject, body, req.body.link);
                    }

                    // We add to queue to process one by one
                    dbConn.run(
                        'INSERT INTO mail_queue (to_address, from_address, subject, body, status) VALUES (?, ?, ?, ?, ?)',
                        [sub.email, from, subject, emailHtml || emailText, 'pending']
                    );
                } catch (e) {
                    logger.error(`Error queueing broadcast email for ${sub.email}:`, e);
                }
            }

            res.json({ message: `Broadcast initiated for ${subscribers.length} potential recipients` });
        });
    });

    // HTTP endpoint for password reset requests (used by Backend)
    app.post('/send-email', async (req, res) => {
        try {
            const { type, recipient, code, expires, subject, body, html, userName, highlights, title, message, link } = req.body;
            const from = '"Icomly" <noreply@icomly.com>';

            // Handle Password Reset type
            if (type === 'password_reset') {
                if (!recipient || !code) {
                    return res.status(400).json({ error: 'Missing required fields for password_reset' });
                }
                await emailManager.handlePasswordReset({ recipient, token: code, expires });
                return res.json({ message: 'Password reset code sent successfully' });
            }

            // Handle Weekly Digest type
            if (type === 'weekly_digest') {
                if (!recipient || !userName) {
                    return res.status(400).json({ error: 'Missing required fields for weekly_digest' });
                }

                const digestSubject = emailManager.templates.weeklyDigest.subject;
                const digestHtml = emailManager.templates.weeklyDigest.createHtml(userName, highlights || []);
                const digestText = emailManager.templates.weeklyDigest.createText(userName, highlights || []);

                await emailManager.deliverEmail(from, recipient, digestSubject, digestText, digestHtml);
                return res.json({ message: 'Weekly digest sent successfully' });
            }

            // Handle Notification type
            if (type === 'notification') {
                if (!recipient || !title || !message) {
                    return res.status(400).json({ error: 'Missing required fields for notification' });
                }

                const notifSubject = subject || title;
                const notifHtml = emailManager.templates.notification.createHtml(title, message, link);
                const notifText = emailManager.templates.notification.createText(title, message, link);

                await emailManager.deliverEmail(from, recipient, notifSubject, notifText, notifHtml);
                return res.json({ message: 'Notification sent successfully' });
            }

            // Handle Generic type (Welcome, Alerts)
            if (type === 'generic') {
                if (!recipient || !subject || (!body && !html)) {
                    return res.status(400).json({ error: 'Missing required fields for generic email' });
                }
                await emailManager.deliverEmail(from, recipient, subject, body || '', html);
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
