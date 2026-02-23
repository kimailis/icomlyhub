const PersonalityManager = require('./personalityManager');

class PersonalityContentGenerator {
    constructor() {
        this.personalityManager = new PersonalityManager();
        
        // Content templates organized by personality traits and topics
        this.contentTemplates = {
            tech: {
                high_technical: [
                    "Just spent 3 hours debugging what turned out to be a missing semicolon. The struggle is real! 🔧",
                    "Finally optimized that algorithm - 40% performance improvement! Sometimes the little things make a huge difference.",
                    "Hot take: Clean code is more important than clever code. Readability wins every time.",
                    "Anyone else fascinated by the potential of edge computing? The implications are mind-blowing.",
                    "Refactored the entire module today. It's like giving your code a fresh haircut - feels so clean!",
                    "Found a critical security vulnerability in our API. Thank goodness for thorough testing!",
                    "Docker containers have changed my entire development workflow. How did we live without them?",
                    "Machine learning models are getting scary good. We're living in the future, folks."
                ],
                moderate_technical: [
                    "Learning a new framework this week. The learning curve is steep but exciting!",
                    "Coffee + coding = the perfect morning combination ☕",
                    "That feeling when your code finally works after hours of debugging 🎉",
                    "Technology moves so fast, feels like I'm always catching up!",
                    "Finally got my development environment set up just right. Productivity mode: ON",
                    "Reading about the latest tech trends. Some of this stuff sounds like science fiction!",
                    "Backup your code, people! Learned that lesson the hard way today.",
                    "The tech community is amazing - always someone willing to help solve a problem."
                ],
                low_technical: [
                    "My phone updated and now everything looks different. Why do they keep changing things?",
                    "Trying to figure out this new app. Technology can be confusing sometimes!",
                    "Is it just me or are passwords getting more complicated every day?",
                    "Set up my smart speaker today. It's like having a robot assistant!",
                    "Finally organized my photos. Technology makes life easier when it works.",
                    "Video calls with family are the best thing about modern tech ❤️",
                    "Discovered a new feature on my favorite app. Still learning something new every day!",
                    "Technology can be overwhelming, but it's amazing how it connects us all."
                ]
            },
            lifestyle: {
                high_creative: [
                    "Spent the morning sketching in the park. There's something magical about creating with nature as your backdrop 🎨",
                    "Finally finished that art project I've been working on for weeks. The satisfaction is incredible!",
                    "Inspiration strikes at the weirdest times. 3 AM idea sessions are surprisingly productive.",
                    "Visited a local gallery today. Art has this amazing power to make you see the world differently.",
                    "Trying a new creative medium this week. Stepping out of your comfort zone is terrifying and exhilarating.",
                    "The creative process is messy, chaotic, and absolutely beautiful. Embrace the chaos!",
                    "Found the perfect vintage frame for my latest piece. Sometimes the presentation is everything.",
                    "Collaboration with other artists always pushes my creativity to new heights."
                ],
                high_social: [
                    "Had the most amazing conversation with a stranger at the coffee shop today. Humans are fascinating!",
                    "Planning a dinner party for this weekend. There's nothing better than bringing people together 🍽️",
                    "Volunteered at the local shelter today. Giving back feels incredible.",
                    "Met up with old friends I hadn't seen in years. Some connections never fade.",
                    "Attended a community event tonight. Love seeing our neighborhood come together.",
                    "Started a book club with some neighbors. Reading is better when shared!",
                    "Helped a neighbor with their garden today. Small acts of kindness make a big difference.",
                    "Group fitness classes are my jam. Working out is so much more fun with others!"
                ],
                general: [
                    "Beautiful sunset tonight. Sometimes you just need to pause and appreciate the moment 🌅",
                    "Trying to establish a better morning routine. Self-care isn't selfish!",
                    "Made my favorite comfort food today. Cooking is therapy for the soul.",
                    "Decluttered my closet this weekend. Minimalism is surprisingly liberating.",
                    "Long walk in the park helped clear my head. Nature is the best medicine.",
                    "Reading a book that's changing my perspective on everything. Love when that happens!",
                    "Trying to be more mindful about screen time. Balance is everything.",
                    "Sunday reset day: meal prep, clean house, set intentions for the week."
                ]
            },
            humor: {
                high_humor: [
                    "My plant died even though I talked to it every day. Apparently, I'm not very motivational 🌱",
                    "Tried to be productive today. Netflix had other plans. Netflix won.",
                    "My autocorrect has learned to be sarcastic. I don't know if I should be proud or concerned.",
                    "Went to the gym today. Spent most of the time trying to figure out the machines. The machines won.",
                    "My cooking skills are so bad, even the smoke alarm cheers when I order takeout 🔥",
                    "Attempted adulting today. Results were... questionable. Tomorrow I'll try again.",
                    "My brain has too many browser tabs open and I can't find the music one.",
                    "Life is like a software update: whenever I think I've figured it out, everything changes."
                ],
                moderate_humor: [
                    "Monday motivation: at least it's not Sunday night anymore! 😅",
                    "Coffee isn't a hobby, it's a survival skill ☕",
                    "That awkward moment when you wave back at someone who was waving at the person behind you.",
                    "Pretending to be a functional adult is exhausting. When do I get my manual?",
                    "My weekend plans: ambitious. My weekend reality: significantly less ambitious.",
                    "Why do they call it rush hour when nobody's moving? Life's great mysteries.",
                    "Trying to adult but I keep getting distracted by snacks and naps.",
                    "My spirit animal is a sloth on vacation. No rush, just vibes."
                ]
            },
            personal: {
                high_emotional: [
                    "Sometimes I wonder if I'm doing enough to make a difference in this world. Heavy thoughts tonight 💭",
                    "Had a moment today where everything just clicked. Grateful for the clarity, even if it's temporary.",
                    "Missing the simple times when everything felt possible. Growing up is complicated.",
                    "Been reflecting on how much I've changed in the past year. Growth is messy but necessary.",
                    "That feeling when you realize you're becoming the person you needed when you were younger ❤️",
                    "Life has been testing me lately, but I'm learning resilience I didn't know I had.",
                    "Sometimes the best conversations happen at 2 AM when your guard is down.",
                    "Vulnerability is terrifying and liberating at the same time. Still learning to embrace it."
                ],
                moderate_emotional: [
                    "Some days I feel like I have it all figured out. Other days I can't even pick what to wear.",
                    "Grateful for the people who accept my weird quirks and love me anyway 🙏",
                    "Learning to be patient with my own journey. Comparison really is the thief of joy.",
                    "Small wins matter too. Celebrated finishing my to-do list today!",
                    "Sometimes you need to remind yourself that you're doing better than you think.",
                    "Life update: still figuring it out, but enjoying the process more these days.",
                    "Today's mood: cautiously optimistic with a chance of snacks.",
                    "Reminder that it's okay to not be okay sometimes. We're all human."
                ]
            },
            gaming: {
                high_technical: [
                    "Finally optimized my gaming setup. Custom loop cooling and RGB everything. Peak performance unlocked! 🎮",
                    "Spent the weekend modding my favorite game. The community creativity never ceases to amaze me.",
                    "Frame rates matter, but good game design matters more. Fighting for that perfect balance.",
                    "Built a new gaming PC today. Cable management is an art form that I'm still mastering.",
                    "The physics engine in this new game is incredible. The attention to detail is mind-blowing.",
                    "Beta testing a new indie game. Love being part of the development process.",
                    "Analyzed the latest GPU benchmarks. The performance gains are getting marginal but impressive.",
                    "Streaming setup is finally dialed in. Time to share some epic gameplay moments!"
                ],
                casual: [
                    "Just discovered this amazing indie game. Sometimes the best gems are the hidden ones!",
                    "Rage quit three times today but came back for more. The addiction is real 😅",
                    "Finally beat that boss I've been stuck on for weeks. Persistence pays off!",
                    "Gaming with friends online hits different. Distance means nothing when you're having fun.",
                    "That moment when you pull off an impossible move and no one saw it happen.",
                    "New game release day! There goes my productivity for the next week.",
                    "Mobile gaming during lunch breaks is my guilty pleasure. Don't judge!",
                    "Co-op games are the best way to test friendships. We survived, barely."
                ]
            }
        };

        // Comment templates organized by interaction style and context
        this.commentTemplates = {
            // Context-specific comments for all interaction styles
            contextual: {
                technical_debug: [
                    "Been there! Debugging can be such a rollercoaster 🎢",
                    "The feeling when you finally find that one character causing chaos!",
                    "Debug sessions are like detective work. So satisfying when solved!",
                    "What debugger do you prefer? I'm always looking for better tools",
                    "Classic! Sometimes it's the simplest things that trip us up",
                    "Hope you celebrated when you found it! Those moments deserve recognition",
                    "The debugging struggle is real! How long did it take to track down?"
                ],
                technical_general: [
                    "Love seeing fellow developers share their journey!",
                    "The tech community is amazing for learning from each other",
                    "Which language/framework are you working with?",
                    "Always exciting to see new approaches to coding challenges",
                    "This reminds me why I love programming - constant learning!",
                    "Clean code is so satisfying to write and read",
                    "What's your favorite part about this project?"
                ],
                technical_tools: [
                    "Great choice! How are you finding the learning curve?",
                    "I've been meaning to try this. How's the documentation?",
                    "The ecosystem around this tool is fantastic",
                    "Performance improvements with this are usually impressive",
                    "Integration with existing projects smooth?",
                    "Community support for this framework is top-notch"
                ],
                achievement_celebration: [
                    "Congratulations! That must feel incredible! 🎉",
                    "Way to go! Your persistence paid off! 💪",
                    "Success tastes even sweeter after the struggle! Well done!",
                    "So proud of you for pushing through! 🌟",
                    "This is amazing! Time to celebrate properly!",
                    "You earned this moment! Enjoy every bit of it!",
                    "Inspiring to see hard work pay off like this! 👏"
                ],
                support_struggle: [
                    "Sending you strength! We all have those tough days 💙",
                    "You're not alone in this. Better days are coming!",
                    "One step at a time. You've got this! 🌟",
                    "It's okay to struggle. Growth isn't always easy",
                    "Your honesty is brave. Thank you for sharing",
                    "Hard times don't last, but resilient people do! 💪",
                    "Reach out if you need someone to listen. We're here! 🤗"
                ],
                excitement_shared: [
                    "Your excitement is contagious! Love this energy! ✨",
                    "Yes! This enthusiasm absolutely made my day! 😊",
                    "So here for this positive vibe! Keep shining! 🌟",
                    "Feeling the joy through the screen! Amazing! 💫",
                    "This is the energy we all need more of! 🔥",
                    "Your happiness is infectious! Spread that joy! 🌈"
                ],
                learning_shared: [
                    "Love this! Never stop learning! 📚",
                    "TIL moments are the best! Thanks for sharing! 💡",
                    "Knowledge shared is knowledge doubled! 🤓",
                    "This perspective is eye-opening! Learn something new every day!",
                    "Curious minds unite! What sparked this realization?",
                    "Growth mindset in action! Keep exploring! 🚀"
                ],
                question_response: [
                    "Great question! I've been wondering about this too 🤔",
                    "This deserves a thoughtful discussion! Interesting point!",
                    "Love questions that make you think! Here's my take...",
                    "Ooh this is complex! Multiple perspectives needed here",
                    "You've opened up a fascinating topic! 💭",
                    "The kind of question that keeps you up at night thinking!"
                ],
                advice_giving: [
                    "From my experience, starting small usually works best",
                    "I found that consistency beats intensity every time",
                    "Here's what worked for me in similar situations...",
                    "Pro tip: don't try to change everything at once!",
                    "Been there! Happy to share what I learned",
                    "The journey is different for everyone, but here's one approach..."
                ],
                creative_appreciation: [
                    "This is beautiful! Your creativity shines through! 🎨",
                    "Art like this brightens my day! Thank you for sharing! ✨",
                    "The talent! The vision! Absolutely stunning work! 👏",
                    "Creative minds inspire us all! Keep creating! 💫",
                    "Art has this amazing power to connect us all 🌟",
                    "Your artistic eye is incredible! More please! 🎭"
                ],
                lifestyle_relatable: [
                    "This is so me! Morning routines are everything! ☕",
                    "Coffee first, then human functions activate! 😄",
                    "The daily ritual that keeps us all sane! ☀️",
                    "Yes! These little moments make the day better! ✨",
                    "Self-care in action! Love to see it! 💙",
                    "The simple pleasures are often the best ones! 🌻"
                ],
                fitness_motivation: [
                    "Get it! Fitness goals in action! 💪",
                    "You're inspiring the rest of us couch potatoes! 🔥",
                    "The dedication is real! Keep crushing it! 🏋️",
                    "Consistency is key! You're doing amazing! 🌟",
                    "Mind over matter! Your strength shows! 💯",
                    "Health journey heroes like you motivate us all! 🚀"
                ],
                food_appreciation: [
                    "This looks absolutely delicious! Recipe please? 😋",
                    "Food is love made visible! This looks amazing! 🍽️",
                    "My mouth is watering! Cooking skills on point! 👨‍🍳",
                    "The presentation alone is art! Taste must be incredible! ✨",
                    "Home cooking hits different! Nothing beats it! 🏠",
                    "You've just inspired my next kitchen adventure! 🔥"
                ],
                nature_appreciation: [
                    "Nature never fails to amaze! Beautiful capture! 📸",
                    "This view is absolutely breathtaking! 🌅",
                    "Mother Nature showing off again! Gorgeous! 🌿",
                    "These moments remind us what's truly important! ✨",
                    "Perfect day to be outside! Nature therapy! 🌳",
                    "The world is so beautiful when we pause to notice! 💚"
                ],
                gaming_shared: [
                    "The grind is real! What game has you hooked? 🎮",
                    "Gaming moments like these are pure gold! 🏆",
                    "Respect for the dedication! How long did this take? ⏰",
                    "Fellow gamer here! The struggle and triumph! 🕹️",
                    "These victories hit different! Well played! 🎯",
                    "Gaming community is the best! Shared experiences! 👾"
                ],
                work_relatable: [
                    "The work life is so relatable! We've all been there! 💼",
                    "Productivity comes in waves! You're doing great! 📊",
                    "Work-life balance is an art form! Keep learning! ⚖️",
                    "Deadlines are temporary, but good work lasts! 💪",
                    "Project life cycle emotions in one post! 📈",
                    "The hustle is real! Take care of yourself too! 🌟"
                ],
                gratitude_response: [
                    "Gratitude is such a beautiful mindset! 🙏",
                    "These moments of appreciation are everything! ✨",
                    "Thank you for reminding us to be grateful! 💙",
                    "Positive energy is contagious! Keep spreading it! 🌟",
                    "Grateful hearts make the world brighter! 🌻",
                    "This perspective shift changes everything! Beautiful! 💫"
                ]
            },
            // Interaction style specific templates
            friendly: {
                social_engagement: [
                    "This resonates so much! Love connecting with like-minded people! 💕",
                    "Your posts always brighten my day! Thank you for sharing! ☀️",
                    "The positive vibes are strong with this one! ✨",
                    "So grateful for thoughtful people like you! 🤗",
                    "This is why I love this community! Amazing humans! 💙"
                ],
                general_positive: [
                    "Love this! Thanks for sharing your thoughts! 😊",
                    "This made me smile! Appreciate the positivity! 🌟",
                    "Beautiful perspective! Keep being awesome! ✨",
                    "Posts like this restore faith in humanity! 💕",
                    "Simple but profound! Thank you! 🙏"
                ]
            },
            helpful: {
                social_engagement: [
                    "If you need someone to brainstorm with, I'm here!",
                    "Happy to share resources if you're interested!",
                    "Feel free to reach out if you want to discuss this more!",
                    "I've got some experience with this if you need tips!",
                    "Always here to help if you need a different perspective!"
                ]
            },
            sarcastic: {
                sarcastic_mild: [
                    "Well, that's certainly one way to approach it! 😏",
                    "Ah yes, the eternal optimist strikes again! 🙃",
                    "Bold choice! Let's see how that works out! 😅",
                    "Obviously, because life is always that simple! 🙄",
                    "Sure, everyone's experience is exactly the same! 😂"
                ],
                sarcastic_playful: [
                    "Found today's main character! 👑",
                    "The confidence is... truly something to behold! 😎",
                    "Teaching us all how it's really done! 🎭",
                    "Plot twist: it actually works perfectly every time! 📚",
                    "Clearly operating on a higher level than the rest of us! 🚀"
                ],
                humor_light: [
                    "The energy is immaculate! Love the commitment! 😄",
                    "Living your best life, I see! Respect! 👏",
                    "This is the content I'm here for! 😂",
                    "Never change! The world needs this energy! 🌟",
                    "The audacity is actually admirable! 😅"
                ]
            },
            neutral: [
                "Thanks for sharing this perspective",
                "Interesting point to consider",
                "Valuable insight on the topic",
                "This adds good context to the discussion",
                "Appreciate the thoughtful post",
                "Good contribution to the conversation",
                "Worth reflecting on this",
                "Helpful information to know"
            ]
        };
    }

