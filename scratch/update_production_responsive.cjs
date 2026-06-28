const fs = require('fs');
const path = 'c:\\AntiGravity\\src\\components\\ProductionDashboard.jsx';
let content = fs.readFileSync(path, 'utf8');

// 1. Add isMobile state
const stateInjection = `    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);

    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);\n\n`;

content = content.replace(
    /const ProductionDashboard = \(\{ data = \{\}, selectedMonth, selectedYear,\s+isAdmin \}\) => \{/,
    `const ProductionDashboard = ({ data = {}, selectedMonth, selectedYear, isAdmin }) => {\n${stateInjection}`
);

// 2. Wrap main container with padding and adjust grid based on isMobile
// The main return starts around line 796 in my previous view.
// But let's find it more reliably.

// Update KPIs Grid to be more responsive
content = content.replace(
    /gridTemplateColumns: 'repeat\(auto-fit, minmax\(200px, 1fr\)\)', gap: '1.5rem', marginBottom: '2rem'/g,
    "gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem', marginBottom: '2rem'"
);

// Update Production Performance grid
content = content.replace(
    /gridTemplateColumns: 'repeat\(auto-fit, minmax\(200px, 1fr\)\)', gap: '1.5rem'/g,
    "gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem'"
);

// Update Data Tables grid to stack on mobile
content = content.replace(
    /gridTemplateColumns: 'repeat\(auto-fit, minmax\(300px, 1fr\)\)', gap: '1.5rem', height: '600px'/g,
    "gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', height: isMobile ? 'auto' : '600px'"
);

fs.writeFileSync(path, content);
console.log('Successfully updated ProductionDashboard.jsx with isMobile and responsive layouts.');
