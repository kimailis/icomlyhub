require('dotenv').config();
const mysql = require('mysql2');

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.promise().query("SELECT user_id, username, profilepath FROM users WHERE username IN ('StarGazer78', 'MidnightDahlia')")
    .then(([rows]) => {
        console.log(JSON.stringify(rows, null, 2));
        process.exit(0);
    })
    .catch(err => {
        console.error(err);
        process.exit(1);
    });
