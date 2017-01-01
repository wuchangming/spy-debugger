'use strict'

const http = require('http');
const os = require('os');
const weinre = require('../../buildin_modules/weinre/lib/weinre');
const child_process = require('child_process');
const spyProxy = require('../proxy/spyProxy');
const config = require('../config/config');
const colors = require('colors');
const fs = require('fs');
const htmlUtil = require('../util/htmlUtil');
const path = require('path');
const domain = require('domain');
const mitmproxy = require('node-mitmproxy');
const _ = require('lodash');
const ip = require('ip');


var d = domain.create();
d.on('error', function (err) {
    console.log(err.message);
});

var spyProxyPort;
var showIframe = false;
var contentEditable = false;

var weinreDelegate = module.exports;
var autoDetectBrowser = true;
var externalProxy;
var cache = false;

weinreDelegate.run = function run({
    cusSpyProxyPort,
    cusShowIframe,
    cusAutoDetectBrowser,
    cusExternalProxy,
    cusCache,
    cusContentEditable
}) {
    spyProxyPort = cusSpyProxyPort;
    showIframe = cusShowIframe;
    autoDetectBrowser = cusAutoDetectBrowser;
    externalProxy = cusExternalProxy;
    cache = cusCache;
    contentEditable = cusContentEditable;
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
    console.log(colors.green('正在启动代理'));
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
                var injectScriptTag = htmlUtil.createScriptTag({
                    tpl,
                    showIframe,
                    contentEditable,
                    weinreDomain: config.SPY_WEINRE_DOMAIN
                });
                spyProxy.createProxy({
                    port: spyProxyPort,
                    injectScriptTag: injectScriptTag,
                    weinrePort: port,
                    autoDetectBrowser,
                    externalProxy: externalProxy,
                    cache,
                    successCB: function (externalProxyPorts) {
                        if (!externalProxy) {
                            var webPort = externalProxyPorts.webPort;
                            var guiServer = new http.Server();
                            guiServer.listen(() => {
                                setTimeout(() => {
                                    var guiPort = guiServer.address().port;
                                    if (process.platform === 'win32' || process.platform === 'win64') {
                                        child_process.exec(`start http://127.0.0.1:${guiPort}`);
                                        console.log(colors.green(`浏览器打开 ---> http://127.0.0.1:${guiPort}`));
                                    } else {
                                        child_process.exec(`open http://127.0.0.1:${guiPort}`);
                                        console.log(colors.green(`浏览器打开 ---> http://127.0.0.1:${guiPort}`));
                                    }
                                }, 600)
                            });
                            guiServer.on('error', (e) => {
                                console.log(e);
                            })
                            var fp = path.join(__dirname, '../../template/wrap.html');
                            var fileTemp = (fs.readFileSync(fp)).toString();
                            var fileString = _.template(fileTemp)({
                                weinreUrl: `http://127.0.0.1:${port}/client`,
                                anyProxyUrl: `http://127.0.0.1:${webPort}`
                            });
                            guiServer.on('request', (req, res) => {
                                res.setHeader('Content-Type', 'text/html;charset=utf-8');
                                res.end(fileString);
                            })

                        } else {
                            // auto open debugger page
                            if (process.platform === 'win32' || process.platform === 'win64') {
                                child_process.exec(`start http://127.0.0.1:${port}/client`);
                                console.log(colors.green(`浏览器打开 ---> http://127.0.0.1:${port}/client`));
                            } else {
                                child_process.exec(`open http://127.0.0.1:${port}/client`);
                                console.log(colors.green(`浏览器打开 ---> http://127.0.0.1:${port}/client`));
                            }
                        }
                        console.log(colors.green(`本机在当前网络下的IP地址为：${ip.address()}`))
                    }
                });
            });
            weinreServer.on('error', (e) => {
                console.error(e);
            })
        })

    })
}
