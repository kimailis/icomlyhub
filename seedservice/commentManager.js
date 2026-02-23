const PersonalityManager = require('./personalityManager');
const PersonalityContentGenerator = require('./personalityContentGenerator');

class CommentManager {
    constructor(db) {
        this.db = db;
        this.personalityManager = new PersonalityManager();
        this.contentGenerator = new PersonalityContentGenerator();
        this.lastCommentCheck = Date.now();
    }

    // Main function to generate and post comments based on personalities
    async generatePersonalityComments() {
        try {
            console.log('[Comment Manager] Starting personality-based comment generation...');
            
            // Get recent posts that might need comments
            const [recentPosts] = await this.db.promise().query(`
                SELECT p.post_id, p.user_id, p.post_content, p.post_date, p.post_comments, u.username
                FROM posts p
                JOIN users u ON p.user_id = u.user_id
                WHERE p.post_date > DATE_SUB(NOW(), INTERVAL 6 HOUR)
                AND p.post_comments < 5
                ORDER BY p.post_date DESC
                LIMIT 10
            `);

            if (recentPosts.length === 0) {
                console.log('[Comment Manager] No recent posts found for commenting');
                return;
            }

            // Get all available seed users for commenting
            const [seedUsers] = await this.db.promise().query(`
                SELECT user_id, username 
                FROM users 
                WHERE user_id BETWEEN 1000 AND 9999 
                ORDER BY RAND()
            `);

            if (seedUsers.length === 0) {
                console.log('[Comment Manager] No seed users found for commenting');
                return;
            }

            let totalCommentsGenerated = 0;

            // Process each recent post
            for (const post of recentPosts) {
                const postAge = (Date.now() - new Date(post.post_date).getTime()) / (1000 * 60 * 60); // Age in hours
                
                // Skip very new posts (less than 30 minutes old) to make it realistic
                if (postAge < 0.5) {
                    continue;
                }

                // Calculate ideal number of comments based on post age and current comments
                let targetComments = this.calculateTargetComments(postAge, post.post_comments);
                
                if (targetComments <= post.post_comments) {
                    continue; // Already has enough comments
                }

                // Limit new comments per post per cycle
                const newCommentsToAdd = Math.min(targetComments - post.post_comments, 3);

                // Get users who haven't commented on this post yet and exclude the post author
                const [existingCommenters] = await this.db.promise().query(`
                    SELECT DISTINCT user_id FROM comments WHERE post_id = ?
                `, [post.post_id]);

                const usedUserIds = new Set([
                    post.user_id, // Post author
                    ...existingCommenters.map(c => c.user_id)
                ]);

                // Filter available commenters
                const availableCommenters = seedUsers.filter(user => 
                    !usedUserIds.has(user.user_id) &&
                    this.personalityManager.shouldUserComment(user.username, post.post_content)
                );

                if (availableCommenters.length === 0) {
                    continue;
                }

                // Shuffle and select commenters
                const shuffledCommenters = availableCommenters.sort(() => Math.random() - 0.5);
                const selectedCommenters = shuffledCommenters.slice(0, newCommentsToAdd);

                // Generate and post comments
                for (const commenter of selectedCommenters) {
                    try {
                        const comment = this.contentGenerator.generatePersonalityComment(
                            commenter.username, 
                            post.post_content, 
                            post.username
                        );

                        // Insert the comment
                        await this.db.promise().query(`
                            INSERT INTO comments (post_id, user_id, comment_content, comment_date)
                            VALUES (?, ?, ?, NOW())
                        `, [post.post_id, commenter.user_id, comment]);

                        // Update post comment count
                        await this.db.promise().query(`
                            UPDATE posts 
                            SET post_comments = post_comments + 1, 
                                base_rating = base_rating + 2 
                            WHERE post_id = ?
                        `, [post.post_id]);

                        console.log(`[Comment Manager] ${commenter.username} commented on ${post.username}'s post`);
                        totalCommentsGenerated++;

                        // Add small delay between comments to make it realistic
                        await new Promise(resolve => setTimeout(resolve, Math.random() * 5000 + 1000));

                    } catch (error) {
                        console.error(`[Comment Manager] Error posting comment from ${commenter.username}:`, error);
                    }
                }
            }

            console.log(`[Comment Manager] Generated ${totalCommentsGenerated} personality-based comments`);

        } catch (error) {
            console.error('[Comment Manager] Error in generatePersonalityComments:', error);
        }
    }