    // Generate personality-based content
    generatePersonalityContent(username) {
        const personality = this.personalityManager.getPersonality(username);
        const selectedTopic = this.personalityManager.selectTopicForUser(username);
        
        let content = this.selectContentTemplate(personality, selectedTopic);
        
        // Apply personality modifications
        content = this.applyPersonalityModifications(content, personality);
        
        // Generate hashtags
        const hashtags = this.personalityManager.generatePersonalityHashtags(username, content);
        
        return {
            content: hashtags ? `${content}\n\n${hashtags}` : content,
            topic: selectedTopic,
            isPersonalityGenerated: true
        };
    }

    // Select appropriate content template based on personality and topic
    selectContentTemplate(personality, topic) {
        const templates = this.contentTemplates[topic];
        if (!templates) {
            return this.getGenericContent(personality);
        }

        // Select template category based on personality traits - handle both old and new formats
        let selectedCategory = 'general';
        
        // Determine trait levels based on personality format
        let technicalLevel = 0;
        let creativeLevel = 0;
        let socialLevel = 0;
        let humorLevel = 0;
        let emotionalLevel = 0;
        
        if (personality.personality) {
            // Old format with numeric traits
            technicalLevel = personality.personality.technical || 0;
            creativeLevel = personality.personality.creative || 0;
            socialLevel = personality.personality.social || 0;
            humorLevel = personality.personality.humor || 0;
            emotionalLevel = personality.personality.emotional || 0;
        } else if (personality.personality_traits && Array.isArray(personality.personality_traits)) {
            // New format with string array traits - approximate numeric levels
            const traits = personality.personality_traits.map(t => t.toLowerCase());
            
            if (traits.some(t => ['technical', 'programmer', 'coding', 'tech', 'developer'].includes(t))) {
                technicalLevel = 8; // High technical
            }
            if (traits.some(t => ['creative', 'artistic', 'art', 'design', 'visual'].includes(t))) {
                creativeLevel = 8; // High creative
            }
            if (traits.some(t => ['social', 'friendly', 'outgoing', 'chatty', 'talkative'].includes(t))) {
                socialLevel = 8; // High social
            }
            if (traits.some(t => ['humorous', 'funny', 'humor', 'comedic', 'witty'].includes(t))) {
                humorLevel = 8; // High humor
            }
            if (traits.some(t => ['emotional', 'sensitive', 'empathetic', 'caring', 'thoughtful'].includes(t))) {
                emotionalLevel = 8; // High emotional
            }
        }
        
        if (topic === 'tech') {
            if (technicalLevel >= 8) {
                selectedCategory = 'high_technical';
            } else if (technicalLevel >= 5) {
                selectedCategory = 'moderate_technical';
            } else {
                selectedCategory = 'low_technical';
            }
        } else if (topic === 'lifestyle') {
            if (creativeLevel >= 7) {
                selectedCategory = 'high_creative';
            } else if (socialLevel >= 7) {
                selectedCategory = 'high_social';
            } else {
                selectedCategory = 'general';
            }
        } else if (topic === 'humor') {
            if (humorLevel >= 7) {
                selectedCategory = 'high_humor';
            } else {
                selectedCategory = 'moderate_humor';
            }
        } else if (topic === 'personal') {
            if (emotionalLevel >= 7) {
                selectedCategory = 'high_emotional';
            } else {
                selectedCategory = 'moderate_emotional';
            }
        } else if (topic === 'gaming') {
            if (technicalLevel >= 7) {
                selectedCategory = 'high_technical';
            } else {
                selectedCategory = 'casual';
            }
        }

        const categoryTemplates = templates[selectedCategory] || templates.general || templates[Object.keys(templates)[0]];
        
        if (!categoryTemplates || categoryTemplates.length === 0) {
            return this.getGenericContent(personality);
        }

        return categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
    }

