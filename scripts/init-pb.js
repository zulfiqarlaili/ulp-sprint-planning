
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
        console.error(`Ensure you have created an admin with email: ${email} and the correct password.`);
        console.error(e.message);
        process.exit(1);
    }

    console.log('Authenticated. Checking collections...');

    const collections = [
        {
            name: 'sprints',
            type: 'base',
            schema: [
                { name: 'name', type: 'text', required: true },
                { name: 'start_date', type: 'date', required: true },
                { name: 'end_date', type: 'date', required: true },
                { name: 'status', type: 'select', options: { values: ['active', 'planned', 'completed'] }, required: true }
            ]
        },
        {
            name: 'capacities',
            type: 'base',
            schema: [
                { name: 'sprint', type: 'relation', collectionId: 'sprints', cascadeDelete: true, required: true }, // Will need to update collectionId after creating sprints if not using name reference? PB uses ID usually, but name works in create? No, relation needs collection ID.
                // Wait, in schema definition, 'collectionId' field of a relation refers to the target collection's ID. 
                // We'll fetching 'sprints' collection first to get its ID.
                { name: 'role', type: 'text', required: true },
                { name: 'total_staff', type: 'number', required: false },
                { name: 'working_days', type: 'number', required: false },
                { name: 'leave_days', type: 'number', required: false },
                { name: 'overhead_perc', type: 'number', required: false }
            ]
        }
    ];

    // Create 'sprints' first
    let sprintCol = null;
    try {
        sprintCol = await pb.collections.getOne('sprints');
        console.log('Collection "sprints" already exists.');
    } catch {
        console.log('Creating "sprints" collection...');
        sprintCol = await pb.collections.create({
            name: 'sprints',
            type: 'base',
            schema: collections[0].schema
        });
        console.log('"sprints" created.');
    }

    // Create 'capacities'
    try {
        await pb.collections.getOne('capacities');
        console.log('Collection "capacities" already exists.');
    } catch {
        console.log('Creating "capacities" collection...');

        // Fix relation field with correct target collection ID
        const schema = collections[1].schema.map(f => {
            if (f.name === 'sprint') {
                return { ...f, options: { collectionId: sprintCol.id } }; // Relation options syntax 
            }
            return f;
        });

        // PB API structure for relation field in schema is:
        // { type: 'relation', options: { collectionId: '...' } }
        // My schema definition above was slightly simplified, adjusting now.

        const finalSchema = [
            { name: 'sprint', type: 'relation', required: true, options: { collectionId: sprintCol.id, cascadeDelete: true, maxSelect: 1 } },
            { name: 'role', type: 'text', required: true },
            { name: 'total_staff', type: 'number' },
            { name: 'working_days', type: 'number' },
            { name: 'leave_days', type: 'number' },
            { name: 'overhead_perc', type: 'number' }
        ];

        await pb.collections.create({
            name: 'capacities',
            type: 'base',
            schema: finalSchema
        });
        console.log('"capacities" created.');
    }

    console.log('Schema setup complete!');
}

main();
