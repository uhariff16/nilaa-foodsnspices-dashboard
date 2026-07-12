const SUPABASE_URL = 'https://eegihrxwtyxdzsiabvtw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVlZ2locnh3dHl4ZHpzaWFidnR3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjcxMzE4MTksImV4cCI6MjA4MjcwNzgxOX0.BgcIotQB7aiXcHvAwS91AJHnY9-rhLS4T_G5mk1c2yQ';

async function main() {
    console.log("Fetching schema...");
    try {
        const response = await fetch(`${SUPABASE_URL}/rest/v1/?apikey=${SUPABASE_ANON_KEY}`);
        const schema = await response.json();
        console.log("Database Tables/Views:");
        if (schema && schema.definitions) {
            console.log(Object.keys(schema.definitions));
        } else {
            console.log("No definitions found in schema:", schema);
        }
    } catch (e) {
        console.error("Fetch failed:", e);
    }
}

main();