    // Apply personality-specific modifications to content
    applyPersonalityModifications(content, personality) {
        let modifiedContent = content;
        
        // Add personality-specific touches based on emoji usage
        const emojiUsage = personality.contentPreferences?.emojiUsage || 'moderate';
        
        if (emojiUsage === 'heavy' && !content.includes('🎯') && !content.includes('💭')) {
            // Add emojis for heavy users if not already present
            const emojis = ['✨', '💪', '🔥', '🚀', '💡', '🌟', '🎉', '💯'];
            const randomEmoji = emojis[Math.floor(Math.random() * emojis.length)];
            
            // 50% chance to add at the end
            if (Math.random() > 0.5) {
                modifiedContent += ` ${randomEmoji}`;
            }
        } else if (emojiUsage === 'none') {
            // Remove emojis for users who don't use them
            modifiedContent = modifiedContent.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
        }

        // Apply length preferences
        const postLength = personality.contentPreferences?.postLength || 'medium';
        
        if (postLength === 'short' && modifiedContent.length > 100) {
            // Truncate long content for short-post users
            modifiedContent = modifiedContent.substring(0, 97) + '...';
        } else if (postLength === 'long' && modifiedContent.length < 80) {
            // Expand short content for long-post users
            const expansions = [
                ' What are your thoughts on this?',
                ' Anyone else feel this way?',
                ' Love hearing different perspectives on this!',
                ' This has been on my mind lately.',
                ' Curious to see what others think!'
            ];
            modifiedContent += expansions[Math.floor(Math.random() * expansions.length)];
        }

        return modifiedContent;
    }

