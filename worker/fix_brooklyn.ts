
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import axios from 'axios';

const connectionString = "postgresql://user:password@localhost:5432/icomly?schema=public";
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const getWikipediaImage = async (celebName: string): Promise<string | null> => {
    const fetchImage = async (query: string) => {
        try {
            console.log(`Fetching image for query: ${query}`);
            const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&titles=${encodeURIComponent(query)}&prop=pageimages&format=json&pithumbsize=600&origin=*&redirects=1`;
            const res = await axios.get(searchUrl, { headers: { 'User-Agent': 'Icomly/1.0 (bot@icomly.com)' } });
            const pages = res.data.query?.pages;
            if (!pages) return null;
            const pageId = Object.keys(pages)[0];
            if (pageId === '-1') return null;
            return pages[pageId].thumbnail?.source || null;
        } catch (e: any) {
            console.error(`Error fetching image for ${query}: ${e.message}`);
            return null;
        }
    };

    let img = await fetchImage(celebName);
    if (img) return img;
    
    // Try removing parens if any (though Brooklyn doesn't have them)
    const simpleName = celebName.replace(/\([^)]*\)/g, '').trim();
    if (simpleName !== celebName) {
        return await fetchImage(simpleName);
    }
    return null;
};

async function main() {
    const name = "Brooklyn Beckham";
    const celeb = await prisma.celebrity.findFirst({
        where: { name: name }
    });

    if (celeb) {
        console.log(`Found celebrity: ${celeb.name}`);
        console.log(`Current Image URL: ${celeb.imageUrl}`);
        
        console.log("Attempting to fetch new image...");
        let newImg = await getWikipediaImage(name);

        if (!newImg) {
            console.log("No image found on Wikipedia.");
            // Check if current image is broken (404)
            try {
                if (celeb.imageUrl && celeb.imageUrl.startsWith('http')) {
                    await axios.head(celeb.imageUrl);
                    console.log("Current image is valid (200 OK). Leaving it alone.");
                } else {
                    throw new Error("Invalid URL");
                }
            } catch (e) {
                console.log("Current image is broken or missing. Falling back to generated avatar.");
                newImg = `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random&size=256`;
            }
        }

        if (newImg) {
            if (newImg !== celeb.imageUrl) {
                 await prisma.celebrity.update({
                    where: { id: celeb.id },
                    data: { imageUrl: newImg, lastUpdated: new Date() }
                });
                console.log(`Database updated to: ${newImg}`);
            } else {
                console.log("Image is already up to date.");
            }
        } else {
            console.log("No replacement image found.");
        }

    } else {
        console.log(`Celebrity '${name}' not found.`);
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
