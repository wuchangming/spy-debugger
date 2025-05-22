'use strict'

const http = require('http');
const os = require('os');
const weinre = require('../../buildin_modules/weinre/lib/weinre');
const child_process = require('child_process');
const spyProxy = require('../proxy/spyProxy');
const config = require('../config/config');
// const colors = require('colors'); // Replaced by logger
const fs = require('fs');
const fsPromises = fs.promises; // Import fs.promises
const htmlUtil = require('../util/htmlUtil');
const path = require('path');
// const domain = require('domain'); // Removed domain
const mitmproxy = require('node-mitmproxy');
const _ = require('lodash');
const ip = require('ip');
const { findFreePort } = require('../util/portUtil');
const { openUrlInBrowser } = require('../util/sysUtil');
const logger = require('../util/logger'); // Import logger

// Removed domain setup

let spyProxyPort;
let showIframe = false;
let contentEditable = false;

const weinreDelegate = module.exports;
let autoDetectBrowser = true;
let externalProxy;
let cache = false;

weinreDelegate.run = async function run({ // Make it async
    cusSpyProxyPort,
    cusShowIframe,
    cusAutoDetectBrowser,
    cusExternalProxy,
    cusCache,
    cusContentEditable
}) {
    spyProxyPort = cusSpyProxyPort;
    showIframe = cusShowIframe;
    autoDetectBrowser = cusAutoDetectBrowser;
    externalProxy = cusExternalProxy;
    cache = cusCache;
    contentEditable = cusContentEditable;

    try {
        const unBoundedPort = await findFreePort(); // Use the utility
        await startWeinreServer(unBoundedPort); // Await startWeinreServer
    } catch (error) {
        logger.error('Failed to find an unbounded port or start Weinre server:', error);
    }
}

weinreDelegate.createCA = function () {
    mitmproxy.createCA();
}

async function startWeinreServer (port) { 
    logger.info('正在启动代理');
    try {
        const weinreServer = await new Promise((resolve, reject) => {
            const server = weinre.run({
                httpPort: port,
                boundHost: '-all-',
                verbose: false,
                debug: false,
                readTimeout: 5,
                deathTimeout: 15
            });
            server.on('listening', () => resolve(server));
            server.on('error', (e) => {
                logger.error('Weinre server error:', e);
                reject(e);
            });
        });
        logger.info(`Weinre server listening on port ${port}`);

        const tpl = await fsPromises.readFile(path.resolve(__dirname, '../../template/inject.js.template.html'), 'utf8');
        
        const injectScriptTag = htmlUtil.createScriptTag({
            tpl,
            showIframe,
            contentEditable,
            weinreDomain: config.SPY_WEINRE_DOMAIN
        });

        const externalProxyPorts = await new Promise((resolve, reject) => {
            // Consider adding an error callback to spyProxy.createProxy for more robust error handling here
            spyProxy.createProxy({
                port: spyProxyPort,
                injectScriptTag: injectScriptTag,
                weinrePort: port,
                autoDetectBrowser,
                externalProxy: externalProxy,
                cache,
                successCB: (ports) => resolve(ports),
                // If createProxy could fail before successCB (e.g. child process issues handled in spyProxy.js)
                // it would be better to have an errorCB to call reject(err) from here.
                // For now, errors from spyProxy's child process are logged within spyProxy.js
            });
        });

        if (!externalProxy) {
            if (!externalProxyPorts) {
                logger.error('Failed to get externalProxyPorts for GUI server.');
                return;
            }
            const webPort = externalProxyPorts.webPort;
            
            await new Promise((resolve, reject) => {
                const guiServer = new http.Server();
                guiServer.listen(() => {
                    const guiPort = guiServer.address().port;
                    setTimeout(() => { 
                        const guiUrl = `http://127.0.0.1:${guiPort}`;
                        openUrlInBrowser(guiUrl);
                        // logger.info(`浏览器打开 ---> ${guiUrl}`); // openUrlInBrowser handles its own logging
                        resolve(); 
                    }, 600);
                    
                    const fp = path.join(__dirname, '../../template/wrap.html');
                    const fileTemp = (fs.readFileSync(fp)).toString();
                    const fileString = _.template(fileTemp)({
                        weinreUrl: `http://127.0.0.1:${port}/client`,
                        anyProxyUrl: `http://127.0.0.1:${webPort}`
                    });
                    guiServer.on('request', (req, res) => {
                        res.setHeader('Content-Type', 'text/html;charset=utf-8');
                        res.end(fileString);
                    });
                });
                guiServer.on('error', (e) => {
                    logger.error('GUI server error:', e);
                    reject(e);
                });
            });

        } else {
            const clientUrl = `http://127.0.0.1:${port}/client`;
            openUrlInBrowser(clientUrl);
            // logger.info(`浏览器打开 ---> ${clientUrl}`); // openUrlInBrowser handles its own logging
        }
        logger.info(`本机在当前网络下的IP地址为：${ip.address()}`);

    } catch (error) {
        logger.error('Error in startWeinreServer:', error);
        // Re-throw or handle more specifically if needed upstream
        throw error; // Propagate error to weinreDelegate.run's catch block
    }
}
