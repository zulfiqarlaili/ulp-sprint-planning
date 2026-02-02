
const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

async function main() {
    const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
    const pb = new PocketBase(pbUrl);

    console.log(`Connecting to PocketBase at ${pbUrl}...`);

    // Authenticate as Admin
    const email = process.env.POCKETBASE_ADMIN_EMAIL;
    const password = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!email || !password) {
        console.error('Error: POCKETBASE_ADMIN_EMAIL or POCKETBASE_ADMIN_PASSWORD not set in .env');
        process.exit(1);
    }

    try {
        await pb.admins.authWithPassword(email, password);
    } catch (e) {
        console.error('Failed to authenticate as admin.');
        process.exit(1);
    }

    const collections = ['sprints', 'capacities'];

    for (const name of collections) {
        try {
            const col = await pb.collections.getOne(name);
            await pb.collections.update(col.id, {
                listRule: '',
                viewRule: '',
                createRule: '',
                updateRule: '',
                deleteRule: ''
            });
            console.log(`Updated rules for collection "${name}" to public.`);
        } catch (e) {
            console.error(`Failed to update rules for "${name}": ${e.message}`);
        }
    }
}

main();