    // Generate personality-based comment
    generatePersonalityComment(username, postContent, postUsername) {
        const personality = this.personalityManager.getPersonality(username);
        const interactionStyle = personality.socialBehavior?.interactionStyle || 'neutral';
        
        // Determine comment context based on post content and personality
        let context = this.determineCommentContext(postContent, personality);
        
        let comment;
        
        // First try to get contextual comments (these are more specific and relevant)
        if (this.commentTemplates.contextual && this.commentTemplates.contextual[context]) {
            const contextualTemplates = this.commentTemplates.contextual[context];
            comment = contextualTemplates[Math.floor(Math.random() * contextualTemplates.length)];
        }
        // Then try interaction style specific comments
        else if (interactionStyle !== 'neutral' && this.commentTemplates[interactionStyle] && 
                 this.commentTemplates[interactionStyle][context]) {
            const styleTemplates = this.commentTemplates[interactionStyle][context];
            comment = styleTemplates[Math.floor(Math.random() * styleTemplates.length)];
        }
        // Fallback to general interaction style comments
        else if (interactionStyle !== 'neutral' && this.commentTemplates[interactionStyle]) {
            const styleCategories = this.commentTemplates[interactionStyle];
            const availableCategories = Object.keys(styleCategories);
            if (availableCategories.length > 0) {
                const randomCategory = availableCategories[Math.floor(Math.random() * availableCategories.length)];
                const categoryTemplates = styleCategories[randomCategory];
                comment = categoryTemplates[Math.floor(Math.random() * categoryTemplates.length)];
            } else {
                comment = this.commentTemplates.neutral[Math.floor(Math.random() * this.commentTemplates.neutral.length)];
            }
        }
        // Final fallback to neutral comments
        else {
            comment = this.commentTemplates.neutral[Math.floor(Math.random() * this.commentTemplates.neutral.length)];
        }

        // Apply emoji preferences
        const emojiUsage = personality.contentPreferences?.emojiUsage || 'moderate';
        if (emojiUsage === 'none') {
            comment = comment.replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');
        } else if (emojiUsage === 'heavy' && !comment.includes('🎯') && !comment.includes('💭')) {
            // Add extra emoji for heavy users occasionally
            if (Math.random() > 0.7) {
                const extraEmojis = ['✨', '💪', '🔥', '🚀', '💡', '🌟', '🎉', '💯'];
                const randomEmoji = extraEmojis[Math.floor(Math.random() * extraEmojis.length)];
                comment += ` ${randomEmoji}`;
            }
        }

        // Add personality-specific modifications
        comment = this.addPersonalityTouch(comment, personality, postContent);

        return comment;
    }

