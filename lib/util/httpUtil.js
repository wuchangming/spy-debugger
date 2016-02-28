'use strict'

const os = require('os');

var httpUtil = exports;

httpUtil.isGzip = function (res) {
    var contentEncoding = res.headers['content-encoding'];
    return !!(contentEncoding && contentEncoding.toLowerCase() == 'gzip');
}
httpUtil.isHtml = function (res) {
    var contentType = res.headers['content-type'];
    return (typeof contentType != 'undefined') && /text\/html|application\/xhtml\+xml/.test(contentType);
}
httpUtil.getIP = function () {
    var ifaces = os.networkInterfaces();

    var ip;

    Object.keys(ifaces).forEach(function (ifname) {

        ifaces[ifname].forEach(function (iface) {
            if ('IPv4' !== iface.family || iface.internal !== false) {
                // skip over internal (i.e. 127.0.0.1) and non-ipv4 addresses
                return;
            }
            ip = iface.address;
        });
    });

    return ip;

}
