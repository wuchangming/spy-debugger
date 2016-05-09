#!/usr/bin/env node
'use strict'
const program = require('commander');
const weinreDelegate = require('./weinre/weinreDelegate');


program.version(require('../package.json').version)
.command('start')
.description('start sypdebugger')
.option('-p, --port [value]', 'start port')
.option('-i, --showIframe [value]', 'spy iframe window')
.action((options) => {
    var cusSpyProxyPort = options.port;
    var cusShowIframe = options.showIframe;
    weinreDelegate.run({
        cusSpyProxyPort,
        cusShowIframe
    });
});

program.version(require('../package.json').version)
.command('initCA')
.description('create root CA certificate')
.action((options) => {
    weinreDelegate.createCA();
});

program.parse(process.argv);
