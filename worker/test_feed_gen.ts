
import { geminiOptimizedService } from './src/services/gemini-optimized.service';

async function main() {
    const currentDate = new Date().toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
    const currentYear = new Date().getFullYear();

    console.log(`[Test] Date: ${currentDate}`);

    const prompt = `Current Date: ${currentDate}. Current Year: ${currentYear}.
TASK: Search for and retrieve 5 REAL, TRENDING celebrity news stories from TODAY or YESTERDAY.

REQUIREMENTS:
1. USE GOOGLE SEARCH to find actual breaking news.
2. FILTER out any stories older than 48 hours.
3. FOCUS on Major Stars (A-List) and high-interest topics (Dating, Breakups, Viral Moments, Fashion, legal issues).
4. VERIFY the dates. Do not hallucinate old news as new.
5. Each summary MUST be 3-4 sentences long, providing deep detail and context.

Format: JSON object { "articles": [{ headline, summary, celebName, buzzScore (10-95), trend ("up"|"down"|"stable"|"volatile"), category }] }.`;

    try {
        console.log('[Test] Requesting content with search...');
        const data = await geminiOptimizedService.generateContent(prompt, { useSearch: true });
        console.log('[Test] Response received:');
        console.log(JSON.stringify(data, null, 2));
    } catch (e) {
        console.error('[Test] Failed:', e);
    }
}

main();
