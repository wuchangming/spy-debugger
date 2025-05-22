'use strict';

const child_process = require('child_process');
const colors = require('colors'); // For logging

/**
 * Opens the given URL in the default web browser.
 * Handles platform differences for Windows and macOS/Linux.
 * @param {string} url The URL to open.
 */
function openUrlInBrowser(url) {
    let command;
    if (process.platform === 'win32' || process.platform === 'win64') {
        command = `start ${url}`;
    } else {
        command = `open ${url}`;
    }

    child_process.exec(command, (error) => {
        if (error) {
            console.error(colors.red(`Failed to open URL: ${url}. Error: ${error.message}`));
            return;
        }
        console.log(colors.green(`Successfully opened ${url} in browser (or initiated opening).`));
    });
}

module.exports = {
    openUrlInBrowser
};
