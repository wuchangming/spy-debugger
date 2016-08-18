'use strict';

var os = require('os');
var url = require('url');
var config = require('../config/config');

var httpUtil = exports;

httpUtil.isGzip = function (res) {
    var contentEncoding = res.headers['content-encoding'];
    return !!(contentEncoding && contentEncoding.toLowerCase() == 'gzip');
};
httpUtil.isHtml = function (res) {
    var contentType = res.headers['content-type'];
    return typeof contentType != 'undefined' && /text\/html|application\/xhtml\+xml/.test(contentType);
};
httpUtil.hasPort = function (host) {
    return !!~host.indexOf(':');
};