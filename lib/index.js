#!/usr/bin/env node

'use strict';

var program = require('commander');
var weinreDelegate = require('./weinre/weinreDelegate');

program.version(require('../package.json').version).option('-p, --port [value]', 'start port').option('-i, --showIframe [value]', 'spy iframe window').option('-b, --autoDetectBrowser [value]', 'Auto detect Browser Request').option('-e, --externalProxy [value]', 'set external Proxy').option('-c, --cache [value]', 'set no cache');

program.parse(process.argv);

var cusSpyProxyPort = program.port;

var cusShowIframe = false;
if (program.showIframe === 'true') {
    cusShowIframe = true;
}

var autoDetectBrowser = true;
if (program.autoDetectBrowser === 'false') {
    autoDetectBrowser = false;
}

var cusCache = false;
if (program.cache === 'true') {
    cusCache = true;
}

weinreDelegate.createCA();
weinreDelegate.run({
    cusExternalProxy: program.externalProxy,
    cusSpyProxyPort: cusSpyProxyPort,
    cusShowIframe: cusShowIframe,
    cusAutoDetectBrowser: autoDetectBrowser,
    cusCache: cusCache
});