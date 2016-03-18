'use strict'

const http = require('http');
const os = require('os');
const weinre = require('weinre');
const child_process = require('child_process');
const SpyProxy = require('../proxy/SpyProxy');
const logColor = require('../config/config').logColor;
const program = require('commander');

var spyProxyPort;
program.version(require('../../package.json').version)
    .command('port <port>')
    .action(function(port) {
        spyProxyPort = port;
    });
program.parse(process.argv);


var weinreDelegate = module.exports;

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
        if (!/window/i.test(process.platform)) {
            child_process.exec(`open http://127.0.0.1:${port}/client`);
        } else {
            child_process.exec(`start http://127.0.0.1:${port}/client`);
        }
        new SpyProxy({
            weinewPort: port,
            port: spyProxyPort
        });
        console.log(`${logColor.FgGreen}%s${logColor.Reset}`,`浏览器打开 ---> http://127.0.0.1:${port}/client`);
    });
    weinreServer.on('error', (e) => {
        console.error(e);
    })
}
