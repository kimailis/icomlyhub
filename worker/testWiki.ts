import axios from 'axios';

const getAvatarName = (name: string): string => {
    return name.replace(/\([^)]*\)/g, '').trim();
};

const getWikipediaBio = async (celebName: string): Promise<string | null> => {
    try {
        console.log(`Fetching bio for: ${celebName}`);
        const searchUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(celebName)}`;
        const res = await axios.get(searchUrl, {
            headers: { 'User-Agent': 'Icomly/1.0 (bot@icomly.com)' },
            validateStatus: (status) => status < 500
        });

        if (res.status === 404) {
            console.log('Got 404');
            return null;
        }

        const extract = res.data?.extract;
        if (extract && extract.length > 50) {
            return extract;
        }
        console.log('Extract too short or missing');
        return null;
    } catch (e: any) {
        console.error(`[Wikipedia] Failed to fetch bio for ${celebName}:`, e.message);
        return null;
    }
};

async function main() {
    const testCases = [
        "Taylor Swift",
        "Lisa Manobal",
        "V (Taehyung)",
        "Fan Bingbing",
        "NonExistent Celeb 123"
    ];

    for (const name of testCases) {
        const bio = await getWikipediaBio(name);
        console.log(`[${name}] Bio found: ${bio ? 'YES' : 'NO'}`);
        if (bio) console.log(`Sample: ${bio.substring(0, 50)}...`);
        console.log('---');
    }
}

main();