    // Add subtle personality touches to comments
    addPersonalityTouch(comment, personality, postContent) {
        let modifiedComment = comment;
        
        // Determine traits based on personality format
        let isTechnical = false;
        let isCreative = false;
        let isSocial = false;
        
        if (personality.personality) {
            // Old format with numeric traits
            isTechnical = personality.personality.technical >= 8;
            isCreative = personality.personality.creative >= 8;
            isSocial = personality.personality.social >= 8;
        } else if (personality.personality_traits && Array.isArray(personality.personality_traits)) {
            // New format with string array traits
            const traits = personality.personality_traits.map(t => t.toLowerCase());
            isTechnical = traits.some(t => ['technical', 'programmer', 'coding', 'tech', 'developer'].includes(t));
            isCreative = traits.some(t => ['creative', 'artistic', 'art', 'design', 'visual'].includes(t));
            isSocial = traits.some(t => ['social', 'friendly', 'outgoing', 'chatty', 'talkative'].includes(t));
        }
        
        // Technical users might add technical perspective
        if (isTechnical && Math.random() > 0.8) {
            if (postContent.toLowerCase().includes('problem') || postContent.toLowerCase().includes('issue')) {
                const techPhrases = [
                    ' (Have you checked the logs?)',
                    ' (Documentation might have the answer!)',
                    ' (Stack Overflow is your friend!)',
                    ' (Time to break out the debugger!)'
                ];
                if (Math.random() > 0.7) {
                    modifiedComment += techPhrases[Math.floor(Math.random() * techPhrases.length)];
                }
            }
        }
        
        // Creative users might add artistic perspective
        if (isCreative && Math.random() > 0.8) {
            if (postContent.toLowerCase().includes('color') || postContent.toLowerCase().includes('design')) {
                const creativePhrases = [
                    ' The composition is *chef\'s kiss*!',
                    ' Colors speak to the soul!',
                    ' Art is everywhere when you look!',
                    ' Creative minds think alike!'
                ];
                if (Math.random() > 0.7) {
                    modifiedComment += creativePhrases[Math.floor(Math.random() * creativePhrases.length)];
                }
            }
        }
        
        // Social users might mention community
        if (isSocial && Math.random() > 0.8) {
            const socialPhrases = [
                ' Love this community!',
                ' We should hang out sometime!',
                ' DM me if you want to chat more!',
                ' Let\'s connect!',
                ' Always here if you need someone to talk to!'
            ];
            if (Math.random() > 0.7) {
                modifiedComment += socialPhrases[Math.floor(Math.random() * socialPhrases.length)];
            }
        }
        
        return modifiedComment;
    }

