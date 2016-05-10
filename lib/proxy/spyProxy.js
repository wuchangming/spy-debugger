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

module.exports = {
    createProxy: function createProxy(_ref) {
        var injectScriptTag = _ref.injectScriptTag;
        var _ref$port = _ref.port;
        var port = _ref$port === undefined ? 9888 : _ref$port;

        mitmProxy.createProxy({
            port: port,
            sslConnectInterceptor: function sslConnectInterceptor(req, cltSocket, head) {

                var srvUrl = url.parse('https://' + req.url);
                // 忽略微信的推广页
                if (srvUrl.host === 'mp.weixin.qq.com:443') {
                    return false;
                }
                // 只拦截浏览器的https请求
                if (req.headers && req.headers['user-agent'] && /^Mozilla/.test(req.headers['user-agent'])) {
                    return true;
                } else {
                    return false;
                }
            },
            requestInterceptor: function requestInterceptor(rOptions, req, res, ssl, next) {

                if (rOptions.hostname === config.SPY_DEBUGGER_DOMAIN && rOptions.path === '/cert') {
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
                if (rOptions.hostname === config.SPY_WEINRE_DOMAIN) {
                    rOptions.protocol = 'http:';
                    rOptions.hostname = '127.0.0.1';
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
                            chunkReplace(this, chunk, enc, callback, injectScriptTag);
                        })).pipe(new zlib.Gzip()).pipe(res);
                    } else {
                        proxyRes.pipe(through(function (chunk, enc, callback) {
                            chunkReplace(this, chunk, enc, callback, injectScriptTag);
                        })).pipe(res);
                    }
                }
                next();
            }
        });
    }
};
function chunkReplace(_this, chunk, enc, callback, injectScriptTag) {
    var chunkString = chunk.toString();
    var newChunkString = htmlUtil.injectScriptIntoHtml(chunkString, injectScriptTag);
    _this.push(new Buffer(newChunkString));
    callback();
}