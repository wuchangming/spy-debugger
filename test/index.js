var weinreDelegateLib = require('../lib/weinre/weinreDelegate');
var weinreDelegateSrc = require('../src/weinre/weinreDelegate');
describe("spy-debugger", function() {
    it('`lib` should be ok', function () {
        weinreDelegateLib.run();
    })
    it('`src` should be ok', function () {
        weinreDelegateSrc.run();
    })
})
