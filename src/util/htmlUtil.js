const _ = require('lodash');

var htmlUtil = exports;


// inject script into html
htmlUtil.injectScriptIntoHtml = function(html, script) {
    html = html.replace(/<head>|<head\s[^<]*>/gi, function (match) {
        return match + script;
    });
    html = html.replace(/Content-Security-Policy/ig, function (match) {
        return 'hacky';
    });
    return html;
}

htmlUtil.createScriptTag = function ({
    tpl,
    showIframe,
    contentEditable,
    weinreDomain
}) {
    return _.template(tpl)({
        showIframe,
        weinreDomain,
        contentEditable
    });
};