    // Determine appropriate comment context
    determineCommentContext(postContent, personality) {
        const contentLower = postContent.toLowerCase();
        
        // Enhanced content analysis with more specific patterns
        
        // Technical content analysis - handle both old and new personality formats
        let isTechnical = false;
        if (personality.personality && personality.personality.technical >= 6) {
            // Old format with numeric traits
            isTechnical = true;
        } else if (personality.personality_traits && Array.isArray(personality.personality_traits)) {
            // New format with string array traits
            const traits = personality.personality_traits.map(t => t.toLowerCase());
            isTechnical = traits.some(t => ['technical', 'programmer', 'coding', 'tech', 'developer'].includes(t));
        }
        
        if (isTechnical) {
            if (contentLower.includes('debug') || contentLower.includes('error') || contentLower.includes('bug')) {
                return 'technical_debug';
            }
            if (contentLower.includes('code') || contentLower.includes('programming') || contentLower.includes('algorithm')) {
                return 'technical_general';
            }
            if (contentLower.includes('framework') || contentLower.includes('library') || contentLower.includes('api')) {
                return 'technical_tools';
            }
        }
        
        // Emotional/personal content
        if (contentLower.includes('struggling') || contentLower.includes('hard time') || contentLower.includes('difficult')) {
            return 'support_struggle';
        }
        if (contentLower.includes('excited') || contentLower.includes('amazing') || contentLower.includes('love this')) {
            return 'excitement_shared';
        }
        if (contentLower.includes('grateful') || contentLower.includes('thankful') || contentLower.includes('blessed')) {
            return 'gratitude_response';
        }
        
        // Achievement/success posts
        if (contentLower.includes('finally') || contentLower.includes('success') || contentLower.includes('achieved') || 
            contentLower.includes('completed') || contentLower.includes('finished')) {
            return 'achievement_celebration';
        }
        
        // Learning/education posts
        if (contentLower.includes('learning') || contentLower.includes('til') || contentLower.includes('discovered') ||
            contentLower.includes('found out') || contentLower.includes('realized')) {
            return 'learning_shared';
        }
        
        // Questions and advice seeking
        if (postContent.includes('?') || contentLower.includes('what do you think') || 
            contentLower.includes('opinions') || contentLower.includes('thoughts')) {
            return 'question_response';
        }
        if (contentLower.includes('advice') || contentLower.includes('recommend') || contentLower.includes('suggestions')) {
            return 'advice_giving';
        }
        
        // Creative content
        if (contentLower.includes('art') || contentLower.includes('design') || contentLower.includes('creative') ||
            contentLower.includes('painting') || contentLower.includes('drawing')) {
            return 'creative_appreciation';
        }
        
        // Lifestyle/daily life
        if (contentLower.includes('coffee') || contentLower.includes('morning') || contentLower.includes('routine')) {
            return 'lifestyle_relatable';
        }
        if (contentLower.includes('workout') || contentLower.includes('gym') || contentLower.includes('fitness')) {
            return 'fitness_motivation';
        }
        
        // Food content
        if (contentLower.includes('food') || contentLower.includes('cooking') || contentLower.includes('recipe') ||
            contentLower.includes('delicious') || contentLower.includes('tasty')) {
            return 'food_appreciation';
        }
        
        // Nature/outdoor content
        if (contentLower.includes('sunset') || contentLower.includes('nature') || contentLower.includes('outdoor') ||
            contentLower.includes('hiking') || contentLower.includes('beautiful day')) {
            return 'nature_appreciation';
        }
        
        // Gaming content
        if (contentLower.includes('game') || contentLower.includes('gaming') || contentLower.includes('player') ||
            contentLower.includes('level') || contentLower.includes('boss')) {
            return 'gaming_shared';
        }
        
        // Work/productivity content
        if (contentLower.includes('work') || contentLower.includes('productivity') || contentLower.includes('meeting') ||
            contentLower.includes('deadline') || contentLower.includes('project')) {
            return 'work_relatable';
        }
        
        // For sarcastic personalities, check for content they might respond to sarcastically
        if (personality.socialBehavior?.interactionStyle === 'sarcastic') {
            if (contentLower.includes('perfect') || contentLower.includes('always') || contentLower.includes('never') ||
                contentLower.includes('best thing ever') || contentLower.includes('worst thing ever') ||
                contentLower.includes('obviously') || contentLower.includes('clearly')) {
                return Math.random() > 0.6 ? 'sarcastic_mild' : 'sarcastic_playful';
            }
        }
        
        // Default fallback based on personality - handle both old and new formats
        let isSocial = false;
        let isHumorous = false;
        
        if (personality.personality) {
            // Old format with numeric traits
            isSocial = personality.personality.social >= 7;
            isHumorous = personality.personality.humor >= 7;
        } else if (personality.personality_traits && Array.isArray(personality.personality_traits)) {
            // New format with string array traits
            const traits = personality.personality_traits.map(t => t.toLowerCase());
            isSocial = traits.some(t => ['social', 'friendly', 'outgoing', 'chatty', 'talkative'].includes(t));
            isHumorous = traits.some(t => ['humorous', 'funny', 'humor', 'comedic', 'witty'].includes(t));
        }
        
        if (isSocial) {
            return 'social_engagement';
        } else if (isHumorous) {
            return 'humor_light';
        } else {
            return 'general_positive';
        }
    }

    // Fallback generic content
    getGenericContent(personality) {
        const genericPosts = [
            "Just another day in paradise! How's everyone doing?",
            "Coffee thoughts: why is Monday a thing? ☕",
            "Sometimes the simplest moments are the most beautiful.",
            "Learning something new every day. Growth mindset activated!",
            "Grateful for the little things that make life amazing.",
            "Anyone else feeling the good vibes today? ✨",
            "Life update: still figuring it out, and that's okay!",
            "Random thought: we're all doing better than we think we are."
        ];
        
        return genericPosts[Math.floor(Math.random() * genericPosts.length)];
    }
}

module.exports = PersonalityContentGenerator; 