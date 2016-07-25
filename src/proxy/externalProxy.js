const proxy = require('anyproxy');
const http = require('http')
const default_rule = require('anyproxy/lib/rule_default');
const fs = require('fs');
const path = require('path')

var defaultExternalProxy = exports;
defaultExternalProxy.createExternalProxy = function (callback) {
    //create cert when you want to use https features
    //please manually trust this rootCA when it is the first time you run it
    var userHome = process.env.HOME || process.env.USERPROFILE;
    var certDir = path.join(userHome, "/.anyproxy_certs/");
    if(!fs.existsSync(certDir)){
        try{
            fs.mkdirSync(certDir);
        }catch(e){
            console.error('fail to create certDir at:' + certDir);
        }
    }
    var mitmCrt = path.resolve(userHome, './node-mitmproxy/node-mitmproxy.ca.crt');
    var mitmKey = path.resolve(userHome, './node-mitmproxy/node-mitmproxy.ca.key.pem');

    fs.createReadStream(mitmCrt).pipe(fs.createWriteStream(path.join(certDir, './rootCA.crt')));
    fs.createReadStream(mitmKey).pipe(fs.createWriteStream(path.join(certDir, './rootCA.key')));


    let unBoundedPort1,unBoundedPort2,unBoundedPort3;
    // get an unbounded port
    let tempServer1  = new http.Server();
    let tempServer2  = new http.Server();
    let tempServer3  = new http.Server();


    var tempServer1Promise = () => {
        return new Promise((resolve, reject) => {
            tempServer1.listen(() => {
                unBoundedPort1 = tempServer1.address().port;
                tempServer1.close(() => {
                    resolve(unBoundedPort1);
                })
            });
        });
    }

    var tempServer2Promise = () => {
        return new Promise((resolve, reject) => {
            tempServer2.listen(() => {
                unBoundedPort2 = tempServer2.address().port;
                tempServer2.close(() => {
                    resolve(unBoundedPort2);
                })
            });
        });
    }

    var tempServer3Promise = () => {
        return new Promise((resolve, reject) => {
            tempServer3.listen(() => {
                unBoundedPort3 = tempServer3.address().port;
                tempServer3.close(() => {
                    resolve(unBoundedPort3);
                })
            });
        });
    }

    (async () => {
        var result1 = await tempServer1Promise();
        var result2 = await tempServer2Promise();
        var result3 = await tempServer3Promise();

        var options = {
            type          : "http",
            port          : result1,
            hostname      : "localhost",
            rule          : Object.assign(default_rule, {
                shouldInterceptHttpsReq: () => true
            }),
            webPort       : result2,  // optional, port for web interface
            socketPort    : result3,
            silent        : true //optional, do not print anything into terminal. do not set it when you are still debugging.
        };
        new proxy.proxyServer(options);

        callback({
            port: result1,
            webPort: result2
        })
    })();
}
