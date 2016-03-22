'use strict'

const http = require('http');
const url = require('url');
const net = require('net');
const through = require('through2');
const httpUtil = require('../util/httpUtil');
const zlib = require('zlib');
const htmlUtil = require('../util/htmlUtil');
const os = require('os');
const debug = require('debug')('spy-debugger');
const config = require('../config/config');
const logColor = config.logColor;
const domain = require('domain');
const ip = require('ip');
var address = ip.address();

var d = domain.create();
d.on('error', function (err) {
    console.log(err.message);
});

module.exports = class SpyProxy {
    constructor(options) {
        this.proxyServer = this.createProxyServer(options);
    }
    createProxyServer (options) {
        options = options || {};
        this.injectScriptTag = options.injectScriptTag;
        var port = options.port || 9888;
        var server = new http.Server();
        server.listen(port, () => {
            server.on('error', (e) => {
                console.error(e);
            });
            server.on('request', (req, res) => {
                d.run(() => {
                    this.requestHandler(req, res);
                });
            });
            // tunneling for https
            server.on('connect', (req, cltSocket, head) => {
                d.run(() => {
                    // connect to an origin server
                    var srvUrl = url.parse(`http://${req.url}`);
                    var srvSocket = net.connect(srvUrl.port, srvUrl.hostname, () => {
                        cltSocket.write('HTTP/1.1 200 Connection Established\r\n' +
                        'Proxy-agent: SpyProxy\r\n' +
                        '\r\n');
                        srvSocket.write(head);
                        srvSocket.pipe(cltSocket);
                        cltSocket.pipe(srvSocket);
                    });
                });
            });
        });
        console.log(`${logColor.FgGreen}%s${logColor.Reset}`,`移动设备设置HTTP代理到本机。本机IP地址：${address}，端口号为：${port}`);
    }
    requestHandler(req, res) {
        var urlObject = url.parse(req.url);
        var orginHost = req.headers['host'];

        debug('request urlObject ---> ', urlObject);

        var host = orginHost.split(':')[0];
        if(host === config.SPY_WEINRE_DOMAIN) {
            host = '127.0.0.1';
        }

        var rOptions = {
            protocol: urlObject.protocol,
            host: host,
            method: req.method,
            port: urlObject.port || 80,
            path: urlObject.path
        }
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
    responseHandler(rOptions, req, res, responseCallback) {
        return new http.ClientRequest(rOptions, (proxyRes) => {
            if (responseCallback) {
                responseCallback(req, res,proxyRes);
            } else {
                this.interceptResponse(req, res, proxyRes);
            }
        });
    }
    ignoreResponse(req, res, proxyRes) {
        Object.keys(proxyRes.headers).forEach(function(key) {
            if(proxyRes.headers[key] != undefined){
                var newkey = key.replace(/^[a-z]|-[a-z]/g, (match) => {
                    return match.toUpperCase()
                });
                var newkey = key;
                res.setHeader(newkey, proxyRes.headers[key]);
            }
        });
        res.writeHead(proxyRes.statusCode);
        proxyRes.pipe(res);
    }
    interceptResponse(req, res, proxyRes) {
        var _this = this;
        var isHtml = httpUtil.isHtml(proxyRes);
        var contentLengthIsZero = (() => {
            return proxyRes.headers['content-length'] == 0;
        })();
        if (!isHtml || contentLengthIsZero) {
            this.ignoreResponse(req, res, proxyRes);
        } else {
            Object.keys(proxyRes.headers).forEach(function(key) {
                if(proxyRes.headers[key] != undefined){
                    var newkey = key.replace(/^[a-z]|-[a-z]/g, (match) => {
                        return match.toUpperCase()
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
                proxyRes.pipe(new zlib.Gunzip())
                .pipe(through(function (chunk, enc, callback) {
                    chunkReplace(this, chunk, enc, callback, _this.injectScriptTag);
                })).pipe(new zlib.Gzip()).pipe(res);
            } else {
                proxyRes.pipe(through(function (chunk, enc, callback) {
                    chunkReplace(this, chunk, enc, callback, _this.injectScriptTag);
                })).pipe(res);
            }
        }
    }
}

function chunkReplace (_this, chunk, enc, callback, injectScriptTag) {
    var chunkString = chunk.toString();
    var newChunkString = htmlUtil.injectScriptIntoHtml(chunkString, injectScriptTag);
    _this.push(new Buffer(newChunkString));
    callback();
}
