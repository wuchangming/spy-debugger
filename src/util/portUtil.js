'use strict';

const http = require('http');
const colors = require('colors'); // For potential error logging, though not strictly required by findFreePort itself

/**
 * Finds an available unbound port.
 * @returns {Promise<number>} A Promise that resolves to an available port number.
 * @rejects {Error} If an error occurs during port finding.
 */
async function findFreePort() {
    return new Promise((resolve, reject) => {
        const tempServer = new http.Server();
        tempServer.listen(() => {
            const port = tempServer.address().port;
            tempServer.close(() => {
                resolve(port);
            });
        });
        tempServer.on('error', (err) => {
            // This error typically means the initial attempt to listen on a system-assigned port failed,
            // which is highly unlikely but theoretically possible.
            // More common errors (like port already in use) are handled by the listen attempt itself.
            console.error(colors.red('Error finding free port:'), err);
            reject(err);
        });
    });
}

module.exports = {
    findFreePort
};
