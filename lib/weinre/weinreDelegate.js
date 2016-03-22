'use strict';

var http = require('http');
var os = require('os');
var weinre = require('weinre');
var child_process = require('child_process');
var SpyProxy = require('../proxy/SpyProxy');
var config = require('../config/config');
var logColor = config.logColor;
var program = require('commander');
var fs = require('fs');
var htmlUtil = require('../util/htmlUtil');

var spyProxyPort;
var showIframe = false;
program.version(require('../../package.json').version).option('-p, --port [value]', 'start port').option('-i, --showIframe [value]', 'spy iframe window').parse(process.argv);
spyProxyPort = program.port;
showIframe = program.showIframe || showIframe;

var weinreDelegate = module.exports;

weinreDelegate.run = function run() {
    var unBoundedPort = void 0;
    // get an unbounded port
    var tempServer = new http.Server();
    tempServer.listen(function () {
        unBoundedPort = tempServer.address().port;
        tempServer.close(function () {
            startWeinreServer(unBoundedPort);
        });
    });
};

function startWeinreServer(port) {
    var weinreServer = weinre.run({
        httpPort: port,
        boundHost: '-all-',
        verbose: false,
        debug: false,
        readTimeout: 5,
        deathTimeout: 15
    });
    weinreServer.on('listening', function () {

        fs.readFile('./src/config/inject.js.template.html', 'utf8', function (err, tpl) {
            if (err) {
                return console.log(err);
            }
            var injectScriptTag = htmlUtil.createScriptTag(tpl, showIframe, config.SPY_WEINRE_DOMAIN, port);
            new SpyProxy({
                port: spyProxyPort,
                injectScriptTag: injectScriptTag
            });
            // auto open debugger page
            if (process.platform === 'win32' || process.platform === 'win64') {
                child_process.exec('start http://127.0.0.1:' + port + '/client');
            } else {
                child_process.exec('open http://127.0.0.1:' + port + '/client');
            }
            console.log(logColor.FgGreen + '%s' + logColor.Reset, '浏览器打开 ---> http://127.0.0.1:' + port + '/client');
        });
    });
    weinreServer.on('error', function (e) {
        console.error(e);
    });
}