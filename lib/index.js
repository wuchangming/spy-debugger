#!/usr/bin/env node

'use strict';

var program = require('commander');
var weinreDelegate = require('./weinre/weinreDelegate');

program.version(require('../package.json').version).command('start').description('start sypdebugger').option('-p, --port [value]', 'start port').option('-i, --showIframe [value]', 'spy iframe window').action(function (options) {
    var cusSpyProxyPort = options.port;
    var cusShowIframe = options.showIframe;
    weinreDelegate.run({
        cusSpyProxyPort: cusSpyProxyPort,
        cusShowIframe: cusShowIframe
    });
});

program.version(require('../package.json').version).command('initCA').description('create root CA certificate').action(function (options) {
    weinreDelegate.createCA();
});

program.parse(process.argv);