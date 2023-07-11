const Throttler = require("./throttler");

const defaultGifConfig = {
  workerScript: "gif.worker.js",
  workers: 2,
  repeat: 0, // repeat forever, -1 = repeat once
  background: "#fff",
  quality: 10, // pixel sample interval, lower is better
  width: null, // size derermined from first frame if possible
  height: null,
  transparent: null,
  debug: false,
};

const defaultFrameConfig = {
  delay: 500,
  copy: false,
  applyCropOptimization: false,
  transparencyDifferenceThreshold: 1,
  applyTransparencyOptimization: false,
  dispose: -1,
  isLastFrame: false,
};

// To Do: Optimize groups. Optimize previous frames, dispose unused memory.
class GIF {
  constructor(options) {
    this.freeWorkers = [];
    this.activeWorkers = [];
    this.gifConfig = { ...defaultGifConfig, ...options };
    console.log(this.gifConfig);
    // This can be more but we keep queue size fixed here so
    // that we dont have to manage task queue.
    this.queueSize = Math.max(this.gifConfig.workers, 1);
    this.spawnWorkers();
    this.frames = [];
    this.previousFrames = [];
    this.groups = new Map();
    this.throttler = new Throttler(this.gifConfig.workers);
    this.nextFrame = 0;
    this.imageParts = [];
  }

  spawnWorkers() {
    for (let i = 0; i < this.gifConfig.workers; i++) {
      const worker = new Worker(this.gifConfig.workerScript);
      worker.onmessage = (event) => {
        this.activeWorkers.splice(this.activeWorkers.indexOf(worker));
        this.freeWorkers.push(worker);
        this.frameFinished(event.data, false);
      };
      this.freeWorkers.push(worker);
    }
  }

  async addFrame(image, options) {
    let frame = { ...defaultFrameConfig, ...options };
    let previousFrame = {};
    frame.transparent = this.gifConfig.transparent;
    await new Promise((resolve) => setTimeout(resolve, 100));

    if (!this.gifConfig.width) {
      this.gifConfig.width = image.width;
    }
    if (!this.gifConfig.height) {
      this.gifConfig.height = image.height;
    }

    frame = this.getFrameData(image, frame, options);
    if (this.gifConfig.applyTransparencyOptimization && options.previousImage) {
      previousFrame = this.getFrameData(options.previousImage, previousFrame, options);
    }

    console.log("HERE")

    let index = this.frames.length;
    if (index > 0 && frame.data) {
      if (this.groups.has(frame.data)) {
        this.groups.get(frame.data).push(index);
      } else {
        this.groups.set(frame.data, index);
      }
    }

    this.frames.push(frame);
    if (previousFrame.data) {
      this.previousFrames.push(previousFrame);
    }

    await this.throttler.wait();
    this.render();
  }

  render(isLastFrame = false) {
    if (this.nextFrame > this.frames.length) {
      // No frame to render.
      return;
    }

    if (!this.gifConfig.width || !this.gifConfig.height) {
      throw new Error("Width and height must be set prior to rendering");
    }

    if (this.freeWorkers.length === 0) {
      throw new Error("No workers available");
    }

    let index = this.nextFrame;
    let frame = this.frames[index];
    this.imageParts.push(null)
    let previousFrame = null;
    if (this.previousFrames.length > (index - 1))
      previousFrame = this.previousFrames[index - 1];
    this.nextFrame++;

    if (
      index > 0 &&
      this.groups.has(frame.data) &&
      this.groups.get(frame.data)[0] != index
    ) {
      return this.frameFinished(frame, true);
    }

    const worker = this.freeWorkers.shift();
    const task = this.getTask(index, frame, previousFrame, isLastFrame);
    this.activeWorkers.push(worker);
    worker.postMessage(task);
  }

  abort() {
    for (let i = 0; i < this.activeWorkers.length; i++) {
      this.activeWorkers[i].terminate();
    }
  }