    // Calculate target number of comments based on post age and current engagement
    calculateTargetComments(postAgeHours, currentComments) {
        // Base comment targets by age
        let target = 0;
        
        if (postAgeHours >= 0.5 && postAgeHours < 2) {
            // 30 minutes to 2 hours: 0-2 comments
            target = Math.floor(Math.random() * 3);
        } else if (postAgeHours >= 2 && postAgeHours < 6) {
            // 2 to 6 hours: 1-4 comments
            target = Math.floor(Math.random() * 4) + 1;
        } else if (postAgeHours >= 6) {
            // 6+ hours: 2-5 comments
            target = Math.floor(Math.random() * 4) + 2;
        }

        return Math.max(target, currentComments); // Never reduce existing comments
    }

    // Generate a single comment for a specific user on a specific post
    async generateSingleComment(username, postId) {
        try {
            // Get post details
            const [posts] = await this.db.promise().query(`
                SELECT p.post_content, u.username as post_username
                FROM posts p
                JOIN users u ON p.user_id = u.user_id
                WHERE p.post_id = ?
            `, [postId]);

            if (posts.length === 0) {
                throw new Error('Post not found');
            }

            const post = posts[0];
            
            // Check if user should comment based on personality
            if (!this.personalityManager.shouldUserComment(username, post.post_content)) {
                return null; // User wouldn't comment on this post
            }

            // Generate the comment
            const comment = this.contentGenerator.generatePersonalityComment(
                username, 
                post.post_content, 
                post.post_username
            );

            return comment;

        } catch (error) {
            console.error(`[Comment Manager] Error generating single comment for ${username}:`, error);
            return null;
        }
    }

    // Get comment engagement statistics
    async getCommentStats() {
        try {
            const [stats] = await this.db.promise().query(`
                SELECT 
                    COUNT(*) as total_comments,
                    COUNT(DISTINCT user_id) as unique_commenters,
                    COUNT(DISTINCT post_id) as posts_with_comments,
                    AVG(LENGTH(comment_content)) as avg_comment_length
                FROM comments 
                WHERE comment_date > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            const [postStats] = await this.db.promise().query(`
                SELECT 
                    AVG(post_comments) as avg_comments_per_post,
                    MAX(post_comments) as max_comments_on_post
                FROM posts 
                WHERE post_date > DATE_SUB(NOW(), INTERVAL 24 HOUR)
            `);

            return {
                daily_comments: stats[0].total_comments || 0,
                unique_commenters: stats[0].unique_commenters || 0,
                posts_with_comments: stats[0].posts_with_comments || 0,
                avg_comment_length: Math.round(stats[0].avg_comment_length || 0),
                avg_comments_per_post: Math.round((postStats[0].avg_comments_per_post || 0) * 10) / 10,
                max_comments_on_post: postStats[0].max_comments_on_post || 0
            };

        } catch (error) {
            console.error('[Comment Manager] Error getting comment stats:', error);
            return null;
        }
    }

    // Clean up old comments if needed (for maintenance)
    async cleanupOldComments(daysToKeep = 90) {
        try {
            const [result] = await this.db.promise().query(`
                DELETE FROM comments 
                WHERE comment_date < DATE_SUB(NOW(), INTERVAL ? DAY)
            `, [daysToKeep]);

            if (result.affectedRows > 0) {
                console.log(`[Comment Manager] Cleaned up ${result.affectedRows} old comments`);
                
                // Update post comment counts after cleanup
                await this.db.promise().query(`
                    UPDATE posts p
                    SET post_comments = (
                        SELECT COUNT(*) 
                        FROM comments c 
                        WHERE c.post_id = p.post_id
                    )
                `);
                
                console.log('[Comment Manager] Updated post comment counts after cleanup');
            }

        } catch (error) {
            console.error('[Comment Manager] Error cleaning up old comments:', error);
        }
    }

    // Start periodic comment generation
    startPeriodicCommentGeneration(intervalMinutes = 15) {
        console.log(`[Comment Manager] Starting periodic comment generation every ${intervalMinutes} minutes`);
        
        // Run immediately
        this.generatePersonalityComments();
        
        // Then run on interval
        setInterval(() => {
            this.generatePersonalityComments();
        }, intervalMinutes * 60 * 1000);
    }
}

module.exports = CommentManager; 