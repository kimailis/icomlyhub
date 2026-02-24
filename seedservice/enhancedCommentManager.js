const PersonalityManager = require('./personalityManager');
const OpenAIContentGenerator = require('./openaiContentGenerator');
const CommentManager = require('./commentManager');

class EnhancedCommentManager extends CommentManager {
    constructor(db) {
        super(db);
        this.openaiGenerator = new OpenAIContentGenerator();
        this.openaiSuccessRate = 0.5; // Start with 50% success rate
        this.openaiAttempts = 0;
        this.lastHealthCheck = 0;
        this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes
        this.recentFallbackComments = new Map(); // Track recent fallback comments to avoid repetition
        this.maxRecentComments = 50; // Keep track of last 50 fallback comments
    }

    // Enhanced comment generation with OpenAI
    async generateEnhancedComment(username, postContent, postAuthor) {
        try {
            console.log(`[Enhanced Comment] Generating AI comment for ${username} on ${postAuthor}'s post`);
            
            // Track attempts for success rate monitoring
            this.openaiAttempts++;
            
            // Try OpenAI first
            const openaiResult = await this.openaiGenerator.generateComment(postContent, username, postAuthor);
            
            if (openaiResult && openaiResult.content && openaiResult.isOpenAIGenerated) {
                // Update success rate
                this.openaiSuccessRate = Math.min(this.openaiSuccessRate + 0.1, 1.0);
                
                console.log(`[Enhanced Comment] Successfully generated AI comment: "${openaiResult.content.substring(0, 50)}..."`);
                return {
                    content: openaiResult.content,
                    isAiGenerated: true,
                    model: 'openai-gpt4.1-nano',
                    quality: 'high'
                };
            }
        } catch (error) {
            console.log(`[Enhanced Comment] AI generation failed: ${error.message}`);
            // Decrease success rate slightly
            this.openaiSuccessRate = Math.max(this.openaiSuccessRate - 0.05, 0);
        }

        // If OpenAI fails, use intelligent fallback comment generation
        console.log(`[Enhanced Comment] AI generation failed, using intelligent fallback for ${username}`);
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

    // Override the main comment generation method
    async generatePersonalityComments() {
        try {
            console.log('[Enhanced Comment] Starting enhanced personality-based comment generation...');
            
            // Periodic health check
            await this.performHealthCheck();
            
            // Get recent posts that need comments, prioritizing those with no comments yet
            const [recentPosts] = await this.db.promise().query(`
                SELECT p.post_id, p.user_id, p.post_content, p.post_date, p.post_comments, u.username
                FROM posts p
                JOIN users u ON p.user_id = u.user_id
                WHERE p.post_date > DATE_SUB(NOW(), INTERVAL 4 HOUR)
                AND p.post_comments < 10
                ORDER BY p.post_comments ASC, p.post_date DESC
                LIMIT 15
            `);
            
            console.log(`[Enhanced Comment] Found ${recentPosts.length} recent posts for commenting`);

            if (recentPosts.length === 0) {
                console.log('[Enhanced Comment] No recent posts found for commenting');
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
                console.log('[Enhanced Comment] No seed users found for commenting');
                return;
            }

            let totalCommentsGenerated = 0;
            let aiCommentsGenerated = 0;

            // Process each recent post
            for (const post of recentPosts) {
                const postAge = (Date.now() - new Date(post.post_date).getTime()) / (1000 * 60 * 60); // Age in hours
                
                console.log(`[Enhanced Comment] Processing post ${post.post_id} by ${post.username} (age: ${postAge.toFixed(2)}h, comments: ${post.post_comments})`);
                
                // Skip very new posts (less than 2 minutes old) to make it realistic
                if (postAge < 0.03) {
                    console.log(`[Enhanced Comment] Skipping post ${post.post_id} - too new (${postAge.toFixed(2)}h < 0.03h)`);
                    continue;
                }

                // Calculate ideal number of comments based on post age and current comments
                let targetComments = this.calculateEnhancedTargetComments(postAge, post.post_comments);
                
                if (targetComments <= post.post_comments) {
                    console.log(`[Enhanced Comment] Skipping post ${post.post_id} - already has enough comments (${post.post_comments} >= ${targetComments})`);
                    continue; // Already has enough comments
                }

                // Limit new comments per post per cycle (increased for better engagement)
                const newCommentsToAdd = Math.min(targetComments - post.post_comments, 4);

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

                // Generate and post AI comments only
                for (let i = 0; i < selectedCommenters.length; i++) {
                    const commenter = selectedCommenters[i];
                    
                    try {
                        // Always use AI generation
                        const commentResult = await this.generateEnhancedComment(
                            commenter.username, 
                            post.post_content, 
                            post.username
                        );

                        if (!commentResult || !commentResult.content) {
                            console.log(`[Enhanced Comment] No comment generated for ${commenter.username}, skipping`);
                            continue;
                        }

                        // Insert the comment
                        await this.db.promise().query(`
                            INSERT INTO comments (post_id, user_id, comment_content, comment_date)
                            VALUES (?, ?, ?, NOW())
                        `, [post.post_id, commenter.user_id, commentResult.content]);

                        // Update post comment count with slight boost for AI comments
                        const ratingBoost = commentResult.isAiGenerated ? 3 : 2;
                        await this.db.promise().query(`
                            UPDATE posts 
                            SET post_comments = post_comments + 1, 
                                base_rating = base_rating + ?
                            WHERE post_id = ?
                        `, [ratingBoost, post.post_id]);

                        // Synchronize comment count to ensure accuracy
                        await this.synchronizeCommentCount(post.post_id);

                        const aiFlag = commentResult.isAiGenerated ? '[AI]' : '[Fallback]';
                        console.log(`[Enhanced Comment] ${aiFlag} ${commenter.username} commented on ${post.username}'s post (${commentResult.model})`);
                        
                        totalCommentsGenerated++;
                        if (commentResult.isAiGenerated) {
                            aiCommentsGenerated++;
                        }

                        // Variable delay based on comment type
                        const delay = commentResult.isAiGenerated ? 
                            Math.random() * 8000 + 2000 : // 2-10 seconds for AI comments
                            Math.random() * 5000 + 1000;  // 1-6 seconds for standard comments
                        
                        await new Promise(resolve => setTimeout(resolve, delay));

                    } catch (error) {
                        console.error(`[Enhanced Comment] Error posting comment from ${commenter.username}:`, error);
                    }
                }
            }

            const aiPercentage = totalCommentsGenerated > 0 ? 
                ((aiCommentsGenerated / totalCommentsGenerated) * 100).toFixed(1) : 0;

            console.log(`[Enhanced Comment] Generated ${totalCommentsGenerated} comments (${aiCommentsGenerated} AI, ${aiPercentage}%)`);
            console.log(`[Enhanced Comment] OpenAI success rate: ${(this.openaiSuccessRate * 100).toFixed(1)}%`);
            
            // Add debug info if no comments were generated
            if (totalCommentsGenerated === 0) {
                console.log(`[Enhanced Comment] DEBUG: No comments generated. Recent posts found: ${recentPosts.length}`);
                if (recentPosts.length > 0) {
                    const samplePost = recentPosts[0];
                    const postAge = (Date.now() - new Date(samplePost.post_date).getTime()) / (1000 * 60 * 60);
                    console.log(`[Enhanced Comment] DEBUG: Sample post age: ${postAge.toFixed(2)} hours, current comments: ${samplePost.post_comments}`);
                    
                    // Show why posts are being skipped
                    let skippedCount = 0;
                    let ageSkippedCount = 0;
                    let enoughCommentsCount = 0;
                    let noCommentersCount = 0;
                    
                    for (const post of recentPosts) {
                        const postAge = (Date.now() - new Date(post.post_date).getTime()) / (1000 * 60 * 60);
                        
                        if (postAge < 0.03) {
                            ageSkippedCount++;
                        } else {
                            const targetComments = this.calculateEnhancedTargetComments(postAge, post.post_comments);
                            if (targetComments <= post.post_comments) {
                                enoughCommentsCount++;
                            } else {
                                // Check if there are available commenters
                                const [existingCommenters] = await this.db.promise().query(`
                                    SELECT DISTINCT user_id FROM comments WHERE post_id = ?
                                `, [post.post_id]);
                                
                                const usedUserIds = new Set([
                                    post.user_id,
                                    ...existingCommenters.map(c => c.user_id)
                                ]);
                                
                                const availableCommenters = seedUsers.filter(user => 
                                    !usedUserIds.has(user.user_id) &&
                                    this.personalityManager.shouldUserComment(user.username, post.post_content)
                                );
                                
                                if (availableCommenters.length === 0) {
                                    noCommentersCount++;
                                }
                            }
                        }
                        skippedCount++;
                    }
                    
                    console.log(`[Enhanced Comment] DEBUG: Posts skipped - Age: ${ageSkippedCount}, Enough comments: ${enoughCommentsCount}, No commenters: ${noCommentersCount}`);
                }
            }

        } catch (error) {
            console.error('[Enhanced Comment] Error in generatePersonalityComments:', error);
        }
    }

    // Enhanced target comment calculation (more generous for better engagement)
    calculateEnhancedTargetComments(postAgeHours, currentComments) {
        let target = 0;
        
        if (postAgeHours >= 0.03 && postAgeHours < 0.5) {
            // 2 minutes to 30 minutes: 2-4 comments (increased from 1-3)
            target = Math.floor(Math.random() * 3) + 2;
        } else if (postAgeHours >= 0.5 && postAgeHours < 2) {
            // 30 minutes to 2 hours: 3-5 comments (increased from 2-4)
            target = Math.floor(Math.random() * 3) + 3;
        } else if (postAgeHours >= 2 && postAgeHours < 6) {
            // 2 to 6 hours: 4-7 comments (increased from 3-6)
            target = Math.floor(Math.random() * 4) + 4;
        } else if (postAgeHours >= 6) {
            // 6+ hours: 5-9 comments (increased from 4-8)
            target = Math.floor(Math.random() * 5) + 5;
        }

        return Math.max(target, currentComments); // Never reduce existing comments
    }

    // Always use AI generation for comments
    shouldUseAI(commentIndex, totalComments) {
        // Always return true - 100% AI generation
        return true;
    }

    // Generate simple fallback comment with basic logic
    generateSimpleFallback(username, postContent) {
        try {
            // Check personality alignment to determine comment type
            const alignment = this.openaiGenerator.checkPersonalityPostAlignment(username, postContent);
            const personalityData = this.openaiGenerator.formatPersonalityTraits(username);
            
            // Check if user has humor trait
            const hasHumorTrait = personalityData && personalityData.traits && 
                personalityData.traits.toLowerCase().includes('humor');
            
            // Check if post has a picture (contains URLs from Pexels, image references, or "Photo by")
            const postLower = postContent.toLowerCase();
            const hasPicture = postLower.includes('pexels') || 
                             postLower.includes('photo by') || 
                             postLower.includes('.jpg') || 
                             postLower.includes('.png') || 
                             postLower.includes('.jpeg') || 
                             postLower.includes('unsplash') ||
                             /https?:\/\/.*\.(jpg|jpeg|png|gif|webp)/i.test(postContent);
            
            // If user has humor trait, return a dad joke
            if (hasHumorTrait) {
                const dadJokes = [
                    "Why don't scientists trust atoms? Because they make up everything!",
                    "I invented a new word: Plagiarism!",
                    "Why did the coffee file a police report? It got mugged!",
                    "I told my wife she was drawing her eyebrows too high. She looked surprised.",
                    "Why don't eggs tell jokes? They'd crack each other up!",
                    "What do you call a fake noodle? An impasta!",
                    "I used to hate facial hair, but then it grew on me.",
                    "Why did the bicycle fall over? Because it was two-tired!",
                    "What do you call a bear with no teeth? A gummy bear!",
                    "I only know 25 letters of the alphabet. I don't know y.",
                    "Why did the math book look so sad? Because it had too many problems!",
                    "What's the best thing about Switzerland? I don't know, but the flag is a big plus.",
                    "I used to be addicted to soap, but I'm clean now.",
                    "Why can't you give Elsa a balloon? Because she will let it go!",
                    "What did the ocean say to the beach? Nothing, it just waved.",
                    "I'm reading a book about anti-gravity. It's impossible to put down!",
                    "Why don't skeletons fight each other? They don't have the guts.",
                    "What do you call a dinosaur that crashes his car? Tyrannosaurus Wrecks!",
                    "I was wondering why the ball kept getting bigger. Then it hit me.",
                    "Why don't scientists trust atoms? Because they make up everything!"
                ];
                const randomJoke = dadJokes[Math.floor(Math.random() * dadJokes.length)];
                this.trackCommentUsage(randomJoke);
                return randomJoke;
            }
            
            // Handle different comment types based on personality alignment
            if (alignment.commentType === 'dismissive') {
                return this.generateDismissiveComment(alignment.category, hasPicture);
            } else if (alignment.commentType === 'supportive') {
                return this.generateSupportiveComment(alignment.category, hasPicture);
            }
            
            // If post has a picture, return picture-specific comments (neutral case)
            if (hasPicture) {
                const pictureComments = [
                    "nice pic",
                    "that's pretty",
                    "beautiful",
                    "awesome angle!",
                    "great shot",
                    "love this view",
                    "stunning",
                    "picture perfect",
                    "amazing capture",
                    "gorgeous",
                    "incredible photo",
                    "breathtaking"
                ];
                const availableResponses = this.getAvailableResponses(pictureComments);
                const selectedComment = availableResponses[Math.floor(Math.random() * availableResponses.length)];
                this.trackCommentUsage(selectedComment);
                return selectedComment;
            }
            
            // Otherwise return general comments that don't relate to any subject
            const generalComments = [
                "cool",
                "ok",
                "gonna grab a toast",
                "i got to get me some cake",
                "whatever",
                "that's interesting",
                "nice",
                "yep",
                "same",
                "mood",
                "right",
                "totally",
                "true",
                "facts",
                "this",
                "exactly",
                "fair enough",
                "makes sense",
                "got it",
                "noted",
                "sure thing",
                "alright",
                "word",
                "bet"
            ];
            
            const availableResponses = this.getAvailableResponses(generalComments);
            const selectedComment = availableResponses[Math.floor(Math.random() * availableResponses.length)];
            this.trackCommentUsage(selectedComment);
            return selectedComment;
            
        } catch (error) {
            console.log(`[Enhanced Comment] Error in simple fallback: ${error.message}`);
            // Emergency fallback
            const emergency = ["cool", "ok", "nice"];
            return emergency[Math.floor(Math.random() * emergency.length)];
        }
    }

    // Get available responses that haven't been used recently
    getAvailableResponses(responses) {
        const now = Date.now();
        const recentThreshold = 10 * 60 * 1000; // 10 minutes
        
        // Clean up old entries
        for (const [comment, timestamp] of this.recentFallbackComments.entries()) {
            if (now - timestamp > recentThreshold) {
                this.recentFallbackComments.delete(comment);
            }
        }
        
        // Filter out recently used comments
        return responses.filter(comment => !this.recentFallbackComments.has(comment));
    }

    // Generate varied dismissive comments based on post category
    generateDismissiveComment(category, hasPicture) {
        const dismissiveByCategory = {
            celebs: [
                "who cares about this star?",
                "totally staged PR",
                "boring celeb news",
                "so over this person",
                "not real talent",
                "slow news day?",
                "irrelevant",
                "fake drama"
            ],
            gossip: [
                "old tea",
                "nobody believes this",
                "fake news",
                "boring rumors",
                "stop making people famous for nothing",
                "who even leaked this?",
                "clearly a lie",
                "not interesting"
            ],
            technical: [
                "meh, seen better code",
                "not impressed",
                "basic stuff",
                "everyone knows this",
                "old news",
                "nothing special here",
                "been there, done that",
                "amateur hour",
                "could be better",
                "not my thing",
                "whatever works I guess",
                "if you say so",
                "sure thing buddy",
                "cool story bro",
                "riveting",
                "fascinating"
            ],
            creative: [
                "not feeling it",
                "seen better",
                "meh",
                "not my style",
                "interesting choice",
                "bold move",
                "different",
                "unique I guess",
                "not for everyone",
                "to each their own",
                "if that's your thing",
                "sure",
                "okay then",
                "I don't get it",
                "abstract",
                "modern art vibes"
            ],
            fitness: [
                "easy workout",
                "call that exercise?",
                "lightweight",
                "been doing this for years",
                "basic level stuff",
                "not impressed",
                "seen stronger",
                "amateur moves",
                "too easy",
                "child's play",
                "warm-up level",
                "not even sweating",
                "my rest day routine",
                "beginners luck",
                "show me real lifting"
            ],
            automotive: [
                "not a real car enthusiast move",
                "seen better rides",
                "basic maintenance",
                "everyone knows this",
                "amateur mechanic stuff",
                "not impressive",
                "my dad taught me this",
                "YouTube university graduate",
                "basic car knowledge",
                "not a real project",
                "weekend warrior stuff",
                "garage rookie move",
                "call that car work?",
                "seen better mods"
            ],
            beauty: [
                "not my aesthetic",
                "seen better looks",
                "basic makeup",
                "not impressed",
                "filter doing heavy lifting",
                "lighting is everything",
                "good angle",
                "interesting choice",
                "bold look",
                "if you say so",
                "not for everyone",
                "to each their own",
                "different style",
                "unique approach"
            ],
            travel: [
                "touristy spot",
                "been there before",
                "basic destination",
                "everyone goes there",
                "tourist trap",
                "overrated place",
                "seen better views",
                "not impressed",
                "crowded spot",
                "basic travel",
                "instagram location",
                "predictable choice",
                "typical tourist",
                "mainstream destination"
            ],
            social_media: [
                "so original",
                "never seen this before",
                "groundbreaking stuff",
                "revolutionary thinking",
                "cutting edge content",
                "sure thing",
                "if you say so",
                "okay then",
                "riveting",
                "fascinating",
                "bold take",
                "hot take alert",
                "controversial opinion",
                "edgy"
            ],
            food: [
                "seen better food",
                "basic cooking",
                "not impressed",
                "amateur chef vibes",
                "my grandma makes better",
                "restaurant quality? sure",
                "interesting plating",
                "bold flavors I bet",
                "if you say so",
                "not my taste",
                "to each their own",
                "different palate",
                "unique combination",
                "experimental"
            ],
            nature: [
                "seen better sunsets",
                "basic nature shot",
                "everyone posts these",
                "filter doing work",
                "decent lighting",
                "if you're into that",
                "not my scene",
                "nature is nature",
                "trees are trees",
                "typical outdoor shot",
                "seen this view before",
                "standard nature pic",
                "basic outdoor stuff"
            ],
            pets: [
                "seen cuter pets",
                "basic pet content",
                "all pets are cute I guess",
                "not my favorite breed",
                "if you say so",
                "pet parent vibes",
                "typical pet behavior",
                "animals being animals",
                "good for you",
                "pet life",
                "furry friend",
                "four-legged friend",
                "your baby"
            ]
        };

        // General dismissive comments for any category or unknown categories
        const generalDismissive = [
            "whatever",
            "sure thing",
            "if you say so",
            "okay then",
            "meh",
            "not really",
            "I guess",
            "maybe",
            "sure",
            "alright",
            "fair enough",
            "if that's your thing",
            "to each their own",
            "not for me",
            "different strokes",
            "interesting choice",
            "bold move",
            "unique approach",
            "not my cup of tea",
            "seen better",
            "not impressed",
            "basic stuff",
            "nothing special",
            "been there",
            "old news",
            "standard",
            "typical",
            "predictable",
            "mainstream",
            "common",
            "ordinary"
        ];

        // If it's a picture post, add some picture-specific dismissive comments
        if (hasPicture) {
            const pictureSpecific = [
                "seen better pics",
                "decent angle I guess",
                "filter doing work",
                "good lighting",
                "not bad",
                "interesting shot",
                "sure",
                "okay pic",
                "standard photo",
                "typical shot",
                "basic photography",
                "if you say so"
            ];
            generalDismissive.push(...pictureSpecific);
        }

        // Use category-specific dismissive comments if available, otherwise use general
        const categoryComments = dismissiveByCategory[category] || [];
        const allComments = [...categoryComments, ...generalDismissive];
        
        const availableResponses = this.getAvailableResponses(allComments);
        const selectedComment = availableResponses[Math.floor(Math.random() * availableResponses.length)];
        this.trackCommentUsage(selectedComment);
        return selectedComment;
    }

    // Generate varied supportive comments based on post category
    generateSupportiveComment(category, hasPicture) {
        const supportiveByCategory = {
            celebs: [
                "wow, I love this celeb!",
                "they look so good together!",
                "hope the rumors are true",
                "total legend",
                "can't wait for their next project!",
                "so talented",
                "deserve all the success!",
                "best star ever!"
            ],
            gossip: [
                "omg, the tea is hot!",
                "I knew it!",
                "tell me more!",
                "spill the details!",
                "I'm here for the drama!",
                "so juicy!",
                "who else saw this coming?",
                "loving this tea!"
            ],
            technical: [
                "nice code work!",
                "solid solution",
                "clean implementation",
                "well done debugging",
                "smart approach",
                "good catch",
                "helpful tip",
                "learned something new",
                "thanks for sharing",
                "useful info",
                "great example",
                "appreciate the details",
                "solid work",
                "good documentation",
                "clear explanation"
            ],
            creative: [
                "love the creativity",
                "amazing work",
                "so inspiring",
                "beautiful creation",
                "artistic talent",
                "impressive skills",
                "stunning piece",
                "love the style",
                "great composition",
                "wonderful art",
                "creative genius",
                "masterpiece vibes",
                "artistic vision",
                "beautiful expression",
                "amazing creativity"
            ],
            fitness: [
                "keep grinding",
                "motivation right here",
                "strong work",
                "inspiring dedication",
                "fitness goals",
                "great progress",
                "keep pushing",
                "respect the hustle",
                "amazing transformation",
                "workout inspiration",
                "strength goals",
                "dedication paying off",
                "crush those goals",
                "beast mode",
                "fitness journey respect"
            ],
            automotive: [
                "nice ride",
                "car goals",
                "sweet wheels",
                "respect the work",
                "good maintenance",
                "love the mods",
                "clean build",
                "appreciate the craftsmanship",
                "car enthusiast respect",
                "solid work",
                "nice upgrades",
                "beautiful machine",
                "well maintained",
                "car culture love"
            ],
            beauty: [
                "gorgeous look",
                "makeup skills on point",
                "stunning transformation",
                "beautiful aesthetic",
                "flawless execution",
                "love the style",
                "makeup artistry",
                "beautiful work",
                "inspiring look",
                "talent showing",
                "gorgeous result",
                "amazing skills",
                "beauty goals",
                "perfect execution"
            ],
            travel: [
                "bucket list destination",
                "travel goals",
                "amazing views",
                "wanderlust activated",
                "beautiful location",
                "adventure inspiration",
                "stunning scenery",
                "travel envy",
                "incredible journey",
                "living the dream",
                "amazing experience",
                "travel vibes",
                "adventure goals",
                "beautiful adventure"
            ],
            social_media: [
                "truth spoken",
                "needed to hear this",
                "real talk",
                "appreciate the honesty",
                "great perspective",
                "thanks for sharing",
                "relatable content",
                "honest thoughts",
                "appreciate the insight",
                "good point",
                "thoughtful post",
                "meaningful share"
            ],
            food: [
                "looks delicious",
                "food goals",
                "amazing cooking",
                "chef skills",
                "mouth watering",
                "culinary art",
                "beautiful presentation",
                "cooking inspiration",
                "foodie approved",
                "restaurant quality",
                "amazing flavors I bet",
                "cooking talent",
                "food photography goals",
                "delicious looking"
            ],
            nature: [
                "breathtaking view",
                "nature's beauty",
                "stunning capture",
                "peaceful vibes",
                "beautiful scenery",
                "nature appreciation",
                "amazing shot",
                "natural beauty",
                "serene moment",
                "earth's artwork",
                "nature's magic",
                "beautiful creation",
                "peaceful scene",
                "natural wonder"
            ],
            pets: [
                "adorable companion",
                "precious baby",
                "cute overload",
                "furry family",
                "animal love",
                "sweet pet",
                "adorable friend",
                "pet goals",
                "pure joy",
                "wholesome content",
                "heart melting",
                "precious moment",
                "animal happiness",
                "furry joy"
            ]
        };

        // General supportive comments for any category
        const generalSupportive = [
            "love this",
            "amazing",
            "so cool",
            "impressive",
            "well done",
            "great work",
            "awesome",
            "fantastic",
            "brilliant",
            "excellent",
            "wonderful",
            "inspiring",
            "beautiful",
            "outstanding",
            "incredible",
            "remarkable",
            "superb",
            "magnificent",
            "spectacular",
            "phenomenal",
            "marvelous",
            "splendid",
            "terrific",
            "fabulous",
            "gorgeous"
        ];

        // If it's a picture post, add some picture-specific supportive comments
        if (hasPicture) {
            const pictureSpecific = [
                "beautiful shot",
                "amazing capture",
                "great photography",
                "stunning image",
                "perfect moment",
                "incredible photo",
                "artistic vision",
                "beautiful composition",
                "picture perfect",
                "amazing angle",
                "great lighting",
                "photographic talent"
            ];
            generalSupportive.push(...pictureSpecific);
        }

        // Use category-specific supportive comments if available, otherwise use general
        const categoryComments = supportiveByCategory[category] || [];
        const allComments = [...categoryComments, ...generalSupportive];
        
        const availableResponses = this.getAvailableResponses(allComments);
        const selectedComment = availableResponses[Math.floor(Math.random() * availableResponses.length)];
        this.trackCommentUsage(selectedComment);
        return selectedComment;
    }

    // Track comment usage to avoid repetition
    trackCommentUsage(comment) {
        const now = Date.now();
        this.recentFallbackComments.set(comment, now);
        
        // Keep map size manageable
        if (this.recentFallbackComments.size > this.maxRecentComments) {
            // Remove oldest entries
            const entries = Array.from(this.recentFallbackComments.entries());
            entries.sort((a, b) => a[1] - b[1]);
            
            const toRemove = entries.slice(0, entries.length - this.maxRecentComments);
            for (const [comment] of toRemove) {
                this.recentFallbackComments.delete(comment);
            }
        }
    }

    // Perform periodic health check
    async performHealthCheck() {
        const now = Date.now();
        if (now - this.lastHealthCheck < this.healthCheckInterval) {
            return; // Too soon for another health check
        }

        try {
            console.log('[Enhanced Comment] Performing OpenAI health check...');
            const healthResult = await this.openaiGenerator.healthCheck();
            
            if (healthResult) {
                console.log('[Enhanced Comment] OpenAI is healthy and available');
                // Gradually improve success rate if health check passes
                this.openaiSuccessRate = Math.min(this.openaiSuccessRate + 0.1, 1.0);
            } else {
                console.log(`[Enhanced Comment] OpenAI health check failed: Unknown error`);
                // Reduce success rate on health check failure
                this.openaiSuccessRate = Math.max(this.openaiSuccessRate - 0.2, 0);
            }
            
            this.lastHealthCheck = now;
        } catch (error) {
            console.error('[Enhanced Comment] Health check error:', error);
            this.openaiSuccessRate = Math.max(this.openaiSuccessRate - 0.2, 0);
            this.lastHealthCheck = now;
        }
    }

    // Get enhanced statistics
    async getEnhancedStats() {
        try {
            const baseStats = await this.getCommentStats();
            
            return {
                ...baseStats,
                openaiSuccessRate: this.openaiSuccessRate,
                openaiAttempts: this.openaiAttempts,
                lastHealthCheck: new Date(this.lastHealthCheck).toISOString(),
                enhancedMode: true
            };
        } catch (error) {
            console.error('[Enhanced Comment] Error getting enhanced stats:', error);
            return {
                enhancedMode: true,
                error: error.message
            };
        }
    }

    // Override to use enhanced generation
    startPeriodicCommentGeneration(intervalMinutes = 8) {
        console.log(`[Enhanced Comment] Starting enhanced comment generation every ${intervalMinutes} minutes`);
        
        // Initial generation after 1 minute
        setTimeout(() => {
            this.generatePersonalityComments();
        }, 1 * 60 * 1000);
        
        // Then every intervalMinutes
        setInterval(() => {
            this.generatePersonalityComments();
        }, intervalMinutes * 60 * 1000);
    }

    // Synchronize comment count with actual comment count
    async synchronizeCommentCount(postId) {
        try {
            // Get actual comment count
            const [commentCountResult] = await this.db.promise().query(
                'SELECT COUNT(*) as actual_count FROM comments WHERE post_id = ?',
                [postId]
            );
            
            const actualCount = commentCountResult[0].actual_count;
            
            // Get current post comment count
            const [postResult] = await this.db.promise().query(
                'SELECT post_comments FROM posts WHERE post_id = ?',
                [postId]
            );
            
            if (postResult.length > 0) {
                const currentCount = postResult[0].post_comments;
                
                // If counts don't match, update the post count
                if (currentCount !== actualCount) {
                    console.log(`[Enhanced Comment] Post ${postId}: Count mismatch detected. Database: ${currentCount}, Actual: ${actualCount}. Fixing...`);
                    
                    await this.db.promise().query(
                        'UPDATE posts SET post_comments = ? WHERE post_id = ?',
                        [actualCount, postId]
                    );
                }
            }
        } catch (error) {
            console.error(`[Enhanced Comment] Error synchronizing comment count for post ${postId}:`, error);
        }
    }
}

module.exports = EnhancedCommentManager; 