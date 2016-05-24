'use strict'

const http = require('http');
const os = require('os');
const weinre = require('weinre');
const child_process = require('child_process');
const spyProxy = require('../proxy/spyProxy');
const config = require('../config/config');
const colors = require('colors');
const fs = require('fs');
const htmlUtil = require('../util/htmlUtil');
const path = require('path');
const domain = require('domain');
const mitmproxy = require('node-mitmproxy');
var d = domain.create();
d.on('error', function (err) {
    console.log(err.message);
});

var spyProxyPort;
var showIframe = false;

var weinreDelegate = module.exports;
var autoDetectBrowser = true;

weinreDelegate.run = function run({
    cusSpyProxyPort,
    cusShowIframe,
    cusAutoDetectBrowser
}) {
    spyProxyPort = cusSpyProxyPort;
    showIframe = cusShowIframe;
    autoDetectBrowser = cusAutoDetectBrowser;

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

weinreDelegate.createCA = function () {
    mitmproxy.createCA();
}

function startWeinreServer (port) {

    d.run(() => {

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
                var injectScriptTag = htmlUtil.createScriptTag(tpl, showIframe, config.SPY_WEINRE_DOMAIN);
                spyProxy.createProxy({
                    port: spyProxyPort,
                    injectScriptTag: injectScriptTag,
                    weinrePort: port,
                    autoDetectBrowser
                });
                // auto open debugger page
                if (process.platform === 'win32' || process.platform === 'win64') {
                    child_process.exec(`start http://127.0.0.1:${port}/client`);
                } else {
                    child_process.exec(`open http://127.0.0.1:${port}/client`);
                    console.log(colors.green(`浏览器打开 ---> http://127.0.0.1:${port}/client`));
                }
            });
            weinreServer.on('error', (e) => {
                console.error(e);
            })
        })

    })
}
