'use strict';

// const os = require('os'); // TODO: May be needed for system operations
// const url = require('url'); // TODO: May be needed for URL parsing
// const config = require('../config/config'); // TODO: May be needed for configuration

var httpUtil = exports;

httpUtil.isGzip = function (res) {
    var contentEncoding = res.headers['content-encoding'];
    return !!(contentEncoding && contentEncoding.toLowerCase() == 'gzip');
};
httpUtil.isHtml = function (res) {
    var contentType = res.headers['content-type'];
    return (typeof contentType != 'undefined') && /text\/html|application\/xhtml\+xml/.test(contentType);
};
httpUtil.hasPort = (host) => {
    return !!~host.indexOf(':');
};
