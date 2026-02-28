const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'components');

const replacements = [
    { regex: /color:\s*['"]white['"]/g, replacement: "color: 'var(--text-primary)'" },
    { regex: /color:\s*['"]#fff['"]/g, replacement: "color: 'var(--text-primary)'" },
    { regex: /color:\s*['"]#ffffff['"]/g, replacement: "color: 'var(--text-primary)'" },
    // Also background shorthand
    { regex: /background:\s*['"]#0f172a['"]/g, replacement: "background: 'var(--bg-primary)'" },
    { regex: /background:\s*['"]#1e293b['"]/g, replacement: "background: 'var(--bg-secondary)'" },
    { regex: /backgroundColor:\s*['"]#0f172a['"]/g, replacement: "backgroundColor: 'var(--bg-primary)'" },
    { regex: /backgroundColor:\s*['"]#1e293b['"]/g, replacement: "backgroundColor: 'var(--bg-secondary)'" },
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);
    let totalReplacements = 0;

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            totalReplacements += processDirectory(fullPath);
        } else if (fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;

            for (const { regex, replacement } of replacements) {
                if (regex.test(content)) {
                    content = content.replace(regex, replacement);
                    modified = true;
                }
            }

            if (modified) {
                fs.writeFileSync(fullPath, content, 'utf8');
                console.log(`Updated Text Colors: ${fullPath.replace(__dirname, '')}`);
                totalReplacements++;
            }
        }
    }
    return totalReplacements;
}

console.log("Starting text color replacement...");
const count = processDirectory(srcDir);
console.log(`Finished checking components. Updated ${count} files.`);
