'use strict';

var fs = require('fs');
var path = require('path');
try {
    var anyproxyIndexHtml = fs.readFileSync(path.join(__dirname, '../../template/anyproxy_index.html'));
    fs.writeFileSync(path.join(__dirname, '../../node_modules/anyproxy/web/index.html'), anyproxyIndexHtml);
} catch (e) {
    //
}