const fs = require('fs');
const path = require('path');
try {
    const newTextPromptJs = fs.readFileSync(path.join(__dirname, '../../template/TextPrompt.js'))
    fs.writeFileSync(path.join(__dirname, '../../node_modules/weinre/web/client/TextPrompt.js'), newTextPromptJs)
} catch (e) {
//
}
