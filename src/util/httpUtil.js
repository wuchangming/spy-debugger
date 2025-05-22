'use strict'

const os = require('os');
const url = require('url');
const config = require('../config/config');

const httpUtil = exports;

httpUtil.isGzip = function (res) {
    const contentEncoding = res.headers['content-encoding'];
    return !!(contentEncoding && contentEncoding.toLowerCase() == 'gzip');
}
httpUtil.isHtml = function (res) {
    const contentType = res.headers['content-type'];
    return (typeof contentType != 'undefined') && /text\/html|application\/xhtml\+xml/.test(contentType);
}
httpUtil.hasPort = (host) => {
  return !!~host.indexOf(':');
};
