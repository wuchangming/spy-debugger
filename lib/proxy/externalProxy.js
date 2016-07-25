'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { return step("next", value); }, function (err) { return step("throw", err); }); } } return step("next"); }); }; }

var proxy = require('anyproxy');
var http = require('http');
var default_rule = require('anyproxy/lib/rule_default');
var fs = require('fs');
var path = require('path');

var defaultExternalProxy = exports;
defaultExternalProxy.createExternalProxy = function (callback) {
    var _this = this;

    //create cert when you want to use https features
    //please manually trust this rootCA when it is the first time you run it
    if (!proxy.isRootCAFileExists()) {
        var userHome = process.env.HOME || process.env.USERPROFILE;
        var certDir = path.join(userHome, "/.anyproxy_certs/");
        if (!fs.existsSync(certDir)) {
            try {
                fs.mkdirSync(certDir);
            } catch (e) {
                console.error('fail to create certDir at:' + certDir);
            }
        }
        var mitmCrt = path.resolve(userHome, './node-mitmproxy/node-mitmproxy.ca.crt');
        var mitmKey = path.resolve(userHome, './node-mitmproxy/node-mitmproxy.ca.key.pem');

        fs.createReadStream(mitmCrt).pipe(fs.createWriteStream(path.join(certDir, './rootCA.crt')));
        fs.createReadStream(mitmKey).pipe(fs.createWriteStream(path.join(certDir, './rootCA.key')));
    }

    var unBoundedPort1 = void 0,
        unBoundedPort2 = void 0,
        unBoundedPort3 = void 0;
    // get an unbounded port
    var tempServer1 = new http.Server();
    var tempServer2 = new http.Server();
    var tempServer3 = new http.Server();

    var tempServer1Promise = function tempServer1Promise() {
        return new Promise(function (resolve, reject) {
            tempServer1.listen(function () {
                unBoundedPort1 = tempServer1.address().port;
                tempServer1.close(function () {
                    resolve(unBoundedPort1);
                });
            });
        });
    };

    var tempServer2Promise = function tempServer2Promise() {
        return new Promise(function (resolve, reject) {
            tempServer2.listen(function () {
                unBoundedPort2 = tempServer2.address().port;
                tempServer2.close(function () {
                    resolve(unBoundedPort2);
                });
            });
        });
    };

    var tempServer3Promise = function tempServer3Promise() {
        return new Promise(function (resolve, reject) {
            tempServer3.listen(function () {
                unBoundedPort3 = tempServer3.address().port;
                tempServer3.close(function () {
                    resolve(unBoundedPort3);
                });
            });
        });
    };

    _asyncToGenerator(regeneratorRuntime.mark(function _callee() {
        var result1, result2, result3, options;
        return regeneratorRuntime.wrap(function _callee$(_context) {
            while (1) {
                switch (_context.prev = _context.next) {
                    case 0:
                        _context.next = 2;
                        return tempServer1Promise();

                    case 2:
                        result1 = _context.sent;
                        _context.next = 5;
                        return tempServer2Promise();

                    case 5:
                        result2 = _context.sent;
                        _context.next = 8;
                        return tempServer3Promise();

                    case 8:
                        result3 = _context.sent;
                        options = {
                            type: "http",
                            port: result1,
                            hostname: "localhost",
                            rule: Object.assign(default_rule, {
                                shouldInterceptHttpsReq: function shouldInterceptHttpsReq() {
                                    return true;
                                }
                            }),
                            webPort: result2, // optional, port for web interface
                            socketPort: result3,
                            silent: true //optional, do not print anything into terminal. do not set it when you are still debugging.
                        };

                        new proxy.proxyServer(options);

                        callback({
                            port: result1,
                            webPort: result2
                        });

                    case 12:
                    case 'end':
                        return _context.stop();
                }
            }
        }, _callee, _this);
    }))();
};