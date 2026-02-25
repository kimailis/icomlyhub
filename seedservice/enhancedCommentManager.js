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

    async interactWithFeed() {
        try {
            console.log('[Enhanced Comment] Starting feed interaction (Articles & Sightings)...');
            
            // 1. Fetch recent Articles (last 24h)
            const recentArticlesRes = await this.db.query(`
                SELECT a."id", a."headline", a."summary", a."celebrityId", c."name" as celeb_name,
                       (SELECT COUNT(*) FROM "Comment" WHERE "articleId" = a."id") as comment_count,
                       (SELECT COUNT(*) FROM "Like" WHERE "articleId" = a."id") as like_count
                FROM "Article" a
                JOIN "Celebrity" c ON a."celebrityId" = c."id"
                WHERE a."publishedAt" > NOW() - INTERVAL '24 hours'
                ORDER BY a."publishedAt" DESC
                LIMIT 50
            `);
            const articles = recentArticlesRes.rows;

            // 2. Fetch recent Sightings (last 24h)
            const recentSightingsRes = await this.db.query(`
                SELECT s."id", s."location", s."snippet", s."celebrityId", c."name" as celeb_name,
                       (SELECT COUNT(*) FROM "Comment" WHERE "sightingId" = s."id") as comment_count,
                       (SELECT COUNT(*) FROM "Like" WHERE "sightingId" = s."id") as like_count
                FROM "Sighting" s
                JOIN "Celebrity" c ON s."celebrityId" = c."id"
                WHERE s."date" > NOW() - INTERVAL '24 hours'
                ORDER BY s."date" DESC
                LIMIT 30
            `);
            const sightings = recentSightingsRes.rows;

            const seedUsersRes = await this.db.query(`
                SELECT "id" as user_id, "name" as username 
                FROM "User" 
                WHERE "email" LIKE '%@icomly.com'
                ORDER BY RANDOM()
            `);
            const seedUsers = seedUsersRes.rows;

            if (seedUsers.length === 0) return;

            // 3. Process Articles
            for (const article of articles) {
                const targetInteractions = Math.floor(Math.random() * 5) + 3; // Aim for 3-8 interactions
                const currentInteractions = parseInt(article.comment_count) + parseInt(article.like_count);
                
                console.log(`[Enhanced Comment] Article "${article.headline}" (ID: ${article.id}) has ${currentInteractions} interactions, target is ${targetInteractions}`);

                if (currentInteractions >= targetInteractions) {
                    console.log(`[Enhanced Comment] Skipping article "${article.headline}" (sufficient interactions)`);
                    continue;
                }

                const usersNeeded = targetInteractions - currentInteractions;
                const availableUsers = seedUsers.sort(() => Math.random() - 0.5).slice(0, usersNeeded);

                console.log(`[Enhanced Comment] Adding ${usersNeeded} interactions to "${article.headline}" using ${availableUsers.map(u => u.username).join(', ')}`);

                for (const user of availableUsers) {
                    try {
                        const interaction = await this.openaiGenerator.generateFeedInteraction(
                            user.username, 'ARTICLE', article.headline + ': ' + article.summary, article.celeb_name
                        );

                        if (interaction.like) {
                            await this.db.query(`
                                INSERT INTO "Like" ("id", "userId", "articleId", "isUpvote", "createdAt")
                                VALUES ($1, $2, $3, true, NOW())
                                ON CONFLICT ("userId", "articleId") DO NOTHING
                            `, [crypto.randomUUID(), user.user_id, article.id]);
                        }

                        if (interaction.comment) {
                            await this.db.query(`
                                INSERT INTO "Comment" ("id", "articleId", "userId", "content", "createdAt", "updatedAt")
                                VALUES ($1, $2, $3, $4, NOW(), NOW())
                            `, [crypto.randomUUID(), article.id, user.user_id, interaction.comment]);
                        }

                        console.log(`[Enhanced Comment] ${user.username} interacted with ${article.celeb_name}'s news`);
                    } catch (e) { console.error(e); }
                }
            }

            // 4. Process Sightings
            for (const sighting of sightings) {
                const targetInteractions = Math.floor(Math.random() * 3) + 2; // Aim for 2-5 interactions
                const currentInteractions = parseInt(sighting.comment_count) + parseInt(sighting.like_count);
                
                console.log(`[Enhanced Comment] Sighting for ${sighting.celeb_name} (ID: ${sighting.id}) has ${currentInteractions} interactions, target is ${targetInteractions}`);

                if (currentInteractions >= targetInteractions) {
                    console.log(`[Enhanced Comment] Skipping sighting for ${sighting.celeb_name} (sufficient interactions)`);
                    continue;
                }

                const usersNeeded = targetInteractions - currentInteractions;
                const availableUsers = seedUsers.sort(() => Math.random() - 0.5).slice(0, usersNeeded);

                console.log(`[Enhanced Comment] Adding ${usersNeeded} interactions to ${sighting.celeb_name}'s sighting using ${availableUsers.map(u => u.username).join(', ')}`);

                for (const user of availableUsers) {
                    try {
                        const interaction = await this.openaiGenerator.generateFeedInteraction(
                            user.username, 'SIGHTING', sighting.location + ': ' + sighting.snippet, sighting.celeb_name
                        );

                        if (interaction.like) {
                            await this.db.query(`
                                INSERT INTO "Like" ("id", "userId", "sightingId", "isUpvote", "createdAt")
                                VALUES ($1, $2, $3, true, NOW())
                                ON CONFLICT ("userId", "sightingId") DO NOTHING
                            `, [crypto.randomUUID(), user.user_id, sighting.id]);
                        }

                        if (interaction.comment) {
                            await this.db.query(`
                                INSERT INTO "Comment" ("id", "sightingId", "userId", "content", "createdAt", "updatedAt")
                                VALUES ($1, $2, $3, $4, NOW(), NOW())
                            `, [crypto.randomUUID(), sighting.id, user.user_id, interaction.comment]);
                        }

                        console.log(`[Enhanced Comment] ${user.username} interacted with ${sighting.celeb_name}'s sighting`);
                    } catch (e) { console.error(e); }
                }
            }

        } catch (error) {
            console.error('[Enhanced Comment] Error in interactWithFeed:', error);
        }
    }

    startPeriodicFeedInteraction(intervalMinutes = 20) {
        console.log(`[Enhanced Comment] Starting periodic feed interaction every ${intervalMinutes} minutes`);
        this.interactWithFeed();
        setInterval(() => {
            this.interactWithFeed();
        }, intervalMinutes * 60 * 1000);
    }

    startPeriodicCommentGeneration(intervalMinutes = 8) {
        console.log(`[Enhanced Comment] Starting enhanced comment generation every ${intervalMinutes} minutes`);
        setInterval(() => {
            this.generatePersonalityComments();
        }, intervalMinutes * 60 * 1000);
    }
}

module.exports = EnhancedCommentManager;
