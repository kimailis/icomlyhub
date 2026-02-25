const PersonalityManager = require('./personalityManager');
const OpenAIContentGenerator = require('./openaiContentGenerator');
const CommentManager = require('./commentManager');
const crypto = require('crypto');

class EnhancedCommentManager extends CommentManager {
    constructor(db) {
        super(db);
        this.openaiGenerator = new OpenAIContentGenerator();
        this.openaiSuccessRate = 0.5;
        this.openaiAttempts = 0;
        this.lastHealthCheck = 0;
        this.healthCheckInterval = 5 * 60 * 1000;
        this.recentFallbackComments = new Map();
        this.maxRecentComments = 50;
    }

    async generateEnhancedComment(username, postContent, postAuthor) {
        try {
            this.openaiAttempts++;
            const openaiResult = await this.openaiGenerator.generateComment(postContent, username, postAuthor);
            if (openaiResult && openaiResult.content && openaiResult.isOpenAIGenerated) {
                this.openaiSuccessRate = Math.min(this.openaiSuccessRate + 0.1, 1.0);
                return {
                    content: openaiResult.content,
                    isAiGenerated: true,
                    model: 'openai-gpt4.1-nano',
                    quality: 'high'
                };
            }
        } catch (error) {
            console.log(`[Enhanced Comment] AI generation failed: ${error.message}`);
            this.openaiSuccessRate = Math.max(this.openaiSuccessRate - 0.05, 0);
        }
        const fallbackComment = this.generateSimpleFallback(username, postContent);
        if (fallbackComment) {
            return {
                content: fallbackComment,
                isAiGenerated: false,
                model: 'intelligent-fallback',
                quality: 'medium'
            };
        }
        return null;
    }

    async generatePersonalityComments() {
        try {
            console.log('[Enhanced Comment] Starting enhanced personality-based comment generation...');
            const recentPostsRes = await this.db.query(`
                SELECT p."id" as post_id, p."userId" as user_id, p."content" as post_content, p."createdAt" as post_date, 
                       (SELECT COUNT(*) FROM "Comment" WHERE "postId" = p."id") as post_comments, u."name" as username
                FROM "Post" p
                JOIN "User" u ON p."userId" = u."id"
                WHERE p."createdAt" > NOW() - INTERVAL '4 hours'
                ORDER BY post_comments ASC, p."createdAt" DESC
                LIMIT 15
            `);
            const recentPosts = recentPostsRes.rows;

            if (recentPosts.length === 0) return;

            const seedUsersRes = await this.db.query(`
                SELECT "id" as user_id, "name" as username 
                FROM "User" 
                WHERE "email" LIKE '%@icomly.com'
                ORDER BY RANDOM()
            `);
            const seedUsers = seedUsersRes.rows;

            if (seedUsers.length === 0) return;

            for (const post of recentPosts) {
                const postAge = (Date.now() - new Date(post.post_date).getTime()) / (1000 * 60 * 60);
                if (postAge < 0.03) continue;

                let targetComments = this.calculateEnhancedTargetComments(postAge, parseInt(post.post_comments));
                
                // Always aim for at least 2 comments
                if (targetComments < 2) targetComments = 2;
                
                if (targetComments <= parseInt(post.post_comments)) continue;

                const newCommentsToAdd = Math.min(targetComments - parseInt(post.post_comments), 6);

                const existingCommentersRes = await this.db.query(`
                    SELECT DISTINCT "userId" FROM "Comment" WHERE "postId" = $1
                `, [post.post_id]);
                const existingCommenters = existingCommentersRes.rows;

                const usedUserIds = new Set([
                    post.user_id,
                    ...existingCommenters.map(c => c.userId)
                ]);

                const availableCommenters = seedUsers.filter(user => 
                    !usedUserIds.has(user.user_id) &&
                    this.personalityManager.shouldUserComment(user.username, post.post_content)
                );

                if (availableCommenters.length === 0) continue;

                const selectedCommenters = availableCommenters.sort(() => Math.random() - 0.5).slice(0, newCommentsToAdd);

                for (const commenter of selectedCommenters) {
                    try {
                        const commentResult = await this.generateEnhancedComment(commenter.username, post.post_content, post.username);
                        if (!commentResult || !commentResult.content) continue;

                        const id = crypto.randomUUID();
                        await this.db.query(`
                            INSERT INTO "Comment" ("id", "postId", "userId", "content", "createdAt", "updatedAt")
                            VALUES ($1, $2, $3, $4, NOW(), NOW())
                        `, [id, post.post_id, commenter.user_id, commentResult.content]);

                        console.log(`[Enhanced Comment] ${commenter.username} commented on ${post.username}'s post`);
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 2000));
                    } catch (error) {
                        console.error(`[Enhanced Comment] Error posting comment:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('[Enhanced Comment] Error in generatePersonalityComments:', error);
        }
    }

    calculateEnhancedTargetComments(postAgeHours, currentComments) {
        // Target range: 2 to 10 comments
        let target = Math.floor(Math.random() * 9) + 2; // Random between 2 and 10
        return Math.max(target, currentComments);
    }

    generateSimpleFallback(username, postContent) {
        const generalComments = [
            "completely agree", "this is so true", "wow, didn't know that", 
            "mood", "facts", "100%", "no way!", "unreal", 
            "love this", "so good", "actually facts", "speechless",
            "yesss", "exactly this", "needed to hear this", "literally me",
            "say it louder", "preach", "been saying this", "crazy"
        ];
        return generalComments[Math.floor(Math.random() * generalComments.length)];
    }

    startPeriodicCommentGeneration(intervalMinutes = 8) {
        console.log(`[Enhanced Comment] Starting enhanced comment generation every ${intervalMinutes} minutes`);
        setInterval(() => {
            this.generatePersonalityComments();
        }, intervalMinutes * 60 * 1000);
    }
}

module.exports = EnhancedCommentManager;
