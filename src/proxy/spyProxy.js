const url = require('url');
const mitmProxy = require('node-mitmproxy');
const httpUtil = require('../util/httpUtil');
const zlib = require('zlib');
const through = require('through2');
const config = require('../config/config');
const htmlUtil = require('../util/htmlUtil');
const path = require('path');
const fs = require('fs');
const colors = require('colors');
const charset = require('charset');
const iconv = require('iconv-lite');
const jschardet = require('jschardet');

module.exports = {

    createProxy ({
        injectScriptTag,
        port = 9888,
        weinrePort,
        autoDetectBrowser = true,
        externalProxy
    }) {
        console.log(colors.green('正在启动代理'));

        mitmProxy.createProxy({
            externalProxy,
            port,
            getCertSocketTimeout: 3 * 1000,
            sslConnectInterceptor: (req, cltSocket, head) => {

                var srvUrl = url.parse(`https://${req.url}`);

                // 只拦截浏览器的https请求
                if (!autoDetectBrowser || (req.headers && req.headers['user-agent'] && /^Mozilla/.test(req.headers['user-agent']))) {
                    return true
                } else {
                    return false
                }
            },
            requestInterceptor: (rOptions, req, res, ssl, next) => {

                if (rOptions.headers.host === config.SPY_DEBUGGER_DOMAIN && rOptions.path === '/cert'){
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
                    rOptions.agent = false;
                }
                // delete Accept-Encoding
                delete rOptions.headers['accept-encoding']
                next();
            },
            responseInterceptor: (req, res, proxyReq, proxyRes, ssl, next) => {
                var isHtml = httpUtil.isHtml(proxyRes);
                var contentLengthIsZero = (() => {
                    return proxyRes.headers['content-length'] == 0;
                })();
                if (!isHtml || contentLengthIsZero) {
                    next();
                } else {

                    Object.keys(proxyRes.headers).forEach(function(key) {
                        if(proxyRes.headers[key] != undefined){
                            var newkey = key.replace(/^[a-z]|-[a-z]/g, (match) => {
                                return match.toUpperCase()
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
                        proxyRes.pipe(new zlib.Gunzip())
                        .pipe(through(function (chunk, enc, callback) {
                            chunkReplace(this, chunk, enc, callback, injectScriptTag, proxyRes);
                        }))
                        .pipe(new zlib.Gzip()).pipe(res);
                    } else {
                        proxyRes
                        .pipe(through(function (chunk, enc, callback) {
                            chunkReplace(this, chunk, enc, callback, injectScriptTag, proxyRes);
                        }))
                        .pipe(res);
                    }
                }
                next();
            }
        });

    }
}
function chunkReplace (_this, chunk, enc, callback, injectScriptTag, proxyRes) {
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
