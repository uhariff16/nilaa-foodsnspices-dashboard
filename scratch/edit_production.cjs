const fs = require('fs');
const path = 'c:\\AntiGravity\\src\\components\\ProductionDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Update isMobile threshold
content = content.replace(/window\.innerWidth < 768/g, 'window.innerWidth < 1024');

// 2. Wrap tables in renderTable
// Find the return ( <table ... and wrap it
content = content.replace(
    /return \(\s+<table style={{([^}]+)}}/g,
    "return (\n            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>\n            <table style={{$1, minWidth: '800px'}}"
);

// We also need to close the div. 
// This is tricky because there are multiple return statements.
// Let's try a more robust replacement for renderTable return.

content = content.replace(
    /return \(\s+<table style=\{\{\s+width: '100%',\s+borderCollapse: 'collapse',\s+backgroundColor: 'white',\s+borderRadius: '8px',\s+overflow: 'hidden',\s+boxShadow: '0 1px 3px rgba\(0,0,0,0.1\)'\s+\}\}>\s+<thead>/g,
    (match) => {
        return "return (\n            <div style={{ overflowX: 'auto', width: '100%', WebkitOverflowScrolling: 'touch' }}>\n            " + match.replace("width: '100%'", "width: '100%', minWidth: '1000px'");
    }
);

// We need to add </div> before the closing ); of the table return.
// The table ends with </table>\n        );
content = content.replace(/<\/table>\s+\);\s+};/g, "</table>\n            </div>\n        );\n    };");

fs.writeFileSync(path, content);
console.log('Successfully updated ProductionDashboard.jsx');
