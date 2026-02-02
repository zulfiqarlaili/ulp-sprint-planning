
const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

async function main() {
    const pb = new PocketBase('http://127.0.0.1:8090');

    // Authenticate
    try {
        await pb.admins.authWithPassword(
            process.env.POCKETBASE_ADMIN_EMAIL,
            process.env.POCKETBASE_ADMIN_PASSWORD
        );
    } catch (e) {
        console.error('Failed to authenticate:', e.message);
        process.exit(1);
    }

    // Fix Sprints
    try {
        const col = await pb.collections.getOne('sprints');
        console.log('Current fields:', col.fields.map(f => f.name));

        // Add system fields if missing
        const newFields = [...col.fields];

        if (!newFields.find(f => f.name === 'created')) {
            newFields.push({ name: 'created', type: 'autodate', onCreate: true });
        }
        if (!newFields.find(f => f.name === 'updated')) {
            newFields.push({ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true });
        }

        await pb.collections.update(col.id, { fields: newFields });
        console.log('Fixed "sprints": Added created/updated.');
    } catch (e) {
        console.error('Error updating sprints:', e.message);
    }

    // Fix Capacities (Good practice)
    try {
        const col = await pb.collections.getOne('capacities');
        const newFields = [...col.fields];

        if (!newFields.find(f => f.name === 'created')) {
            newFields.push({ name: 'created', type: 'autodate', onCreate: true });
        }
        if (!newFields.find(f => f.name === 'updated')) {
            newFields.push({ name: 'updated', type: 'autodate', onCreate: true, onUpdate: true });
        }

        await pb.collections.update(col.id, { fields: newFields });
        console.log('Fixed "capacities": Added created/updated.');
    } catch (e) {
        console.error('Error updating capacities:', e.message);
    }
}

main();
