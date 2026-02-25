require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
    host: process.env.DB_HOST || 'postgres',
    port: process.env.DB_PORT || 5432,
    user: process.env.DB_USER || 'user',
    password: process.env.DB_PASSWORD || 'password',
    database: process.env.DB_NAME || 'icomly'
});

pool.query('SELECT "id" as user_id, "name" as username, "profilePath" as profilepath FROM "User" WHERE "name" IN (\'StarGazer78\', \'MidnightDahlia\')')
    .then(res => {
        console.log(JSON.stringify(res.rows, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
