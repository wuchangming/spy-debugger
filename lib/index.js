#!/usr/bin/env node

'use strict';

var program = require('commander');
var weinreDelegate = require('./weinre/weinreDelegate');
var colors = require('colors');
var http = require('http');

program.version(require('../package.json').version).option('-p, --port [value]', 'start port').option('-i, --showIframe [value]', 'spy iframe window').option('-b, --autoDetectBrowser [value]', 'Auto detect Browser Request').option('-e, --externalProxy [value]', 'set external Proxy').option('-c, --cache [value]', 'set no cache').option('-w, --contentEditable [value]', 'set content editable');

program.parse(process.argv);

var cusSpyProxyPort = program.port || 9888;

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

var cusContentEditable = false;
if (program.contentEditable === 'true') {
    cusContentEditable = true;
}

weinreDelegate.createCA();

var tempServer = new http.Server();

var createTempServerPromise = function createTempServerPromise(port) {
    return new Promise(function (resolve, reject) {
        tempServer.listen(port, function () {
            tempServer.close(function () {
                resolve();
            });
        });
        tempServer.on('error', function (e) {
            console.error(colors.red('警告：启动失败!！'));
            console.error(colors.red('检查端口 ' + port + ' 是否被占用，或尝试更换启动端口'));
            reject();
        });
    });
};

var tempServerPromise = createTempServerPromise(cusSpyProxyPort);

tempServerPromise.then(function () {
    weinreDelegate.run({
        cusExternalProxy: program.externalProxy,
        cusSpyProxyPort: cusSpyProxyPort,
        cusShowIframe: cusShowIframe,
        cusAutoDetectBrowser: autoDetectBrowser,
        cusCache: cusCache,
        cusContentEditable: cusContentEditable
    });
}, function (e) {
    // throw e
});