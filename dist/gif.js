!function(t,e){"object"==typeof exports&&"object"==typeof module?module.exports=e():"function"==typeof define&&define.amd?define([],e):"object"==typeof exports?exports.GIF=e():t.GIF=e()}(this,function(){return function(t){function e(r){if(i[r])return i[r].exports;var n=i[r]={exports:{},id:r,loaded:!1};return t[r].call(n.exports,n,n.exports,e),n.loaded=!0,n.exports}var i={};return e.m=t,e.c=i,e.p="",e(0)}([function(t,e,i){var r,n,s,o=function(t,e){function i(){this.constructor=t}for(var r in e)a.call(e,r)&&(t[r]=e[r]);return i.prototype=e.prototype,t.prototype=new i,t.__super__=e.prototype,t},a={}.hasOwnProperty,h=[].indexOf||function(t){for(var e=0,i=this.length;e<i;e++)if(e in this&&this[e]===t)return e;return-1};r=i(1).EventEmitter,s=i(2),n=function(t){function e(t){var e,r,n,s;this.running=!1,this.options={},this.frames=[],this.previousFrames=new Map,this.pendingFrameCount=0,this.groups=new Map,this.freeWorkers=[],this.activeWorkers=[],this.setOptions(t);for(r in i)s=i[r],null==(e=this.options)[r]&&(e[r]=s);this.batchSizeForRendering=this.options.workers,this.curBatchSizeLastIndex=0,this.spawnWorkers(),n=[]}var i,r;return o(e,t),i={workerScript:"gif.worker.js",workers:2,repeat:0,background:"#fff",quality:10,width:null,height:null,transparent:null,debug:!1},r={delay:500,copy:!1,applyCropOptimization:!1,transparencyDifferenceThreshold:1,applyTransparencyOptimization:!1,dispose:-1},e.prototype.setOption=function(t,e){if(this.options[t]=e,null!=this._canvas&&("width"===t||"height"===t))return this._canvas[t]=e},e.prototype.setOptions=function(t){var e,i,r;i=[];for(e in t)a.call(t,e)&&(r=t[e],i.push(this.setOption(e,r)));return i},e.prototype.getFrameData=function(t,e,i){if(null==i&&(i={}),"undefined"!=typeof ImageData&&null!==ImageData&&t instanceof ImageData)e.data=t.data;else if("undefined"!=typeof CanvasRenderingContext2D&&null!==CanvasRenderingContext2D&&t instanceof CanvasRenderingContext2D||"undefined"!=typeof WebGLRenderingContext&&null!==WebGLRenderingContext&&t instanceof WebGLRenderingContext)i.copy?e.data=this.getContextData(t):e.context=t;else{if(null==t.childNodes)throw new Error("Invalid image");i.copy?e.data=this.getImageData(t):e.image=t}return e},e.prototype.addFrame=function(t,e){var i,n,s,o;null==e&&(e={}),i={},o={},i.transparent=this.options.transparent;for(s in r)i[s]=e[s]||r[s];return null==this.options.width&&this.setOption("width",t.width),null==this.options.height&&this.setOption("height",t.height),i=this.getFrameData(t,i,e),this.options.applyTransparencyOptimization&&null!=e.previousImage&&(o=this.getFrameData(e.previousImage,o,e)),n=this.frames.length,n>0&&i.data&&(this.groups.has(i.data)?this.groups.get(i.data).push(n):this.groups.set(i.data,[n])),this.frames.push(i),null!=o.data&&this.previousFrames.set(n,o),this.pendingFrameCount>this.batchSizeForRendering&&(0===this.freeWorkers.length||this.taskQueue.length>0?flushTasks().then(function(){return this.addBatchForRendering()}):this.addBatchForRendering()),this.emit("progress",1)},e.prototype.render=function(){var t,e,i,r,n,s;if(this.running)throw new Error("Already running");if(null==this.options.width||null==this.options.height)throw new Error("Width and height must be set prior to rendering");for(this.running=!0,this.nextFrame=0,this.finishedFrames=0,t=e=0,n=Math.min(this.pendingFrameCount,this.batchSizeForRendering);0<=n?e<n:e>n;t=0<=n?++e:--e)this.imageParts.push(null);if(r=this.freeWorkers.length,this.options.globalPalette===!0)this.renderNextFrame();else for(t=i=0,s=r;0<=s?i<s:i>s;t=0<=s?++i:--i)this.renderNextFrame();return this.emit("start"),this.emit("progress",0)},e.prototype.abort=function(){for(var t;;){if(t=this.activeWorkers.shift(),null==t)break;this.log("killing active worker"),t.terminate()}return this.running=!1,this.emit("abort")},e.prototype.addBatchForRendering=function(){var t;return this.curBatchSizeLastIndex=this.curBatchSizeLastIndex+this.batchSizeForRendering,t=new Promise(function(t){return setTimeout(function(){return this.render(),this.taskQueue=[],this.resolve()})}),this.taskQueue.push(t)},e.prototype.flushTasks=function(){return Promise.all(this.taskQueue).then(function(){return this.taskQueue=[]}).catch(function(t){throw t})},e.prototype.spawnWorkers=function(){var t,e,i;return t=Math.min(this.options.workers,this.frames.length),function(){i=[];for(var r=e=this.freeWorkers.length;e<=t?r<t:r>t;e<=t?r++:r--)i.push(r);return i}.apply(this).forEach(function(t){return function(e){var i;return t.log("spawning worker "+e),i=new Worker(t.options.workerScript),i.onmessage=function(e){return t.activeWorkers.splice(t.activeWorkers.indexOf(i),1),t.freeWorkers.push(i),t.frameFinished(e.data,!1)},t.freeWorkers.push(i)}}(this)),t},e.prototype.frameFinished=function(t,e){var i,r,n,s,o;if(this.finishedFrames++,this.pendingFrameCount--,e?(r=this.frames.indexOf(t),n=this.groups.get(t.data)[0],this.log("frame "+(r+1)+" is duplicate of "+n+" - "+this.activeWorkers.length+" active"),this.imageParts[r]={indexOfFirstInGroup:n}):(this.log("frame "+(t.index+1)+" finished - "+this.activeWorkers.length+" active"),this.emit("progress",1),this.imageParts[t.index]=t),this.options.globalPalette===!0&&!e&&(this.options.globalPalette=t.globalPalette,this.log("global palette analyzed"),this.frames.length>2))for(i=s=1,o=this.freeWorkers.length;1<=o?s<o:s>o;i=1<=o?++s:--s)this.renderNextFrame();if(h.call(this.imageParts,null)>=0)return this.renderNextFrame()},e.prototype.flush=function(){return this.flushTasks.then(function(){return this.render(),this.finishRendering()})},e.prototype.finishRendering=function(){var t,e,i,r,n,s,o,a,h,p,u,l,f,c,d,g,m,v,y,w;for(m=this.imageParts,n=s=0,p=m.length;s<p;n=++s)e=m[n],e.indexOfFirstInGroup&&(this.imageParts[n]=this.imageParts[e.indexOfFirstInGroup]);for(h=0,v=this.imageParts,o=0,u=v.length;o<u;o++)e=v[o],h+=(e.data.length-1)*e.pageSize+e.cursor;for(h+=e.pageSize-e.cursor,this.log("rendering finished - filesize "+Math.round(h/1e3)+"kb"),t=new Uint8Array(h),d=0,y=this.imageParts,a=0,l=y.length;a<l;a++)for(e=y[a],w=e.data,i=c=0,f=w.length;c<f;i=++c)g=w[i],t.set(g,d),d+=i===e.data.length-1?e.cursor:e.pageSize;return r=new Blob([t],{type:"image/gif"}),this.emit("finished",r,t)},e.prototype.renderNextFrame=function(){var t,e,i,r,n;if(0===this.freeWorkers.length)throw new Error("No free workers");if(!(this.nextFrame>=this.frames.length||this.nextFrame>=this.imageParts.length))return e=this.nextFrame++,t=this.frames[e],i=null,this.previousFrames.has(e-1)&&(i=this.previousFrames.get(e-1)),e>0&&this.groups.has(t.data)&&this.groups.get(t.data)[0]!==e?void setTimeout(function(e){return function(){return e.frameFinished(t,!0)}}(this),0):(n=this.freeWorkers.shift(),r=this.getTask(t,i),this.log("starting frame "+(r.index+1)+" of "+this.frames.length),this.activeWorkers.push(n),n.postMessage(r),this.frames[e]=null,this.previousFrames[e-1]=null)},e.prototype.getContextData=function(t){return t.getImageData(0,0,this.options.width,this.options.height).data},e.prototype.getImageData=function(t){var e;return null==this._canvas&&(this._canvas=document.createElement("canvas"),this._canvas.width=this.options.width,this._canvas.height=this.options.height),e=this._canvas.getContext("2d"),e.setFill=this.options.background,e.fillRect(0,0,this.options.width,this.options.height),e.drawImage(t,0,0),this.getContextData(e)},e.prototype.getFrameDataForTask=function(t){if(null!=t.data)return t.data;if(null!=t.context)return this.getContextData(t.context);if(null!=t.image)return this.getImageData(t.image);throw new Error("Invalid frame")},e.prototype.getTask=function(t,e){var i,r;return i=this.frames.indexOf(t),r={index:i,last:i===this.frames.length-1,delay:t.delay,transparent:t.transparent,width:this.options.width,height:this.options.height,quality:this.options.quality,dither:this.options.dither,globalPalette:this.options.globalPalette,repeat:this.options.repeat,canTransfer:!0,data:this.getFrameDataForTask(t),applyCropOptimization:this.options.applyCropOptimization,transparencyDifferenceThreshold:this.options.transparencyDifferenceThreshold,dispose:this.options.dispose,applyTransparencyOptimization:this.options.applyTransparencyOptimization},null!=e&&(r.previousFrameData=this.getFrameDataForTask(e)),r},e.prototype.log=function(t){if(this.options.debug)return console.log(t)},e}(r),t.exports=n},function(t,e){function i(){this._events=this._events||{},this._maxListeners=this._maxListeners||void 0}function r(t){return"function"==typeof t}function n(t){return"number"==typeof t}function s(t){return"object"==typeof t&&null!==t}function o(t){return void 0===t}t.exports=i,i.EventEmitter=i,i.prototype._events=void 0,i.prototype._maxListeners=void 0,i.defaultMaxListeners=10,i.prototype.setMaxListeners=function(t){if(!n(t)||t<0||isNaN(t))throw TypeError("n must be a positive number");return this._maxListeners=t,this},i.prototype.emit=function(t){var e,i,n,a,h,p;if(this._events||(this._events={}),"error"===t&&(!this._events.error||s(this._events.error)&&!this._events.error.length)){if(e=arguments[1],e instanceof Error)throw e;var u=new Error('Uncaught, unspecified "error" event. ('+e+")");throw u.context=e,u}if(i=this._events[t],o(i))return!1;if(r(i))switch(arguments.length){case 1:i.call(this);break;case 2:i.call(this,arguments[1]);break;case 3:i.call(this,arguments[1],arguments[2]);break;default:a=Array.prototype.slice.call(arguments,1),i.apply(this,a)}else if(s(i))for(a=Array.prototype.slice.call(arguments,1),p=i.slice(),n=p.length,h=0;h<n;h++)p[h].apply(this,a);return!0},i.prototype.addListener=function(t,e){var n;if(!r(e))throw TypeError("listener must be a function");return this._events||(this._events={}),this._events.newListener&&this.emit("newListener",t,r(e.listener)?e.listener:e),this._events[t]?s(this._events[t])?this._events[t].push(e):this._events[t]=[this._events[t],e]:this._events[t]=e,s(this._events[t])&&!this._events[t].warned&&(n=o(this._maxListeners)?i.defaultMaxListeners:this._maxListeners,n&&n>0&&this._events[t].length>n&&(this._events[t].warned=!0,console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.",this._events[t].length),"function"==typeof console.trace&&console.trace())),this},i.prototype.on=i.prototype.addListener,i.prototype.once=function(t,e){function i(){this.removeListener(t,i),n||(n=!0,e.apply(this,arguments))}if(!r(e))throw TypeError("listener must be a function");var n=!1;return i.listener=e,this.on(t,i),this},i.prototype.removeListener=function(t,e){var i,n,o,a;if(!r(e))throw TypeError("listener must be a function");if(!this._events||!this._events[t])return this;if(i=this._events[t],o=i.length,n=-1,i===e||r(i.listener)&&i.listener===e)delete this._events[t],this._events.removeListener&&this.emit("removeListener",t,e);else if(s(i)){for(a=o;a-- >0;)if(i[a]===e||i[a].listener&&i[a].listener===e){n=a;break}if(n<0)return this;1===i.length?(i.length=0,delete this._events[t]):i.splice(n,1),this._events.removeListener&&this.emit("removeListener",t,e)}return this},i.prototype.removeAllListeners=function(t){var e,i;if(!this._events)return this;if(!this._events.removeListener)return 0===arguments.length?this._events={}:this._events[t]&&delete this._events[t],this;if(0===arguments.length){for(e in this._events)"removeListener"!==e&&this.removeAllListeners(e);return this.removeAllListeners("removeListener"),this._events={},this}if(i=this._events[t],r(i))this.removeListener(t,i);else if(i)for(;i.length;)this.removeListener(t,i[i.length-1]);return delete this._events[t],this},i.prototype.listeners=function(t){var e;return e=this._events&&this._events[t]?r(this._events[t])?[this._events[t]]:this._events[t].slice():[]},i.prototype.listenerCount=function(t){if(this._events){var e=this._events[t];if(r(e))return 1;if(e)return e.length}return 0},i.listenerCount=function(t,e){return t.listenerCount(e)}},function(t,e){var i,r,n,s,o;o=navigator.userAgent.toLowerCase(),s=navigator.platform.toLowerCase(),i=o.match(/(opera|ie|firefox|chrome|version)[\s\/:]([\w\d\.]+)?.*?(safari|version[\s\/:]([\w\d\.]+)|$)/)||[null,"unknown",0],n="ie"===i[1]&&document.documentMode,r={name:"version"===i[1]?i[3]:i[1],version:n||parseFloat("opera"===i[1]&&i[4]?i[4]:i[2]),platform:{name:o.match(/ip(?:ad|od|hone)/)?"ios":(o.match(/(?:webos|android)/)||s.match(/mac|win|linux/)||["other"])[0]}},r[r.name]=!0,r[r.name+parseInt(r.version,10)]=!0,r.platform[r.platform.name]=!0,t.exports=r}])});
//# sourceMappingURL=gif.js.map