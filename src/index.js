#!/usr/bin/env node
'use strict'
const program = require('commander');
const weinreDelegate = require('./weinre/weinreDelegate');


program.version(require('../package.json').version)
.option('-p, --port [value]', 'start port')
.option('-i, --showIframe [value]', 'spy iframe window')
.option('-b, --autoDetectBrowser [value]', 'Auto detect Browser Request')

program.parse(process.argv);

var cusSpyProxyPort = program.port;
var cusShowIframe = program.showIframe;

var autoDetectBrowser = true;
if (program.autoDetectBrowser === 'false') {
    autoDetectBrowser = false;
}

weinreDelegate.createCA();
weinreDelegate.run({
    cusSpyProxyPort,
    cusShowIframe,
    cusAutoDetectBrowser: autoDetectBrowser
});
