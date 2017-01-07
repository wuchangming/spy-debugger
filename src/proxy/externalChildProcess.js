require('babel-polyfill')
const http = require('http')
const default_rule = require('anyproxy/lib/rule_default')
const proxy = require('anyproxy')
const fs = require('fs')
const path = require('path')
const colors = require('colors');


let port, webPort, socketPort

var tempServerPromise = () => {
    return new Promise((resolve, reject) => {
        let tempServer = new http.Server()
        tempServer.listen(() => {
            let unBoundedPort = tempServer.address().port;
            tempServer.close(() => {
                resolve(unBoundedPort)
            })
        })
    })
}

let createAnyProxy = () => {
    var options = {
        type          : "http",
        port,
        hostname      : "127.0.0.1",
        rule          : Object.assign(default_rule, {
            shouldInterceptHttpsReq: () => true
        }),
        webPort,  // optional, port for web interface
        socketPort,
        silent        : true //optional, do not print anything into terminal. do not set it when you are still debugging.
    }
    new proxy.proxyServer(options)
}

process.on('message', ({type, ports}) => {
    if (type === 'start') {
        if(!proxy.isRootCAFileExists()) {
            var userHome = process.env.HOME || process.env.USERPROFILE
            var certDir = path.join(userHome, "/.anyproxy_certs/")
            if(!fs.existsSync(certDir)){
                try{
                    fs.mkdirSync(certDir)
                }catch(e){
                    console.error('fail to create certDir at:' + certDir)
                }
            }
            var mitmCrt = path.resolve(userHome, './node-mitmproxy/node-mitmproxy.ca.crt')
            var mitmKey = path.resolve(userHome, './node-mitmproxy/node-mitmproxy.ca.key.pem')

            fs.createReadStream(mitmCrt).pipe(fs.createWriteStream(path.join(certDir, './rootCA.crt')))
            fs.createReadStream(mitmKey).pipe(fs.createWriteStream(path.join(certDir, './rootCA.key')))
        }

        (async () => {
            let ports = await Promise.all([tempServerPromise(), tempServerPromise(), tempServerPromise()])
            port = ports[0]
            webPort = ports[1]
            socketPort = ports[2]
            createAnyProxy()

            process.send({
                port,
                webPort,
                socketPort
            })
        })()

    } else if (type === 'restart') {
        port = ports.port
        webPort = ports.webPort
        socketPort = ports.socketPort

        createAnyProxy()
        console.log(colors.green('重启成功！请手动刷新浏览器'));
    }
})
