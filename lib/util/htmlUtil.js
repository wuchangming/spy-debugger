'use strict';

var _ = require('lodash');

var htmlUtil = exports;

// inject script into html
htmlUtil.injectScriptIntoHtml = function (html, script) {
    html = html.replace(/(<head>)/i, function (match) {
        return match + script;
    });
    return html;
};

htmlUtil.createScriptTag = function (tpl, showIframe, weinreDomain, weinrePort) {
    return _.template(tpl)({
        showIframe: showIframe,
        weinreDomain: weinreDomain,
        weinrePort: weinrePort
    });
};