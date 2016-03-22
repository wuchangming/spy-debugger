'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var http = require('http');
var url = require('url');
var net = require('net');
var through = require('through2');
var httpUtil = require('../util/httpUtil');
var zlib = require('zlib');
var htmlUtil = require('../util/htmlUtil');
var os = require('os');
var debug = require('debug')('spy-debugger');
var config = require('../config/config');
var logColor = config.logColor;
var domain = require('domain');
var ip = require('ip');
var address = ip.address();

var d = domain.create();
d.on('error', function (err) {
    console.log(err.message);
});

module.exports = function () {
    function SpyProxy(options) {
        _classCallCheck(this, SpyProxy);

        this.proxyServer = this.createProxyServer(options);
    }

    _createClass(SpyProxy, [{
        key: 'createProxyServer',
        value: function createProxyServer(options) {
            var _this2 = this;

            options = options || {};
            this.injectScriptTag = options.injectScriptTag;
            var port = options.port || 9888;
            var server = new http.Server();
            server.listen(port, function () {
                server.on('error', function (e) {
                    console.error(e);
                });
                server.on('request', function (req, res) {
                    d.run(function () {
                        _this2.requestHandler(req, res);
                    });
                });
                // tunneling for https
                server.on('connect', function (req, cltSocket, head) {
                    d.run(function () {
                        // connect to an origin server
                        var srvUrl = url.parse('http://' + req.url);
                        var srvSocket = net.connect(srvUrl.port, srvUrl.hostname, function () {
                            cltSocket.write('HTTP/1.1 200 Connection Established\r\n' + 'Proxy-agent: SpyProxy\r\n' + '\r\n');
                            srvSocket.write(head);
                            srvSocket.pipe(cltSocket);
                            cltSocket.pipe(srvSocket);
                        });
                    });
                });
            });
            console.log(logColor.FgGreen + '%s' + logColor.Reset, '移动设备设置HTTP代理到本机。本机IP地址：' + address + '，端口号为：' + port);
        }
    }, {
        key: 'requestHandler',
        value: function requestHandler(req, res) {
            var urlObject = url.parse(req.url);
            var orginHost = req.headers['host'];

            debug('request urlObject ---> ', urlObject);

            var host = orginHost.split(':')[0];
            if (host === config.SPY_WEINRE_DOMAIN) {
                host = '127.0.0.1';
            }

            var rOptions = {
                protocol: urlObject.protocol,
                host: host,
                method: req.method,
                port: urlObject.port || 80,
                path: urlObject.path
            };
            rOptions.headers = req.headers;

            var proxyReq;
            if (host === '127.0.0.1') {
                proxyReq = this.responseHandler(rOptions, req, res, this.ignoreResponse);
            } else {
                proxyReq = this.responseHandler(rOptions, req, res);
            }

            req.on('aborted', function () {
                proxyReq.abort();
            });

            req.pipe(proxyReq);
        }
    }, {
        key: 'responseHandler',
        value: function responseHandler(rOptions, req, res, responseCallback) {
            var _this3 = this;

            return new http.ClientRequest(rOptions, function (proxyRes) {
                if (responseCallback) {
                    responseCallback(req, res, proxyRes);
                } else {
                    _this3.interceptResponse(req, res, proxyRes);
                }
            });
        }
    }, {
        key: 'ignoreResponse',
        value: function ignoreResponse(req, res, proxyRes) {
            Object.keys(proxyRes.headers).forEach(function (key) {
                if (proxyRes.headers[key] != undefined) {
                    var newkey = key.replace(/^[a-z]|-[a-z]/g, function (match) {
                        return match.toUpperCase();
                    });
                    var newkey = key;
                    res.setHeader(newkey, proxyRes.headers[key]);
                }
            });
            res.writeHead(proxyRes.statusCode);
            proxyRes.pipe(res);
        }
    }, {
        key: 'interceptResponse',
        value: function interceptResponse(req, res, proxyRes) {
            var _this = this;
            var isHtml = httpUtil.isHtml(proxyRes);
            var contentLengthIsZero = function () {
                return proxyRes.headers['content-length'] == 0;
            }();
            if (!isHtml || contentLengthIsZero) {
                this.ignoreResponse(req, res, proxyRes);
            } else {
                Object.keys(proxyRes.headers).forEach(function (key) {
                    if (proxyRes.headers[key] != undefined) {
                        var newkey = key.replace(/^[a-z]|-[a-z]/g, function (match) {
                            return match.toUpperCase();
                        });
                        var newkey = key;
                        if (isHtml && key === 'content-length') {
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
                        chunkReplace(this, chunk, enc, callback, _this.injectScriptTag);
                    })).pipe(new zlib.Gzip()).pipe(res);
                } else {
                    proxyRes.pipe(through(function (chunk, enc, callback) {
                        chunkReplace(this, chunk, enc, callback, _this.injectScriptTag);
                    })).pipe(res);
                }
            }
        }
    }]);

    return SpyProxy;
}();

function chunkReplace(_this, chunk, enc, callback, injectScriptTag) {
    var chunkString = chunk.toString();
    var newChunkString = htmlUtil.injectScriptIntoHtml(chunkString, injectScriptTag);
    _this.push(new Buffer(newChunkString));
    callback();
}