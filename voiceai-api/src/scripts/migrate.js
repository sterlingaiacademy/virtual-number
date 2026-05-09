const fs = require('fs');
const path = require('path');
const { Client } = require('pg');

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL environment variable is required.");
        process.exit(1);
    }

    const client = new Client({ connectionString: dbUrl });
    await client.connect();
    console.log("Connected to database.");

    const migrationsDir = path.join(__dirname, '../../database/migrations');
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

    for (const file of files) {
        console.log(`Running migration: ${file}`);
        const sql = fs.readFileSync(path.join(migrationsDir, file), 'utf8');
        try {
            await client.query(sql);
            console.log(`Successfully ran ${file}`);
        } catch (err) {
            console.error(`Error running migration ${file}:`, err);
            process.exit(1);
        }
    }

    await client.end();
    console.log("All migrations applied successfully!");
}

main().catch(err => {
    console.error("Fatal error:", err);
    process.exit(1);
});
