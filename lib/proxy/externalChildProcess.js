'use strict';

function _asyncToGenerator(fn) { return function () { var gen = fn.apply(this, arguments); return new Promise(function (resolve, reject) { function step(key, arg) { try { var info = gen[key](arg); var value = info.value; } catch (error) { reject(error); return; } if (info.done) { resolve(value); } else { return Promise.resolve(value).then(function (value) { step("next", value); }, function (err) { step("throw", err); }); } } return step("next"); }); }; }

require('babel-polyfill');
var http = require('http');
var AnyProxy = require('AnyProxy');
var fs = require('fs');
var path = require('path');
var colors = require('colors');

var port = void 0,
    webPort = void 0,
    socketPort = void 0;

var tempServerPromise = function tempServerPromise() {
    return new Promise(function (resolve, reject) {
        var tempServer = new http.Server();
        tempServer.listen(function () {
            var unBoundedPort = tempServer.address().port;
            tempServer.close(function () {
                resolve(unBoundedPort);
            });
        });
    });
};

var createAnyProxy = function createAnyProxy() {
    var options = {
        port: port,
        forceProxyHttps: true,
        webInterface: {
            enable: true,
            webPort: webPort
        },
        dangerouslyIgnoreUnauthorized: true,
        silent: true //optional, do not print anything into terminal. do not set it when you are still debugging.
    };
    new AnyProxy.ProxyServer(options).start();
};

process.on('message', function (_ref) {
    var type = _ref.type,
        ports = _ref.ports;

    if (type === 'start') {
        if (!AnyProxy.utils.certMgr.isRootCAFileExists()) {
            var userHome = process.env.HOME || process.env.USERPROFILE;
            var certDir = path.join(userHome, '/.anyproxy/certificates');
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

        ;_asyncToGenerator( /*#__PURE__*/regeneratorRuntime.mark(function _callee() {
            var ports;
            return regeneratorRuntime.wrap(function _callee$(_context) {
                while (1) {
                    switch (_context.prev = _context.next) {
                        case 0:
                            _context.next = 2;
                            return Promise.all([tempServerPromise(), tempServerPromise(), tempServerPromise()]);

                        case 2:
                            ports = _context.sent;

                            port = ports[0];
                            webPort = ports[1];
                            socketPort = ports[2];
                            createAnyProxy();

                            process.send({
                                port: port,
                                webPort: webPort,
                                socketPort: socketPort
                            });

                        case 8:
                        case 'end':
                            return _context.stop();
                    }
                }
            }, _callee, undefined);
        }))();
    } else if (type === 'restart') {
        port = ports.port;
        webPort = ports.webPort;
        socketPort = ports.socketPort;

        createAnyProxy();
        console.log(colors.green('重启成功！请手动刷新浏览器'));
    }
});