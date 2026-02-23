import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';
import axios from 'axios';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const ALIAS_MAP: Record<string, string> = {
    "sean combs": "Diddy",
    "p diddy": "Diddy",
    "p. diddy": "Diddy",
    "sean diddy combs": "Diddy",
    "sean 'diddy' combs": "Diddy",
    "puff daddy": "Diddy",
    "ye": "Kanye West",
    "jlo": "Jennifer Lopez",
    "j-lo": "Jennifer Lopez",
    "the rock": "Dwayne Johnson"
};

const cleanCelebName = (rawName: string): string => {
    let name = rawName;
    const separators = [' and ', ' & ', ' with ', ' feat ', ' + ', ',', ' And ', ' AND '];
    for (const sep of separators) {
        if (name.includes(sep)) name = name.split(sep)[0];
    }
    name = name.replace(/([\u2700-\u27BF]|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDD10-\uDDFF])/g, '');
    return name.trim();
};

// Normalize person names by removing group/band suffixes to prevent duplicates
const normalizePersonName = (rawName: string): string => {
    let name = rawName;
    // Remove parenthetical suffixes like "(BTS)", "(BLACKPINK)", etc.
    name = name.replace(/\s*\([^)]*\)\s*$/, '').trim();
    // Also strip common group suffixes not in parens
    name = name.replace(/\s+BTS$/i, '').trim();
    name = name.replace(/\s+BLACKPINK$/i, '').trim();
    name = name.replace(/\s+EXO$/i, '').trim();
    name = name.replace(/\s+TWICE$/i, '').trim();
    
    // Clean first
    name = cleanCelebName(name);

    // Check aliases
    const lower = name.toLowerCase().replace(/['"“”\.]/g, '').trim();
    if (ALIAS_MAP[lower]) return ALIAS_MAP[lower];
    
    // Fuzzy match for Diddy
    if (lower.includes('diddy') && (lower.includes('sean') || lower.includes('combs') || lower.includes('p '))) return "Diddy";

    return name;
};

const slugify = (text: string) => {
    return normalizePersonName(text)
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')
        .replace(/[^\w\-]+/g, '')
        .replace(/\-\-+/g, '-');
};

// Check if an entity is a real person (not a band, group, or organization)
const isRealPerson = async (celebName: string): Promise<boolean> => {
    try {
        const url = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(celebName)}`;
        const res = await axios.get(url, {
            headers: { 'User-Agent': 'Icomly/1.0 (bot@icomly.com)' },
            validateStatus: (status) => status < 500
        });

        if (res.status === 404) return false;

        const description = (res.data?.description || '').toLowerCase();

        // Reject if clearly a group/band/company
        const groupIndicators = [
            'boy band', 'girl group', 'band', 'musical group', 'duo',
            'rock band', 'pop group', 'hip hop group', 'k-pop group',
            'ensemble', 'orchestra', 'company', 'brand', 'organization',
            'south korean boy band', 'south korean girl group',
            'american rock band', 'british rock band', 'supergroup',
            'musical duo', 'vocal group', 'record label', 'entertainment company'
        ];

        for (const indicator of groupIndicators) {
            if (description.includes(indicator)) {
                console.log(`  [isRealPerson] ${celebName} is a group/band: "${description}"`);
                return false;
            }
        }

        return true;
    } catch (e) {
        console.error(`  [isRealPerson] Check failed for ${celebName}:`, e);
        return true;
    }
};

async function deleteCelebWithRelations(id: string) {
    console.log(`  Deleting celebrity: ${id}`);
    await prisma.celebrityOsint.deleteMany({ where: { celebrityId: id } });
    await prisma.article.deleteMany({ where: { celebrityId: id } });
    await prisma.sighting.deleteMany({ where: { celebrityId: id } });
    await prisma.noiseHistory.deleteMany({ where: { celebrityId: id } });
    await prisma.follow.deleteMany({ where: { celebrityId: id } });
    await prisma.celebrity.delete({ where: { id } });
}

async function mergeProfiles(keepId: string, deleteId: string) {
    console.log(`  Merging ${deleteId} -> ${keepId}`);

    // Move articles to the kept profile
    await prisma.article.updateMany({
        where: { celebrityId: deleteId },
        data: { celebrityId: keepId }
    });

    // Move sightings to the kept profile
    await prisma.sighting.updateMany({
        where: { celebrityId: deleteId },
        data: { celebrityId: keepId }
    });

    // Move noise history to the kept profile
    await prisma.noiseHistory.updateMany({
        where: { celebrityId: deleteId },
        data: { celebrityId: keepId }
    });

    // Delete duplicate's OSINT data (can't merge easily)
    await prisma.celebrityOsint.deleteMany({ where: { celebrityId: deleteId } });

    // Delete follows for the duplicate (user can re-follow the canonical one)
    await prisma.follow.deleteMany({ where: { celebrityId: deleteId } });

    // Delete the duplicate profile
    await prisma.celebrity.delete({ where: { id: deleteId } });
}

async function main() {
    console.log('=== CELEBRITY PROFILE CLEANUP ===\n');

    // 1. Find and remove non-person profiles (bands, groups, etc.)
    console.log('--- Phase 1: Removing Non-Person Profiles ---');
    const allCelebs = await prisma.celebrity.findMany({
        select: { id: true, name: true }
    });

    let removedNonPersons = 0;
    for (const celeb of allCelebs) {
        const isPerson = await isRealPerson(celeb.name);
        if (!isPerson) {
            console.log(`[Non-Person] Removing: ${celeb.name} (${celeb.id})`);
            await deleteCelebWithRelations(celeb.id);
            removedNonPersons++;
        }
    }
    console.log(`Removed ${removedNonPersons} non-person profiles.\n`);

    // 2. Find and merge duplicate profiles
    console.log('--- Phase 2: Finding and Merging Duplicate Profiles ---');

    // Re-fetch after phase 1
    const remainingCelebs = await prisma.celebrity.findMany({
        select: { id: true, name: true },
        orderBy: { lastUpdated: 'desc' }
    });

    // Group by normalized name to find duplicates
    const nameMap = new Map<string, typeof remainingCelebs>();
    for (const celeb of remainingCelebs) {
        const normalizedSlug = slugify(celeb.name);
        if (!nameMap.has(normalizedSlug)) {
            nameMap.set(normalizedSlug, []);
        }
        nameMap.get(normalizedSlug)!.push(celeb);
    }

    let mergedCount = 0;
    for (const [slug, group] of nameMap) {
        if (group.length > 1) {
            console.log(`\n[Duplicate Found] "${slug}" has ${group.length} profiles:`);
            group.forEach(c => console.log(`  - ${c.id}: ${c.name}`));

            // Keep the first one (most recently updated due to sort order)
            const keep = group[0];
            console.log(`  Keeping: ${keep.id} (${keep.name})`);

            for (let i = 1; i < group.length; i++) {
                await mergeProfiles(keep.id, group[i].id);
                mergedCount++;
            }
        }
    }
    console.log(`\nMerged ${mergedCount} duplicate profiles.`);

    // 3. Summary
    console.log('\n=== CLEANUP COMPLETE ===');
    console.log(`- Removed ${removedNonPersons} non-person profiles (bands/groups)`);
    console.log(`- Merged ${mergedCount} duplicate profiles`);

    const finalCount = await prisma.celebrity.count();
    console.log(`- Total celebrities remaining: ${finalCount}`);
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
