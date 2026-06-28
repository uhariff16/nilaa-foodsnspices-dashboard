const fs = require('fs');

// --- Update Dashboard.jsx ---
const dashboardPath = 'c:\\AntiGravity\\src\\components\\Dashboard.jsx';
let dashboard = fs.readFileSync(dashboardPath, 'utf8');

// Reduce gap in tab bar on mobile
dashboard = dashboard.replace(
    /alignItems: 'center', gap: '2rem', borderBottom: '1px solid var\(--glass-border\)', marginBottom: '2rem', overflowX: 'auto'/,
    "alignItems: 'center', gap: isMobile ? '1rem' : '2rem', borderBottom: '1px solid var(--glass-border)', marginBottom: '2rem', overflowX: 'auto'"
);

// Reduce padding for tabs on mobile
dashboard = dashboard.replace(
    /color: activeTab === 'overview' \? 'var\(--accent-primary\)' : 'var\(--text-secondary\)',/g,
    "color: activeTab === 'overview' ? 'var(--accent-primary)' : 'var(--text-secondary)', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0',"
);
// Actually the TabButton component is separate but main tabs in Dashboard.jsx are buttons.
// Let's replace the padding for all buttons in the nav tabs
dashboard = dashboard.replace(
    /background: 'none', border: 'none', padding: '0.5rem 0',/g,
    "background: 'none', border: 'none', padding: isMobile ? '0.5rem 0.25rem' : '0.5rem 0',"
);

fs.writeFileSync(dashboardPath, dashboard);
console.log('Updated Dashboard.jsx');

// --- Update ItemAnalysis.jsx ---
const itemAnalysisPath = 'c:\\AntiGravity\\src\\components\\ItemAnalysis.jsx';
let itemAnalysis = fs.readFileSync(itemAnalysisPath, 'utf8');

// Add isMobile state
itemAnalysis = itemAnalysis.replace(
    /const ItemAnalysis = \(\{ data \}\) => \{/,
    `const ItemAnalysis = ({ data }) => {
    const [isMobile, setIsMobile] = React.useState(window.innerWidth < 768);
    React.useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);`
);

// Change grid columns
itemAnalysis = itemAnalysis.replace(
    /gridTemplateColumns: '1fr 1fr'/,
    "gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'"
);

// Adjust chart height on mobile
itemAnalysis = itemAnalysis.replace(
    /height: '450px'/g,
    "height: isMobile ? '350px' : '450px'"
);

fs.writeFileSync(itemAnalysisPath, itemAnalysis);
console.log('Updated ItemAnalysis.jsx');

// --- Update InvestmentsDashboard.jsx ---
const investmentsPath = 'c:\\AntiGravity\\src\\components\\InvestmentsDashboard.jsx';
let investments = fs.readFileSync(investmentsPath, 'utf8');

// Add isMobile state
investments = investments.replace(
    /const InvestmentsDashboard = \(\{ isAdmin \}\) => \{/,
    `const InvestmentsDashboard = ({ isAdmin }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);`
);

// Update grid template columns for charts
investments = investments.replace(
    /className="responsive-grid" style=\{\{ gridTemplateColumns: '1fr 1fr'/,
    'className="responsive-grid" style={{ gridTemplateColumns: isMobile ? "1fr" : "1fr 1fr"'
);

// Adjust modal width on mobile
investments = investments.replace(
    /style=\{\{ width: '450px', padding: '2rem' \}\}/g,
    "style={{ width: isMobile ? '95%' : '450px', padding: isMobile ? '1.5rem' : '2rem' }}"
);

fs.writeFileSync(investmentsPath, investments);
console.log('Updated InvestmentsDashboard.jsx');
