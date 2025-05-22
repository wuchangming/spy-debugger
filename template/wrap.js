var weinreBtn = document.getElementById('weinreBtn');
var anyProxyBtn = document.getElementById('anyProxyBtn');
var weinreIframe = document.getElementById('weinreIframe');
var anyProxyIframe = document.getElementById('anyProxyIframe');

weinreBtn.onclick=function(){
    weinreIframe.style.display = 'block';
    anyProxyIframe.style.display = 'none';
    weinreBtn.className = weinreBtn.className.replace(new RegExp('(?:^|\\s)'+ 'off' + '(?:\\s|$)'), ' ');
    weinreBtn.className = weinreBtn.className.replace(new RegExp('(?:^|\\s)'+ 'on' + '(?:\\s|$)'), ' ');
    weinreBtn.className += " on";

    anyProxyBtn.className = anyProxyBtn.className.replace(new RegExp('(?:^|\\s)'+ 'on' + '(?:\\s|$)'), ' ');
    anyProxyBtn.className = anyProxyBtn.className.replace(new RegExp('(?:^|\\s)'+ 'off' + '(?:\\s|$)'), ' ');
    anyProxyBtn.className += " off";
}

anyProxyBtn.onclick=function(){
    weinreIframe.style.display = 'none';
    anyProxyIframe.style.display = 'block';
    anyProxyBtn.className = anyProxyBtn.className.replace(new RegExp('(?:^|\\s)'+ 'off' + '(?:\\s|$)'), ' ');
    anyProxyBtn.className = anyProxyBtn.className.replace(new RegExp('(?:^|\\s)'+ 'on' + '(?:\\s|$)'), ' ');
    anyProxyBtn.className += " on";
    weinreBtn.className = weinreBtn.className.replace(new RegExp('(?:^|\\s)'+ 'on' + '(?:\\s|$)'), ' ');
    weinreBtn.className = weinreBtn.className.replace(new RegExp('(?:^|\\s)'+ 'off' + '(?:\\s|$)'), ' ');
    weinreBtn.className += " off";
}
