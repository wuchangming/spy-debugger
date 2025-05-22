const http = require('http')
const AnyProxy = require('anyproxy')
const fs = require('fs')
const path = require('path')
const colors = require('colors')
const { findFreePort } = require('../util/portUtil'); // Import the utility

let port, webPort, socketPort

// Removed tempServerPromise function

let createAnyProxy = () => {
    const options = {
        port,
        forceProxyHttps: true,
        webInterface: {
            enable: true,
            webPort
        },
        dangerouslyIgnoreUnauthorized: true,
        silent: true //optional, do not print anything into terminal. do not set it when you are still debugging.
    }
    new AnyProxy.ProxyServer(options).start()
}

process.on('message', ({ type, ports }) => {
    if (type === 'start') {
        if (!AnyProxy.utils.certMgr.isRootCAFileExists()) {
            const userHome = process.env.HOME || process.env.USERPROFILE
            const certDir = path.join(userHome, '/.anyproxy/certificates')
            if (!fs.existsSync(certDir)) {
                try {
                    fs.mkdirSync(certDir)
                } catch (e) {
                    console.error('fail to create certDir at:' + certDir)
                }
            }
            const mitmCrt = path.resolve(userHome, './node-mitmproxy/node-mitmproxy.ca.crt')
            const mitmKey = path.resolve(userHome, './node-mitmproxy/node-mitmproxy.ca.key.pem')

            fs
                .createReadStream(mitmCrt)
                .pipe(fs.createWriteStream(path.join(certDir, './rootCA.crt')))
            fs
                .createReadStream(mitmKey)
                .pipe(fs.createWriteStream(path.join(certDir, './rootCA.key')))
        }

        ;(async () => {
            try {
                let resolvedPorts = await Promise.all([
                    findFreePort(),
                    findFreePort(),
                    findFreePort()
                ]);
                port = resolvedPorts[0];
                webPort = resolvedPorts[1];
                socketPort = resolvedPorts[2];
                createAnyProxy();

                process.send({
                    port,
                    webPort,
                    socketPort
                });
            } catch (error) {
                console.error(colors.red('Failed to find free ports for AnyProxy:'), error);
                // Consider sending an error message back to the parent process or exiting
                process.exit(1); // Exit if we can't get ports
            }
        })()
    } else if (type === 'restart') {
        port = ports.port
            webPort = ports.webPort; // This was part of the original code, ensure it's correctly scoped if needed later.
            socketPort = ports.socketPort;  // This was part of the original code.
        webPort = ports.webPort
        socketPort = ports.socketPort

        createAnyProxy()
        console.log(colors.green('重启成功！请手动刷新浏览器'))
    }
})
