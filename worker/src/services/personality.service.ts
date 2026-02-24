import personalities from '../data/personalities.json';

export interface Personality {
  username: string;
  userId: number;
  personality_traits: string[];
  interests: string[];
  socialBehavior: {
    followProbability: number;
    likeProbability: number;
    commentProbability: number;
    interactionStyle: 'friendly' | 'sarcastic' | 'helpful' | 'neutral' | string;
    hashtagStyle?: 'none' | 'minimal' | 'moderate' | 'heavy';
  };
}

class PersonalityService {
  private personalities: Record<string, Personality> = (personalities as any);

  getPersonality(username: string): Personality | null {
    return this.personalities[username] || null;
  }

  getAllPersonalities(): Personality[] {
    return Object.values(this.personalities);
  }

  getRandomPersonality(): Personality {
    const keys = Object.keys(this.personalities);
    const randomKey = keys[Math.floor(Math.random() * keys.length)];
    return this.personalities[randomKey];
  }

  getUsersByTrait(trait: string): Personality[] {
    const traitKeywords: Record<string, string[]> = {
      'technical': ['technical', 'programmer', 'coding', 'tech', 'developer'],
      'creative': ['creative', 'artistic', 'art', 'design', 'visual'],
      'humor': ['humorous', 'funny', 'humor', 'comedic', 'witty'],
      'social': ['social', 'friendly', 'outgoing', 'chatty', 'talkative'],
      'intellectual': ['intellectual', 'thoughtful', 'philosophical', 'analytical', 'smart']
    };

    const keywords = traitKeywords[trait.toLowerCase()] || [trait.toLowerCase()];
    
    return Object.values(this.personalities).filter(p => {
      const traits = p.personality_traits.map(t => t.toLowerCase());
      return traits.some(t => keywords.includes(t));
    });
  }

  selectTopicForUser(username: string): string {
    const personality = this.getPersonality(username);
    if (!personality || !personality.interests.length) return 'lifestyle';

    const interestToCategory: Record<string, string[]> = {
      'tech': ['technology', 'programming', 'coding', 'software', 'AI', 'blockchain', 'crypto', 'cybersecurity'],
      'gaming': ['gaming', 'games', 'esports', 'streaming', 'console', 'PC gaming'],
      'lifestyle': ['fitness', 'health', 'wellness', 'yoga', 'meditation', 'self-improvement', 'fashion', 'beauty', 'luxury', 'elegance'],
      'humor': ['comedy', 'humor', 'funny', 'jokes', 'memes', 'entertainment'],
      'personal': ['personal', 'life', 'thoughts', 'feelings', 'relationships', 'family'],
      'photography': ['photography', 'art', 'visual', 'creative', 'aesthetic'],
      'science': ['science', 'research', 'nature', 'environment', 'astronomy', 'physics']
    };

    const matchedCategories: string[] = [];
    for (const interest of personality.interests) {
      for (const [category, keywords] of Object.entries(interestToCategory)) {
        if (keywords.some(keyword => interest.toLowerCase().includes(keyword.toLowerCase()))) {
          matchedCategories.push(category);
        }
      }
    }

    if (matchedCategories.length > 0) {
      return matchedCategories[Math.floor(Math.random() * matchedCategories.length)];
    }

    return 'lifestyle';
  }

  generatePersonalityHashtags(username: string, content: string): string {
    return '';
  }

  shouldUserPost(username: string): boolean {
    const personality = this.getPersonality(username);
    if (!personality) return false;
    
    // Default frequency if not specified
    const frequency = 1.5; // posts per day
    const dailyChecks = 24; // assuming hourly checks
    const probability = frequency / dailyChecks;
    
    return Math.random() < probability;
  }

  shouldUserComment(username: string, postContent: string): boolean {
    const personality = this.getPersonality(username);
    if (!personality) return false;
    
    const baseProbability = personality.socialBehavior.commentProbability || 0.5;
    let adjustedProbability = baseProbability;
    
    // Adjust based on traits
    const traits = personality.personality_traits.map(t => t.toLowerCase());
    
    if (traits.some(t => ['social', 'friendly', 'outgoing', 'chatty'].includes(t))) {
      adjustedProbability *= 1.2;
    }
    
    if (traits.some(t => ['technical', 'geeky', 'nerdy'].includes(t)) && 
        (postContent.toLowerCase().includes('tech') || postContent.toLowerCase().includes('code'))) {
      adjustedProbability *= 1.5;
    }

    if (traits.some(t => ['creative', 'artistic'].includes(t)) && 
        (postContent.toLowerCase().includes('art') || postContent.toLowerCase().includes('design'))) {
      adjustedProbability *= 1.5;
    }
    
    return Math.random() < Math.min(adjustedProbability, 0.9);
  }

  generatePostPrompt(username: string, targetName: string, isCeleb: boolean): string {
    const personality = this.getPersonality(username);
    if (!personality) return `Write a social media post from ${username} to ${targetName}'s wall.`;
    
    const traits = personality.personality_traits.join(', ');
    const interests = personality.interests.join(', ');
    const style = personality.socialBehavior.interactionStyle;
    const topic = this.selectTopicForUser(username);
    const hashtags = this.generatePersonalityHashtags(username, '');
    
    let prompt = `Write a short, engaging social media post (max 280 chars) from the perspective of ${username}.
Personality traits: ${traits}
Interests: ${interests}
Interaction style: ${style}
Current Topic of Interest: ${topic}

The user is posting on ${targetName}'s ${isCeleb ? 'official celebrity' : 'user'} wall.
The post should reflect the user's personality and their current interest in ${topic}.
ABSOLUTELY NO HASHTAGS.
Return ONLY the text of the post. No quotes. Use an authentic human tone with emojis.`;

    return prompt;
  }

  generateCommentPrompt(username: string, content: string, type: 'article' | 'post'): string {
    const personality = this.getPersonality(username);
    if (!personality) return `Write a brief comment on this ${type}: "${content}".`;
    
    const traits = personality.personality_traits.join(', ');
    const style = personality.socialBehavior.interactionStyle;
    
    let prompt = `Write a brief, one-sentence comment from ${username} responding to this ${type}: "${content}".
Personality traits: ${traits}
Interaction style: ${style}

Keep it very brief, like a real social media user.
ABSOLUTELY NO HASHTAGS.
Return ONLY the comment text. No quotes.`;

    return prompt;
  }
}

export const personalityService = new PersonalityService();
