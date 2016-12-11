'use strict';

var _ = require('lodash');

var htmlUtil = exports;

// inject script into html
htmlUtil.injectScriptIntoHtml = function (html, script) {
    html = html.replace(/<head>/ig, function (match) {
        return match + script;
    });
    html = html.replace(/Content-Security-Policy/ig, function (match) {
        return 'hacky';
    });
    return html;
};

htmlUtil.createScriptTag = function (_ref) {
    var tpl = _ref.tpl,
        showIframe = _ref.showIframe,
        contentEditable = _ref.contentEditable,
        weinreDomain = _ref.weinreDomain;

    return _.template(tpl)({
        showIframe: showIframe,
        weinreDomain: weinreDomain,
        contentEditable: contentEditable
    });
};