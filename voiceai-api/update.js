const { Client } = require('pg');

async function update() {
    const client = new Client({ connectionString: process.env.DATABASE_URL });
    await client.connect();
    try {
        await client.query('UPDATE users SET email = $1 WHERE email = $2', ['info@sterlingaiacademy.com', 'admin@sterlingaiacademy.com']);
        console.log('Email updated successfully');
    } catch (e) {
        console.error(e);
    } finally {
        await client.end();
    }
}
update();
