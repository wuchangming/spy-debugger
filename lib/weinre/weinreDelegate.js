'use strict'

const http = require('http');
const os = require('os');
const weinre = require('weinre');
const child_process = require('child_process');
const SpyProxy = require('../proxy/SpyProxy');

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
        child_process.exec(`open http://127.0.0.1:${port}/client/#anonymous`);
        new SpyProxy({
            weinewPort: port
        });
        console.log(`open ---> http://127.0.0.1:${port}/client/#anonymous`);
    });
}
