class SubjectRotator {
    constructor(subjects) {
        this.subjects = [...subjects];
        this.contentCache = new Map(); // Cache for content rotators of each subject
        this.lastUsedSubjects = new Set(); // Track recently used subjects
    }

    // Get a random index excluding recently used subjects
    getRandomIndex() {
        const availableSubjects = this.subjects.filter(subject => !this.lastUsedSubjects.has(subject));
        if (availableSubjects.length === 0) {
            // If all subjects have been used, reset the tracking
            this.lastUsedSubjects.clear();
            return Math.floor(Math.random() * this.subjects.length);
        }
        const randomIndex = Math.floor(Math.random() * availableSubjects.length);
        return this.subjects.indexOf(availableSubjects[randomIndex]);
    }

    // Get next subject and rotate it
    getNextSubject() {
        if (this.subjects.length <= 1) {
            return this.subjects[0];
        }

        const index = this.getRandomIndex();
        const subject = this.subjects[index];
        
        // Track this subject as recently used
        this.lastUsedSubjects.add(subject);
        
        // Keep track of only the last few subjects to prevent repetition
        if (this.lastUsedSubjects.size > Math.min(5, Math.floor(this.subjects.length * 0.2))) {
            const oldestSubject = Array.from(this.lastUsedSubjects)[0];
            this.lastUsedSubjects.delete(oldestSubject);
        }

        // Move the chosen subject to a different position
        this.subjects.splice(index, 1);
        this.subjects.push(subject);

        return subject;
    }

    // Get content rotator for a specific subject
    getContentRotator(subject, content) {
        if (!this.contentCache.has(subject)) {
            this.contentCache.set(subject, new SubjectRotator(content));
        }
        return this.contentCache.get(subject);
    }

    // Reset the rotation
    reset(subjects) {
        this.subjects = [...subjects];
        this.contentCache.clear();
        this.lastUsedSubjects.clear();
    }
}

// Initialize the main subject rotator with balanced distribution
const mainSubjects = [
    // Only subjects that have corresponding categories in contentStructure
    'tech',
    'lifestyle', 
    'health',
    'food',        // Added to include food content (pasta, pizza, baking, anecdotes)
    'provocative', // maps to 'personal'
    'weather',
    'travel',
    'books',
    'fitness', // maps to 'health'
    'mindfulness' // maps to 'lifestyle' 
];

// Cache for API content to prevent repetition
class ApiContentCache {
    constructor(maxSize = 10) {
        this.cache = new Map();
        this.maxSize = maxSize;
    }

    // Add content to cache with timestamp
    addContent(apiUrl, content) {
        if (this.cache.size >= this.maxSize) {
            // Remove oldest entry if cache is full
            const oldestKey = Array.from(this.cache.entries())
                .sort(([, a], [, b]) => a.timestamp - b.timestamp)[0][0];
            this.cache.delete(oldestKey);
        }
        this.cache.set(content, {
            apiUrl,
            timestamp: Date.now()
        });
    }

    // Check if content exists in cache
    hasContent(content) {
        return this.cache.has(content);
    }

    // Clear old entries (older than 1 hour)
    clearOld() {
        const oneHourAgo = Date.now() - (60 * 60 * 1000);
        for (const [content, data] of this.cache.entries()) {
            if (data.timestamp < oneHourAgo) {
                this.cache.delete(content);
            }
        }
    }

    // Get cache size
    size() {
        return this.cache.size;
    }

    // Clear entire cache
    clear() {
        this.cache.clear();
    }
}

const subjectRotator = new SubjectRotator(mainSubjects);
const apiContentCache = new ApiContentCache();

module.exports = {
    SubjectRotator,
    ApiContentCache,
    subjectRotator,
    apiContentCache
}; 