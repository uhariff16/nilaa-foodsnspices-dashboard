import fs from 'fs';
import path from 'path';

function walk(dir, results = []) {
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            if (!file.includes('node_modules') && !file.includes('.git')) {
                walk(fullPath, results);
            }
        } else {
            const lower = fullPath.toLowerCase();
            if (file.endsWith('.xlsx') && (lower.includes('04_') || lower.includes('apr') || lower.includes('_04'))) {
                results.push(fullPath);
            }
        }
    });
    return results;
}

console.log("Searching for all Excel files...");
const xlsxFiles = walk('c:\\AntiGravity');
console.log(`Found ${xlsxFiles.length} Excel files:`);
xlsxFiles.forEach(f => console.log(f));
