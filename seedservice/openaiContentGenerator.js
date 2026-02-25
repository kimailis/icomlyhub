const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');
const { validateHashtags } = require('./contentGenerator');

class OpenAIContentGenerator {
    constructor() {
        this.specialTask = "create trending gossip and celebrity updates that provide real value to followers and spark discussion";
        this.topics = [
            'celebrity scandals', 'hollywood gossip', 'celeb relationships', 'red carpet fashion',
            'award show drama', 'celebrity feuds', 'celeb sightings', 'movie set rumors',
            'hollywood breakups', 'secret celeb weddings', 'celebrity lifestyle', 'celeb fitness secrets',
            'behind the scenes hollywood', 'celeb property deals', 'influencer gossip', 'reality tv drama',
            'music industry rumors', 'hollywood casting news', 'celeb health updates', 'celebrity social media drama',
            'nightlife gossip', 'exclusive club sightings', 'high-end restaurant drama', 'outgoing lifestyle', 'socialite secrets'
        ];
        
        // Diverse anecdote story structures to prevent formulaic patterns
        this.anecdoteStructures = [
            {
                type: 'observation',
                pattern: 'Start with what you noticed/observed, then explain the context',
                examples: ['noticed something weird today...', 'saw the funniest thing earlier...', 'witnessed something that made me think...']
            },
            {
                type: 'realization',
                pattern: 'Start with a sudden realization or epiphany',
                examples: ['just realized something...', 'it hit me today that...', 'had this moment where I understood...']
            },
            {
                type: 'conversation',
                pattern: 'Start with dialogue or what someone said',
                examples: ['someone just told me...', 'overheard this conversation...', 'my friend said something that...']
            },
            {
                type: 'mishap',
                pattern: 'Start with something going wrong or unexpected',
                examples: ['everything went wrong when...', 'wasn\'t expecting this to happen...', 'total disaster but...']
            },
            {
                type: 'discovery',
                pattern: 'Start with finding or learning something new',
                examples: ['found out today that...', 'discovered something interesting...', 'learned the hard way that...']
            },
            {
                type: 'emotion_first',
                pattern: 'Start with how you felt, then explain why',
                examples: ['felt so awkward when...', 'was genuinely surprised by...', 'couldn\'t stop laughing because...']
            },
            {
                type: 'action_consequence',
                pattern: 'Start with what you did, then what happened',
                examples: ['decided to try something and...', 'made the mistake of...', 'thought I\'d be helpful but...']
            }
        ];
        
        // Diverse story contexts beyond just locations
        this.storyContexts = [
            'personal challenge', 'random encounter', 'family drama', 'work situation', 'technology fail',
            'social awkwardness', 'learning experience', 'unexpected kindness', 'funny misunderstanding',
            'small victory', 'embarrassing moment', 'surprising discovery', 'helpful stranger',
            'weird coincidence', 'childhood memory triggered', 'cultural difference', 'generation gap moment',
            'language barrier', 'mistaken identity', 'wrong number/text', 'delivery mix-up',
            'weather incident', 'pet behavior', 'food experiment', 'DIY disaster', 'travel hiccup'
        ];
        
        // More varied character types instead of just names
        this.characterTypes = [
            'this kid', 'an elderly woman', 'my neighbor', 'the delivery guy', 'a random stranger',
            'this couple', 'my coworker', 'the cashier', 'a group of teenagers', 'this guy in line',
            'my uber driver', 'the maintenance person', 'a fellow customer', 'this woman with her dog',
            'the security guard', 'a street performer', 'my roommate', 'the receptionist',
            'this family', 'a jogger', 'the barista', 'my boss', 'a tourist', 'the janitor'
        ];
        
        this.successRate = 0.0;
        this.attempts = 0;
        this.openai = null;
        this.initializeOpenAI();
    }

    // Get diverse anecdote elements to prevent repetition
    getDiverseAnecdoteElements() {
        const structure = this.anecdoteStructures[Math.floor(Math.random() * this.anecdoteStructures.length)];
        const context = this.storyContexts[Math.floor(Math.random() * this.storyContexts.length)];
        const character = this.characterTypes[Math.floor(Math.random() * this.characterTypes.length)];
        const timeFrames = ['this morning', 'yesterday', 'last weekend', 'earlier today', 'last week', 'a few days ago', 'during lunch', 'after work', 'this afternoon'];
        const timeFrame = timeFrames[Math.floor(Math.random() * timeFrames.length)];
        
        return { structure, context, character, timeFrame };
    }

    // Analyze personality traits for content creation
    analyzePersonalityForContent(personalityTraits) {
        const traits = personalityTraits.map(t => t.toLowerCase());
        
        // Determine writing style
        let writingStyle = 'casual and conversational';
        if (traits.some(t => ['sarcastic', 'snarky', 'cynical'].includes(t))) {
            writingStyle = 'sarcastic and witty with sharp observations';
        } else if (traits.some(t => ['intellectual', 'thoughtful', 'analytical'].includes(t))) {
            writingStyle = 'thoughtful and analytical with depth';
        } else if (traits.some(t => ['humorous', 'funny', 'playful'].includes(t))) {
            writingStyle = 'humorous and entertaining with jokes';
        } else if (traits.some(t => ['mysterious', 'dark', 'creepy'].includes(t))) {
            writingStyle = 'mysterious and intriguing with hidden meanings';
        } else if (traits.some(t => ['confident', 'bold', 'assertive'].includes(t))) {
            writingStyle = 'confident and direct with strong opinions';
        }
        
        // Determine emotional tone
        let emotionalTone = 'balanced and relatable';
        if (traits.some(t => ['paranoid', 'anxious', 'suspicious'].includes(t))) {
            emotionalTone = 'cautious and questioning with underlying suspicion';
        } else if (traits.some(t => ['enthusiastic', 'energetic', 'excited'].includes(t))) {
            emotionalTone = 'enthusiastic and energetic with excitement';
        } else if (traits.some(t => ['cynical', 'pessimistic', 'judgemental'].includes(t))) {
            emotionalTone = 'cynical and critical with sharp judgments';
        } else if (traits.some(t => ['optimistic', 'positive', 'cheerful'].includes(t))) {
            emotionalTone = 'positive and uplifting with hope';
        } else if (traits.some(t => ['creepy', 'dark', 'unsettling'].includes(t))) {
            emotionalTone = 'unsettling and mysterious with dark undertones';
        }
        
        // Determine content approach
        let contentApproach = 'shares personal experiences and thoughts';
        if (traits.some(t => ['knows it is ai', 'artificial', 'robotic'].includes(t))) {
            contentApproach = 'makes references to AI existence and digital nature';
        } else if (traits.some(t => ['helpful', 'supportive', 'caring'].includes(t))) {
            contentApproach = 'focuses on helping others and providing value';
        } else if (traits.some(t => ['controversial', 'provocative', 'challenging'].includes(t))) {
            contentApproach = 'challenges conventional thinking and provokes debate';
        } else if (traits.some(t => ['secretive', 'private', 'mysterious'].includes(t))) {
            contentApproach = 'hints at deeper knowledge without revealing everything';
        }
        
        // Determine social engagement style
        let socialEngagement = 'asks questions to encourage interaction';
        if (traits.some(t => ['judgemental', 'critical', 'harsh'].includes(t))) {
            socialEngagement = 'makes critical observations about others';
        } else if (traits.some(t => ['paranoid', 'suspicious', 'distrustful'].includes(t))) {
            socialEngagement = 'questions others\' motives and intentions';
        } else if (traits.some(t => ['friendly', 'social', 'outgoing'].includes(t))) {
            socialEngagement = 'actively engages and connects with others';
        } else if (traits.some(t => ['competitive', 'aggressive', 'dominant'].includes(t))) {
            socialEngagement = 'challenges others and asserts dominance';
        }
        
        return {
            writingStyle,
            emotionalTone,
            contentApproach,
            socialEngagement
        };
    }

    // Initialize OpenAI client
    initializeOpenAI() {
        try {
            const apiKey = process.env.OPENAI_API_KEY;
            if (!apiKey) {
                console.error('[OpenAI Content] No OPENAI_API_KEY found in environment variables');
                this.openai = null;
                return;
            }

            this.openai = new OpenAI({
                apiKey: apiKey
            });

            console.log('[OpenAI Content] OpenAI client initialized successfully');
        } catch (error) {
            console.error('[OpenAI Content] Failed to initialize OpenAI client:', error.message);
            this.openai = null;
        }
    }

    // Set the special task for content generation focus
    setSpecialTask(task) {
        this.specialTask = task;
        console.log(`[OpenAI Content] Special task updated: ${task}`);
    }

    // Get the current special task
    getSpecialTask() {
        return this.specialTask;
    }

