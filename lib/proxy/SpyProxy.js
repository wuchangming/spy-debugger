'use strict'

const http = require('http');
const url = require('url');
const through = require('through2');
const httpUtil = require('../util/httpUtil');
const zlib = require('zlib');
const htmlUtil = require('../util/htmlUtil');
const os = require('os');
const debug = require('debug')('spy-debugger');
const config = require('../config/config');

module.exports = class SpyProxy {
    constructor(options) {
        this.proxyServer = this.createProxyServer(options);
    }
    createProxyServer (options) {
        options = options || {};
        this.weinewPort = options.weinewPort;
        var port = options.port || 9888;
        var server = new http.Server();
        server.listen(port, () => {
            server.on('error', (e) => {
                console.error(e);
            });
            server.on('request', (req, res) => {
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
                var proxyReq = new http.ClientRequest(rOptions, (proxyRes) => {
                    var isGzip = httpUtil.isGzip(proxyRes);
                    var isHtml = httpUtil.isHtml(proxyRes);

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

                    if (isHtml) {
                        if (isGzip) {
                            var _this = this;
                            proxyRes.pipe(new zlib.Gunzip())
                            .pipe(through(function (chunk, enc, callback) {
                                var chunkString = chunk.toString();
                                var newChunkString = htmlUtil.injectScriptIntoHtml(chunkString,`<script src="http://${config.SPY_WEINRE_DOMAIN}:${_this.weinewPort}/target/target-script-min.js#anonymous"></script>`);
                                this.push(new Buffer(newChunkString));
                                callback();
                            })).pipe(new zlib.Gzip()).pipe(res);
                        } else {
                            proxyRes.pipe(through(function (chunk, enc, callback) {
                                this.push(chunk);
                                callback();
                            })).pipe(res);
                        }

                    } else {
                        proxyRes.pipe(res);
                    }

                });

                req.on('aborted', function () {
                    console.log('aborted');
                    proxyReq.abort();
                });

                req.pipe(proxyReq);

            });
        });

    }
}
