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
const domain = require('domain');
const childProcess = require('child_process');

var d = domain.create();
d.on('error', function(err) {
    console.log(err.message);
});
module.exports = {
    createProxy({
        injectScriptTag,
        port = 9888,
        weinrePort,
        autoDetectBrowser = true,
        externalProxy,
        successCB,
        cache
    }) {
        var createMitmProxy = () => {
            mitmProxy.createProxy({
                externalProxy: (req, ssl) => {
                    // ignore weixin mmtls
                    var headers = req.headers;
                    if (headers['upgrade'] && headers['upgrade'] === 'mmtls') {
                        return '';
                    } else {
                        return externalProxy;
                    }
                },
                port,
                getCertSocketTimeout: 3 * 1000,
                sslConnectInterceptor: (req, cltSocket, head) => {
                    var srvUrl = url.parse(`https://${req.url}`);

                    // 只拦截浏览器的https请求
                    if (
                        !autoDetectBrowser ||
                        (req.headers &&
                            req.headers['user-agent'] &&
                            /Mozilla/.test(req.headers['user-agent']))
                    ) {
                        return true;
                    } else {
                        return false;
                    }
                },
                requestInterceptor: (rOptions, req, res, ssl, next) => {
                    var rPath;
                    if (rOptions.path) {
                        rPath = url.parse(rOptions.path).path;
                    } else {
                        rOptions.path = '/';
                    }

                    if (
                        (rOptions.headers.host === config.SPY_DEBUGGER_DOMAIN &&
                            rPath === '/cert') ||
                        rOptions.headers.host === config.SPY_DEBUGGER_SHORT_DOMAIN
                    ) {
                        var userHome = process.env.HOME || process.env.USERPROFILE;
                        var certPath = path.resolve(
                            userHome,
                            './node-mitmproxy/node-mitmproxy.ca.crt'
                        );
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
                responseInterceptor: (req, res, proxyReq, proxyRes, ssl, next) => {
                    var isHtml = httpUtil.isHtml(proxyRes);
                    var contentLengthIsZero = (() => {
                        return proxyRes.headers['content-length'] == 0;
                    })();
                    if (!isHtml || contentLengthIsZero) {
                        next();
                    } else {
                        Object.keys(proxyRes.headers).forEach(function(key) {
                            if (proxyRes.headers[key] != undefined) {
                                var newkey = key.replace(/^[a-z]|-[a-z]/g, match => {
                                    return match.toUpperCase();
                                });
                                var newkey = key;

                                if (
                                    isHtml &&
                                    (key === 'content-length' || key === 'content-security-policy')
                                ) {
                                    // do nothing
                                } else {
                                    res.setHeader(newkey, proxyRes.headers[key]);
                                }
                            }
                        });

                        res.writeHead(proxyRes.statusCode);

                        var isGzip = httpUtil.isGzip(proxyRes);

                        var chunks = []
                        proxyRes.on('data', function (chunk) {
                            chunks.push(chunk)
                        }).on('end', function () {
                            var allChunk = Buffer.concat(chunks);

                            res.end(chunkReplace(allChunk, injectScriptTag, proxyRes))
                        })
                    }
                    next();
                }
            });
        };

        if (!externalProxy) {
            d.run(() => {
                let ports;

                var childProxy = childProcess.fork(`${__dirname}/externalChildProcess`);
                childProxy.send({
                    type: 'start'
                });
                childProxy.on('message', externalProxyPorts => {
                    ports = externalProxyPorts;
                    var externalProxyPort = externalProxyPorts.port;
                    var externalProxyWebPort = externalProxyPorts.webPort;
                    externalProxy = 'http://127.0.0.1:' + externalProxyPort;
                    createMitmProxy();
                    successCB(externalProxyPorts);
                });
                let restartFun = () => {
                    console.log(colors.yellow(`anyproxy异常退出，尝试重启`));
                    let childProxy = childProcess.fork(`${__dirname}/externalChildProcess`);
                    childProxy.send({
                        type: 'restart',
                        ports
                    });
                    childProxy.on('exit', function(e) {
                        restartFun();
                    });
                };
                childProxy.on('exit', function(e) {
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
        _charset =  charset(proxyRes, chunk) || jschardet.detect(chunk).encoding.toLowerCase();
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
