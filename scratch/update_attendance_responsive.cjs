const fs = require('fs');

const path = 'c:\\AntiGravity\\src\\components\\TimeAttendance.jsx';
let content = fs.readFileSync(path, 'utf8');

// Add isMobile state
content = content.replace(
    /const TimeAttendance = \(\{ onBack, hideBack = false \}\) => \{/,
    `const TimeAttendance = ({ onBack, hideBack = false }) => {
    const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
    useEffect(() => {
        const handleResize = () => setIsMobile(window.innerWidth < 1024);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);`
);

// Update grids
content = content.replace(
    /gridTemplateColumns: 'repeat\(auto-fit, minmax\(200px, 1fr\)\)'/g,
    "gridTemplateColumns: isMobile ? '1fr' : 'repeat(auto-fit, minmax(200px, 1fr))'"
);

content = content.replace(
    /gridTemplateColumns: isPaymentTab \? '1fr 1fr' : '1fr 1fr 1fr'/g,
    "gridTemplateColumns: isMobile ? '1fr' : (isPaymentTab ? '1fr 1fr' : '1fr 1fr 1fr')"
);

content = content.replace(
    /gridTemplateColumns: isPaymentTab \? '1fr' : '2fr 1fr'/g,
    "gridTemplateColumns: isMobile ? '1fr' : (isPaymentTab ? '1fr' : '2fr 1fr')"
);

// General 1fr 1fr grids
content = content.replace(
    /gridTemplateColumns: '1fr 1fr'/g,
    "gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr'"
);

fs.writeFileSync(path, content);
console.log('Updated TimeAttendance.jsx');
