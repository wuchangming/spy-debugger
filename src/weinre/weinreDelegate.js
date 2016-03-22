'use strict'

const http = require('http');
const os = require('os');
const weinre = require('weinre');
const child_process = require('child_process');
const SpyProxy = require('../proxy/SpyProxy');
const config = require('../config/config');
const logColor = config.logColor;
const program = require('commander');
const fs = require('fs');
const htmlUtil = require('../util/htmlUtil');
const path = require('path');

var spyProxyPort;
var showIframe = false;
program.version(require('../../package.json').version)
.option('-p, --port [value]', 'start port')
.option('-i, --showIframe [value]', 'spy iframe window')
.parse(process.argv);
spyProxyPort = program.port;
showIframe = program.showIframe || showIframe;

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

        fs.readFile(path.resolve(__dirname, '../../template/inject.js.template.html'), 'utf8', function (err,tpl) {
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
                child_process.exec(`start http://127.0.0.1:${port}/client`);
            } else {
                child_process.exec(`open http://127.0.0.1:${port}/client`);            }
                console.log(`${logColor.FgGreen}%s${logColor.Reset}`,`浏览器打开 ---> http://127.0.0.1:${port}/client`);
            });

        });
        weinreServer.on('error', (e) => {
            console.error(e);
        })
    }
