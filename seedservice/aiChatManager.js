const { Pool } = require('pg');
const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

class AIChatManager {
    constructor(dbPool) {
        console.log('[AI Chat] Initializing AI Chat Manager...');
        this.openai = null;
        this.initializeOpenAI();
        this.db = dbPool;
        this.intervals = { active: 90000, idle: 180000, inactive: 360000 };
        this.currentInterval = this.intervals.active;
        this.timeoutId = null;
    }

    async initialize() {
        console.log('[AI Chat] AI chat manager started');
        this.start();
    }

    initializeOpenAI() {
        try {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) return;
            this.openai = new OpenAI({ apiKey });
        } catch (error) {
            console.error('[AI Chat] Failed to initialize OpenAI:', error.message);
        }
    }

    async getSeedUsers() {
        const res = await this.db.query('SELECT id as user_id, name as username FROM users WHERE email LIKE \'%@icomly.com\'');
        return res.rows;
    }

    async getUsername(userId) {
        const res = await this.db.query('SELECT name as username FROM users WHERE id = $1', [userId]);
        return res.rows.length > 0 ? res.rows[0].username : null;
    }

    loadPersonalityData(username) {
        try {
            const personalityPath = path.join(__dirname, 'seedusers', username, `${username}_personality.js`);
            if (!fs.existsSync(personalityPath)) return null;
            delete require.cache[require.resolve(personalityPath)];
            return require(personalityPath);
        } catch (error) {
            return null;
        }
    }

    async checkForNewMessages() {
        // Simple placeholder for now, direct DB messaging not fully implemented in this project's Prisma schema yet
        // but keeping structure for future use
    }

    start() {
        this.scheduleNext();
    }

    scheduleNext() {
        if (this.timeoutId) clearTimeout(this.timeoutId);
        this.timeoutId = setTimeout(async () => {
            await this.checkForNewMessages();
            this.scheduleNext();
        }, this.currentInterval);
    }

    stop() {
        if (this.timeoutId) clearTimeout(this.timeoutId);
    }
}

module.exports = AIChatManager;
