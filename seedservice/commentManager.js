const PersonalityManager = require('./personalityManager');
const PersonalityContentGenerator = require('./personalityContentGenerator');
const crypto = require('crypto');

class CommentManager {
    constructor(db) {
        this.db = db;
        this.personalityManager = new PersonalityManager();
        this.contentGenerator = new PersonalityContentGenerator();
        this.lastCommentCheck = Date.now();
    }

    async generatePersonalityComments() {
        try {
            console.log('[Comment Manager] Starting personality-based comment generation...');
            const recentPostsRes = await this.db.query(`
                SELECT p."id" as post_id, p."userId" as user_id, p."content" as post_content, p."createdAt" as post_date,
                       (SELECT COUNT(*) FROM "Comment" WHERE "postId" = p."id") as post_comments, u."name" as username
                FROM "Post" p
                JOIN "User" u ON p."userId" = u."id"
                WHERE p."createdAt" > NOW() - INTERVAL '6 hours'
                ORDER BY p."createdAt" DESC
                LIMIT 10
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
                if (postAge < 0.5) continue;

                let targetComments = this.calculateTargetComments(postAge, parseInt(post.post_comments));
                if (targetComments <= parseInt(post.post_comments)) continue;

                const newCommentsToAdd = Math.min(targetComments - parseInt(post.post_comments), 3);

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
                        const comment = this.contentGenerator.generatePersonalityComment(
                            commenter.username, 
                            post.post_content, 
                            post.username
                        );

                        const id = crypto.randomUUID();
                        await this.db.query(`
                            INSERT INTO "Comment" ("id", "postId", "userId", "content", "createdAt", "updatedAt")
                            VALUES ($1, $2, $3, $4, NOW(), NOW())
                        `, [id, post.post_id, commenter.user_id, comment]);

                        console.log(`[Comment Manager] ${commenter.username} commented on ${post.username}'s post`);
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 1000));
                    } catch (error) {
                        console.error(`[Comment Manager] Error posting comment from ${commenter.username}:`, error);
                    }
                }
            }
        } catch (error) {
            console.error('[Comment Manager] Error in generatePersonalityComments:', error);
        }
    }

    calculateTargetComments(postAgeHours, currentComments) {
        let target = 0;
        if (postAgeHours < 2) target = Math.floor(Math.random() * 3);
        else if (postAgeHours < 6) target = Math.floor(Math.random() * 4) + 1;
        else target = Math.floor(Math.random() * 4) + 2;
        return Math.max(target, currentComments);
    }

    startPeriodicCommentGeneration(intervalMinutes = 15) {
        console.log(`[Comment Manager] Starting periodic comment generation every ${intervalMinutes} minutes`);
        this.generatePersonalityComments();
        setInterval(() => {
            this.generatePersonalityComments();
        }, intervalMinutes * 60 * 1000);
    }
}

module.exports = CommentManager;
