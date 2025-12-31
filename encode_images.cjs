
const fs = require('fs');
const path = require('path');

const gPath = 'C:\\Users\\UmaiZahid\\.gemini\\antigravity\\brain\\edb48b2b-714c-4ad7-a2da-0590840b693d\\ginger_icon_1766827922881.png';
const gaPath = 'C:\\Users\\UmaiZahid\\.gemini\\antigravity\\brain\\edb48b2b-714c-4ad7-a2da-0590840b693d\\garlic_icon_1766827937272.png';
const targetFile = 'c:/AntiGravity/src/components/ProductionDashboard.jsx';

const gB64 = 'data:image/png;base64,' + fs.readFileSync(gPath).toString('base64');
const gaB64 = 'data:image/png;base64,' + fs.readFileSync(gaPath).toString('base64');

let content = fs.readFileSync(targetFile, 'utf8');

// Replace Image Paths
content = content.replace(/const GINGER_IMG = "file:\/\/\/.*?";/, `const GINGER_IMG = "${gB64}";`);
content = content.replace(/const GARLIC_IMG = "file:\/\/\/.*?";/, `const GARLIC_IMG = "${gaB64}";`);

// Add 'Used in Production' KPI if missing (User asked for it "on the top box along with stock")
// We look for the "Specific Stock Cards" section in the render
const kpiInsertPoint = `{/* Specific Stock Cards */}`;
const kpiCode = `
                {/* Specific Stock Cards */}
                <MetricCard
                    title="Ginger Stock"
                    value={\`\${gingerBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg\`}
                    subtext="Remaining Balance"
                    icon={Package}
                    trend="neutral"
                    image={GINGER_IMG}
                />
                <MetricCard
                    title="Garlic Stock"
                    value={\`\${garlicBalance.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg\`}
                    subtext="Remaining Balance"
                    icon={Package}
                    trend="neutral"
                    image={GARLIC_IMG}
                />
                 {/* Added Total Used as requested */}
                <MetricCard
                    title="Total Used"
                    value={\`\${totalPreProd.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg\`}
                    subtext="Pre-Production Input"
                    icon={Factory}
                    trend="neutral"
                />`;

// Use a simple replacement of the first two cards if they exist to inject the 3rd one
// Or finding the block.
// The current code has:
/*
            <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem'
            }}>
                <MetricCard
                    title="Ginger Stock"
...
                <MetricCard
                    title="Garlic Stock"
...
                <MetricCard
                    title="Total Output"
*/

// We can regex replace the MetricCards section
// Let's match from "Ginger Stock" down to "Garlic Stock" card end
// This is risky with regex on code.
// Let's use a known anchor.
// The file currently has:
// <MetricCard
//     title="Ginger Stock"
// ...
//     image={GARLIC_IMG}
// />

// We want to insert AFTER the Garlic Stock card.
const anchor = `image={GARLIC_IMG}
                />`;
const injection = `image={GARLIC_IMG}
                />
                <MetricCard
                    title="Total Used"
                    value={\`\${totalPreProd.toLocaleString('en-IN', { maximumFractionDigits: 0 })} kg\`}
                    subtext="Pre-Production Input"
                    icon={Factory}
                    trend="neutral"
                />`;

if (!content.includes('title="Total Used"')) {
    content = content.replace(anchor, injection);
}

fs.writeFileSync(targetFile, content);
console.log('ProductionDashboard.jsx updated with Base64 images and KPI.');
