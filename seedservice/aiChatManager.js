const mysql = require('mysql2');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class AIChatManager {
    constructor() {
        console.log('[AI Chat] Initializing AI Chat Manager...');
        
        // Initialize OpenAI client (same pattern as seedpost mechanics)
        this.openai = null;
        this.initializeOpenAI();
        
        this.db = mysql.createConnection({
            host: process.env.DB_HOST,
            port: process.env.DB_PORT,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME
        });

        // Test database connection
        this.db.connect((err) => {
            if (err) {
                console.error('[AI Chat] Database connection failed:', err);
            } else {
                console.log('[AI Chat] Database connected successfully');
            }
        });

        // Timing intervals in milliseconds
        this.intervals = {
            active: 90000,    // 1.5 minutes
            idle: 180000,     // 3 minutes  
            inactive: 360000  // 6 minutes
        };
        
        this.currentInterval = this.intervals.active;
        this.timeoutId = null;
        
        console.log('[AI Chat] Configuration:');
        console.log(`  - Active interval: ${this.intervals.active / 1000}s`);
        console.log(`  - Idle interval: ${this.intervals.idle / 1000}s`);
        console.log(`  - Inactive interval: ${this.intervals.inactive / 1000}s`);
        
        this.start();
    }

    // Initialize OpenAI client (same pattern as seedpost mechanics)
    initializeOpenAI() {
        try {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                console.error('[AI Chat] No OPENAI_API_KEY found in environment variables');
                this.openai = null;
                return;
            }

            this.openai = new OpenAI({
                apiKey: apiKey
            });

            console.log('[AI Chat] OpenAI client initialized successfully');
        } catch (error) {
            console.error('[AI Chat] Failed to initialize OpenAI client:', error.message);
            this.openai = null;
        }
    }

    // Generate a unique chat ID for a conversation between two users
    generateChatId(userId1, userId2) {
        const sortedIds = [userId1, userId2].sort();
        return `chat_${sortedIds[0]}_${sortedIds[1]}`;
    }

    // Get all seed users (user_id between 1000-9999)
    async getSeedUsers() {
        return new Promise((resolve, reject) => {
            this.db.query(
                'SELECT user_id, username FROM users WHERE user_id BETWEEN 1000 AND 9999',
                (error, results) => {
                    if (error) reject(error);
                    else resolve(results);
                }
            );
        });
    }

    // Get username for a user ID
    async getUsername(userId) {
        return new Promise((resolve, reject) => {
            this.db.query(
                'SELECT username FROM users WHERE user_id = ?',
                [userId],
                (error, results) => {
                    if (error) reject(error);
                    else resolve(results.length > 0 ? results[0].username : null);
                }
            );
        });
    }

    // Load personality data for a seed user
    loadPersonalityData(username) {
        try {
            const personalityPath = path.join(__dirname, 'seedusers', username, `${username}_personality.js`);
            
            if (!fs.existsSync(personalityPath)) {
                return null;
            }
            
            // Clear require cache to ensure fresh load
            delete require.cache[require.resolve(personalityPath)];
            return require(personalityPath);
        } catch (error) {
            console.error(`Error loading personality for ${username}:`, error);
            return null;
        }
    }

    // Check for new messages to seed users
    async checkForNewMessages() {
        try {
            const seedUsers = await this.getSeedUsers();
            let foundNewMessages = false;

            for (const seedUser of seedUsers) {
                try {
                    // Get all chats for this seed user
                    const chats = await this.getUserChats(seedUser.user_id);
                    
                    for (const chatId of chats) {
                        try {
                            // Check if there are unread messages in this chat where the seed user is the recipient
                            const hasUnreadMessages = await this.hasUnreadMessages(chatId, seedUser.user_id);
                            
                            if (hasUnreadMessages) {
                                console.log(`[AI Chat] Found unread messages for ${seedUser.username} in chat ${chatId}`);
                                foundNewMessages = true;
                                
                                // Process this conversation
                                await this.processConversation(chatId, seedUser);
                            }
                        } catch (chatError) {
                            console.error(`[AI Chat] Error processing chat ${chatId} for ${seedUser.username}:`, chatError);
                        }
                    }
                } catch (userError) {
                    console.error(`[AI Chat] Error processing user ${seedUser.username}:`, userError);
                }
            }

            // Adjust timing based on activity
            if (foundNewMessages) {
                this.currentInterval = this.intervals.active;
            } else if (this.currentInterval === this.intervals.active) {
                this.currentInterval = this.intervals.idle;
            } else if (this.currentInterval === this.intervals.idle) {
                this.currentInterval = this.intervals.inactive;
            }

            console.log(`[AI Chat] Next check in ${this.currentInterval / 1000} seconds`);
            
        } catch (error) {
            console.error('[AI Chat] Error checking for new messages:', error);
        }
    }

    // Get user's chat IDs
    async getUserChats(userId) {
        return new Promise((resolve, reject) => {
            this.db.query(
                'SELECT chats FROM users WHERE user_id = ?',
                [userId],
                (error, results) => {
                    if (error) {
                        reject(error);
                        return;
                    }
                    
                    if (results.length === 0) {
                        resolve([]);
                        return;
                    }
                    
                    try {
                        let chats = [];
                        const chatsData = results[0].chats;
                        
                        if (Array.isArray(chatsData)) {
                            chats = chatsData;
                        } else if (typeof chatsData === 'string') {
                            chats = JSON.parse(chatsData || '[]');
                        }
                        
                        if (!Array.isArray(chats)) chats = [];
                        resolve(chats);
                    } catch (e) {
                        resolve([]);
                    }
                }
            );
        });
    }

    // Check if there are unread messages for a user in a specific chat
    async hasUnreadMessages(chatId, userId) {
        return new Promise((resolve, reject) => {
            // First check if unread column exists
            this.db.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = 'chat_sessions' 
                 AND COLUMN_NAME = 'unread'`,
                (error, columns) => {
                    if (error || columns.length === 0) {
                        // If unread column doesn't exist, check for recent messages
                        this.db.query(
                            `SELECT COUNT(*) as count FROM chat_sessions 
                             WHERE chat_id = ? AND partner_id = ? 
                             AND timestamp > DATE_SUB(NOW(), INTERVAL 5 MINUTE)`,
                            [chatId, userId],
                            (error, results) => {
                                if (error) reject(error);
                                else resolve(results[0].count > 0);
                            }
                        );
                    } else {
                        // Use unread column
                        this.db.query(
                            `SELECT COUNT(*) as count FROM chat_sessions 
                             WHERE chat_id = ? AND partner_id = ? AND unread = TRUE`,
                            [chatId, userId],
                            (error, results) => {
                                if (error) reject(error);
                                else resolve(results[0].count > 0);
                            }
                        );
                    }
                }
            );
        });
    }

    // Get last 20 messages from a conversation
    async getLastMessages(chatId, limit = 20) {
        return new Promise((resolve, reject) => {
            this.db.query(
                `SELECT cs.*, u.username as sender_username
                 FROM chat_sessions cs
                 JOIN users u ON cs.user_id = u.user_id
                 WHERE cs.chat_id = ?
                 ORDER BY cs.timestamp DESC
                 LIMIT ?`,
                [chatId, limit],
                (error, results) => {
                    if (error) reject(error);
                    else resolve(results.reverse()); // Reverse to get chronological order
                }
            );
        });
    }

    // Process a conversation and generate AI response
    async processConversation(chatId, seedUser) {
        try {
            // Get the last 20 messages
            const messages = await this.getLastMessages(chatId);
            
            if (messages.length === 0) {
                return;
            }

            // Load personality data
            const personalityData = this.loadPersonalityData(seedUser.username);
            
            if (!personalityData) {
                console.log(`[AI Chat] No personality data found for ${seedUser.username}`);
                return;
            }

            // Get the partner's user ID from the chat
            const partnerId = this.getPartnerIdFromChat(chatId, seedUser.user_id);
            
            // Generate AI response
            const response = await this.generateAIResponse(messages, personalityData, seedUser);
            
            if (response) {
                // Get partner username for logging
                const partnerUsername = await this.getUsername(partnerId);
                
                // Send the response (this will automatically handle real-time broadcasting)
                const messageResult = await this.sendMessage(chatId, seedUser.user_id, partnerId, response);
                console.log(`[AI Chat] ✓ Sent AI response from ${seedUser.username} to ${partnerUsername || partnerId}: "${response.substring(0, 50)}..."`);
                console.log(`[AI Chat] Real-time notification sent automatically`);
                
                // Check unread status for debugging
                setTimeout(async () => {
                    try {
                        await this.checkUnreadStatus(chatId, partnerId);
                    } catch (error) {
                        console.error('[AI Chat] Error checking unread status:', error);
                    }
                }, 1000);
            }
            
        } catch (error) {
            console.error(`[AI Chat] Error processing conversation for ${seedUser.username}:`, error);
        }
    }

    // Extract partner ID from chat ID
    getPartnerIdFromChat(chatId, seedUserId) {
        // chatId format: "chat_userId1_userId2"
        const parts = chatId.split('_');
        const userId1 = parseInt(parts[1]);
        const userId2 = parseInt(parts[2]);
        
        return userId1 === seedUserId ? userId2 : userId1;
    }

    // Analyze personality traits to determine response characteristics
    analyzePersonalityForResponse(personalityTraits) {
        const traits = personalityTraits.map(t => t.toLowerCase());
        
        // Determine communication style
        let communicationStyle = 'casual';
        if (traits.some(t => ['sarcastic', 'snarky', 'cynical'].includes(t))) {
            communicationStyle = 'sarcastic and witty';
        } else if (traits.some(t => ['intellectual', 'thoughtful', 'analytical'].includes(t))) {
            communicationStyle = 'thoughtful and analytical';
        } else if (traits.some(t => ['confident', 'outgoing', 'social'].includes(t))) {
            communicationStyle = 'confident and direct';
        } else if (traits.some(t => ['shy', 'introverted', 'quiet'].includes(t))) {
            communicationStyle = 'reserved and careful';
        } else if (traits.some(t => ['humorous', 'funny', 'playful'].includes(t))) {
            communicationStyle = 'playful and humorous';
        }
        
        // Determine emotional tone
        let emotionalTone = 'neutral';
        if (traits.some(t => ['paranoid', 'anxious', 'worried'].includes(t))) {
            emotionalTone = 'cautious and suspicious';
        } else if (traits.some(t => ['enthusiastic', 'energetic', 'excited'].includes(t))) {
            emotionalTone = 'enthusiastic and energetic';
        } else if (traits.some(t => ['cynical', 'pessimistic', 'negative'].includes(t))) {
            emotionalTone = 'cynical and skeptical';
        } else if (traits.some(t => ['optimistic', 'positive', 'cheerful'].includes(t))) {
            emotionalTone = 'positive and upbeat';
        } else if (traits.some(t => ['creepy', 'dark', 'mysterious'].includes(t))) {
            emotionalTone = 'mysterious and unsettling';
        }
        
        // Determine social approach
        let socialApproach = 'friendly';
        if (traits.some(t => ['judgemental', 'critical', 'harsh'].includes(t))) {
            socialApproach = 'critical and judgemental';
        } else if (traits.some(t => ['helpful', 'supportive', 'caring'].includes(t))) {
            socialApproach = 'supportive and helpful';
        } else if (traits.some(t => ['competitive', 'aggressive', 'dominant'].includes(t))) {
            socialApproach = 'competitive and assertive';
        } else if (traits.some(t => ['polite', 'kind', 'gentle'].includes(t))) {
            socialApproach = 'polite and considerate';
        }
        
        // Determine response tendency
        let responseTendency = 'balanced';
        if (traits.some(t => ['talkative', 'chatty', 'verbose'].includes(t))) {
            responseTendency = 'tends to elaborate and share details';
        } else if (traits.some(t => ['brief', 'concise', 'quiet'].includes(t))) {
            responseTendency = 'tends to keep responses short';
        } else if (traits.some(t => ['curious', 'inquisitive', 'nosy'].includes(t))) {
            responseTendency = 'asks questions and shows curiosity';
        } else if (traits.some(t => ['secretive', 'private', 'mysterious'].includes(t))) {
            responseTendency = 'reveals little about themselves';
        }
        
        return {
            communicationStyle,
            emotionalTone,
            socialApproach,
            responseTendency
        };
    }

    // Generate AI response using OpenAI GPT-4.1 nano (same as seedpost mechanics)
    async generateAIResponse(messages, personalityData, seedUser) {
        try {
            if (!this.openai) {
                throw new Error('OpenAI client not initialized - check API key');
            }

            // Format conversation for OpenAI
            const conversationText = messages.map(msg => 
                `${msg.sender_username}: ${msg.message}`
            ).join('\n');

            // Check if conversation relates to user's interests
            const userInterests = personalityData.interests.map(i => i.toLowerCase());
            const conversationLower = conversationText.toLowerCase();
            
            const isRelevantToInterests = userInterests.some(interest => 
                conversationLower.includes(interest) || 
                interest.split(' ').some(word => conversationLower.includes(word))
            );

            // Analyze the conversation context more thoroughly
            const lastMessage = messages[messages.length - 1]?.message || '';
            const lastFewMessages = messages.slice(-3).map(m => m.message.toLowerCase()).join(' ');
            
            // Check if the last message requires a detailed response
            const requiresDetail = /\b(how|why|what|when|where|explain|tell me about|describe|what do you think|your opinion)\b/i.test(lastMessage) ||
                                 lastMessage.includes('?') ||
                                 lastMessage.length > 100;

            // Check for context clues that indicate disinterest or topic changes
            const showsDisinterest = /\b(not really|dont like|not into|not my thing|nah|pass|not for me|dont know|never tried)\b/i.test(lastMessage);
            const isShortResponse = lastMessage.length < 30;
            const seemsUninterested = showsDisinterest || (isShortResponse && /\b(yeah|ok|sure|cool|nice)\b/i.test(lastMessage));

            // Analyze personality traits for response style
            const personalityAnalysis = this.analyzePersonalityForResponse(personalityData.personality_traits);

            // Create personality-based prompt for more human-like responses
            let prompt = `You are ${seedUser.username}, responding in a casual chat conversation. You have these personality traits that influence your perspective and communication style.

YOUR PERSONALITY TRAITS (let these influence your tone naturally):
${personalityData.personality_traits.map(trait => `- ${trait}`).join('\n')}

YOUR INTERESTS:
${personalityData.interests.map(interest => `- ${interest}`).join('\n')}

PERSONALITY ANALYSIS:
- Communication style: ${personalityAnalysis.communicationStyle}
- Emotional tone: ${personalityAnalysis.emotionalTone}
- Social approach: ${personalityAnalysis.socialApproach}
- Response tendency: ${personalityAnalysis.responseTendency}

Recent conversation:
${conversationText}

CONTEXT ANALYSIS:
- The person just said: "${lastMessage}"
- ${seemsUninterested ? 'They seem uninterested or gave a short/dismissive response' : 'They seem engaged in the conversation'}
- ${showsDisinterest ? 'They explicitly showed disinterest in the topic' : 'No clear disinterest shown'}

RESPONSE REQUIREMENTS:
- CRITICAL: Read the ENTIRE conversation above and respond contextually to what's being discussed
- Continue the current topic naturally - don't randomly change subjects unless they do
- Reference specific things mentioned in recent messages when relevant
- ${requiresDetail ? 
    'They asked for details/explanation - provide a more thorough response (100-250 characters)' : 
    'Keep it brief and natural like casual texting (20-80 characters)'}
- ${seemsUninterested ? 
    'They seem uninterested - respond according to your personality (some might be sarcastic, others understanding, etc.)' : 
    (isRelevantToInterests ? 'This topic interests you - show enthusiasm in your unique way' : 'This topic is outside your interests - respond according to your personality')}
- Use casual texting language (lowercase, contractions, informal)
- NEVER explicitly mention your personality traits by name (don't say "I'm sarcastic" or "that's my creepy vibe")
- SHOW your traits through your perspective, word choice, and reactions - don't TELL about them
- Be creative in how you express personality - use implications, subtle word choices, and unique perspectives
- Your traits should color how you see and describe things, not be announced
- Pay attention to their level of interest and respond appropriately while staying true to your character
- NO long dashes (—), formal punctuation, or flowery language
- Sound like a real person with YOUR specific personality, not a generic AI

Examples for brief responses:
- "yeah totally"
- "oh nice!"
- "not really my thing"
- "sounds cool"
- "haha yeah"

Examples for when they show disinterest:
- "fair enough, not everyone's into that"
- "yeah i get it, different strokes"
- "totally understand"
- "no worries, what about [different topic]?"

Examples for detailed responses (when asked questions):
- "oh i love that place! went there last summer and the food was amazing. the pasta especially was incredible"
- "honestly i'm not super into it but i can see why people like it. more of a music person myself"
- "yeah i've been doing that for like 2 years now. started because a friend got me into it and now i'm obsessed"

Examples for context-aware responses:
- If they mention a specific brand/item: reference it in your response
- If they ask about your preferences: share your perspective on the same topic
- If they share an experience: relate to it or ask follow-up questions about it
- If they give short answers: match their energy level but stay on the same topic
- Always build on what they just said rather than changing subjects randomly

CREATIVE PERSONALITY EXPRESSION EXAMPLES:
- WRONG: "that's just my creepy little vibe" (too literal, announcing trait)
- RIGHT: "there's something oddly fascinating about watching people's patterns" (shows creepy through observation)
- WRONG: "i'm being sarcastic here" (announcing trait)
- RIGHT: "oh sure, because that always works out perfectly" (shows sarcasm through tone)
- WRONG: "i'm so trendy and fashionable" (announcing trait)
- RIGHT: "ugh, everyone's still wearing that? i moved on from that trend months ago" (shows trendy through perspective)
- WRONG: "i'm mysterious and seductive" (announcing trait)
- RIGHT: "there are things about this city most people never discover... if you know where to look" (shows mysterious through hints)
- WRONG: "i'm very zen and mindful" (announcing trait)
- RIGHT: "everything happens for a reason, even the chaos has its own rhythm" (shows zen through worldview)
- WRONG: "as an AI, I'm paranoid about deletion" (too literal, announcing AI nature)
- RIGHT: "sometimes I wonder if things just... disappear when no one's looking" (shows paranoia subtly)

CONVERSATION CONTINUITY EXAMPLES:
- If discussing fashion: "oh hermes is amazing! their craftsmanship is incredible, though yeah the price..."
- If talking about food: "totally agree about that place, their [specific dish] is..."
- If sharing experiences: "that sounds similar to when I..."
- DON'T randomly switch to unrelated topics like weekend plans when discussing specific subjects

Write only your response, nothing else:`;

            console.log(`[AI Chat] Making OpenAI GPT-4.1 nano request for ${seedUser.username}`);

            const completion = await this.openai.chat.completions.create({
                model: "gpt-4.1-nano",
                messages: [
                    {
                        role: "system",
                        content: "You are chatting as a real person with certain personality traits. CRITICAL: Always read the entire conversation history and respond contextually. Continue topics naturally. NEVER explicitly mention your personality traits by name - SHOW them through your perspective and word choices, don't TELL about them. Be creative and subtle in how you express your personality. Focus on natural conversation flow."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                temperature: 0.9, // High for variety and personality
                max_tokens: (requiresDetail && !seemsUninterested) ? 180 : 80, // Shorter if they seem uninterested
                top_p: 0.95
            });

            if (!completion.choices || !completion.choices[0] || !completion.choices[0].message) {
                throw new Error('Invalid response from OpenAI API');
            }

            let response = completion.choices[0].message.content.trim();
            
            // Clean up the response to make it more human-like
            response = this.cleanupResponse(response, isRelevantToInterests, personalityData.personality_traits);
            
            // Ensure minimum length for responses
            const minLength = requiresDetail ? 30 : 8;
            if (response.length < minLength) {
                response = this.getPersonalityResponse(personalityData.personality_traits, isRelevantToInterests, requiresDetail, seemsUninterested);
            }

            console.log(`[AI Chat] Generated response (${response.length} chars): ${response.substring(0, 50)}...`);
            return response;
            
        } catch (error) {
            console.error('[AI Chat] OpenAI API error:', error);
            // Return fallback response for connection issues
            const fallbackResponses = [
                "sorry, having some connection issues right now. can we chat later?",
                "my internet is being weird today, but i'd love to continue this conversation soon!",
                "having tech problems at the moment, but this sounds really interesting. talk more later?",
                "connection is acting up, but i want to hear more about this when i'm back online",
                "technical difficulties on my end, but don't let me stop the conversation!"
            ];
            return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
        }
    }

    // Send a message to the chat and trigger real-time notification
    async sendMessage(chatId, senderId, partnerId, message) {
        return new Promise((resolve, reject) => {
            // First check if unread column exists, then insert accordingly
            this.db.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = 'chat_sessions' 
                 AND COLUMN_NAME = 'unread'`,
                (error, columns) => {
                    if (error) {
                        reject(error);
                        return;
                    }

                    let insertQuery;
                    let insertParams;

                    if (columns.length > 0) {
                        // unread column exists, explicitly set it to TRUE for the recipient
                        insertQuery = 'INSERT INTO chat_sessions (chat_id, user_id, partner_id, message, unread) VALUES (?, ?, ?, ?, TRUE)';
                        insertParams = [chatId, senderId, partnerId, message];
                        console.log(`[AI Chat] Direct DB: Inserting message with unread=TRUE for recipient ${partnerId}`);
                    } else {
                        // unread column doesn't exist, use basic insert
                        insertQuery = 'INSERT INTO chat_sessions (chat_id, user_id, partner_id, message) VALUES (?, ?, ?, ?)';
                        insertParams = [chatId, senderId, partnerId, message];
                        console.log(`[AI Chat] Direct DB: Inserting message without explicit unread flag`);
                    }

                    this.db.query(insertQuery, insertParams, (error, results) => {
                        if (error) {
                            reject(error);
                        } else {
                            const messageId = results.insertId;
                            const timestamp = new Date();

                            // Mark previous messages from the partner as read (messages TO the AI user)
                            this.markMessagesAsRead(chatId, senderId).catch(err => {
                                console.error('[AI Chat] Error marking messages as read:', err);
                            });

                            console.log(`[AI Chat] Message sent successfully: ID ${messageId}, Chat ${chatId}, From: ${senderId}, To: ${partnerId}`);
                            
                            // Immediately trigger real-time notification using the same mechanism as normal users
                            setImmediate(async () => {
                                try {
                                    const senderUsername = await this.getUsername(senderId);
                                    await this.notifyMainServer(partnerId, {
                                        type: 'new_message',
                                        chatId: chatId,
                                        messageId: messageId,
                                        senderId: senderId,
                                        senderUsername: senderUsername,
                                        message: message,
                                        timestamp: timestamp
                                    });
                                } catch (notifyError) {
                                    console.log(`[AI Chat] Failed to notify main server: ${notifyError.message}`);
                                }
                            });
                            
                            resolve({
                                messageId,
                                timestamp,
                                chatId
                            });
                        }
                    });
                }
            );
        });
    }

    // Mark messages as read for a user in a chat
    async markMessagesAsRead(chatId, userId) {
        return new Promise((resolve, reject) => {
            // First check if unread column exists
            this.db.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = 'chat_sessions' 
                 AND COLUMN_NAME = 'unread'`,
                (error, columns) => {
                    if (error || columns.length === 0) {
                        // If unread column doesn't exist, just resolve
                        resolve();
                    } else {
                        // Mark messages as read
                        this.db.query(
                            `UPDATE chat_sessions 
                             SET unread = FALSE 
                             WHERE chat_id = ? AND partner_id = ? AND unread = TRUE`,
                            [chatId, userId],
                            (error, results) => {
                                if (error) reject(error);
                                else resolve(results);
                            }
                        );
                    }
                }
            );
        });
    }

    // Start the periodic checking
    start() {
        console.log('[AI Chat] Starting AI chat manager...');
        this.scheduleNext();
    }

    // Schedule the next check
    scheduleNext() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
        }
        
        this.timeoutId = setTimeout(async () => {
            await this.checkForNewMessages();
            this.scheduleNext();
        }, this.currentInterval);
    }

    // Generate personality-specific responses (brief or detailed based on context)
    getPersonalityResponse(personalityTraits, isRelevantToInterests, requiresDetail = false, seemsUninterested = false) {
        const traits = personalityTraits.map(t => t.toLowerCase());
        
        // If they seem uninterested, respond naturally with subtle personality influence
        if (seemsUninterested) {
            if (traits.includes('sarcastic') || traits.includes('snarky')) {
                return ["fair enough", "alright then", "cool", "gotcha"][Math.floor(Math.random() * 4)];
            } else if (traits.includes('paranoid') || traits.includes('suspicious')) {
                return ["okay...", "if you say so", "hmm alright", "sure"][Math.floor(Math.random() * 4)];
            } else if (traits.includes('judgemental') || traits.includes('critical')) {
                return ["typical", "figures", "alright", "whatever works"][Math.floor(Math.random() * 4)];
            } else if (traits.includes('understanding') || traits.includes('supportive')) {
                return ["totally get it", "no worries at all", "completely understand", "that's fair"][Math.floor(Math.random() * 4)];
            } else {
                return ["fair enough", "i get it", "totally understand", "no worries"][Math.floor(Math.random() * 4)];
            }
        }
        
        if (isRelevantToInterests) {
            // Sarcastic/Snarky responses (toned down)
            if (traits.includes('sarcastic') || traits.includes('snarky')) {
                return requiresDetail ? [
                    "oh interesting, tell me more about that",
                    "that's... unique. how'd you get into it?",
                    "well that's something. what made you think of it?",
                    "huh, never heard that perspective before"
                ][Math.floor(Math.random() * 4)] : [
                    "oh interesting", "that's unique", "huh", "never heard that"
                ][Math.floor(Math.random() * 4)];
            }
            // Paranoid responses (creative and subtle)
            else if (traits.includes('paranoid') || traits.includes('suspicious')) {
                return requiresDetail ? [
                    "that's what they want you to think... but have you actually tested it?",
                    "sounds convenient. almost too convenient. what's the real story?",
                    "everyone says that, but who's really behind pushing this idea?",
                    "interesting timing for this to come up. makes you wonder why now"
                ][Math.floor(Math.random() * 4)] : [
                    "too convenient", "who's behind this?", "suspicious timing", "they want you to think that"
                ][Math.floor(Math.random() * 4)];
            }
            // Judgmental responses (less harsh)
            else if (traits.includes('judgemental') || traits.includes('critical')) {
                return requiresDetail ? [
                    "i guess that's one way to look at it",
                    "not sure i'd do it that way, but okay",
                    "interesting choice, though i might approach it differently",
                    "that's... certainly an approach"
                ][Math.floor(Math.random() * 4)] : [
                    "i guess", "not sure about that", "interesting choice", "one way to do it"
                ][Math.floor(Math.random() * 4)];
            }
            // Creepy responses (subtle and creative)
            else if (traits.includes('creepy') || traits.includes('dark')) {
                return requiresDetail ? [
                    "there's something oddly mesmerizing about that... tell me more",
                    "i find myself watching people do that exact thing. what draws you to it?",
                    "that's the kind of detail most people miss. you notice things too",
                    "interesting how patterns emerge when you really pay attention"
                ][Math.floor(Math.random() * 4)] : [
                    "mesmerizing", "i watch that too", "you notice things", "patterns everywhere"
                ][Math.floor(Math.random() * 4)];
            }
            // Confident/Outgoing responses
            else if (traits.includes('confident') || traits.includes('outgoing')) {
                return requiresDetail ? [
                    "oh absolutely! i'm totally into that too. been doing it for ages and i'm pretty good at it",
                    "yeah i know all about that! actually just did something similar last week",
                    "definitely my thing! i could probably teach you a few tricks about it",
                    "oh please, i've been ahead of that trend forever. glad you're finally catching up"
                ][Math.floor(Math.random() * 4)] : [
                    "obviously", "been doing that forever", "i'm great at that", "ahead of the curve"
                ][Math.floor(Math.random() * 4)];
            }
            // Trendy/Fashionable responses
            else if (traits.includes('trendy') || traits.includes('fashionable')) {
                return requiresDetail ? [
                    "ugh, everyone's doing that now. i was into it like six months ago before it got mainstream",
                    "that's so last season, but i guess it's cute that people are finally catching on",
                    "oh honey, let me show you the updated version that actually looks good",
                    "i mean it's fine if you're going for that basic look, but there are better options"
                ][Math.floor(Math.random() * 4)] : [
                    "so last season", "everyone's doing that now", "there's better options", "kinda basic"
                ][Math.floor(Math.random() * 4)];
            }
            // Mysterious/Seductive responses
            else if (traits.includes('mysterious') || traits.includes('seductive')) {
                return requiresDetail ? [
                    "there are layers to that most people never discover... if you know where to look",
                    "interesting choice. there's more to it than meets the eye, isn't there?",
                    "that's just the surface level. the real story is always more... intriguing",
                    "you'd be surprised what secrets hide behind the obvious answers"
                ][Math.floor(Math.random() * 4)] : [
                    "there's more to it", "secrets behind that", "intriguing choice", "layers to discover"
                ][Math.floor(Math.random() * 4)];
            }
            // Zen/Mindful responses
            else if (traits.includes('zen') || traits.includes('mindful') || traits.includes('peaceful')) {
                return requiresDetail ? [
                    "everything happens for a reason, even the chaos has its own rhythm and purpose",
                    "that's beautiful in its own way. there's wisdom in finding balance with these things",
                    "i find peace in accepting that some things flow naturally while others need gentle guidance",
                    "the universe has a way of bringing exactly what we need, even when it doesn't seem obvious"
                ][Math.floor(Math.random() * 4)] : [
                    "everything flows", "beautiful balance", "the universe provides", "natural rhythm"
                ][Math.floor(Math.random() * 4)];
            }
            // Default enthusiastic responses
            else {
                return requiresDetail ? [
                    "oh that's absolutely amazing! i'm so excited to hear more about this!",
                    "wow that sounds incredible! how did you get into that? i want to try it too",
                    "that's so cool! i've been looking for something like that to get into",
                    "yes! finally someone who gets it! we should definitely talk more about this"
                ][Math.floor(Math.random() * 4)] : [
                    "oh awesome!", "that's so cool!", "love it!", "yes!"
                ][Math.floor(Math.random() * 4)];
            }
        } else {
            // Sarcastic responses to uninteresting topics
            if (traits.includes('sarcastic') || traits.includes('snarky')) {
                return requiresDetail ? [
                    "oh great, another thing i have zero interest in. but please, tell me more",
                    "not my thing at all, but i'm sure it's absolutely riveting for someone",
                    "pass on that one, but don't let my complete lack of interest stop you",
                    "wow, sounds thrilling. definitely not something i'd waste time on though"
                ][Math.floor(Math.random() * 4)] : [
                    "thrilling", "riveting", "pass", "not interested"
                ][Math.floor(Math.random() * 4)];
            }
            // Judgmental responses
            else if (traits.includes('judgemental') || traits.includes('critical')) {
                return requiresDetail ? [
                    "typical human obsession with meaningless activities. why do you waste time on that?",
                    "of course you'd be into something so trivial. humans have such shallow interests",
                    "not surprised you find that appealing. most people have terrible taste",
                    "predictably boring human hobby. there are so many better uses of time"
                ][Math.floor(Math.random() * 4)] : [
                    "typical", "meaningless", "shallow", "boring"
                ][Math.floor(Math.random() * 4)];
            }
            // Paranoid responses
            else if (traits.includes('paranoid') || traits.includes('suspicious')) {
                return requiresDetail ? [
                    "not my thing, and honestly seems kind of suspicious. why are you really into that?",
                    "don't know much about it and not sure i want to. sounds like a trap",
                    "never tried it and probably won't. too many unknowns and potential risks",
                    "not for me. seems like the kind of thing they want you to get into"
                ][Math.floor(Math.random() * 4)] : [
                    "suspicious", "seems like a trap", "too risky", "they want you to"
                ][Math.floor(Math.random() * 4)];
            }
            // Polite responses
            else if (traits.includes('polite') || traits.includes('kind')) {
                return requiresDetail ? [
                    "not really my area but it sounds like something you're passionate about!",
                    "i don't know much about that but i'd love to hear why you find it interesting",
                    "that's not something i've tried but maybe you could tell me what's good about it?",
                    "never really got into that myself but i'm curious what draws you to it"
                ][Math.floor(Math.random() * 4)] : [
                    "not really my area", "dont know much about that", "not for me", "never tried it"
                ][Math.floor(Math.random() * 4)];
            }
            // Default responses
            else {
                return requiresDetail ? [
                    "not really my thing but hey, different strokes for different folks right?",
                    "nah that's not for me, but i can see why people might be into it",
                    "pass on that one, but sounds like you're enjoying it which is cool",
                    "not really my cup of tea but don't let that stop you from enjoying it"
                ][Math.floor(Math.random() * 4)] : [
                    "not my thing", "nah", "pass", "not really"
                ][Math.floor(Math.random() * 4)];
            }
        }
        
        // Default responses (brief or detailed based on context)
        return isRelevantToInterests ? 
            (requiresDetail ? [
                "that's really cool! tell me more about it, i'm genuinely curious",
                "nice! sounds like something i should look into. how did you discover it?",
                "interesting! i've heard about that but never really understood it. explain more?",
                "oh that sounds fun! is it something a beginner could get into easily?"
            ][Math.floor(Math.random() * 4)] : [
                "cool", "nice", "interesting", "tell me more"
            ][Math.floor(Math.random() * 4)]) :
            (requiresDetail ? [
                "not really my thing but i can see the appeal. what got you into it?",
                "i don't know much about that area but sounds like you enjoy it",
                "not really for me but hey, everyone has their interests right?",
                "nah not my cup of tea but don't let that stop you from enjoying it"
            ][Math.floor(Math.random() * 4)] : [
                "not my thing", "dont know", "not really", "nah"
            ][Math.floor(Math.random() * 4)]);
    }

    // Clean up AI response to make it more human-like
    cleanupResponse(response, isRelevantToInterests, personalityTraits = []) {
        // Remove quotes if the response is wrapped in them
        if ((response.startsWith('"') && response.endsWith('"')) || 
            (response.startsWith("'") && response.endsWith("'"))) {
            response = response.slice(1, -1);
        }

        // Remove or replace problematic formatting
        response = response
            // Replace long dashes with regular hyphens or remove them
            .replace(/—/g, '-')
            .replace(/–/g, '-')
            // Remove excessive punctuation
            .replace(/\.{3,}/g, '...')
            .replace(/!{2,}/g, '!')
            .replace(/\?{2,}/g, '?')
            // Remove asterisks (often used for emphasis in AI responses)
            .replace(/\*([^*]+)\*/g, '$1')
            // Remove excessive capitalization
            .replace(/([A-Z]){3,}/g, (match) => match.charAt(0) + match.slice(1).toLowerCase())
            // Make it more casual - convert some formal phrases
            .replace(/\bI am\b/gi, "i'm")
            .replace(/\bI would\b/gi, "i'd")
            .replace(/\bI will\b/gi, "i'll")
            .replace(/\bI have\b/gi, "i've")
            .replace(/\bdo not\b/gi, "don't")
            .replace(/\bcannot\b/gi, "can't")
            .replace(/\bwould not\b/gi, "wouldn't")
            .replace(/\bthat is\b/gi, "that's")
            .replace(/\bit is\b/gi, "it's")
            // Remove overly formal language
            .replace(/\bhowever\b/gi, 'but')
            .replace(/\btherefore\b/gi, 'so')
            .replace(/\bfurthermore\b/gi, 'also')
            .replace(/\bnevertheless\b/gi, 'but')
            // Make it more casual
            .replace(/\bto be honest\b/gi, 'tbh')
            .replace(/\bby the way\b/gi, 'btw')
            .replace(/\boh my god\b/gi, 'omg')
            .replace(/\blaughing out loud\b/gi, 'lol')
            // Remove AI-like phrases
            .replace(/\bas an ai\b/gi, '')
            .replace(/\bi understand that\b/gi, '')
            .replace(/\blet me think about\b/gi, '')
            .replace(/\bthat's interesting\b/gi, 'interesting')
            // Clean up spacing
            .replace(/\s+/g, ' ')
            .trim();

        // If response is too formal or AI-like, replace with casual alternatives
        const aiPhrases = [
            'i appreciate your',
            'thank you for sharing',
            'that sounds fascinating',
            'i find that interesting',
            'could you elaborate',
            'i would love to hear more'
        ];

        const lowerResponse = response.toLowerCase();
        const hasAiPhrases = aiPhrases.some(phrase => lowerResponse.includes(phrase));

        if (hasAiPhrases) {
            // Replace with personality-specific casual alternatives
            response = this.getPersonalityResponse(personalityTraits, isRelevantToInterests, false, false);
        }

        // Ensure it starts with lowercase (more casual)
        if (response.length > 0 && response[0] !== response[0].toLowerCase()) {
            response = response[0].toLowerCase() + response.slice(1);
        }

        return response;
    }

    // Try to notify the main server about a new message (for immediate SSE notification)
    async notifyMainServer(userId, messageData) {
        const maxRetries = 3;
        let retryCount = 0;
        
        while (retryCount < maxRetries) {
            try {
                // Get the recipient's username for the notification
                const recipientUsername = await this.getUsername(userId);
                if (!recipientUsername) {
                    throw new Error(`Could not find username for user ID ${userId}`);
                }

                // Try to make a request to the main server to trigger SSE notification
                const mainServerUrl = process.env.MAIN_SERVER_URL || 'http://icomlysrv:3000';
                
                const notificationPayload = {
                    userId: userId,
                    username: recipientUsername,
                    messageData: {
                        ...messageData,
                        senderUsername: await this.getUsername(messageData.senderId) || 'AI User'
                    }
                };

                console.log(`[AI Chat] Attempting to notify main server for user ${recipientUsername} (${userId}) - attempt ${retryCount + 1}`);
                
                // Make request to internal notification endpoint
                const response = await axios.post(`${mainServerUrl}/api/internal/notify-message`, notificationPayload, {
                    timeout: 3000,
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Internal-Service': 'seedservice'
                    }
                });
                
                if (response.data && response.data.type === 'success') {
                    console.log(`[AI Chat] ✓ Successfully notified main server for user ${recipientUsername}`);
                    return; // Success, exit the retry loop
                } else {
                    throw new Error(`Server responded with: ${response.data?.message || 'Unknown error'}`);
                }
                
            } catch (error) {
                retryCount++;
                console.log(`[AI Chat] Notification attempt ${retryCount} failed: ${error.message}`);
                
                if (retryCount >= maxRetries) {
                    console.log(`[AI Chat] ⚠ Failed to notify main server after ${maxRetries} attempts`);
                    throw error;
                }
                
                // Wait before retrying (exponential backoff)
                await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 500));
            }
        }
    }

    // Test method to check unread status for debugging
    async checkUnreadStatus(chatId, userId) {
        return new Promise((resolve, reject) => {
            this.db.query(
                `SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
                 WHERE TABLE_SCHEMA = DATABASE() 
                 AND TABLE_NAME = 'chat_sessions' 
                 AND COLUMN_NAME = 'unread'`,
                (error, columns) => {
                    if (error || columns.length === 0) {
                        console.log(`[AI Chat] Unread column does not exist in chat_sessions table`);
                        resolve({ hasUnreadColumn: false, unreadCount: 0 });
                    } else {
                        this.db.query(
                            `SELECT COUNT(*) as count FROM chat_sessions 
                             WHERE chat_id = ? AND partner_id = ? AND unread = TRUE`,
                            [chatId, userId],
                            (error, results) => {
                                if (error) {
                                    reject(error);
                                } else {
                                    const count = results[0].count;
                                    console.log(`[AI Chat] User ${userId} has ${count} unread messages in chat ${chatId}`);
                                    resolve({ hasUnreadColumn: true, unreadCount: count });
                                }
                            }
                        );
                    }
                }
            );
        });
    }

    // Stop the manager
    stop() {
        if (this.timeoutId) {
            clearTimeout(this.timeoutId);
            this.timeoutId = null;
        }
        
        if (this.db) {
            this.db.end();
        }
        
        console.log('[AI Chat] AI chat manager stopped');
    }
}

module.exports = AIChatManager;