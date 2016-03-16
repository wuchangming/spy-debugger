const http = require('http');

console.log(11);
var client = new http.ClientRequest({
    protocol: 'http:',
    hostname: '192.168.1.103',
    method: 'GET',
    port: '56047',
    path: '/target/target-script-min.js'

}, (res) => {
    console.log(res);

});

client.end();
