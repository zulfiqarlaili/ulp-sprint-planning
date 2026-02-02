
const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

async function main() {
    const pbUrl = process.env.POCKETBASE_URL || 'http://127.0.0.1:8090';
    const pb = new PocketBase(pbUrl);

    // Authenticate
    const email = process.env.POCKETBASE_ADMIN_EMAIL;
    const password = process.env.POCKETBASE_ADMIN_PASSWORD;

    try {
        await pb.admins.authWithPassword(email, password);
    } catch (e) {
        console.error('Failed to authenticate:', e.message);
        process.exit(1);
    }

    // 1. Sprints
    try {
        const sprintCol = await pb.collections.getOne('sprints');
        console.log('Found sprints collection. Updating...');

        // Flattened options for v0.23+
        const sprintFields = [
            { name: 'name', type: 'text', required: true },
            { name: 'start_date', type: 'date', required: true },
            { name: 'end_date', type: 'date', required: true },
            {
                name: 'status',
                type: 'select',
                values: ['active', 'planned', 'completed'], // Flattened
                maxSelect: 1,
                required: true
            },
            { name: 'lead_effort_hours', type: 'number' },
            { name: 'support_effort_hours', type: 'number' },
            { name: 'release_effort_points', type: 'number' },
            { name: 'lead_effort_points_input', type: 'number' },
            { name: 'support_effort_points_input', type: 'number' },
            { name: 'dev_capacity_factor', type: 'number' },
            { name: 'qa_capacity_factor', type: 'number' }
        ];

        await pb.collections.update(sprintCol.id, { fields: sprintFields });
        console.log('Fixed "sprints" schema/fields.');
    } catch (e) {
        console.error('Error updating sprints:', e.message);
        if (e.data) console.error(JSON.stringify(e.data, null, 2));
    }

    // 2. Capacities
    try {
        const sprintCol = await pb.collections.getOne('sprints');
        const capCol = await pb.collections.getOne('capacities');
        console.log('Found capacities collection. Updating...');

        const capFields = [
            {
                name: 'sprint',
                type: 'relation',
                collectionId: sprintCol.id, // Flattened
                cascadeDelete: true,
                maxSelect: 1,
                required: true
            },
            { name: 'name', type: 'text', required: true },
            { name: 'role', type: 'text', required: true },
            { name: 'total_staff', type: 'number' },
            { name: 'working_days', type: 'number' },
            { name: 'leave_days', type: 'number' },
            { name: 'public_holiday_days', type: 'number' },
            { name: 'full_capacity_points', type: 'number' },
            { name: 'overhead_perc', type: 'number' }
        ];

        await pb.collections.update(capCol.id, { fields: capFields });
        console.log('Fixed "capacities" schema/fields.');
    } catch (e) {
        console.error('Error updating capacities:', e.message);
        if (e.data) console.error(JSON.stringify(e.data, null, 2));
    }
}

main();
