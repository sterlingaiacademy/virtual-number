const { Client } = require('pg');
const bcrypt = require('bcryptjs');

async function seed() {
    const dbUrl = process.env.DATABASE_URL;
    if (!dbUrl) {
        console.error("DATABASE_URL not set");
        process.exit(1);
    }

    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
        // 1. Create Admin
        const adminEmail = 'admin@sterlingaiacademy.com';
        const adminPass = 'Admin@123';
        const adminHash = await bcrypt.hash(adminPass, 12);
        
        await client.query(`
            INSERT INTO users (email, password_hash, role, is_active) 
            VALUES ($1, $2, 'admin', true)
            ON CONFLICT (email) DO NOTHING
        `, [adminEmail, adminHash]);
        console.log(`Admin created: ${adminEmail} / ${adminPass}`);

        // 2. Create Green World Client
        const clientRes = await client.query(`
            INSERT INTO clients (business_name, contact_email, plan, status, billing_status)
            VALUES ('Green World', 'contact@greenworld.com', 'enterprise', 'active', 'paid')
            RETURNING id
        `);
        const clientId = clientRes.rows[0].id;

        const gwEmail = 'admin@greenworld.com';
        const gwPass = 'GreenWorld@123';
        const gwHash = await bcrypt.hash(gwPass, 12);

        await client.query(`
            INSERT INTO users (email, password_hash, role, client_id, is_active)
            VALUES ($1, $2, 'client', $3, true)
            ON CONFLICT (email) DO NOTHING
        `, [gwEmail, gwHash, clientId]);
        console.log(`Green World client created: ${gwEmail} / ${gwPass}`);

    } catch (err) {
        console.error(err);
    } finally {
        await client.end();
    }
}

seed();
