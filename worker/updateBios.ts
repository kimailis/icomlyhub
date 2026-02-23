import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import pg from 'pg';

const connectionString = `${process.env.DATABASE_URL}`;
const pool = new pg.Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

const TAYLOR_BIO = `Taylor Swift, born Taylor Alison Swift on December 13, 1989, in West Reading, Pennsylvania, is an American singer-songwriter renowned for her narrative songwriting and genre-spanning musical evolution. She began her musical journey at a young age, inspired by artists like Shania Twain, and moved to Nashville, Tennessee, at 14 to pursue a career in country music. After signing with Big Machine Records in 2005, she released her self-titled debut album in 2006. Swift achieved crossover success with albums like "Fearless" (2008), which featured hits such as "Love Story" and "You Belong with Me," establishing her as a prominent artist in both country and pop music.

Throughout her career, Swift has become one of the best-selling music artists of all time and an influential figure in popular culture. Her accolades include a record-breaking four Grammy Awards for Album of the Year, making her the first artist to achieve this feat. She has also received 14 Grammy Awards in total, a Primetime Emmy Award, and is the most-awarded artist at the American Music Awards, Billboard Music Awards, and MTV Video Music Awards. Her "Eras Tour" made history as the highest-grossing concert tour, surpassing $2 billion in revenue. Swift was named Time Person of the Year in 2023, the first individual from the arts to receive this honor.`;

async function main() {
    console.log('Updating Taylor Swift bio...');

    try {
        const updated = await prisma.celebrity.updateMany({
            where: {
                OR: [
                    { id: 'taylor-swift' },
                    { name: 'Taylor Swift' }
                ]
            },
            data: {
                bio: TAYLOR_BIO,
                bioLastUpdated: new Date()
            }
        });

        if (updated.count > 0) {
            console.log(`Successfully updated ${updated.count} record(s) for Taylor Swift.`);
        } else {
            console.error('No records found for Taylor Swift to update.');
        }

    } catch (error) {
        console.error('Error updating bio:', error);
    }
}

main()
    .catch((e) => console.error(e))
    .finally(async () => await prisma.$disconnect());
