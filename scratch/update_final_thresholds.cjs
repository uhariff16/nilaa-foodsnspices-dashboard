const fs = require('fs');

// --- Update StockDashboard.jsx ---
const stockPath = 'c:\\AntiGravity\\src\\components\\StockDashboard.jsx';
let stock = fs.readFileSync(stockPath, 'utf8');
stock = stock.replace(/window\.innerWidth < 768/g, 'window.innerWidth < 1024');
fs.writeFileSync(stockPath, stock);
console.log('Updated StockDashboard.jsx threshold');

// --- Update ProcurementDashboard.jsx ---
const procurementPath = 'c:\\AntiGravity\\src\\components\\ProcurementDashboard.jsx';
let procurement = fs.readFileSync(procurementPath, 'utf8');
procurement = procurement.replace(/window\.innerWidth < 768/g, 'window.innerWidth < 1024');
fs.writeFileSync(procurementPath, procurement);
console.log('Updated ProcurementDashboard.jsx threshold');

// --- Update Charts.jsx ---
const chartsPath = 'c:\\AntiGravity\\src\\components\\Charts.jsx';
let charts = fs.readFileSync(chartsPath, 'utf8');

// Add isMobile state
charts = charts.replace(
    /const Charts = \(\{ transactions, data: propData, selectedMonth \}\) => \{/,
    `const Charts = ({ transactions, data: propData, selectedMonth }) => {
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 1024);
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);`
);

// Update grid columns
charts = charts.replace(
    /gridTemplateColumns: 'repeat\(2, 1fr\)'/g,
    "gridTemplateColumns: isMobile ? '1fr' : 'repeat(2, 1fr)'"
);

// Adjust chart height on mobile
charts = charts.replace(
    /height: '400px'/g,
    "height: isMobile ? '350px' : '400px'"
);

fs.writeFileSync(chartsPath, charts);
console.log('Updated Charts.jsx');
