const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

async function main() {
    const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
    const pb = new PocketBase(pbUrl);

    console.log(`Connecting to PocketBase at ${pbUrl}...`);

    const email = process.env.POCKETBASE_ADMIN_EMAIL;
    const password = process.env.POCKETBASE_ADMIN_PASSWORD;

    await pb.admins.authWithPassword(email, password);
    console.log('Authenticated successfully.\n');

    try {
        // Get all poker_sessions records
        const sessions = await pb.collection('poker_sessions').getFullList();
        console.log(`Found ${sessions.length} session(s)`);

        // Update each session to have status = 'active' if it doesn't have one
        let updated = 0;
        for (const session of sessions) {
            if (!session.status) {
                await pb.collection('poker_sessions').update(session.id, {
                    status: 'active'
                });
                console.log(`✓ Updated session ${session.session_id} to active`);
                updated++;
            }
        }

        console.log(`\n✓ Updated ${updated} session(s) with default status`);
    } catch (err) {
        console.error('\n❌ Error:', err.message);
        process.exit(1);
    }
}

main();
