const GIFEncoder = require('./GIFEncoder.js');

const renderFrame = (frame) => {
  const encoder = new GIFEncoder(frame.width, frame.height);

  if (frame.index === 0) {
    encoder.writeHeader();
  } else {
    encoder.firstFrame = false;
  }

  encoder.setDispose(frame.dispose);
  encoder.setTransparencyDifferenceThreshold(frame.transparencyDifferenceThreshold);
  encoder.setApplyTransparencyOptimization(frame.applyTransparencyOptimization);
  encoder.setApplyCropOptimization(frame.applyCropOptimization);
  const previousFrame = frame.previousFrameData ? frame.previousFrameData : null;
  encoder.setTransparent(frame.transparent);
  encoder.setRepeat(frame.repeat);
  encoder.setDelay(frame.delay);
  encoder.setQuality(frame.quality);
  encoder.setDither(frame.dither);
  encoder.setGlobalPalette(frame.globalPalette);
  encoder.addFrame(frame.data, previousFrame);
  if (frame.last) {
    encoder.finish();
  }
  if (frame.globalPalette === true) {
    frame.globalPalette = encoder.getGlobalPalette();
  }

  const stream = encoder.stream();
  frame.data = stream.pages;
  frame.cursor = stream.cursor;
  frame.pageSize = stream.constructor.pageSize;

  if (frame.canTransfer) {
    const transfer = frame.data.map((page) => page.buffer);
    self.postMessage(frame, transfer);
  } else {
    self.postMessage(frame);
  }
};

self.onmessage = (event) => renderFrame(event.data);

module.exports = renderFrame;
