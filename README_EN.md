About spy-debugger
==========
Spy-debugger is one-stop pages inspection and debugger proxy. Spy-debugger can inspect and debugger all the mobile end browers and webview HTML page within the request of HTTP and HTTPS, such as Wechat, Facebook, HybridApp and so on.  

[![npm](https://img.shields.io/npm/v/spy-debugger.svg)](https://www.npmjs.com/package/spy-debugger)
[![npm](https://img.shields.io/npm/dt/spy-debugger.svg)](https://www.npmjs.com/package/spy-debugger)
[![Build Status](https://travis-ci.org/wuchangming/spy-debugger.svg?branch=master)](https://travis-ci.org/wuchangming/spy-debugger)  

语言: [中文](./README.md)

Functions
------------
1、HTML page inspection ＋ debugger  
2、[Easy to use](#only-3-mins-to-set-up)  
3、**Support HTTPS**  
4、`spy-debugger` integrated [`weinre`](http://people.apache.org/~pmuellr/weinre/docs/latest/)、[`node-mitmproxy`](https://github.com/wuchangming/node-mitmproxy)、[`AnyProxy`](https://github.com/alibaba/anyproxy)  
5、`spy-debugger` automately overlooks the HTTPS requests from native App, and it only intercepts the HTTPS requests from webview. It will not cause any impacts to the native App that used SSL pinning.  
6、`spy-debugger` can be better to use other debugger proxies such as Charles. the default debugger proxy in `spy-debugger` is AnyProxy.[(Set up the exterior proxy)](#set-up-the-exterior-proxy-default-proxy-anyproxy)  


Demo
------------
#### Page inspection
<img src="demo/img/demo.png" width="650px" />

#### Debugger
<img src="demo/img/AnyProxy.png" width="650px" />

Install
------------
Windows
```
    npm install spy-debugger -g
```

Mac
```
    sudo npm install spy-debugger -g
```

## Only 3 mins to set up

Step 1: The mobile and PC must be under the same network (both of devices connect same Wi-Fi)

Step 2: Input `spy-debugger` in the command line and input the address on the brower according the command line's tip.

Step 3: Set up proxy on the mobile device. The proxy IP address must be same to the PC device. the port must be `spy-debugger`'s start port(default port: 9888).

Step 4: Install certification to your mobile phone. **note: moblie device must be set up well the proxy first and browe `http://spydebugger.com/cert` by the default brower on the phone.[`(QR code)`](demo/img/QRCodeForCert.png)Install certification**（Only the first time need to install it.)

Step 5: Use any installed browers on the mobile device to open the web page that you want to debugger or inspect.

Manual Options
------------
#### Port
(Default Port: 9888)
```
spy-debugger -p 8888
```

#### Set up the exterior proxy (default proxy AnyProxy)
```
spy-debugger -e http://127.0.0.1:8888
```
spy-debugger supply AnyProxy as default proxy, but you can only set up the exterior proxy to instead of the default proxy such as Charles, Fiddler.

#### whether weinre watch iframe load page
(default: false)
```
spy-debugger -i true
```

#### whether intercept the HTTPS requests from the brower.【not working in iOS 15】
(default: false)
```
spy-debugger -b true
```
There are some browers that send the connect request with incorrected userAgent. Sometimes this would cause error. such as **UC brower**. In this case, `spy-debugger -b false` can fix this error. In most cases we suggest using the default value `true`. Now there are many native Apps send request with SSL pinning. Manual certification will not pass native app certification.


#### whether allow HTTP cache
(default: false)
```
spy-debugger -c true
```

More
------------
`spy-debugger` integrated `weinre`，simplified that `weinre` needs to add javascript code to each page. `spy-debugger` intercepted the javascript code that need inject to `weinre` when the HTML page send the requests. it can make inspection and debugger easier to use.
