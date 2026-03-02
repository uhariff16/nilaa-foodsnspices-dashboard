import fs from 'fs';

const filePath = 'c:/AntiGravity/src/components/Dashboard.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Add import
if (!content.includes("import { useNavigate }")) {
    content = content.replace("import React, { useState, useMemo, useEffect, useRef } from 'react';", "import React, { useState, useMemo, useEffect, useRef } from 'react';\nimport { useNavigate } from 'react-router-dom';");
}

// Add hook inside Dashboard
if (!content.includes("const navigate = useNavigate();")) {
    content = content.replace("const { theme, toggleTheme } = useTheme();", "const { theme, toggleTheme } = useTheme();\n    const navigate = useNavigate();");
}

fs.writeFileSync(filePath, content, 'utf8');
console.log("Patched Dashboard.jsx routing");
