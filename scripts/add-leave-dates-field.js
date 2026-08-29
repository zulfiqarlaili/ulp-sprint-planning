const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

async function main() {
    const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
    const pb = new PocketBase(pbUrl);

    console.log(`Connecting to PocketBase at ${pbUrl}...`);

    const email = process.env.POCKETBASE_ADMIN_EMAIL;
    const password = process.env.POCKETBASE_ADMIN_PASSWORD;

    if (!email || !password) {
        console.error('Error: POCKETBASE_ADMIN_EMAIL or POCKETBASE_ADMIN_PASSWORD not set in .env');
        process.exit(1);
    }

    await pb.admins.authWithPassword(email, password);
    console.log('Authenticated successfully.\n');

    try {
        const capCol = await pb.collections.getOne('capacities');

        console.log('Current fields:');
        capCol.fields.forEach((f) => {
            if (!f.system) {
                console.log(`  - ${f.name} (${f.type})`);
            }
        });

        const hasLeaveDates = capCol.fields.some((f) => f.name === 'leave_dates');
        if (hasLeaveDates) {
            console.log('\n✓ leave_dates field already exists!');
            return;
        }

        console.log('\nAdding leave_dates json field...');
        const updatedFields = [
            ...capCol.fields,
            {
                name: 'leave_dates',
                type: 'json',
                required: false,
            },
        ];

        await pb.collections.update(capCol.id, {
            fields: updatedFields,
        });

        console.log('✓ leave_dates field added successfully!');

        const updated = await pb.collections.getOne(capCol.id);
        console.log('\nFinal fields:');
        updated.fields.forEach((f) => {
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
