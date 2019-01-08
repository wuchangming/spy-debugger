'use strict';

var url = require('url');
var mitmProxy = require('node-mitmproxy');
var httpUtil = require('../util/httpUtil');
var zlib = require('zlib');
var through = require('through2');
var config = require('../config/config');
var htmlUtil = require('../util/htmlUtil');
var path = require('path');
var fs = require('fs');
var colors = require('colors');
var charset = require('charset');
var iconv = require('iconv-lite');
var jschardet = require('jschardet');
var domain = require('domain');
var childProcess = require('child_process');

var d = domain.create();
d.on('error', function (err) {
    console.log(err.message);
});
module.exports = {
    createProxy: function createProxy(_ref) {
        var injectScriptTag = _ref.injectScriptTag,
            _ref$port = _ref.port,
            port = _ref$port === undefined ? 9888 : _ref$port,
            weinrePort = _ref.weinrePort,
            _ref$autoDetectBrowse = _ref.autoDetectBrowser,
            autoDetectBrowser = _ref$autoDetectBrowse === undefined ? true : _ref$autoDetectBrowse,
            _externalProxy = _ref.externalProxy,
            successCB = _ref.successCB,
            cache = _ref.cache;

        var createMitmProxy = function createMitmProxy() {
            mitmProxy.createProxy({
                externalProxy: function externalProxy(req, ssl) {
                    // ignore weixin mmtls
                    var headers = req.headers;
                    if (headers['upgrade'] && headers['upgrade'] === 'mmtls') {
                        return '';
                    } else {
                        return _externalProxy;
                    }
                },
                port: port,
                getCertSocketTimeout: 3 * 1000,
                sslConnectInterceptor: function sslConnectInterceptor(req, cltSocket, head) {
                    var srvUrl = url.parse('https://' + req.url);

                    // 只拦截浏览器的https请求
                    if (!autoDetectBrowser || req.headers && req.headers['user-agent'] && /Mozilla/.test(req.headers['user-agent'])) {
                        return true;
                    } else {
                        return false;
                    }
                },
                requestInterceptor: function requestInterceptor(rOptions, req, res, ssl, next) {
                    var rPath;
                    if (rOptions.path) {
                        rPath = url.parse(rOptions.path).path;
                    } else {
                        rOptions.path = '/';
                    }

                    if (rOptions.headers.host === config.SPY_DEBUGGER_DOMAIN && rPath === '/cert' || rOptions.headers.host === config.SPY_DEBUGGER_SHORT_DOMAIN) {
                        var userHome = process.env.HOME || process.env.USERPROFILE;
                        var certPath = path.resolve(userHome, './node-mitmproxy/node-mitmproxy.ca.crt');
                        try {
                            var fileString = fs.readFileSync(certPath);
                            res.setHeader('Content-Type', 'application/x-x509-ca-cert');
                            res.setHeader("Content-Disposition", "attachment;filename=node-mitmproxy.ca.crt");
                            res.end(fileString.toString());
                        } catch (e) {
                            console.log(e);
                            res.end('please create certificate first!!');
                        }
                        next();
                        return;
                    }
                    if (rOptions.headers.host === config.SPY_WEINRE_DOMAIN) {
                        rOptions.protocol = 'http:';
                        rOptions.hostname = '127.0.0.1';
                        rOptions.port = weinrePort;
                        // trick for non-transparent proxy
                        rOptions.path = rPath;
                        rOptions.agent = false;
                    }
                    // delete Accept-Encoding
                    delete rOptions.headers['accept-encoding'];

                    // no cache
                    if (!cache) {
                        delete rOptions.headers['if-modified-since'];
                        delete rOptions.headers['last-modified'];
                        delete rOptions.headers['if-none-match'];
                    }

                    next();
                },
                responseInterceptor: function responseInterceptor(req, res, proxyReq, proxyRes, ssl, next) {
                    var isHtml = httpUtil.isHtml(proxyRes);
                    var contentLengthIsZero = function () {
                        return proxyRes.headers['content-length'] == 0;
                    }();
                    if (!isHtml || contentLengthIsZero) {
                        next();
                    } else {
                        Object.keys(proxyRes.headers).forEach(function (key) {
                            if (proxyRes.headers[key] != undefined) {
                                var newkey = key.replace(/^[a-z]|-[a-z]/g, function (match) {
                                    return match.toUpperCase();
                                });
                                var newkey = key;

                                if (isHtml && (key === 'content-length' || key === 'content-security-policy')) {
                                    // do nothing
                                } else {
                                    res.setHeader(newkey, proxyRes.headers[key]);
                                }
                            }
                        });

                        res.writeHead(proxyRes.statusCode);

                        var isGzip = httpUtil.isGzip(proxyRes);

                        var chunks = [];
                        proxyRes.on('data', function (chunk) {
                            chunks.push(chunk);
                        }).on('end', function () {
                            var allChunk = Buffer.concat(chunks);

                            res.end(chunkReplace(allChunk, injectScriptTag, proxyRes));
                        });
                    }
                    next();
                }
            });
        };

        if (!_externalProxy) {
            d.run(function () {
                var ports = void 0;

                var childProxy = childProcess.fork(__dirname + '/externalChildProcess');
                childProxy.send({
                    type: 'start'
                });
                childProxy.on('message', function (externalProxyPorts) {
                    ports = externalProxyPorts;
                    var externalProxyPort = externalProxyPorts.port;
                    var externalProxyWebPort = externalProxyPorts.webPort;
                    _externalProxy = 'http://127.0.0.1:' + externalProxyPort;
                    createMitmProxy();
                    successCB(externalProxyPorts);
                });
                var restartFun = function restartFun() {
                    console.log(colors.yellow('anyproxy\u5F02\u5E38\u9000\u51FA\uFF0C\u5C1D\u8BD5\u91CD\u542F'));
                    var childProxy = childProcess.fork(__dirname + '/externalChildProcess');
                    childProxy.send({
                        type: 'restart',
                        ports: ports
                    });
                    childProxy.on('exit', function (e) {
                        restartFun();
                    });
                };
                childProxy.on('exit', function (e) {
                    restartFun();
                });
            });
        } else {
            createMitmProxy();
            successCB(null);
        }
    }
};
function chunkReplace(chunk, injectScriptTag, proxyRes) {
    var _charset;
    try {
        _charset = charset(proxyRes, chunk) || jschardet.detect(chunk).encoding.toLowerCase();
    } catch (e) {
        console.error(e);
    }
    var chunkString;
    if (_charset != null && _charset != 'utf-8') {
        try {
            chunkString = iconv.decode(chunk, _charset);
        } catch (e) {
            console.error(e);
            chunkString = iconv.decode(chunk, 'utf-8');
        }
    } else {
        chunkString = chunk.toString();
    }

    var newChunkString = htmlUtil.injectScriptIntoHtml(chunkString, injectScriptTag);

    var buffer;
    if (_charset != null && _charset != 'utf-8') {
        try {
            buffer = iconv.encode(newChunkString, _charset);
        } catch (e) {
            console.error(e);
            buffer = iconv.encode(newChunkString, 'utf-8');
        }
    } else {
        buffer = new Buffer(newChunkString);
    }

    return buffer;
}