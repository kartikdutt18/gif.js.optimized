!function(t,e){if("object"==typeof exports&&"object"==typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var i=e();for(var r in i)("object"==typeof exports?exports:t)[r]=i[r]}}(self,(()=>{return t={764:t=>{t.exports=class{constructor(){this.pending=[],this.closed=!1,this.inErrorState=!1,this.error=null}wait(){return this.inErrorState?Promise.reject(this.error):this.closed?Promise.resolve(void 0):new Promise(((t,e)=>{this.pending.push({resolve:t,reject:e})}))}notifyOne(){this.pending.length>0&&this.pending.shift()?.resolve()}notifyAll(){this.pending.forEach((t=>t.resolve())),this.pending=[]}rejectAll(t){this.inErrorState=!0,this.error=t,this.pending.forEach((e=>e.reject(t))),this.pending=[]}close(){this.notifyAll(),this.closed=!0}}},503:(t,e,i)=>{const r=i(373),a={workerScript:"gif.worker.js",workers:2,repeat:0,background:"#fff",quality:10,width:null,height:null,transparent:null,debug:!1},s={delay:500,copy:!1,applyCropOptimization:!1,transparencyDifferenceThreshold:1,applyTransparencyOptimization:!1,dispose:-1,isLastFrame:!1};t.exports=class{constructor(t){this.freeWorkers=[],this.activeWorkers=[],this.gifConfig={...a,...t},console.log(this.gifConfig),this.queueSize=Math.max(this.gifConfig.workers,1),this.spawnWorkers(),this.frames=[],this.previousFrames=[],this.throttler=new r(this.gifConfig.workers),this.nextFrame=0,this.imageParts=[]}spawnWorkers(){for(let t=0;t<this.gifConfig.workers;t++){const t=new Worker(this.gifConfig.workerScript),e=e=>{const i=this.activeWorkers.indexOf(t);-1!==i&&this.activeWorkers.splice(i,1),this.freeWorkers.push(t),this.frameFinished(e.data)};t.onmessage=e,this.freeWorkers.push(t)}}async addFrame(t,e){let i={...s,...e},r={};i.transparent=this.gifConfig.transparent,await new Promise((t=>setTimeout(t,100))),this.gifConfig.width||(this.gifConfig.width=t.width),this.gifConfig.height||(this.gifConfig.height=t.height),i=this.getFrameData(t,i,e),this.gifConfig.applyTransparencyOptimization&&e.previousImage&&(r=this.getFrameData(e.previousImage,r,e)),this.frames.push(i),r.data&&this.previousFrames.push(r),await this.throttler.wait(),this.render(i,r,e.isLastFrame??!1)}render(t,e,i=!1){if(!this.gifConfig.width||!this.gifConfig.height)throw new Error("Width and height must be set prior to rendering");if(0===this.freeWorkers.length)throw new Error("No workers available");this.imageParts.push(null);const r=this.freeWorkers.shift(),a=this.getTask(this.nextFrame++,t,e,i);this.activeWorkers.push(r),r.postMessage(a)}abort(){for(let t=0;t<this.activeWorkers.length;t++)this.activeWorkers[t].terminate()}getTask(t,e,i,r){return{index:t,last:r,delay:e.delay,transparent:e.transparent,width:this.gifConfig.width,height:this.gifConfig.height,quality:this.gifConfig.quality,dither:this.gifConfig.dither,globalPalette:this.gifConfig.globalPalette,repeat:this.gifConfig.repeat,canTransfer:!0,data:this.getFrameDataForTask(e),applyCropOptimization:this.gifConfig.applyCropOptimization,transparencyDifferenceThreshold:this.gifConfig.transparencyDifferenceThreshold,dispose:this.gifConfig.dispose,applyTransparencyOptimization:this.gifConfig.applyTransparencyOptimization,previousFrameData:i?this.getFrameDataForTask(i):null}}getContextData(t){return t.getImageData(0,0,this.gifConfig.width,this.gifConfig.height).data}getFrameDataForTask(t){if(t.data)return t.data;if(t.context)return this.getContextData(t.context);if(t.image)return this.getImageData(t.image);throw new Error("Invalid frame")}frameFinished(t){null===this.imageParts[t.index]&&(this.imageParts[t.index]=t,!0!==this.gifConfig.options||duplicate||(this.gifConfig.globalPalette=t.globalPalette),this.throttler.notify())}async flush(){await this.throttler.ensureEmpty();var t=0;for(var e in this.imageParts)t+=((a=this.imageParts[e]).data.length-1)*a.pageSize+a.cursor;t+=a.pageSize-a.cursor;var i=new Uint8Array(t),r=0;for(var e in this.imageParts){var a=this.imageParts[e];for(var s in a.data){var n=a.data[s];i.set(n,r),s==a.data.length-1?r+=a.cursor:r+=a.pageSize}}return new Blob([i],{type:"image/gif"})}getFrameData(t,e,i={}){if("undefined"!=typeof ImageData&&t instanceof ImageData)e.data=t.data;else if("undefined"!=typeof CanvasRenderingContext2D&&t instanceof CanvasRenderingContext2D||"undefined"!=typeof WebGLRenderingContext&&t instanceof WebGLRenderingContext)i.copy?e.data=this.getContextData(t):e.context=t;else{if(!t.childNodes)throw new Error("Invalid image");i.copy?e.data=this.getImageData(t):e.image=t}return e}getImageData(t){this._canvas||(this._canvas=document.createElement("canvas"),this._canvas.width=this.gifConfig.width,this._canvas.height=this.gifConfig.height);var e=this._canvas.getContext("2d");return e.setFill=this.gifConfig.background,e.fillRect(0,0,this.gifConfig.width,this.gifConfig.height),e.drawImage(t,0,0),this.getContextData(e)}}},373:(t,e,i)=>{var r=i(764);t.exports=class{constructor(t){this.maxPending=t,this.pendingCount=0,this.full=new r}async wait(){for(;this.pendingCount>=this.maxPending;)await this.full.wait();this.pendingCount++}async ensureEmpty(){for(;0!=this.pendingCount;)await this.full.wait()}notify(){this.pendingCount--,this.full.notifyOne()}}}},e={},function i(r){var a=e[r];if(void 0!==a)return a.exports;var s=e[r]={exports:{}};return t[r](s,s.exports,i),s.exports}(503);var t,e}));
//# sourceMappingURL=gif.js.map