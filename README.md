# 关于spy-debugger
[![npm](https://img.shields.io/npm/dt/spy-debugger.svg)](https://www.npmjs.com/package/spy-debugger)
[![Build Status](https://travis-ci.org/wuchangming/spy-debugger.svg?branch=master)](https://travis-ci.org/wuchangming/spy-debugger)  

1、一站式页面调试工具，远程调试任何手机浏览器页面，任何手机移动端webview（如：微信，HybirdApp等）*HTTP/HTTPS*。  
2、`spy-debugger`内部集成了[`weinre`](http://people.apache.org/~pmuellr/weinre/docs/latest/)。  
3、支持HTTPS页面的调试。

## 安装
Windows 下
```
    npm install spy-debugger -g
```

Mac 下
```
    sudo npm install spy-debugger -g
```

## 安装证书

#### 第一步：生成证书
```
    spy-debugger initCA
    // 证书生成在用户根目录的node-mitmproxy文件夹下的
    // 如： /Users/wuchangming/node-mitmproxy

```

#### 第二步：安装证书
把node-mitmproxy文件夹下的 `node-mitmproxy.ca.crt` 传到手机上，点击安装即可。


## Demo

#### 轻轻松松修改微信小游戏页面^.^
<img src="demo/img/thumb_IMG_0122_1024.jpg" height="600px" width="350px" />

## 三分钟上手

第一步：手机和PC保持在同一网络下（比如同时连到一个Wi-Fi下）

第二步：命令行输入`spy-debugger start`，按命令行提示用浏览器打开相应地址。

第三步：设置手机的HTTP代理，代理IP地址设置为PC的IP地址，端口为`spy-debugger`的启动端口(默认端口：9888)。

第四步：用手机浏览器访问你要调试的页面即可。

## 自定义选项
#### 端口
(默认端口：9888)
```
spy-debugger start -p 8888
```

#### 是否让weinre监控iframe加载的页面
(默认： false)
```
spy-debugger start -i true
```
## 更多
`spy-debugger`原理是集成了`weinre`，简化了`weinre`需要给每个调试的页面添加js代码。`spy-debugger`原理是拦截所有html页面请求注入`weinre`所需要的js代码。让页面调试更加方便。
