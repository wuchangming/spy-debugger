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

const d = domain.create();
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
        const createMitmProxy = () => {
            mitmProxy.createProxy({
                externalProxy: (req, ssl) => {
                    // ignore weixin mmtls
                    const headers = req.headers;
                    if (headers['upgrade'] && headers['upgrade'] === 'mmtls') {
                        return '';
                    } else {
                        return externalProxy;
                    }
                },
                port,
                getCertSocketTimeout: 3 * 1000,
                sslConnectInterceptor: (req, cltSocket, head) => {
                    const srvUrl = url.parse(`https://${req.url}`);

                    // 只拦截浏览器的https请求
                    if (
                        !autoDetectBrowser ||
                        (req.headers &&
                            req.headers['user-agent'] &&
                            (/Mozilla/.test(req.headers['user-agent']) ||
                                /com.apple.WebKit.Networking/i.test(req.headers['user-agent'])))
                    ) {
                        return true;
                    } else {
                        return false;
                    }
                },
                requestInterceptor: (rOptions, req, res, ssl, next) => {
                    let rPath;
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
                        const userHome = process.env.HOME || process.env.USERPROFILE;
                        const certPath = path.resolve(
                            userHome,
                            './node-mitmproxy/node-mitmproxy.ca.crt'
                        );
                        try {
                            const fileString = fs.readFileSync(certPath);
                            res.setHeader('Content-Type', 'application/x-x509-ca-cert');
                            res.setHeader("Content-Disposition","attachment;filename=node-mitmproxy.ca.crt");
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
                    const isHtml = httpUtil.isHtml(proxyRes);
                    const contentLengthIsZero = (() => {
                        return proxyRes.headers['content-length'] == 0;
                    })();
                    if (!isHtml || contentLengthIsZero) {
                        next();
                    } else {
                        Object.keys(proxyRes.headers).forEach(function(key) {
                            if (proxyRes.headers[key] != undefined) {
                                // var newkey = key.replace(/^[a-z]|-[a-z]/g, match => {
                                //     return match.toUpperCase();
                                // });
                                const newkey = key;

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

                        const isGzip = httpUtil.isGzip(proxyRes);

                        const chunks = []
                        proxyRes.on('data', function (chunk) {
                            chunks.push(chunk)
                        }).on('end', function () {
                            const allChunk = Buffer.concat(chunks);

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
                let isExternalProxyInitialized = false;
                let initializationTimeoutId = null;
                let childProxyInstance = null; // To keep track of the current child proxy

                const startChildProcess = (isRestart = false) => {
                    if (isExternalProxyInitialized && !isRestart) return; // Already initialized or failed fatally

                    childProxyInstance = childProcess.fork(`${__dirname}/externalChildProcess`);
                    
                    if (!isRestart) {
                        initializationTimeoutId = setTimeout(() => {
                            if (isExternalProxyInitialized) return;
                            isExternalProxyInitialized = true;
                            console.error(colors.red('External proxy process initialization timed out.'));
                            if (childProxyInstance) {
                                childProxyInstance.kill();
                            }
                            // Not calling successCB as it failed.
                            // Consider adding an error callback to createProxy if more formal error propagation is needed.
                        }, 15000); // 15 seconds timeout

                        childProxyInstance.send({
                            type: 'start'
                        });
                    } else {
                        // This is a restart
                        if (!ports) {
                            console.error(colors.red('Cannot restart external proxy without port information.'));
                            return;
                        }
                        childProxyInstance.send({
                            type: 'restart',
                            ports
                        });
                    }

                    childProxyInstance.on('message', externalProxyPortsMsg => {
                        if (isExternalProxyInitialized && !isRestart) return; // Already handled (e.g. timeout or previous success)
                        
                        clearTimeout(initializationTimeoutId);
                        initializationTimeoutId = null;

                        if (!isRestart) {
                            ports = externalProxyPortsMsg;
                            const externalProxyPort = externalProxyPortsMsg.port;
                            // const externalProxyWebPort = externalProxyPortsMsg.webPort; // Not directly used here
                            externalProxy = 'http://127.0.0.1:' + externalProxyPort;
                            
                            isExternalProxyInitialized = true; // Mark as initialized
                            createMitmProxy();
                            successCB(externalProxyPortsMsg);
                        } else {
                            // If it's a restart, we don't call the original successCB again.
                            // We might want to update 'ports' if they can change on restart, 
                            // but current externalChildProcess doesn't seem to send new ports on restart.
                            console.log(colors.green('External proxy restarted successfully.'));
                        }
                    });

                    childProxyInstance.on('exit', (code, signal) => {
                        clearTimeout(initializationTimeoutId); // Clear timeout if it exits early

                        if (!isRestart && !isExternalProxyInitialized) {
                            isExternalProxyInitialized = true; // Mark as handled to prevent successCB or timeout
                            console.error(colors.red(`External proxy process exited prematurely before initialization. Code: ${code}, Signal: ${signal}`));
                            // Not calling successCB.
                            // At this point, the initial attempt has failed. We are not auto-restarting the *initial* failure.
                        } else if (isRestart || (ports && isExternalProxyInitialized)) { 
                            // Only restart if it was already initialized or if it's a deliberate restart action
                            console.log(colors.yellow(`Anyproxy (restarted instance) exited. Code: ${code}, Signal: ${signal}. Attempting to restart again...`));
                            // Small delay before restarting to prevent rapid spawn loops if it keeps crashing
                            setTimeout(() => restartFun(), 5000);
                        } else {
                            // This case handles if the initial child process exits after a successful initialization
                            // and restartFun is called for the first time.
                             console.log(colors.yellow(`Anyproxy (initial instance) exited after initialization. Code: ${code}, Signal: ${signal}. Attempting to restart...`));
                             setTimeout(() => restartFun(), isExternalProxyInitialized ? 0 : 5000); // if not initialized, delay
                        }
                    });

                    childProxyInstance.on('error', (err) => {
                        clearTimeout(initializationTimeoutId);
                        if (!isExternalProxyInitialized && !isRestart) {
                            isExternalProxyInitialized = true;
                            console.error(colors.red('Failed to start external proxy process:'), err);
                            // Not calling successCB
                        } else {
                            console.error(colors.red('Error from external proxy process:'), err);
                        }
                    });
                };
                
                const restartFun = () => {
                    if (!ports) {
                        console.error(colors.red("Cannot execute restart: initial port information was not received."));
                        // Potentially handle this as a permanent failure of the external proxy.
                        return;
                    }
                    console.log(colors.yellow(`Attempting to restart anyproxy...`));
                    startChildProcess(true); // Call with isRestart = true
                };

                startChildProcess(); // Initial start

            });
        } else {
            createMitmProxy();
            successCB(null);
        }
    }
};
function chunkReplace(chunk, injectScriptTag, proxyRes) {
    let _charset;
    try {
        _charset =  charset(proxyRes, chunk) || jschardet.detect(chunk).encoding.toLowerCase();
    } catch (e) {
        console.error(e);
    }
    let chunkString;
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

    const newChunkString = htmlUtil.injectScriptIntoHtml(chunkString, injectScriptTag);

    let buffer;
    if (_charset != null && _charset != 'utf-8') {
        try {
            buffer = iconv.encode(newChunkString, _charset);
        } catch (e) {
            console.error(e);
            buffer = iconv.encode(newChunkString, 'utf-8');
        }
    } else {
        buffer = Buffer.from(newChunkString);
    }

    return buffer;
}
