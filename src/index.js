#!/usr/bin/env node
'use strict'
const program = require('commander')
const weinreDelegate = require('./weinre/weinreDelegate')
// const colors = require('colors'); // Replaced by logger
const http = require('http')
const logger = require('./util/logger'); // Import logger

program
    .version(require('../package.json').version)
    .option('-p, --port [value]', 'start port')
    .option('-i, --showIframe [value]', 'spy iframe window')
    .option('-b, --autoDetectBrowser [value]', 'Auto detect Browser Request')
    .option('-e, --externalProxy [value]', 'set external Proxy')
    .option('-c, --cache [value]', 'set no cache')
    .option('-w, --contentEditable [value]', 'set content editable')

program.parse(process.argv)

const cusSpyProxyPort = program.port || 9888

let cusShowIframe = false
if (program.showIframe === 'true') {
    cusShowIframe = true
}

let autoDetectBrowser = false
if (program.autoDetectBrowser === 'true') {
    autoDetectBrowser = true
}

let cusCache = false
if (program.cache === 'true') {
    cusCache = true
}

let cusContentEditable = false
if (program.contentEditable === 'true') {
    cusContentEditable = true
}

async function main() {
    try {
        weinreDelegate.createCA()

        let tempServer = new http.Server()

        const createTempServerPromise = port => {
            return new Promise((resolve, reject) => {
                tempServer.listen(port, () => {
                    tempServer.close(() => {
                        resolve()
                    })
                })
                tempServer.on('error', e => {
                    logger.error(`警告：启动失败!！检查端口 ${port} 是否被占用，或尝试更换启动端口`, e);
                    reject(e) // Pass error to reject
                })
            })
        }

        await createTempServerPromise(cusSpyProxyPort)

        weinreDelegate.run({
            cusExternalProxy: program.externalProxy,
            cusSpyProxyPort,
            cusShowIframe,
            cusAutoDetectBrowser: autoDetectBrowser,
            cusCache,
            cusContentEditable
        })
    } catch (e) {
        // Errors from createTempServerPromise are logged there.
        // If weinreDelegate.run() itself could throw and needs logging here, add:
        // logger.error('An error occurred during main execution:', e);
    }
}

main();
