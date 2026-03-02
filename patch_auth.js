import fs from 'fs';

const filePath = 'c:/AntiGravity/src/context/AuthContext.jsx';
let content = fs.readFileSync(filePath, 'utf8');

const regex = /const checkSession = async \(\) => \{[\s\S]*?checkSession\(\);/m;
content = content.replace(regex, '');

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched AuthContext.jsx");
