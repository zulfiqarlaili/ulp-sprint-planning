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
        // Get poker_sessions collection
        const pokerSessionCol = await pb.collections.getOne('poker_sessions');
        console.log('Current poker_sessions ID:', pokerSessionCol.id);
        
        console.log('\nCurrent fields:');
        pokerSessionCol.fields.forEach(f => {
            if (!f.system) {
                console.log(`  - ${f.name} (${f.type})`);
            }
        });

        // Check if status field already exists
        const hasStatus = pokerSessionCol.fields.some(f => f.name === 'status');
        
        if (hasStatus) {
            console.log('\n✓ Status field already exists!');
            return;
        }

        // Add status field
        console.log('\nAdding status field...');
        const updatedFields = [
            ...pokerSessionCol.fields,
            {
                name: 'status',
                type: 'text',
                required: true,
                options: {
                    min: null,
                    max: 20
                }
            }
        ];

        await pb.collections.update(pokerSessionCol.id, {
            fields: updatedFields
        });

        console.log('✓ Status field added successfully!');
        
        // Verify
        const updated = await pb.collections.getOne(pokerSessionCol.id);
        console.log('\nFinal fields:');
        updated.fields.forEach(f => {
            if (!f.system) {
                console.log(`  - ${f.name} (${f.type})`);
            }
        });

    } catch (err) {
        console.error('\n❌ Error:', err.message);
        if (err.response && err.response.data) {
            console.error('Details:', JSON.stringify(err.response.data, null, 2));
        }
        process.exit(1);
    }
}

main();
