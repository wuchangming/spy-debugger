const fs = require('fs');
const path = require('path');
try {
    const anyproxyIndexHtml = fs.readFileSync(path.join(__dirname, '../../template/anyproxy_index.html'))
    fs.writeFileSync(path.join(__dirname, '../../node_modules/anyproxy/web/index.html'), anyproxyIndexHtml)
} catch (e) {
//
}
