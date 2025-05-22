'use strict';

const colors = require('colors/safe');

module.exports = {
    info: (message) => {
        console.log(colors.green(message));
    },
    warn: (message) => {
        console.warn(colors.yellow(message));
    },
    error: (message, error) => {
        console.error(colors.red(message));
        if (error && error.stack) {
            console.error(colors.red(error.stack));
        } else if (error) {
            // Fallback for non-Error objects or errors without a stack
            console.error(colors.red(String(error)));
        }
    }
    // Optional: Add a debug method later if needed, e.g.:
    // debug: (message) => {
    //     if (process.env.NODE_ENV === 'development') { // Or some other debug flag
    //         console.log(colors.blue(message));
    //     }
    // }
};