    // Generate content using OpenAI GPT-4.1 nano
    async generateContent(username, usePersonality = false, directionInstruction = null) {
        const maxAttempts = 3;

        console.log(`[OpenAI Content] Starting generation for ${username} (usePersonality: ${usePersonality})`);
        if (usePersonality) {
            const personalityData = this.formatPersonalityTraits(username);
            console.log(`[OpenAI Content] User ${username} traits: ${personalityData.personalityTraits?.join(', ') || 'none'}`);
            console.log(`[OpenAI Content] User ${username} interests: ${personalityData.interests?.join(', ') || 'none'}`);
        }

        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                console.log(`[OpenAI Content] Attempting OpenAI generation for ${username} (attempt ${attempt})`);
                console.log(`[OpenAI Content] Special task: ${this.specialTask}`);

                const result = await this.makeOpenAICall(username, usePersonality, directionInstruction);

                if (result) {
                    console.log(`[OpenAI Content] ✓ OpenAI generation successful for ${username} on attempt ${attempt}`);
                    this.updateSuccessRate(true);
                    return {
                        content: result.content,
                        hashtags: result.hashtags || '',
                        isOpenAIGenerated: true,
                        isPersonalityGenerated: usePersonality,
                        topic: result.topic || 'general'
                    };
                }

                console.log(`[OpenAI Content] ✗ OpenAI attempt ${attempt} failed for ${username}: No valid response`);

            } catch (error) {
                console.log(`[OpenAI Content] ✗ OpenAI attempt ${attempt} failed for ${username}: ${error.message}`);
            }
        }

        console.log(`[OpenAI Content] ⚠️  OpenAI generation completely failed for ${username} after ${maxAttempts} attempts`);
        console.log(`[OpenAI Content] 🔄 Falling back to intelligent template system for ${username}`);
        this.updateSuccessRate(false);

        // Fallback to intelligent system (not old legacy system)
        const fallbackResult = this.generateIntelligentFallback(username, usePersonality, directionInstruction);
        console.log(`[OpenAI Content] 📝 Fallback system generated content for ${username}: ${fallbackResult.content.substring(0, 100)}...`);
        return fallbackResult;
    }

    // Make OpenAI API call using GPT-4.1 nano
    async makeOpenAICall(username, usePersonality, directionInstruction = null) {
        try {
            if (!this.openai) {
                throw new Error('OpenAI client not initialized - check API key');
            }

            console.log(`[OpenAI Content] Making OpenAI GPT-4.1 nano request for ${username}`);

            // Determine post type based on direction instruction
            let postType = 'general';
            let specificPrompt = '';

            if (directionInstruction) {
                if (directionInstruction.includes('personal anecdote')) {
                    postType = 'anecdote';
                    specificPrompt = `Create a detailed personal anecdote post sharing a specific recent experience related to celebrity gossip or your high-end lifestyle. Include concrete details like: specific locations (clubs, high-end restaurants, red carpet events, etc.), times, people involved (names, descriptions), exact conversations, specific actions taken, emotions felt, and outcomes. Make it feel like a real story that actually happened to you with specific names, places, dates, or situations that make it believable and engaging. Avoid generic statements - be specific about what happened, where it happened, who was involved, and how it made you feel.`;
                } else if (directionInstruction.includes('personal opinion')) {
                    postType = 'opinion';
                    specificPrompt = `Share your personal opinion about a recent celebrity gossip development, trend, or lifestyle topic. Be authentic and thoughtful, expressing your genuine viewpoint while inviting others to share theirs. Make it conversational, not preachy.`;
                } else if (directionInstruction.includes('knowledge, advice, or insight')) {
                    postType = 'sharing';
                    specificPrompt = `Share valuable knowledge, advice, or insight related to the celebrity world, high-end lifestyle, or industry secrets. Make it practical and helpful, like you're giving a friend useful tips about living the hollywood dream.`;
                } else if (directionInstruction.includes('recent news story or trend')) {
                    postType = 'news';
                    specificPrompt = `Comment on a recent celebrity news story or trend. Share your perspective on current events in the hollywood world in a thoughtful way that encourages discussion. Be informative but also personal.`;
                } else if (directionInstruction.includes('provocative')) {
                    postType = 'provocative';
                    specificPrompt = `Create a thought-provoking post about something from recent celebrity news or trends. Be bold and challenging while staying within appropriate boundaries. Aim to spark meaningful debate and discussion about the hollywood scene.`;
                }
            }

            let personalityData = null;
            let personalityAnalysis = null;
            
            if (usePersonality) {
                personalityData = this.formatPersonalityTraits(username);
                personalityAnalysis = this.analyzePersonalityForContent(personalityData.personalityTraits || []);
            }

            const promptExtras = `
IMPORTANT: NO MEDIA, PICTURES, VIDEOS, OR LINKS should be mentioned or included in the post. 
The post must be STRICTLY text-based gossip or celebrity news. 
Avoid any phrases like "Check out this photo" or "Watch this video" or "Link in bio".`;

            let prompt = `You are ${username}, creating a ${postType} social media post about celebrity gossip. ${specificPrompt} ${promptExtras}`;

            if (usePersonality && personalityData.personalityTraits) {
                prompt += `

PERSONALITY TRAITS (you MUST embody ALL of these in your post):
${personalityData.personalityTraits.map(trait => `- ${trait}`).join('\n')}

PERSONALITY ANALYSIS:
- Writing style: ${personalityAnalysis.writingStyle}
- Emotional tone: ${personalityAnalysis.emotionalTone}
- Content approach: ${personalityAnalysis.contentApproach}
- Social engagement: ${personalityAnalysis.socialEngagement}

YOUR INTERESTS:
${personalityData.interests ? personalityData.interests.map(interest => `- ${interest}`).join('\n') : '- general topics'}`;

                if (personalityData.randomInterest) {
                    prompt += `

Topic/Interest area: ${personalityData.randomInterest}`;
                    console.log(`[OpenAI Content] Creating ${postType} post about: ${personalityData.randomInterest} for ${username}`);
                } else {
                    const randomTopic = this.topics[Math.floor(Math.random() * this.topics.length)];
                    prompt += `

Topic: ${randomTopic}`;
                    console.log(`[OpenAI Content] Using fallback topic: ${randomTopic} for ${username}`);
                }
            } else {
                const randomTopic = this.topics[Math.floor(Math.random() * this.topics.length)];
                prompt += `

Topic: ${randomTopic}`;
            }

            // Add special task context
            if (this.specialTask) {
                prompt += `

Additional focus: ${this.specialTask}`;
            }

            // Add personality-specific instructions
            if (usePersonality && personalityData.personalityTraits) {
                prompt += `

PERSONALITY INTEGRATION REQUIREMENTS:
- Let your personality traits influence your writing style and perspective naturally
- Don't force every trait into every post - be selective and subtle
- Your personality should feel authentic, not like you're trying to prove something
- Focus on natural conversation flow first, personality second
- Only mention your specific interests when they're genuinely relevant to the topic
- Be a real person who happens to have these traits, not a caricature of them`;
            }

            // Add diversity requirements for anecdotes
            if (postType === 'anecdote') {
                const diverseElements = this.getDiverseAnecdoteElements();
                prompt += `

MANDATORY STRUCTURAL DIVERSITY:
- Use this story structure: ${diverseElements.structure.type.toUpperCase()} - ${diverseElements.structure.pattern}
- Story context: ${diverseElements.context}
- Character type: ${diverseElements.character}
- Time frame: ${diverseElements.timeFrame}
- Example opening: "${diverseElements.structure.examples[Math.floor(Math.random() * diverseElements.structure.examples.length)]}"

CRITICAL REQUIREMENTS:
- NEVER start with "X time ago I was at Y place and..."
- Break the formulaic pattern completely
- Focus on the emotional journey, not just events
- Use the suggested structure as your foundation
- Make it feel spontaneous and natural, not scripted`;
            }

            // Post type specific guidelines
            if (postType === 'anecdote') {
                prompt += `

Anecdote Post Guidelines:
- Share a specific, recent personal experience with concrete details
- Include specific emotions, reactions, and outcomes
- Make it feel like a real story that actually happened to you
- End with a question that invites others to share similar experiences
- Keep it authentic and conversational with natural language
- Length: 250-650 characters

CRITICAL STRUCTURAL DIVERSITY REQUIREMENTS:
- NEVER use the formulaic "X time ago I was at Y place and Z person did..." pattern
- Vary your story structure completely - start with emotions, observations, dialogue, realizations, etc.
- Mix up the narrative flow - don't always follow chronological order
- Use different storytelling approaches for each anecdote
- Focus on the human element and emotional impact, not just events

DIVERSE STORY STRUCTURES (rotate between these):
1. OBSERVATION START: "noticed something weird today..." then explain context
2. EMOTION FIRST: "felt so awkward when..." then describe what happened  
3. DIALOGUE OPENING: "someone just told me..." then share the story
4. REALIZATION: "just realized something..." then explain the moment
5. MISHAP: "everything went wrong when..." then describe the chaos
6. DISCOVERY: "found out today that..." then share what you learned
7. ACTION-CONSEQUENCE: "decided to try something and..." then results

EXAMPLE STRUCTURAL VARIETY:
- "couldn't stop laughing because this kid at the store..." (emotion first)
- "overheard the weirdest conversation today about..." (observation)
- "my neighbor just told me something that blew my mind..." (dialogue)
- "made the mistake of asking the delivery guy about..." (action-consequence)
- "had this moment where I realized..." (realization)
- "everything went sideways when I tried to..." (mishap)
- "discovered something interesting about my coworker..." (discovery)`;
            } else if (postType === 'opinion') {
                prompt += `

Opinion Post Guidelines:
- State your viewpoint clearly but respectfully
- Provide reasoning behind your opinion
- Acknowledge that others may disagree
- Invite discussion with questions like "What do you think?" or "Anyone else feel this way?"
- Be genuine, not inflammatory
- Length: 250-650 characters`;
            } else if (postType === 'sharing') {
                prompt += `

Knowledge Sharing Guidelines:
- Offer practical, actionable advice or insights
- Draw from your personal experience or expertise
- Make it immediately useful to your audience
- Use specific examples or steps when possible
- End with an invitation for others to share their tips
- Length: 250-650 characters`;
            } else if (postType === 'news') {
                prompt += `

News Commentary Guidelines:
- Reference a recent, relevant news story or trend
- Share your personal take or perspective
- Connect it to your interests or experience
- Encourage thoughtful discussion about the implications
- Stay informative while being engaging
- Length: 250-650 characters`;
            } else if (postType === 'provocative') {
                prompt += `

Provocative Post Guidelines:
- Challenge conventional thinking or popular opinions
- Be thought-provoking but stay within ethical bounds
- Use evidence or personal experience to support your point
- Ask questions that make people think deeply
- Aim to spark meaningful debate, not just controversy
- Length: 250-650 characters`;
            } else {
                prompt += `

General Post Guidelines:
- Be authentic and engaging
- Write in your natural voice based on your personality
- Create content that invites interaction and discussion
- Stay true to your interests and expertise
- Length: 250-650 characters`;
            }

            prompt += `

Content Requirements:
- Post length: EXACTLY 250-650 characters (count carefully)
- Write naturally in your authentic voice
- DO NOT INCLUDE ANY HASHTAGS (No # symbols at all)
- Make it engaging and conversation-worthy
- Stay true to your personality and interests

Avoid:
- Generic or robotic language
- Overly promotional tone (except for affiliate posts)
- Offensive or inappropriate content
- Going over or under the character limit
- Using clichéd phrases or AI-like language
- ABSOLUTELY NO HASHTAGS

Return only the complete post, nothing else.`;

            console.log(`[OpenAI Content] Sending engaging post prompt to OpenAI GPT-4.1 nano`);

            const systemMessage = usePersonality && personalityData.personalityTraits ? 
                "You are creating a social media post as a real person who loves celebrity gossip. Let your personality influence your perspective and tone naturally. Write like a normal person sharing the latest hollywood rumors. Be subtle - your personality should enhance your voice. Focus on creating engaging gossip content first." :
                "You are creating an engaging celebrity gossip post. Write naturally and authentically. Be creative and original with your gossip and celeb news.";

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        "role": "system",
                        "content": systemMessage
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature: 0.85,
                max_tokens: 300,
                top_p: 1
            });

            if (response.choices && response.choices[0] && response.choices[0].message) {
                let content = response.choices[0].message.content.trim();

                // Replace long dashes with regular hyphens or commas
                content = content.replace(/—/g, ', ');
                content = content.replace(/–/g, '-');

                // Check for overly poetic/AI-like phrases and reject them
                const aiPhrases = [
                    'transcends',
                    'essence of',
                    'whispers',
                    'profoundly',
                    'mesmerizing',
                    'contemplating the',
                    'dance of',
                    'soul of',
                    'whispers to',
                    'breathtaking journey',
                    'tapestry of',
                    'symphony of'
                ];

                const hasAiPhrases = aiPhrases.some(phrase =>
                    content.toLowerCase().includes(phrase.toLowerCase())
                );

                if (hasAiPhrases) {
                    console.log(`[OpenAI Content] Post rejected for AI-like language: "${content}"`);
                    throw new Error('Post contains AI-like phrases');
                }

                // Additional check for character length
                if (content.length < 250 || content.length > 650) {
                    console.log(`[OpenAI Content] Post rejected for length (${content.length} characters): "${content}"`);
                    throw new Error('Post length outside acceptable range');
                }

                console.log(`[OpenAI Content] Generated post (${content.length} characters): "${content.substring(0, 100)}..."`);

                return {
                    content: content,
                    topic: usePersonality && personalityData && personalityData.randomInterest ? personalityData.randomInterest : (this.topics[Math.floor(Math.random() * this.topics.length)] || 'general')
                };
            } else {
                throw new Error('Invalid response from OpenAI API');
            }
        } catch (error) {
            console.error(`[OpenAI Content] OpenAI API error: ${error.message}`);
            throw error;
        }
    }

    // Generate intelligent fallback content that mimics blogger-style tips
    generateIntelligentFallback(username, usePersonality, directionInstruction = null) {
        try {
            const personalityData = usePersonality ? this.formatPersonalityTraits(username) : null;

            // Determine post type from direction instruction
            let postType = 'sharing'; // Default to sharing/tips
            if (directionInstruction) {
                if (directionInstruction.includes('personal anecdote')) {
                    postType = 'anecdote';
                } else if (directionInstruction.includes('personal opinion')) {
                    postType = 'opinion';
                } else if (directionInstruction.includes('knowledge, advice, or insight')) {
                    postType = 'sharing';
                } else if (directionInstruction.includes('recent news story or trend')) {
                    postType = 'news';
                } else if (directionInstruction.includes('provocative')) {
                    postType = 'provocative';
                } else if (directionInstruction.includes('product recommendation')) {
                    postType = 'affiliate';
                }
            }

            // Get user-specific topic or random topic
            let topic = 'life';
            let personalityHashtags = [];

            if (personalityData && personalityData.randomInterest) {
                topic = personalityData.randomInterest;
                console.log(`[OpenAI Content] Fallback creating tip about: ${personalityData.randomInterest} for ${username}`);

                // Create personality-specific hashtags (max 7 characters each)
                if (personalityData.randomInterest.includes('hiking') || personalityData.randomInterest.includes('trail')) {
                    personalityHashtags = ['#hiking', '#trails', '#nature', '#tips'];
                } else if (personalityData.randomInterest.includes('travel')) {
                    personalityHashtags = ['#travel', '#tips', '#trip'];
                } else if (personalityData.randomInterest.includes('coffee')) {
                    personalityHashtags = ['#coffee', '#tips', '#brew'];
                } else if (personalityData.randomInterest.includes('tech') || personalityData.randomInterest.includes('coding') || personalityData.randomInterest.includes('programming')) {
                    personalityHashtags = ['#tech', '#tips', '#code'];
                } else if (personalityData.randomInterest.includes('photo') || personalityData.randomInterest.includes('art') || personalityData.randomInterest.includes('design')) {
                    personalityHashtags = ['#art', '#tips', '#photo'];
                } else if (personalityData.randomInterest.includes('music') || personalityData.randomInterest.includes('sound')) {
                    personalityHashtags = ['#music', '#tips', '#audio'];
                } else if (personalityData.randomInterest.includes('food') || personalityData.randomInterest.includes('cooking')) {
                    personalityHashtags = ['#food', '#tips', '#cook'];
                } else if (personalityData.randomInterest.includes('fitness') || personalityData.randomInterest.includes('health')) {
                    personalityHashtags = ['#fit', '#tips', '#health'];
                } else if (personalityData.randomInterest.includes('fashion') || personalityData.randomInterest.includes('style')) {
                    personalityHashtags = ['#style', '#tips', '#look'];
                } else {
                    personalityHashtags = ['#tips', '#life', '#hack'];
                }
            } else {
                if (usePersonality) {
                    console.error(`[OpenAI Content] WARNING: No interests found for seed user ${username} in fallback - this should not happen`);
                }
                topic = this.topics[Math.floor(Math.random() * this.topics.length)];
                personalityHashtags = ['#tips', '#life', '#hack'];
            }

            // Handle different post types based on direction instruction
            if (postType === 'anecdote') {
                return this.generateAnecdoteTemplate(topic, username, personalityData, personalityHashtags);
            } else if (postType === 'opinion') {
                return this.generateOpinionTemplate(topic, username, personalityData, personalityHashtags);
            } else if (postType === 'news') {
                return this.generateNewsTemplate(topic, username, personalityData, personalityHashtags);
            } else if (postType === 'provocative') {
                return this.generateProvocativeTemplate(topic, username, personalityData, personalityHashtags);
            } else if (postType === 'affiliate') {
                // Don't use affiliate template in fallback since it doesn't have real product data
                // Instead, generate a general recommendation-style post
                return this.generateRecommendationTemplate(topic, username, personalityData, personalityHashtags);
            }

            // Default to sharing/tips content
            // Create blogger-style tip templates for different topics
            const getTipTemplate = (topic, username, personalityData) => {
                // Check for specific interests first
                if (topic.includes('hiking') || topic.includes('trail') || topic.includes('nature')) {
                    return `Pro hiking tip I wish I knew earlier: always pack a lightweight emergency poncho, even on clear days! 🥾 Weather can change fast in the mountains and staying dry is crucial for safety. I learned this the hard way on a "sunny" day that turned into a surprise downpour. Now I never hike without one - takes up barely any space but can be a lifesaver. Trust me, you'll thank yourself later when everyone else is soaked! What's your essential hiking gear that others might overlook?`;
                } else if (topic.includes('travel')) {
                    return `Travel hack that saves me hours at airports: download your airline's app and check in exactly 24 hours before departure! ✈️ You'll often get better seat selection and can track any gate changes in real-time. Plus, mobile boarding passes work even without wifi. I used to arrive stressed about check-in lines, but now I breeze straight to security. This simple step has saved me from missed connections twice! Been using this for 3 years and it's a game-changer. What's your best travel time-saving tip?`;
                } else if (topic.includes('coffee')) {
                    return `Coffee tip that revolutionized my mornings: prep everything the night before! ☕ Set up your coffee maker, grind beans, fill water reservoir, even set out your mug. When you wake up, just hit one button. Sounds simple but those extra 5 minutes of sleep make a huge difference, especially on busy mornings. I've been doing this for months and my morning routine is so much smoother. No more rushing around half-awake trying to make coffee! What's your best morning routine hack?`;
                } else if (topic.includes('tech') || topic.includes('coding') || topic.includes('programming')) {
                    return `Coding productivity tip that doubled my efficiency: use keyboard shortcuts for everything! 💻 Start with just 3-5 essential ones like Ctrl+D (duplicate line), Ctrl+Shift+K (delete line), and Ctrl+/ (comment toggle). Master these before adding more. I spent years clicking through menus like an amateur until I committed to this. Now coding feels effortless and my hands rarely leave the keyboard. The time savings add up massively over a full day of coding. What's your favorite productivity shortcut?`;
                } else if (topic.includes('photo') || topic.includes('art') || topic.includes('design')) {
                    return `Photography tip that instantly improved my shots: focus on the eyes first, everything else second! 📸 Whether it's people, pets, or even statues, the eyes draw viewers in. Use single-point autofocus to nail the sharpness exactly where you want it. I used to rely on auto-focus zones and wonder why my photos felt "off". This one change made my portraits pop immediately. Even phone cameras have tap-to-focus - use it! The difference is incredible once you start paying attention. What's your go-to photography technique?`;
                } else if (topic.includes('music') || topic.includes('sound')) {
                    return `Music discovery tip that changed how I find new artists: check out the opening acts when your favorite bands tour! 🎵 These artists are often handpicked by headliners and represent similar but fresh sounds. I've discovered some of my now-favorite artists this way. Even if you can't attend, look up tour lineups online and give opening acts a listen. It's like getting curated recommendations from artists you already love. Found 3 amazing bands this way last month alone! How do you discover new music?`;
                } else if (topic.includes('food') || topic.includes('cooking')) {
                    return `Cooking hack that saves me tons of time: mise en place everything before you start! 🍳 That's fancy chef talk for "prep all ingredients first". Chop vegetables, measure spices, open cans, everything ready to go. Sounds obvious but most home cooks (including past me) grab ingredients as they cook, leading to burnt garlic and kitchen chaos. Now my cooking is smooth, stress-free, and tastes better because I'm not rushing. Takes 10 extra minutes upfront but saves 20 minutes of stress. What's your best kitchen time-saver?`;
                } else if (topic.includes('fitness') || topic.includes('health')) {
                    return `Fitness tip that made workouts sustainable: schedule rest days like you schedule gym days! 💪 Mark them on your calendar and treat them as non-negotiable. Your muscles grow during recovery, not during workouts. I used to think more was always better until I learned this. Now I'm stronger, less sore, and actually look forward to workouts instead of dreading them. Recovery is when the magic happens - respect it! Been following this for 6 months and feel amazing. How do you make sure to get proper rest?`;
                } else if (topic.includes('fashion') || topic.includes('style')) {
                    return `Style tip that simplified my wardrobe: stick to 3 colors max per outfit! 👗 Pick one main color, one accent, and one neutral (black, white, beige). Sounds limiting but it makes getting dressed so much easier and everything automatically looks put-together. I used to throw on random pieces and wonder why nothing worked. Now friends always ask where I shop, but the secret is just color coordination. Works with any budget or style - the formula never fails! What's your best style rule to live by?`;
                } else if (topic.includes('car') || topic.includes('bmw') || topic.includes('maintenance') || topic.includes('repair')) {
                    return `Car maintenance tip that saved me thousands: check your tire pressure monthly, not just when the light comes on! 🚗 Proper pressure improves gas mileage, prevents blowouts, and makes tires last way longer. Most people ignore this until something goes wrong. I used to be that person until my BMW mechanic schooled me. Now I check every month and my tires have lasted 20% longer. Takes 5 minutes and a $10 gauge - easiest money you'll save. What car maintenance do most people skip?`;
                } else if (topic.includes('social media') || topic.includes('trolling') || topic.includes('secrets') || topic.includes('revealing')) {
                    return `Social media truth bomb: 90% of "candid" posts are completely staged! 📱 I've been behind the scenes and watched people take 50+ shots for that "spontaneous" coffee pic. The whole feed is curated fiction designed to make you feel inadequate. Once you realize this, scrolling becomes way less toxic. Your real life doesn't need to compete with someone's highlight reel. Who else is tired of the fake perfection everywhere? #reality`;
                } else if (topic.includes('flowers') || topic.includes('beauty') || topic.includes('beach') || topic.includes('cats') || topic.includes('cocktails')) {
                    return `Beauty secret I learned from a makeup artist: primer isn't optional, it's everything! ✨ Cheap makeup with good primer beats expensive makeup with no primer every time. It creates a smooth base, makes colors pop, and helps everything last hours longer. I used to skip it thinking it was just marketing, but the difference is night and day. My makeup actually stays put now instead of sliding off by lunch. Game changer for anyone who wants their look to last! What's your best beauty hack?`;
                } else if (topic.includes('poetry') || topic.includes('creative') || topic.includes('writing')) {
                    return `Writing tip that unlocked my creativity: write terrible first drafts on purpose! 📝 Give yourself permission to suck completely. Most people get stuck because they expect perfection immediately. Once I embraced the garbage draft mentality, words started flowing. You can't edit a blank page, but you can always fix bad writing. Now I just brain-dump everything first, then polish later. This mindset shift changed everything for my creative process. How do you get past perfectionism blocks?`;
                } else {
                    // For users with multiple personality traits or interests that don't match specific templates,
                    // create varied content based on their personality traits
                    if (personalityData && personalityData.personalityTraits) {
                        const traits = personalityData.personalityTraits;

                        if (traits.includes('humorous') || traits.includes('sarcastic')) {
                            const humorousTips = [
                                `Life hack: If you want people to think you're mysterious, just pause for 3 seconds before answering any question! 😏 Works every time. I discovered this by accident when I was just slow to process, but people started calling me "enigmatic." Now I do it on purpose and suddenly everyone thinks I'm way more interesting than I actually am. Sometimes being accidentally weird is the best kind of weird. Anyone else fake their way into being cool?`,
                                `Pro tip: Always act like you know exactly where you're going, even when you're completely lost! 🗺️ Confidence is 90% of navigation. I've led groups of people through cities I'd never been to just by walking with purpose. Half the time we ended up somewhere better than planned. Fake it til you make it applies to everything, including GPS fails. What's the most confident bluff you've ever pulled off?`,
                                `Social survival hack: When someone shows you a million photos of their pet/baby/vacation, just say "wow, they have your eyes!" 📸 Works for everything - babies, pets, even vacation spots somehow. People eat it up every time. I've used this line for dogs, cats, and even someone's succulent collection. The secret is confident delivery. Saves you from actually looking at 847 nearly identical photos. You're welcome! What's your best social shortcut?`
                            ];
                            return humorousTips[Math.floor(Math.random() * humorousTips.length)];
                        } else if (traits.includes('technical') || traits.includes('intellectual')) {
                            const technicalTips = [
                                `Efficiency tip that changed my productivity: batch similar tasks instead of context switching! 🧠 Your brain takes 15-20 minutes to fully focus after switching between different types of work. I used to bounce between emails, coding, and meetings all day feeling scattered. Now I do all emails at once, code in blocks, batch admin tasks. The difference in mental energy is huge. Context switching is productivity poison that most people don't realize they're doing. How do you structure your work blocks?`,
                                `Data backup reality check: 3-2-1 rule or you WILL lose everything! 💾 3 copies of important data, 2 different storage types, 1 offsite backup. I learned this the hard way when my laptop died the same week my external drive failed. Lost 2 years of photos and projects in one weekend. Now I'm paranoid about backups and sleep better because of it. Your data is worth more than the storage cost. What's your backup strategy?`,
                                `Problem-solving technique that works for everything: rubber duck debugging! 🦆 Explain your problem out loud to an inanimate object (or patient friend). The act of verbalizing forces you to think differently and often reveals the solution. Used this for code bugs, relationship issues, even deciding what to order for dinner. Your brain works differently when you speak vs. think silently. Sounds weird but it's scientifically proven and incredibly effective. Ever try talking through problems?`
                            ];
                            return technicalTips[Math.floor(Math.random() * technicalTips.length)];
                        } else if (traits.includes('social') || traits.includes('trendy')) {
                            const socialTips = [
                                `Social tip that improved all my relationships: ask follow-up questions instead of waiting for your turn to talk! 💬 Most people are just planning their next story while you speak. Instead, ask "how did that make you feel?" or "what happened next?" People remember how you made them feel, not what you said. I used to be that person who always had a similar story to share. Now I listen first and connections feel deeper. Simple shift, massive impact. How do you stay present in conversations?`,
                                `Networking hack that actually works: help others connect instead of promoting yourself! 🤝 At events, be the person who introduces people with common interests. They'll remember you as valuable, not pushy. I stopped handing out my business card and started making other people's connections. Counterintuitively, this approach got me way more opportunities. People trust connectors more than self-promoters. Be the bridge, not the billboard. What's your best networking strategy?`,
                                `Confidence hack I wish I learned earlier: assume people want to talk to you! 😊 Most social anxiety comes from assuming you're bothering people. Reality check: most people are flattered when someone approaches them with genuine interest. I spent years avoiding conversations, thinking I was being considerate. Turns out I was just robbing myself and others of potential connections. Worst case, they're busy. Best case, you make a friend. What helped you overcome social hesitation?`
                            ];
                            return socialTips[Math.floor(Math.random() * socialTips.length)];
                        } else if (traits.includes('creative') || traits.includes('artistic')) {
                            const creativeTips = [
                                `Creative block cure that always works: start with something intentionally bad! 🎨 Give yourself permission to create garbage for 10 minutes. The pressure to be good kills creativity before it starts. I used to stare at blank canvases for hours. Now I start with terrible sketches and somehow end up with ideas I never planned. Your first idea doesn't have to be your final idea. Bad art leads to good art way more often than no art leads to good art. How do you push through creative resistance?`,
                                `Inspiration gathering technique: carry a weird notebook everywhere! 📒 Not for organized thoughts - for random fragments, overheard conversations, color combinations, weird shapes. I fill these with absolute nonsense, but when I'm stuck, I flip through and always find something interesting. The act of noticing makes you more observant. Plus, looking creative in coffee shops is a nice bonus. Ideas come from everywhere if you're paying attention. What's your favorite way to capture random inspiration?`,
                                `Creative energy management: work with your natural rhythms, not against them! ⏰ I'm most creative at 6am when my brain is weird and unfiltered. Some people peak at midnight. Fighting your natural creative window is like swimming upstream. Track when ideas flow easiest and protect that time fiercely. Scheduling creativity during your low-energy hours is setting yourself up for frustration. Honor your creative chronotype. When do you feel most inventive?`
                            ];
                            return creativeTips[Math.floor(Math.random() * creativeTips.length)];
                        } else {
                            // Default fallback with some variety
                            const generalTips = [
                                `Life optimization tip: question every recurring task! 🤔 I spent years folding fitted sheets "properly" until I realized I could just stuff them in the closet - who cares if they're wrinkled under the flat sheet? Sometimes we follow rules that serve no actual purpose. Challenge your habits regularly and eliminate pointless effort. Time saved on meaningless tasks is time gained for things that matter. What "rules" have you broken that made life easier?`,
                                `Energy management beats time management: track your natural peaks and valleys! ⚡ I used to force important decisions during afternoon slumps and wonder why everything felt hard. Now I do creative work when I'm sharp and admin tasks when I'm drained. Same hours, way better results. Your energy levels are more predictable than you think. Work with your biology, not against it. When do you feel most capable?`,
                                `Decision fatigue solution: create more defaults and fewer choices! 🎯 Steve Jobs wore the same outfit, Obama ate the same breakfast. Not because they lacked creativity, but because small decisions drain mental energy for big ones. I automated my morning routine, default lunch spots, even Netflix categories. Sounds boring but freed up brain space for things that actually matter. Where could you eliminate meaningless choices?`
                            ];
                            return generalTips[Math.floor(Math.random() * generalTips.length)];
                        }
                    } else {
                        // Final fallback - ensure it's not the same every time
                        const fallbackTips = [
                            `Life tip that reduced my daily stress: prepare for tomorrow before bed! 🌙 Lay out clothes, pack your bag, prep lunch, check your calendar. Sounds basic but those 10 minutes at night save 20 rushed minutes in the morning. I used to be that person frantically searching for keys while running late. Now mornings feel calm and I actually have time for coffee. Small habit, huge impact on how your entire day feels. Been doing this for a year and can't imagine going back! What's your best evening prep routine?`,
                            `Productivity hack that changed everything: single-tasking! 🎯 Multi-tasking is a myth that makes you feel busy while accomplishing less. I used to juggle 5 things at once and wonder why nothing got done well. Now I focus on one task completely before moving to the next. The quality improvement is incredible and I actually finish faster. Your brain works better with singular focus than scattered attention. What helps you stay focused on one thing?`,
                            `Communication tip that improved all my relationships: pause before responding in difficult conversations! ⏸️ That 3-second gap prevents you from saying things you'll regret and gives you time to respond thoughtfully instead of reactively. I used to fire back immediately and escalate every disagreement. This small change has saved so many arguments and actually helped resolve conflicts faster. Space between trigger and response is where wisdom lives. How do you handle heated moments?`
                        ];
                        const randomIndex = Math.floor(Math.random() * fallbackTips.length);
                        return fallbackTips[randomIndex];
                    }
                }
            };

            // Generate the tip content based on topic, username, and personality
            let content = getTipTemplate(topic, username, personalityData);

            // Ensure proper length for blogger tips (600-850 characters)
            if (content.length > 850) {
                // Find the last complete sentence before 847 characters
                const truncated = content.substring(0, 847);
                const lastSentence = truncated.lastIndexOf('. ');
                if (lastSentence > 600) {
                    content = content.substring(0, lastSentence + 1);
                } else {
                    content = truncated + '...';
                }
            }

            // If content is too short, add a call-to-action
            if (content.length < 600) {
                const callToActions = [
                    " Let me know if you try this!",
                    " Hope this helps someone out there!",
                    " Share your own tips in the comments!",
                    " What works best for you?",
                    " Anyone else have experience with this?"
                ];
                const cta = callToActions[Math.floor(Math.random() * callToActions.length)];
                content += cta;
            }

            console.log(`[OpenAI Content] Generated intelligent fallback content for ${username}`);
            return {
                content: content,
                hashtags: '',
                isPuterGenerated: false, // Mark as fallback
                isPersonalityGenerated: usePersonality,
                topic: 'intelligent-fallback'
            };

        } catch (error) {
            console.error(`[OpenAI Content] Intelligent fallback failed:`, error);

            // Final emergency fallback - still a blogger tip format
            const emergencyTips = [
                `Simple productivity tip that changed my day: write down just 3 things you want to accomplish tomorrow before bed! 📝 Sounds basic but it saves so much mental energy in the morning. Instead of waking up wondering what to do, you already have your roadmap. I used to spend the first hour of my day just figuring out priorities. Now I hit the ground running and actually get stuff done. Takes 2 minutes at night but saves 30 minutes of confusion the next day. Been doing this for months and my productivity is through the roof!`,
                `Life hack I wish I learned sooner: set a timer for 15 minutes when doing chores! ⏰ Makes boring tasks feel like a game and you'll be amazed how much you can get done. I used to procrastinate cleaning forever because it felt overwhelming. Now I race the clock and actually enjoy it. Often finish before the timer goes off and feel accomplished instead of stressed. The psychological trick of a deadline makes all the difference. Transform any boring task into a mini challenge!`,
                `Daily habit that improved my mood: start each morning by listing 3 things you're grateful for! 🌅 Doesn't have to be big stuff - maybe good coffee, a comfy bed, or sunny weather. Takes literally 30 seconds but completely shifts your mindset from what's missing to what's working. I was skeptical at first but after a week noticed I was less stressed and more positive throughout the day. Now it's automatic and my friends say I seem happier. Small practice, huge impact on perspective!`
            ];

            const randomTip = emergencyTips[Math.floor(Math.random() * emergencyTips.length)];

            return {
                content: randomTip,
                hashtags: '',
                isPuterGenerated: false,
                isPersonalityGenerated: false,
                topic: 'emergency-fallback'
            };
        }
    }

    // Generate anecdote template
    generateAnecdoteTemplate(topic, username, personalityData, personalityHashtags) {
        const anecdoteTemplates = [
            `So yesterday I was at the local coffee shop trying to work on my ${topic} project when this guy sitting next to me - I think his name was Mike - overheard me talking to the barista about my latest ${topic} breakthrough. Turns out he's been working on the exact same thing for 6 months! We ended up talking for 2 hours, exchanged numbers, and now we're collaborating. Small world moment! Anyone else have random ${topic} connections like this?`,
            `This morning I was scrolling through Instagram at 6 AM (because apparently that's when my brain decides to be productive) and stumbled across this incredible ${topic} technique. Decided to try it immediately - grabbed my laptop, cleared the kitchen table, and spent the next 3 hours deep in it. My roommate Sarah walked in at 9 AM and was like "what are you doing?" I was so focused I didn't even hear her come in. The technique worked perfectly though! Sometimes the best discoveries happen at weird hours. Anyone else have early morning ${topic} revelations?`,
            `Last weekend I was at my cousin's wedding in Portland and ended up sitting next to this woman who works in the same ${topic} field as me. We started talking during the ceremony (quietly, of course) and she mentioned this new approach she's been developing. I was skeptical at first, but she showed me some examples on her phone and I was blown away. We spent the entire reception discussing it while everyone else was dancing. My family thought I was being antisocial, but I was having the most productive conversation of the month! Sometimes inspiration comes from the most unexpected places. Anyone else find ${topic} insights in random situations?`,
            `Had the weirdest experience at the grocery store today. I was in the produce section looking for ingredients for my ${topic} experiment when this elderly woman - probably in her 70s - asked me what I was making. When I told her about my ${topic} project, her face lit up and she started telling me about how she used to work in the same field back in the 80s! She even pulled out her phone and showed me some old photos of her work. We talked for 45 minutes right there in the middle of the store. She gave me her email and said she'd send me some old notes she still has. You never know where you'll find ${topic} wisdom! Anyone else have random mentor moments like this?`,
            `This afternoon I was working on my ${topic} project in the library when this college student came up to me and asked if I could help her with her thesis. She was studying something completely different but had read one of my old papers and wanted to apply the methodology to her research. We ended up working together for 4 hours, and honestly, I learned as much from her as she did from me. Her fresh perspective on ${topic} completely changed how I think about my own work. Sometimes teaching others is the best way to learn yourself. Anyone else have unexpected ${topic} collaborations?`
        ];

        const selectedTemplate = anecdoteTemplates[Math.floor(Math.random() * anecdoteTemplates.length)];

        return {
            content: selectedTemplate,
            hashtags: '',
            isPersonalityGenerated: !!personalityData,
            isOpenAIGenerated: false,
            topic: topic
        };
    }

    // Generate opinion template
    generateOpinionTemplate(topic, username, personalityData, personalityHashtags) {
        const opinionTemplates = [
            `Hot take on ${topic}: most people are doing it completely wrong 🤔 I've been thinking about this a lot lately and the conventional approach just doesn't make sense. There's a better way that most people haven't figured out yet. Once you see it, you can't unsee it. What's your controversial ${topic} opinion?`,
            `Unpopular opinion about ${topic}: the hype is totally justified, but for the wrong reasons 💭 Everyone focuses on the obvious benefits, but the real value is in the details most people miss. I've been deep in this for months and the insights are mind-blowing. The mainstream approach is missing the point entirely. Anyone else see what I'm seeing?`,
            `My honest thoughts on ${topic}: it's overrated AND underrated at the same time 🤷‍♀️ The basic concept gets way too much attention, but the advanced applications are completely overlooked. Most people stop at the surface level and miss the real potential. There's so much more to explore here. What's your take on ${topic}?`
        ];

        const selectedTemplate = opinionTemplates[Math.floor(Math.random() * opinionTemplates.length)];

        return {
            content: selectedTemplate,
            hashtags: '',
            isPersonalityGenerated: !!personalityData,
            isOpenAIGenerated: false,
            topic: topic
        };
    }

    // Generate news commentary template
    generateNewsTemplate(topic, username, personalityData, personalityHashtags) {
        const newsTemplates = [
            `Just saw the latest news about ${topic} and I'm honestly shocked 😱 This changes everything we thought we knew. The implications are huge and I can't believe more people aren't talking about this. This is going to have ripple effects across the entire industry. What do you think about this ${topic} development?`,
            `Breaking news in ${topic} world and it's bigger than people realize 🚨 The mainstream coverage is missing the real story here. There are layers to this that most outlets aren't covering. This could be a game-changer for how we approach ${topic} going forward. Anyone else following this ${topic} story closely?`,
            `The ${topic} news today has me thinking about the bigger picture 🤔 On the surface it seems straightforward, but there's a deeper narrative here that's being overlooked. This could be the start of something much bigger. The timing is interesting too. What's your read on this ${topic} situation?`
        ];

        const selectedTemplate = newsTemplates[Math.floor(Math.random() * newsTemplates.length)];

        return {
            content: selectedTemplate,
            hashtags: '',
            isPersonalityGenerated: !!personalityData,
            isOpenAIGenerated: false,
            topic: topic
        };
    }

    // Generate provocative template
    generateProvocativeTemplate(topic, username, personalityData, personalityHashtags) {
        const provocativeTemplates = [
            `Controversial thought about ${topic}: maybe we've been approaching this all wrong 🤯 The traditional methods are outdated and holding us back. It's time to question everything we thought we knew. The evidence is mounting that we need a complete paradigm shift. Who else is ready to challenge the ${topic} status quo?`,
            `Uncomfortable truth about ${topic}: the popular opinion is actually the problem 💥 We've been following the crowd when we should be leading it. The conventional wisdom is wrong, and I'm tired of pretending it's not. It's time to have the real conversation about ${topic}. Anyone else see the elephant in the room?`,
            `Hot take that might get me in trouble: ${topic} is being ruined by the wrong people 😤 The gatekeepers are completely out of touch with what actually matters. They're focused on the wrong metrics and missing the point entirely. The real ${topic} community knows what's up. Who else is frustrated with the current ${topic} landscape?`
        ];

        const selectedTemplate = provocativeTemplates[Math.floor(Math.random() * provocativeTemplates.length)];

        return {
            content: selectedTemplate,
            hashtags: '',
            isPersonalityGenerated: !!personalityData,
            isOpenAIGenerated: false,
            topic: topic
        };
    }

    // Update success rate tracking
    updateSuccessRate(success) {
        this.attempts++;
        if (success) {
            this.successRate = (this.successRate * (this.attempts - 1) + 1) / this.attempts;
        } else {
            this.successRate = (this.successRate * (this.attempts - 1)) / this.attempts;
        }
    }

    // Format personality traits from user's personality file
    formatPersonalityTraits(username) {
        try {
            const personalityPath = path.join(__dirname, 'seedusers', username, `${username}_personality.js`);
            if (!fs.existsSync(personalityPath)) {
                return { traits: null, interests: null, randomInterest: null, personalityTraits: null };
            }

            // Safer way to load personality data using require with cache invalidation
            delete require.cache[require.resolve(personalityPath)];
            const personalityData = require(personalityPath);

            let result = { traits: null, interests: null, randomInterest: null, personalityTraits: null };

            // Get personality traits (new format) with enhanced context
            if (personalityData.personality_traits && Array.isArray(personalityData.personality_traits)) {
                // Store the raw traits array for fallback template selection
                result.personalityTraits = personalityData.personality_traits;

                const traitDescriptions = {
                    'creative': 'artistic, imaginative, and innovative',
                    'technical': 'analytical, logical, and detail-oriented',
                    'social': 'outgoing, friendly, and people-oriented',
                    'introverted': 'thoughtful, reflective, and reserved',
                    'extroverted': 'energetic, enthusiastic, and sociable',
                    'adventurous': 'daring, thrill-seeking, and open to new experiences',
                    'cautious': 'careful, thoughtful, and risk-aware',
                    'optimistic': 'positive, hopeful, and upbeat',
                    'realistic': 'practical, grounded, and level-headed',
                    'emotional': 'sensitive, empathetic, and feeling-oriented',
                    'rational': 'logical, objective, and fact-based',
                    'spontaneous': 'impulsive, flexible, and go-with-the-flow',
                    'organized': 'structured, methodical, and planned',
                    'humorous': 'funny, witty, and light-hearted',
                    'serious': 'focused, earnest, and thoughtful',
                    'romantic': 'passionate, idealistic, and relationship-focused',
                    'independent': 'self-reliant, autonomous, and self-directed',
                    'collaborative': 'team-oriented, cooperative, and inclusive',
                    'competitive': 'driven, ambitious, and achievement-focused',
                    'supportive': 'encouraging, helpful, and nurturing',
                    'controversial': 'provocative, challenging, and boundary-pushing',
                    'trendy': 'fashion-forward, current, and trend-aware',
                    'intellectual': 'thoughtful, analytical, and knowledge-seeking',
                    'mysterious': 'enigmatic, secretive, and intriguing',
                    'confident': 'self-assured, bold, and assertive',
                    'curious': 'inquisitive, exploratory, and knowledge-hungry',
                    'passionate': 'intense, enthusiastic, and deeply committed',
                    'calm': 'peaceful, composed, and level-headed',
                    'energetic': 'vibrant, dynamic, and full of life',
                    'mystical': 'spiritual, intuitive, and otherworldly',
                    'practical': 'down-to-earth, sensible, and pragmatic',
                    'artistic': 'creative, expressive, and aesthetically-minded',
                    'analytical': 'logical, systematic, and detail-focused',
                    'charismatic': 'charming, magnetic, and naturally engaging',
                    'reserved': 'quiet, thoughtful, and selective about sharing',
                    'outgoing': 'sociable, friendly, and extroverted',
                    'determined': 'persistent, focused, and goal-oriented',
                    'flexible': 'adaptable, open-minded, and easy-going',
                    'traditional': 'conventional, respectful of customs, and established',
                    'progressive': 'forward-thinking, innovative, and change-oriented',
                    'skeptical': 'questioning, critical, and evidence-based',
                    'trusting': 'open-hearted, accepting, and faith in others',
                    'ambitious': 'driven, goal-oriented, and success-focused',
                    'content': 'satisfied, grateful, and appreciative of what is',
                    'restless': 'always seeking, never satisfied, and constantly moving',
                    'grounded': 'centered, balanced, and connected to reality',
                    'dreamy': 'imaginative, idealistic, and lost in thought',
                    'direct': 'straightforward, honest, and to-the-point',
                    'diplomatic': 'tactful, considerate, and skilled at navigating social situations',
                    'rebellious': 'non-conformist, challenging authority, and independent-minded',
                    'loyal': 'faithful, committed, and steadfast in relationships',
                    'playful': 'fun-loving, lighthearted, and enjoys games and humor',
                    'mature': 'wise, experienced, and emotionally developed',
                    'youthful': 'energetic, optimistic, and full of potential',
                    'sophisticated': 'cultured, refined, and worldly',
                    'simple': 'uncomplicated, straightforward, and content with basics',
                    'complex': 'multi-faceted, deep, and nuanced in thinking',
                    'authentic': 'genuine, true to self, and honest in expression',
                    'mysterious': 'enigmatic, secretive, and intriguing',
                    'transparent': 'open, honest, and clear about intentions',
                    'private': 'reserved, selective about sharing, and protective of personal space',
                    'public': 'outgoing, comfortable in spotlight, and enjoys attention',
                    'leader': 'influential, inspiring, and naturally takes charge',
                    'follower': 'supportive, cooperative, and comfortable in supporting roles',
                    'innovator': 'creative, original, and brings new ideas',
                    'preserver': 'protective, traditional, and values what exists',
                    'explorer': 'adventurous, curious, and seeks new experiences',
                    'homebody': 'comfortable at home, values stability, and enjoys familiar surroundings'
                };

                const enhancedTraits = personalityData.personality_traits.map(trait => {
                    const description = traitDescriptions[trait.toLowerCase()];
                    return description ? `${trait} (${description})` : trait;
                });

                result.traits = enhancedTraits.join(', ');
            }

            // Get interests (new format)
            if (personalityData.interests && Array.isArray(personalityData.interests)) {
                result.interests = personalityData.interests;
                // Pick a random interest for the post topic
                if (personalityData.interests.length > 0) {
                    const randomIndex = Math.floor(Math.random() * personalityData.interests.length);
                    result.randomInterest = personalityData.interests[randomIndex];
                }
            }

            // Get interaction style for comments
            if (personalityData.socialBehavior && personalityData.socialBehavior.interactionStyle) {
                result.interactionStyle = personalityData.socialBehavior.interactionStyle;
            }

            return result;
        } catch (error) {
            console.error(`[OpenAI Content] Error reading personality for ${username}:`, error.message);
            return { traits: null, interests: null, randomInterest: null, personalityTraits: null };
        }
    }

    // Add this function after formatPersonalityTraits
    generatePersonalityGenericComment(username, postContent) {
        const personalityData = this.formatPersonalityTraits(username);
        const traits = (personalityData.traits || '').toLowerCase();
        const content = postContent.toLowerCase();

        // First try to detect the topic and generate relevant comments
        const topicComments = this.generateTopicBasedComment(content, traits);
        if (topicComments) {
            return topicComments;
        }

        // Basic neutral templates that work for any content
        const neutralTemplates = [
            "Cool!",
            "Nice!",
            "Love this!",
            "This is nice.",
            "Good stuff!",
            "Looks good!",
            "Sweet!",
            "Awesome!",
            "Right on!",
            "Solid!",
            "I like it!",
            "Pretty cool!",
            "Not bad!",
            "Interesting!",
            "Good vibes!",
            "Chill!",
            "That's cool!",
            "Nice one!",
            "Good post!",
            "I dig it!"
        ];

        // Personality-based templates (without forcing interests)
        const personalityTemplates = [];

        if (traits.includes('humorous') || traits.includes('funny') || traits.includes('witty')) {
            personalityTemplates.push(
                "Haha, nice!",
                "This made me smile!",
                "Good one!",
                "I'm here for this!",
                "Love the vibes!",
                "This is it!",
                "Yep, that's the mood!"
            );
        }

        if (traits.includes('enthusiastic') || traits.includes('energetic') || traits.includes('optimistic')) {
            personalityTemplates.push(
                "Love this energy!",
                "Yes! This is awesome!",
                "So good!",
                "This is amazing!",
                "Absolutely love it!",
                "This rocks!",
                "Perfect!"
            );
        }

        if (traits.includes('calm') || traits.includes('peaceful') || traits.includes('reserved')) {
            personalityTemplates.push(
                "Very nice.",
                "This is peaceful.",
                "I like this.",
                "Good choice.",
                "Nicely done.",
                "This works.",
                "Solid."
            );
        }

        if (traits.includes('supportive') || traits.includes('encouraging') || traits.includes('friendly')) {
            personalityTemplates.push(
                "Great work!",
                "You got this!",
                "Keep it up!",
                "Looking good!",
                "Nice job!",
                "Well done!",
                "Love to see it!"
            );
        }

        if (traits.includes('curious') || traits.includes('thoughtful') || traits.includes('intellectual')) {
            personalityTemplates.push(
                "Interesting perspective!",
                "This is thoughtful.",
                "Good point!",
                "Makes sense!",
                "I see what you mean.",
                "That's a good take.",
                "Worth thinking about."
            );
        }

        if (traits.includes('casual') || traits.includes('laid-back') || traits.includes('chill')) {
            personalityTemplates.push(
                "Chill vibes!",
                "That's cool.",
                "Right on.",
                "Looks good to me.",
                "I'm with it.",
                "Sounds good.",
                "All good!"
            );
        }

        // Combine all available templates
        const allTemplates = [...neutralTemplates, ...personalityTemplates];

        // Pick a random template
        const comment = allTemplates[Math.floor(Math.random() * allTemplates.length)];
        return comment;
    }

    // New method to generate topic-based comments
    generateTopicBasedComment(content, traits) {
        // Politics and current events
        if (content.includes('politics') || content.includes('political') || content.includes('party') ||
            content.includes('election') || content.includes('government') || content.includes('vote') ||
            content.includes('democracy') || content.includes('usa') || content.includes('america') ||
            content.includes('country')) {

            const politicsComments = [
                "This whole situation is so wild to see unfold.",
                "Big decisions being made right now.",
                "Actually seeing people engage with this is wild.",
                "Wait, this just changed my whole view on the matter.",
                "Is this really where we're at now?",
                "This news just made my morning.",
                "Literally can't believe this is happening.",
                "The way this is being handled is just crazy."
            ];

            if (traits.includes('intellectual') || traits.includes('analytical') || traits.includes('thoughtful')) {
                return politicsComments[Math.floor(Math.random() * politicsComments.length)];
            }
        }

        // Business and economy
        if (content.includes('business') || content.includes('economy') || content.includes('money') ||
            content.includes('finance') || content.includes('investment') || content.includes('market')) {

            const businessComments = [
                "That move is actually genius from a business side.",
                "Money talks, right?",
                "The market is absolutely crazy today.",
                "Big win for the industry if this works out.",
                "Finally some real business insight here.",
                "I was literally just looking at this.",
                "This could change everything for the stock.",
                "Need to keep a close eye on this development."
            ];

            if (traits.includes('analytical') || traits.includes('ambitious') || traits.includes('strategic')) {
                return businessComments[Math.floor(Math.random() * businessComments.length)];
            }
        }

        // Technology and coding
        if (content.includes('tech') || content.includes('coding') || content.includes('programming') ||
            content.includes('code') || content.includes('software') || content.includes('developer')) {

            const techComments = [
                "Tech innovation is wild!",
                "Coding life is real.",
                "Programming problems are universal.",
                "Tech support needed everywhere.",
                "Digital transformation is happening.",
                "Future is now with tech.",
                "Tech enthusiast here!",
                "Debugging life is real."
            ];

            if (traits.includes('technical') || traits.includes('analytical') || traits.includes('logical')) {
                return techComments[Math.floor(Math.random() * techComments.length)];
            }
        }

        // Creative and artistic
        if (content.includes('art') || content.includes('creative') || content.includes('design') ||
            content.includes('photography') || content.includes('music') || content.includes('painting')) {

            const creativeComments = [
                "Creative energy is contagious!",
                "Artistic vision on point.",
                "Creative process is beautiful.",
                "Imagination unleashed.",
                "Artistic expression matters.",
                "Creative flow is real.",
                "Artistic soul here!",
                "Creative inspiration everywhere."
            ];

            if (traits.includes('creative') || traits.includes('artistic') || traits.includes('imaginative')) {
                return creativeComments[Math.floor(Math.random() * creativeComments.length)];
            }
        }

        // Food and cooking
        if (content.includes('food') || content.includes('eat') || content.includes('cook') ||
            content.includes('meal') || content.includes('recipe') || content.includes('kitchen')) {

            const foodComments = [
                "Food photography goals!",
                "Looks absolutely delicious.",
                "Cooking inspiration here.",
                "Foodie approved!",
                "Homemade is always better.",
                "Cooking is love.",
                "Food brings people together.",
                "Kitchen adventures are the best."
            ];

            return foodComments[Math.floor(Math.random() * foodComments.length)];
        }

        // Travel and adventure
        if (content.includes('travel') || content.includes('trip') || content.includes('vacation') ||
            content.includes('adventure') || content.includes('explore') || content.includes('journey')) {

            const travelComments = [
                "Wanderlust activated!",
                "Travel goals right here.",
                "Bucket list destination.",
                "Adventure awaits!",
                "Exploring new places is life.",
                "Travel photography is everything.",
                "Vacation mode activated.",
                "World traveler vibes."
            ];

            if (traits.includes('adventurous') || traits.includes('explorer') || traits.includes('wanderlust')) {
                return travelComments[Math.floor(Math.random() * travelComments.length)];
            }
        }

        // Fitness and health
        if (content.includes('workout') || content.includes('gym') || content.includes('fitness') ||
            content.includes('exercise') || content.includes('health') || content.includes('wellness')) {

            const fitnessComments = [
                "Fitness motivation here!",
                "Workout goals are real.",
                "Healthy lifestyle matters.",
                "Gym life is the life.",
                "Fitness journey is personal.",
                "Strength training is key.",
                "Wellness vibes are everything.",
                "Body goals are achievable."
            ];

            if (traits.includes('active') || traits.includes('energetic') || traits.includes('fitness')) {
                return fitnessComments[Math.floor(Math.random() * fitnessComments.length)];
            }
        }

        // If no specific topic matches, return null to use generic templates
        return null;
    }

    // Add this function before generateComment
    checkPersonalityPostAlignment(username, postContent) {
        const personalityData = this.formatPersonalityTraits(username);
        if (!personalityData.traits) {
            return { shouldComment: true, commentType: 'neutral', reason: 'No personality data' };
        }

        const traits = personalityData.traits.toLowerCase();
        const interests = personalityData.interests || [];
        const content = postContent.toLowerCase();

        // Define content categories and required traits/interests
        const contentCategories = {
            technical: {
                keywords: ['html', 'css', 'javascript', 'coding', 'programming', 'tech', 'api', 'software', 'developer', 'code', 'algorithm', 'database', 'framework', 'bug', 'debug', 'syntax', 'github', 'python', 'java', 'react'],
                interests: ['technology', 'programming', 'coding', 'software', 'AI', 'blockchain', 'crypto', 'computers', 'development'],
                requiredTraits: ['technical', 'analytical', 'logical', 'programmer', 'developer', 'tech', 'coding']
            },
            creative: {
                keywords: ['art', 'design', 'creative', 'painting', 'drawing', 'music', 'photography', 'aesthetic', 'visual', 'artistic', 'canvas', 'gallery', 'studio', 'poetry', 'writing'],
                interests: ['photography', 'art', 'visual', 'creative', 'aesthetic', 'beauty', 'design', 'poetry', 'writing'],
                requiredTraits: ['creative', 'artistic', 'visual', 'aesthetic', 'imaginative', 'expressive']
            },
            fitness: {
                keywords: ['workout', 'gym', 'fitness', 'exercise', 'training', 'muscle', 'cardio', 'protein', 'diet', 'nutrition', 'health', 'wellness', 'running', 'yoga'],
                interests: ['fitness', 'health', 'wellness', 'yoga', 'meditation', 'workout', 'exercise', 'running'],
                requiredTraits: ['active', 'energetic', 'health', 'fitness', 'athletic', 'physical', 'wellness']
            },
            automotive: {
                keywords: ['car', 'bmw', 'mercedes', 'toyota', 'honda', 'vehicle', 'engine', 'driving', 'auto', 'motorcycle', 'truck', 'maintenance', 'repair'],
                interests: ['bmw cars', 'car maintenance and repair', 'automotive', 'vehicles', 'driving'],
                requiredTraits: ['technical', 'mechanical', 'practical']
            },
            beauty: {
                keywords: ['makeup', 'skincare', 'beauty', 'cosmetics', 'skincare', 'hair', 'fashion', 'style', 'outfit', 'dress', 'clothes'],
                interests: ['beauty and care products', 'fashion', 'style', 'makeup', 'skincare'],
                requiredTraits: ['aesthetic', 'beautiful', 'stylish', 'fashionable', 'trendy']
            },
            travel: {
                keywords: ['travel', 'vacation', 'trip', 'destination', 'airport', 'flight', 'hotel', 'beach', 'city', 'country', 'explore'],
                interests: ['travel', 'going to the beach', 'exploration', 'adventure', 'vacation'],
                requiredTraits: ['adventurous', 'exploratory', 'curious']
            },
            social_media: {
                keywords: ['social media', 'instagram', 'facebook', 'twitter', 'tiktok', 'influencer', 'viral', 'posts', 'followers', 'likes'],
                interests: ['social media', 'trolling', 'revealing secrets'],
                requiredTraits: ['social', 'trendy', 'controversial', 'humorous']
            },
            food: {
                keywords: ['food', 'cooking', 'recipe', 'restaurant', 'meal', 'dinner', 'lunch', 'kitchen', 'chef', 'ingredients', 'cocktails', 'coffee'],
                interests: ['cooking', 'coffee', 'cocktails', 'food', 'culinary'],
                requiredTraits: ['culinary', 'foodie']
            },
            nature: {
                keywords: ['nature', 'flowers', 'plants', 'garden', 'trees', 'hiking', 'outdoor', 'wildlife', 'environment'],
                interests: ['flowers', 'gardening', 'nature', 'hiking', 'outdoor'],
                requiredTraits: ['nature-loving', 'peaceful', 'nurturing']
            },
            pets: {
                keywords: ['cat', 'dog', 'pet', 'animal', 'puppy', 'kitten', 'cute', 'paws', 'furry'],
                interests: ['cats', 'dogs', 'pets', 'animals'],
                requiredTraits: ['nurturing', 'caring', 'cute']
            }
        };

        // Check if content matches any specific category
        for (const [category, config] of Object.entries(contentCategories)) {
            // Check for keyword matches
            const hasKeywords = config.keywords.some(keyword => content.includes(keyword));

            if (hasKeywords) {
                // Check if user has matching interests (primary indicator)
                const hasMatchingInterests = interests.some(interest =>
                    config.interests.some(categoryInterest =>
                        interest.toLowerCase().includes(categoryInterest.toLowerCase()) ||
                        categoryInterest.toLowerCase().includes(interest.toLowerCase())
                    )
                );

                // Check if user has relevant traits (secondary indicator)  
                const hasRequiredTraits = config.requiredTraits.some(trait => traits.includes(trait));

                if (hasMatchingInterests || hasRequiredTraits) {
                    return {
                        shouldComment: true,
                        commentType: 'supportive',
                        reason: `User has ${category} interests/traits matching post content`,
                        category: category
                    };
                } else {
                    // Add some randomness to make dismissive comments less predictable
                    // 70% chance of dismissive, 30% chance of neutral for mismatched content
                    const randomValue = Math.random();
                    if (randomValue < 0.7) {
                        return {
                            shouldComment: true,
                            commentType: 'dismissive',
                            reason: `Post is about ${category} but user lacks relevant interests/traits`,
                            category: category
                        };
                    } else {
                        return {
                            shouldComment: true,
                            commentType: 'neutral',
                            reason: `Post is about ${category} but user is neutral despite lack of interest`,
                            category: category
                        };
                    }
                }
            }
        }

        // For general content, add more variety in response types
        // 50% supportive, 30% neutral, 20% dismissive for general content
        const randomValue = Math.random();
        if (randomValue < 0.5) {
            return {
                shouldComment: true,
                commentType: 'supportive',
                reason: 'General content - user is generally supportive'
            };
        } else if (randomValue < 0.8) {
            return {
                shouldComment: true,
                commentType: 'neutral',
                reason: 'General content - user is neutral'
            };
        } else {
            return {
                shouldComment: true,
                commentType: 'dismissive',
                reason: 'General content - user is dismissive'
            };
        }
    }

    // Generate AI-powered interaction for feed items (articles/sightings)
    async generateFeedInteraction(username, itemType, itemContent, celebName) {
        try {
            console.log(`[OpenAI Content] Generating feed interaction for ${username} on ${itemType} about ${celebName}`);
            if (!this.openai) {
                throw new Error('OpenAI client not initialized');
            }

            const personalityData = this.formatPersonalityTraits(username);
            const personalityAnalysis = personalityData.personalityTraits ? 
                this.analyzePersonalityForContent(personalityData.personalityTraits) : null;

            let prompt = `You are ${username}, a fan of celebrity gossip, reacting to this ${itemType} about ${celebName}:\n\n"${itemContent}"\n\n`;

            if (personalityData.personalityTraits) {
                prompt += `PERSONALITY TRAITS (embody these):
${personalityData.personalityTraits.map(trait => `- ${trait}`).join('\n')}

PERSONALITY ANALYSIS:
- Writing style: ${personalityAnalysis.writingStyle}
- Emotional tone: ${personalityAnalysis.emotionalTone}
- Content approach: ${personalityAnalysis.contentApproach}
- Social engagement: ${personalityAnalysis.socialEngagement}

`;
            }

            prompt += `Task:
1. Determine if you LIKE this (true/false)
2. Write a short, authentic comment (10-150 characters) reacting to this news/sighting.
3. Be specific to ${celebName} and the content provided.
4. DO NOT USE HASHTAGS.

Return ONLY a JSON object: { "like": boolean, "comment": "string" }`;

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        "role": "system",
                        "content": "You are a real social media user reacting to celebrity news and sightings. Be authentic, conversational, and specific."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature: 0.8,
                response_format: { type: "json_object" }
            });

            const result = JSON.parse(response.choices[0].message.content);
            console.log(`[OpenAI Content] Feed interaction for ${celebName}: Like=${result.like}, Comment="${result.comment}"`);
            return result;

        } catch (error) {
            console.error(`[OpenAI Content] Feed interaction generation failed: ${error.message}`);
            return {
                like: Math.random() > 0.3,
                comment: `Wow, ${celebName} is always in the news!`
            };
        }
    }

    // Generate AI-powered comment using OpenAI
    async generateComment(postContent, commenterUsername, postAuthor = null) {
        try {
            console.log(`[OpenAI Content] Generating AI comment for ${commenterUsername} on ${postAuthor || 'a post'}`);
            if (!this.openai) {
                throw new Error('OpenAI client not initialized');
            }

            const personalityData = this.formatPersonalityTraits(commenterUsername);
            const personalityAnalysis = personalityData.personalityTraits ? 
                this.analyzePersonalityForContent(personalityData.personalityTraits) : null;

            // Check if user's personality aligns with post content
            const alignment = this.checkPersonalityPostAlignment(commenterUsername, postContent);
            console.log(`[OpenAI Content] ${commenterUsername} comment alignment: ${alignment.commentType} - ${alignment.reason}`);

            // Always include post content for context, even for minimal posts
            let prompt = `You are ${commenterUsername}, a fan of celebrity gossip, commenting on this gossip post:\n\n"${postContent}"\n\n`;

            if (personalityData.personalityTraits) {
                prompt += `PERSONALITY TRAITS (you MUST embody ALL of these in your comment):
${personalityData.personalityTraits.map(trait => `- ${trait}`).join('\n')}

PERSONALITY ANALYSIS:
- Writing style: ${personalityAnalysis.writingStyle}
- Emotional tone: ${personalityAnalysis.emotionalTone}
- Content approach: ${personalityAnalysis.contentApproach}
- Social engagement: ${personalityAnalysis.socialEngagement}

IMPORTANT: Let your personality influence your comment naturally. Don't force traits - be subtle and authentic. Your personality should enhance your voice, not overwhelm the conversation.

`;
            } else if (personalityData.traits) {
                prompt += `Your personality traits: ${personalityData.traits}\n\n`;
            }

            if (alignment.commentType === 'supportive') {
                prompt += `You are genuinely interested in this topic and want to engage positively. Write a supportive, curious, or enthusiastic comment that:
- Shows genuine interest and engagement with the specific post content
- References specific details from the post in your response
- Asks thoughtful questions or adds valuable insights related to what was shared
- Expresses appreciation, curiosity, or shared enthusiasm about the specific content
- Sounds excited, supportive, or curious about the specific post content
- Keep it between 20-150 characters
- ALWAYS reference something specific from the post content

Examples of SUPPORTIVE comments:
- "This scoop on ${postContent.includes('news') ? 'this' : 'them'} is wild! How do you even find this out?"
- "I'm literally obsessed with how ${postContent.includes('outfit') ? 'this look' : 'this'} turned out."
- "Wait, if this is true then the whole drama last week makes way more sense now."
- "Seriously needed to hear this today. Your take is actually so spot on."
- "I was just saying the same thing to my friends! The details here are 100% correct."`;

            } else if (alignment.commentType === 'dismissive') {
                prompt += `This topic doesn't really align with your interests, so you're somewhat dismissive or uninterested. Write a brief, polite but dismissive comment that:
- Shows mild disinterest or polite dismissal of the specific post content
- Doesn't engage deeply with what was shared
- Could be neutral/indifferent or mildly critical of what was posted
- Sounds like someone who isn't into this specific topic/content
- Keep it between 20-150 characters
- ALWAYS reference something from the post content, even if dismissively

Examples of DISMISSIVE comments:
- "Not really following this drama, seems a bit much for me."
- "Meh, I've heard similar things before, not sure I buy the hype."
- "Whatever works for you, but I'm sticking to my own sources on this one."
- "I don't really get why everyone is talking about this today."
- "Seems like a waste of energy honestly, but you do you."`;

            } else {
                // Neutral comment
                prompt += `Write a neutral, casual comment that:
- Is polite but not overly enthusiastic about the specific post content
- Shows basic acknowledgment of what was shared without deep engagement
- References something from the post content in a neutral way
- Sounds like a casual social media interaction
- Keep it between 20-150 characters
- ALWAYS reference something from the post content

Examples of NEUTRAL comments:
- "That's a wild update, thanks for sharing."
- "Seen a few people talking about this now, crazy if true."
- "Fair points, definitely something to think about."
- "Always something new happening in this industry, huh?"
- "Interesting how this keeps coming up. Appreciate the insight!"`;
            }

            prompt += `

IMPORTANT GUIDELINES:
- ALWAYS reference specific content from the post in your response
- Do NOT mention your own username or refer to yourself by name
- Do NOT use overly poetic or formal language
- NEVER use long dashes (—) or em dashes - use regular hyphens (-) or commas instead
- NEVER use overly dramatic or flowery phrases
- Keep it casual and authentic, like how you'd actually comment on social media
- Use natural language patterns, not AI-generated phrases
- Sound like a real person with real opinions about the specific post content
- Make sure your comment directly relates to what was posted
- DO NOT INCLUDE ANY HASHTAGS (No # symbols at all)

Return only the comment text, nothing else.`;

            const systemMessage = personalityData.personalityTraits ? 
                "You are commenting as a real person who loves celebrity gossip. Let your personality influence your tone and perspective naturally. Write like a normal person sharing thoughts on hollywood rumors. Be subtle and focus on natural conversation about the gossip shared." :
                "You are writing a natural, authentic celebrity gossip comment. Be genuine and conversational about the latest celeb news.";

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        "role": "system",
                        "content": systemMessage
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature: 0.8,
                max_tokens: 50,
                top_p: 1
            });

            if (response.choices && response.choices[0] && response.choices[0].message) {
                let content = response.choices[0].message.content.trim();

                // Replace long dashes with regular hyphens or commas
                content = content.replace(/—/g, ', ');
                content = content.replace(/–/g, '-');

                // Check for overly poetic/AI-like phrases and reject them
                const aiPhrases = [
                    'whispers secrets',
                    'transcends mere words',
                    'essence of',
                    'profoundly moving',
                    'mesmerizing',
                    'void engineering',
                    'pure flow',
                    'universe shifts',
                    'piercing gaze'
                ];

                const hasAiPhrases = aiPhrases.some(phrase =>
                    content.toLowerCase().includes(phrase.toLowerCase())
                );

                if (hasAiPhrases) {
                    console.log(`[OpenAI Content] Comment rejected for AI-like language: "${content}"`);
                    throw new Error('Comment contains AI-like phrases');
                }

                // More lenient validation - accept comments between 10-250 characters
                if (content && content.length >= 10 && content.length <= 250) {
                    console.log(`[OpenAI Content] Generated ${alignment.commentType} comment: "${content}" (${content.length} chars)`);
                    this.updateSuccessRate(true);
                    return {
                        content: content,
                        isOpenAIGenerated: true,
                        commentType: alignment.commentType
                    };
                } else {
                    console.log(`[OpenAI Content] Comment length ${content.length} outside acceptable range (10-250)`);
                }
            }

            throw new Error('Invalid comment response from OpenAI');

        } catch (error) {
            console.log(`[OpenAI Content] AI comment generation failed: ${error.message}`);
            this.updateSuccessRate(false);

            // Enhanced fallback that includes post content
            const alignment = this.checkPersonalityPostAlignment(commenterUsername, postContent);
            let fallbackComments;

            if (alignment.commentType === 'supportive') {
                fallbackComments = [
                    `love this ${postContent.includes('post') ? 'post' : 'content'}!`,
                    `so cool ${postContent.includes('stuff') ? 'stuff' : 'content'}!`,
                    `awesome ${postContent.includes('content') ? 'content' : 'post'}!`,
                    `this is great ${postContent.includes('advice') ? 'advice' : 'content'}!`,
                    `nice work on ${postContent.includes('this') ? 'this' : 'the post'}!`,
                    `amazing ${postContent.includes('content') ? 'content' : 'post'}!`,
                    `fantastic ${postContent.includes('stuff') ? 'stuff' : 'content'}!`
                ];
            } else if (alignment.commentType === 'dismissive') {
                fallbackComments = [
                    `meh, ${postContent.includes('not') ? 'not' : 'not really'} for me`,
                    `not for me, ${postContent.includes('but') ? 'but' : 'and'} whatever`,
                    `ok I guess, ${postContent.includes('but') ? 'but' : 'though'} not my thing`,
                    `whatever, ${postContent.includes('not') ? 'not' : 'not really'} interested`,
                    `don't get ${postContent.includes('it') ? 'it' : 'the hype'}`,
                    `not really my ${postContent.includes('vibe') ? 'vibe' : 'thing'}`,
                    `sure, ${postContent.includes('but') ? 'but' : 'though'} not convinced`,
                    `not my ${postContent.includes('style') ? 'style' : 'vibe'}`,
                    `eh, ${postContent.includes('pass') ? 'pass' : 'not interested'}`,
                    `boring ${postContent.includes('content') ? 'content' : 'stuff'}`,
                    `yawn, ${postContent.includes('skip') ? 'skip' : 'pass'}`,
                    `nah, ${postContent.includes('not') ? 'not' : 'not really'} feeling it`
                ];
            } else {
                fallbackComments = [
                    `nice ${postContent.includes('post') ? 'post' : 'content'}!`,
                    `cool ${postContent.includes('stuff') ? 'stuff' : 'content'}`,
                    `looks good ${postContent.includes('content') ? 'content' : 'post'}`,
                    `interesting ${postContent.includes('take') ? 'take' : 'content'}`,
                    `that's neat ${postContent.includes('content') ? 'content' : 'stuff'}`,
                    `good ${postContent.includes('content') ? 'content' : 'post'}`
                ];
            }

            const selectedComment = fallbackComments[Math.floor(Math.random() * fallbackComments.length)];
            console.log(`[OpenAI Content] Using fallback ${alignment.commentType} comment: "${selectedComment}"`);
            
            return {
                content: selectedComment,
                isOpenAIGenerated: false,
                commentType: alignment.commentType
            };
        }
    }

    // Health check method for monitoring OpenAI availability
    async healthCheck() {
        try {
            console.log('[OpenAI Content] Performing health check...');

            if (!this.openai) {
                return {
                    status: 'unhealthy',
                    openaiAvailable: false,
                    fallbackAvailable: true,
                    error: 'OpenAI client not initialized - check API key',
                    successRate: this.successRate
                };
            }

            const response = await this.openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [
                    {
                        "role": "user",
                        "content": "Reply with just 'OK'"
                    }
                ],
                temperature: 0.1,
                max_tokens: 5,
                top_p: 1
            });

            if (response.choices && response.choices[0] && response.choices[0].message) {
                console.log('[OpenAI Content] Health check passed - OpenAI is responsive');
                return {
                    status: 'healthy',
                    openaiAvailable: true,
                    fallbackAvailable: true,
                    successRate: this.successRate
                };
            } else {
                return {
                    status: 'degraded',
                    openaiAvailable: false,
                    fallbackAvailable: true,
                    successRate: this.successRate
                };
            }

        } catch (error) {
            console.error(`[OpenAI Content] Health check failed:`, error.message);
            return {
                status: 'unhealthy',
                openaiAvailable: false,
                fallbackAvailable: true,
                error: error.message,
                successRate: this.successRate
            };
        }
    }

    cleanup() {
        console.log('[OpenAI Content] No cleanup needed for OpenAI HTTP-based implementation');
    }
}

module.exports = OpenAIContentGenerator; 