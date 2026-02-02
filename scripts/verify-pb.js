
const PocketBase = require('pocketbase/cjs');
require('dotenv').config();

async function main() {
    const pb = new PocketBase('http://127.0.0.1:8090');

    try {
        console.log("Fetching one item...");
        const result = await pb.collection('sprints').getList(1, 1);
        if (result.items.length > 0) {
            console.log("Item keys:", Object.keys(result.items[0]));
            console.log("Full Item:", JSON.stringify(result.items[0], null, 2));
        } else {
            console.log("No items found.");
        }

        console.log("Attempting sort by -created...");
        await pb.collection('sprints').getList(1, 1, { sort: '-created' });
        console.log("Sort by created works!");
    } catch (e) {
        console.error("Sort failed:", e.message);
    }
}

main();
