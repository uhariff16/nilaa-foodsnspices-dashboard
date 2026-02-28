const fs = require('fs');
const path = require('path');

const srcDir = path.join(__dirname, 'src', 'components');

const replacements = [
    // Backgrounds
    { regex: /background:\s*['"]#0f172a['"]/g, replacement: "background: 'var(--bg-primary)'" },
    { regex: /background:\s*['"]#1e293b['"]/g, replacement: "background: 'var(--bg-secondary)'" },
    { regex: /background:\s*['"]rgba\(255,\s*255,\s*255,\s*0\.05\)['"]/g, replacement: "background: 'var(--glass-highlight)'" },
    { regex: /background:\s*['"]rgba\(255,255,255,0\.05\)['"]/g, replacement: "background: 'var(--glass-highlight)'" },

    // Background colors (if any)
    { regex: /backgroundColor:\s*['"]#0f172a['"]/g, replacement: "backgroundColor: 'var(--bg-primary)'" },
    { regex: /backgroundColor:\s*['"]#1e293b['"]/g, replacement: "backgroundColor: 'var(--bg-secondary)'" },

    // Borders
    { regex: /border:\s*['"]1px solid rgba\(255,\s*255,\s*255,\s*0\.1\)['"]/g, replacement: "border: '1px solid var(--glass-border)'" },
    { regex: /border:\s*['"]1px solid rgba\(255,255,255,0\.1\)['"]/g, replacement: "border: '1px solid var(--glass-border)'" },
    { regex: /borderBottom:\s*['"]1px solid rgba\(255,\s*255,\s*255,\s*0\.1\)['"]/g, replacement: "borderBottom: '1px solid var(--glass-border)'" },
    { regex: /borderBottom:\s*['"]1px solid rgba\(255,255,255,0\.1\)['"]/g, replacement: "borderBottom: '1px solid var(--glass-border)'" },

    // Text colors
    { regex: /color:\s*['"]#fff['"]/g, replacement: "color: 'var(--text-primary)'" },
    { regex: /color:\s*['"]#ffffff['"]/g, replacement: "color: 'var(--text-primary)'" },
    { regex: /color:\s*['"]#94a3b8['"]/g, replacement: "color: 'var(--text-secondary)'" },
    { regex: /color:\s*['"]#cbd5e1['"]/g, replacement: "color: 'var(--text-secondary)'" }
];

function processDirectory(dir) {
    const files = fs.readdirSync(dir);

    for (const file of files) {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);

        if (stat.isDirectory()) {
            processDirectory(fullPath);
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
                console.log(`Updated: ${fullPath.replace(__dirname, '')}`);
            }
        }
    }
}

console.log("Starting theme replacement...");
processDirectory(srcDir);
console.log("Finished theme replacement.");