  getTask(index, frame, previousFrame, isLastFrame) {
    return {
      index: index,
      last: isLastFrame,
      delay: frame.delay,
      transparent: frame.transparent,
      width: this.gifConfig.width,
      height: this.gifConfig.height,
      quality: this.gifConfig.quality,
      dither: this.gifConfig.dither,
      globalPalette: this.gifConfig.globalPalette,
      repeat: this.gifConfig.repeat,
      canTransfer: true,
      data: this.getFrameDataForTask(frame),
      applyCropOptimization: this.gifConfig.applyCropOptimization,
      transparencyDifferenceThreshold:
        this.gifConfig.transparencyDifferenceThreshold,
      dispose: this.gifConfig.dispose,
      applyTransparencyOptimization:
        this.gifConfig.applyTransparencyOptimization,
      previousFrameData: previousFrame
        ? this.getFrameDataForTask(previousFrame)
        : null,
    };
  }

  getContextData(ctx) {
    return ctx.getImageData(0, 0, this.gifConfig.width, this.gifConfig.height)
      .data;
  }

  getFrameDataForTask(frame) {
    if (frame.data) {
      return frame.data;
    } else if (frame.context) {
      return this.getContextData(frame.context);
    } else if (frame.image) {
      return this.getImageData(frame.image);
    } else {
      throw new Error("Invalid frame");
    }
  }

  frameFinished(frame, duplicate) {
    if (!duplicate) {
      this.imageParts[frame.index] = frame;
    } else {
      let indexOfFirstInGroup = this.groups.get(frame.data)[0];
      this.imageParts[frame.index] = {
        indexOfFirstInGroup: indexOfFirstInGroup,
      };
    }

    if (this.gifConfig.options === true && !duplicate) {
      this.gifConfig.globalPalette = frame.globalPalette;
    }

    this.throttler.notify();
  }

  async flush() {
    await this.throttler.wait();
    for (var index in this.imageParts) {
      var frame = this.imageParts[index];
      if (frame.indexOfFirstInGroup) {
        this.imageParts[index] = this.imageParts[frame.indexOfFirstInGroup];
      }
    }

    var len = 0;
    for (var frameIndex in this.imageParts) {
      var frame = this.imageParts[frameIndex];
      len += (frame.data.length - 1) * frame.pageSize + frame.cursor;
    }
    len += frame.pageSize - frame.cursor;

    var data = new Uint8Array(len);
    var offset = 0;
    for (var frameIndex in this.imageParts) {
      var frame = this.imageParts[frameIndex];
      for (var i in frame.data) {
        var page = frame.data[i];
        data.set(page, offset);
        if (i == frame.data.length - 1) {
          offset += frame.cursor;
        } else {
          offset += frame.pageSize;
        }
      }
    }

    var image = new Blob([data], { type: "image/gif" });
    return image;
  }

  getFrameData(image, frame, options = {}) {
    if (typeof ImageData !== "undefined" && image instanceof ImageData) {
      frame.data = image.data;
    } else if (
      (typeof CanvasRenderingContext2D !== "undefined" &&
        image instanceof CanvasRenderingContext2D) ||
      (typeof WebGLRenderingContext !== "undefined" &&
        image instanceof WebGLRenderingContext)
    ) {
      if (options.copy) {
        frame.data = this.getContextData(image);
      } else {
        frame.context = image;
      }
    } else if (image.childNodes) {
      if (options.copy) {
        frame.data = this.getImageData(image);
      } else {
        frame.image = image;
      }
    } else {
      throw new Error("Invalid image");
    }
    return frame;
  }

  getImageData(image) {
    if (!this._canvas) {
      this._canvas = document.createElement("canvas");
      this._canvas.width = this.gifConfig.width;
      this._canvas.height = this.gifConfig.height;
    }

    var ctx = this._canvas.getContext("2d");
    ctx.setFill = this.gifConfig.background;
    ctx.fillRect(0, 0, this.gifConfig.width, this.gifConfig.height);
    ctx.drawImage(image, 0, 0);

    return this.getContextData(ctx);
  }
}

module.exports = GIF;
