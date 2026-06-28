const normalizeName = (name) => {
    if (!name) return "";
    let n = name.toUpperCase()
        .replace(/^NFS\s+/, '') // Remove NFS prefix
        .replace(/\b(G\s*(?:&|AND)\s*G)\b/g, 'GINGER GARLIC') // Handle G & G -> GINGER GARLIC
        .replace(/\s+/g, ' ')   // Normalize internal spacing
        .replace(/\(.*\)/g, '') // Remove everything in parentheses
        .replace(/\b\d+\s*(KG|G|GM|GMS|ML|L|PKT|PACKET|PACK|BOX|PCS|PC|G)\b/g, '') // Expanded units
        .replace(/\b(WITHOUT|PACKET|PKT|BOTTLE|JAR|TIN|PACK|PACKS)\b/g, '') // Specific keywords to ignore
        .replace(/[^\w\s]/g, ' ') // Replace non-alphanumeric with spaces
        .trim();
    // Sort words to handle "GARLIC PEELED" vs "PEELED GARLIC"
    return n.split(/\s+/).filter(Boolean).sort().join(" ");
};

console.log("Production 'Garlic Peeled':", `'${normalizeName('Garlic Peeled')}'`);
console.log("Sales 'NFS PEELED GARLIC 1KG':", `'${normalizeName('NFS PEELED GARLIC 1KG')}'`);
console.log("Sales 'NFS PEELED GARLIC ( 500 G )':", `'${normalizeName('NFS PEELED GARLIC ( 500 G )')}'`);
console.log("Sales 'NFS PEELED GINGER 1KG':", `'${normalizeName('NFS PEELED GINGER 1KG')}'`);
console.log("Production 'Ginger Peeled':", `'${normalizeName('Ginger Peeled')}'`);
