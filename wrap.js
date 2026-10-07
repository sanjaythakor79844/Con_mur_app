const fs = require('fs');

const path = process.argv[2];
let content = fs.readFileSync(path, 'utf8');

// replace text in tags
content = content.replace(/>([^<>{}\n]+)</g, (match, p1) => {
    let text = p1.trim();
    if (!text) return match;
    // skip single words that are likely variables or ignore symbols
    if (text === '—' || text === '·') return match;
    
    // if the text has quotes we need to be careful
    return `>{t("${text.replace(/"/g, '\\"')}")}<`.replace(/>{t\("([ ,.!?-]+)"\)}</, '>$1<'); 
});

// replace placeholders
content = content.replace(/placeholder="([^"]+)"/g, (match, p1) => {
    return `placeholder={t("${p1}")}`;
});

fs.writeFileSync(path, content, 'utf8');
console.log('Done');
