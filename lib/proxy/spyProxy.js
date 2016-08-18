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
var defaultExternalProxy = require('./externalProxy');
var domain = require('domain');

var d = domain.create();
d.on('error', function (err) {
    console.log(err.message);
});
module.exports = {
    createProxy: function createProxy(_ref) {
        var injectScriptTag = _ref.injectScriptTag;
        var _ref$port = _ref.port;
        var port = _ref$port === undefined ? 9888 : _ref$port;
        var weinrePort = _ref.weinrePort;
        var _ref$autoDetectBrowse = _ref.autoDetectBrowser;
        var autoDetectBrowser = _ref$autoDetectBrowse === undefined ? true : _ref$autoDetectBrowse;
        var externalProxy = _ref.externalProxy;
        var successCB = _ref.successCB;
        var cache = _ref.cache;


        var createMitmProxy = function createMitmProxy() {

            mitmProxy.createProxy({
                externalProxy: externalProxy,
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

                    if (rOptions.headers.host === config.SPY_DEBUGGER_DOMAIN && rPath === '/cert') {
                        var userHome = process.env.HOME || process.env.USERPROFILE;
                        var certPath = path.resolve(userHome, './node-mitmproxy/node-mitmproxy.ca.crt');
                        try {
                            var fileString = fs.readFileSync(certPath);
                            res.setHeader('Content-Type', 'application/x-x509-ca-cert');
                            res.end(fileString.toString());
                        } catch (e) {
                            console.log(e);
                            res.end('please create certificate first!!');
                        }
                        next();
                        return;
                    }
                    // console.log(req.path);
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

                        if (isGzip) {
                            proxyRes.pipe(new zlib.Gunzip()).pipe(through(function (chunk, enc, callback) {
                                chunkReplace(this, chunk, enc, callback, injectScriptTag, proxyRes);
                            })).pipe(new zlib.Gzip()).pipe(res);
                        } else {
                            proxyRes.pipe(through(function (chunk, enc, callback) {
                                chunkReplace(this, chunk, enc, callback, injectScriptTag, proxyRes);
                            })).pipe(res);
                        }
                    }
                    next();
                }
            });
        };

        if (!externalProxy) {
            d.run(function () {
                defaultExternalProxy.createExternalProxy(function (externalProxyPorts) {
                    var externalProxyPort = externalProxyPorts.port;
                    var externalProxyWebPort = externalProxyPorts.webPort;
                    externalProxy = 'http://localhost:' + externalProxyPort;
                    createMitmProxy();
                    successCB(externalProxyPorts);
                });
            });
        } else {
            createMitmProxy();
            successCB(null);
        }
    }
};
function chunkReplace(_this, chunk, enc, callback, injectScriptTag, proxyRes) {
    var _charset = charset(proxyRes, chunk) || jschardet.detect(chunk).encoding.toLowerCase();
    var chunkString;
    if (_charset != null && _charset != 'utf-8') {
        chunkString = iconv.decode(chunk, _charset);
    } else {
        chunkString = chunk.toString();
    }

    var newChunkString = htmlUtil.injectScriptIntoHtml(chunkString, injectScriptTag);

    var buffer;
    if (_charset != null && _charset != 'utf-8') {
        buffer = iconv.encode(newChunkString, _charset);
    } else {
        buffer = new Buffer(newChunkString);
    }

    _this.push(buffer);
    callback();
}