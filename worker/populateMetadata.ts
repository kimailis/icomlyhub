import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import { geminiService } from './src/services/gemini.service';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

console.log(`API Key loaded: ${process.env.GEMINI_API_KEY ? 'YES' : 'NO'}`);
if (!process.env.GEMINI_API_KEY) {
    console.error('GEMINI_API_KEY is missing!');
    process.exit(1);
}

async function main() {
    console.log('--- POPULATING METADATA ---');

    // Find celebs missing hobbies OR relationshipStatus
    const celebs = await prisma.celebrity.findMany({
        where: {
            OR: [
                { hobbies: null },
                { hobbies: '' },
                { relationshipStatus: null },
                { relationshipStatus: '' }
            ]
        }
    });

    console.log(`Found ${celebs.length} profiles missing metadata.`);

    for (const c of celebs) {
        console.log(`Enriching ${c.name}...`);

        try {
            const prompt = `
                I need quick facts for ${c.name} (${c.category || 'Celebrity'}).
                Return a JSON object with:
                1. "hobbies": A comma-separated string of 3-5 confirmed hobbies/interests.
                2. "relationshipStatus": Exact status. If married/dating, MUST include partner name (e.g. "Married to [Name]", "Dating [Name]"). If single, say "Single".
                3. "nationality": Their primary nationality (string).
                
                Strictly factual. If unknown, return null.
                Format: { "hobbies": "...", "relationshipStatus": "...", "nationality": "..." }
            `;

            const data = await geminiService.generateContent(prompt);

            const updateData: any = {};
            if (data.hobbies && data.hobbies !== 'null') updateData.hobbies = data.hobbies;
            if (data.relationshipStatus && data.relationshipStatus !== 'null') updateData.relationshipStatus = data.relationshipStatus;
            if (data.nationality && data.nationality !== 'null') updateData.nationality = data.nationality;

            if (Object.keys(updateData).length > 0) {
                await prisma.celebrity.update({
                    where: { id: c.id },
                    data: updateData
                });
                console.log(`Updated ${c.name}: ${JSON.stringify(updateData)}`);
            } else {
                console.log(`No data returned for ${c.name}`);
            }

            // Small delay to avoid rate limits if running on many
            await new Promise(r => setTimeout(r, 1000));

        } catch (e: any) {
            console.error(`Failed to enrich ${c.name}: ${e.message}`);
        }
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
