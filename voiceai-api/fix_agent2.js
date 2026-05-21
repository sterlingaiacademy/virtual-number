require('dotenv').config();
const { Client } = require('pg');

async function main() {
    const dbUrl = process.env.DATABASE_URL;
    const client = new Client({ connectionString: dbUrl });
    await client.connect();

    try {
        const clientId = 'd9f4be0c-ad51-40ec-9248-05d6d1aa3854';
        const agentId = 'agent_7601kj7akhhsf3psk5gxkea2fpde';
        
        await client.query('BEGIN');
        
        await client.query('UPDATE clients SET elevenlabs_agent_id = $1 WHERE id = $2', [agentId, clientId]);
        
        await client.query(`
            INSERT INTO ai_agents (client_id, elevenlabs_agent_id, agent_name)
            VALUES ($1, $2, $3)
            ON CONFLICT (client_id) DO UPDATE SET elevenlabs_agent_id = $2
        `, [clientId, agentId, 'Green World Support']);
        
        await client.query('COMMIT');
        console.log('Successfully linked agent to client');
    } catch (e) {
        await client.query('ROLLBACK');
        console.error(e);
    } finally {
        await client.end();
    }
}
main();
