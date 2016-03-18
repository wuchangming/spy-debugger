'use strict';

var http = require('http');
var os = require('os');
var weinre = require('weinre');
var child_process = require('child_process');
var SpyProxy = require('../proxy/SpyProxy');
var logColor = require('../config/config').logColor;
var program = require('commander');

var spyProxyPort;
program.version(require('../../package.json').version).command('port <port>').action(function (port) {
    spyProxyPort = port;
});
program.parse(process.argv);

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
        // auto open debugger page
        if (!/window/i.test(process.platform)) {
            child_process.exec('open http://127.0.0.1:' + port + '/client');
        } else {
            child_process.exec('start http://127.0.0.1:' + port + '/client');
        }
        new SpyProxy({
            weinewPort: port,
            port: spyProxyPort
        });
        console.log(logColor.FgGreen + '%s' + logColor.Reset, '浏览器打开 ---> http://127.0.0.1:' + port + '/client');
    });
    weinreServer.on('error', function (e) {
        console.error(e);
    });
}