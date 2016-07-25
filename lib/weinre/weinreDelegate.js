'use strict';

var http = require('http');
var os = require('os');
var weinre = require('weinre');
var child_process = require('child_process');
var spyProxy = require('../proxy/spyProxy');
var config = require('../config/config');
var colors = require('colors');
var fs = require('fs');
var htmlUtil = require('../util/htmlUtil');
var path = require('path');
var domain = require('domain');
var mitmproxy = require('node-mitmproxy');
var _ = require('lodash');

var d = domain.create();
d.on('error', function (err) {
    console.log(err.message);
});

var spyProxyPort;
var showIframe = false;

var weinreDelegate = module.exports;
var autoDetectBrowser = true;
var externalProxy;
var cache = false;

weinreDelegate.run = function run(_ref) {
    var cusSpyProxyPort = _ref.cusSpyProxyPort;
    var cusShowIframe = _ref.cusShowIframe;
    var cusAutoDetectBrowser = _ref.cusAutoDetectBrowser;
    var cusExternalProxy = _ref.cusExternalProxy;
    var cusCache = _ref.cusCache;

    spyProxyPort = cusSpyProxyPort;
    showIframe = cusShowIframe;
    autoDetectBrowser = cusAutoDetectBrowser;
    externalProxy = cusExternalProxy;
    cache = cusCache;
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

weinreDelegate.createCA = function () {
    mitmproxy.createCA();
};

function startWeinreServer(port) {
    console.log(colors.green('正在启动代理'));
    d.run(function () {

        var weinreServer = weinre.run({
            httpPort: port,
            boundHost: '-all-',
            verbose: false,
            debug: false,
            readTimeout: 5,
            deathTimeout: 15
        });
        weinreServer.on('listening', function () {

            fs.readFile(path.resolve(__dirname, '../../template/inject.js.template.html'), 'utf8', function (err, tpl) {
                if (err) {
                    return console.log(err);
                }
                var injectScriptTag = htmlUtil.createScriptTag(tpl, showIframe, config.SPY_WEINRE_DOMAIN);
                spyProxy.createProxy({
                    port: spyProxyPort,
                    injectScriptTag: injectScriptTag,
                    weinrePort: port,
                    autoDetectBrowser: autoDetectBrowser,
                    externalProxy: externalProxy,
                    cache: cache,
                    successCB: function successCB(externalProxyPorts) {
                        if (!externalProxy) {
                            var webPort = externalProxyPorts.webPort;
                            var guiServer = new http.Server();
                            guiServer.listen(function () {
                                var guiPort = guiServer.address().port;
                                if (process.platform === 'win32' || process.platform === 'win64') {
                                    child_process.exec('start http://127.0.0.1:' + guiPort);
                                    console.log(colors.green('浏览器打开 ---> http://127.0.0.1:' + guiPort));
                                } else {
                                    child_process.exec('open http://127.0.0.1:' + guiPort);
                                    console.log(colors.green('浏览器打开 ---> http://127.0.0.1:' + guiPort));
                                }
                            });
                            guiServer.on('error', function (e) {
                                console.log(e);
                            });
                            var fp = path.join(__dirname, '../../template/wrap.html');
                            var fileTemp = fs.readFileSync(fp).toString();
                            var fileString = _.template(fileTemp)({
                                weinreUrl: 'http://127.0.0.1:' + port + '/client',
                                anyProxyUrl: 'http://127.0.0.1:' + webPort
                            });
                            guiServer.on('request', function (req, res) {
                                res.setHeader('Content-Type', 'text/html;charset=utf-8');
                                res.end(fileString);
                            });
                        } else {
                            // auto open debugger page
                            if (process.platform === 'win32' || process.platform === 'win64') {
                                child_process.exec('start http://127.0.0.1:' + port + '/client');
                                console.log(colors.green('浏览器打开 ---> http://127.0.0.1:' + port + '/client'));
                            } else {
                                child_process.exec('open http://127.0.0.1:' + port + '/client');
                                console.log(colors.green('浏览器打开 ---> http://127.0.0.1:' + port + '/client'));
                            }
                        }
                    }
                });
            });
            weinreServer.on('error', function (e) {
                console.error(e);
            });
        });
    });
}