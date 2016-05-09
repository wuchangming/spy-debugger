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
var d = domain.create();
d.on('error', function (err) {
    console.log(err.message);
});

var spyProxyPort;
var showIframe = false;

var weinreDelegate = module.exports;

weinreDelegate.run = function run(_ref) {
    var cusSpyProxyPort = _ref.cusSpyProxyPort;
    var cusShowIframe = _ref.cusShowIframe;

    spyProxyPort = cusSpyProxyPort;
    showIframe = showIframe;

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
                var injectScriptTag = htmlUtil.createScriptTag(tpl, showIframe, config.SPY_WEINRE_DOMAIN, port);
                spyProxy.createProxy({
                    port: spyProxyPort,
                    injectScriptTag: injectScriptTag
                });
                // auto open debugger page
                if (process.platform === 'win32' || process.platform === 'win64') {
                    child_process.exec('start http://127.0.0.1:' + port + '/client');
                } else {
                    child_process.exec('open http://127.0.0.1:' + port + '/client');
                    console.log(colors.green('浏览器打开 ---> http://127.0.0.1:' + port + '/client'));
                }
            });
            weinreServer.on('error', function (e) {
                console.error(e);
            });
        });
    });
}