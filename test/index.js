const child_process = require('child_process')
describe("spy-debugger", function() {
    it('`lib` should be ok', function () {
        child_process.exec('node ./lib/index.js')
    })
})
