'use strict'

const http = require('http');
const os = require('os');
const weinre = require('weinre');
const child_process = require('child_process');
const SpyProxy = require('../proxy/SpyProxy');

// console log 颜色
const FgRed = "\x1b[31m";
const FgGreen = "\x1b[32m";
const Reset = "\x1b[0m";

var weinreDelegate = module.exports;

// fixed weinre bugs: https://github.com/apache/cordova-weinre/pull/13
var originPrepareStackTrace = Error.prepareStackTrace;
Error.prepareStackTrace = (error, structuredStackTrace) => {
    try {
        originPrepareStackTrace(error, structuredStackTrace);
    } catch (e) {
        console.info('cause by weinre utils.js: ', e);
    } finally {
        return 'cause by weinre utils.js';
    }
}

weinreDelegate.run = function run() {
    let unBoundedPort;
    // get an unbounded port
    let tempServer  = new http.Server();
    tempServer.listen(() => {
        unBoundedPort = tempServer.address().port;
        tempServer.close(() => {
            startWeinreServer(unBoundedPort);
        });
    });
}

function startWeinreServer (port) {
    let weinreServer = weinre.run({
      httpPort: port,
      boundHost: '-all-',
      verbose: false,
      debug: false,
      readTimeout: 5,
      deathTimeout: 15
    });
    weinreServer.on('listening', () => {
        // auto open debugger page
        child_process.exec(`open http://127.0.0.1:${port}/client`);
        new SpyProxy({
            weinewPort: port
        });
        console.log(`${FgGreen}%s${Reset}`,`浏览器打开 ---> http://127.0.0.1:${port}/client`);
    });
    weinreServer.on('error', (e) => {
        console.error(e);
    })
}
