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
httpUtil.hasPort = (host) => {
  return !!~host.indexOf(':');
};
