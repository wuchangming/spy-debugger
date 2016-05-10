#!/usr/bin/env node

'use strict';

var program = require('commander');
var weinreDelegate = require('./weinre/weinreDelegate');

program.version(require('../package.json').version).option('-p, --port [value]', 'start port').option('-i, --showIframe [value]', 'spy iframe window');

program.parse(process.argv);

var cusSpyProxyPort = program.port;
var cusShowIframe = program.showIframe;
weinreDelegate.createCA();
weinreDelegate.run({
    cusSpyProxyPort: cusSpyProxyPort,
    cusShowIframe: cusShowIframe
});