{EventEmitter} = require 'events'
browser = require './browser.coffee'

class GIF extends EventEmitter

  defaults =
    workerScript: 'gif.worker.js'
    workers: 2
    repeat: 0 # repeat forever, -1 = repeat once
    background: '#fff'
    quality: 10 # pixel sample interval, lower is better
    width: null # size derermined from first frame if possible
    height: null
    transparent: null
    debug: false

  frameDefaults =
    delay: 500 # ms
    copy: false
    applyCropOptimization: false
    transparencyDifferenceThreshold: 1
    applyTransparencyOptimization: false
    dispose: -1

  constructor: (options) ->
    @running = false

    @options = {}
    @frames = []
    @previousFrames = new Map()
    @pendingFrameCount = 0

    # TODO: compare by instance and not by data
    @groups = new Map() # for [data1, data1, data2, data1] @groups[data1] == [1, 3] and @groups[data2] = [2]

    @freeWorkers = []
    @activeWorkers = []
    @canFinish = false

    @setOptions options
    for key, value of defaults
      @options[key] ?= value

    @batchSizeForRendering = @options.workers
    @curBatchSizeLastIndex = 0

    # Spawn workers once and re-use them for all batches.
    @spawnWorkers()
    @taskQueue = []
    @imageParts = []

  setOption: (key, value) ->
    @options[key] = value
    if @_canvas? and key in ['width', 'height']
      @_canvas[key] = value

  setOptions: (options) ->
    @setOption key, value for own key, value of options

  getFrameData: (image, frame, options={}) ->
    if ImageData? and image instanceof ImageData
       frame.data = image.data
    else if (CanvasRenderingContext2D? and image instanceof CanvasRenderingContext2D) or (WebGLRenderingContext? and image instanceof WebGLRenderingContext)
      if options.copy
        frame.data = @getContextData image
      else
        frame.context = image
    else if image.childNodes?
      if options.copy
        frame.data = @getImageData image
      else
        frame.image = image
    else
      throw new Error 'Invalid image'
    return frame

  addFrame: (image, options={}) ->
    @pendingFrameCount++
    frame = {}
    previousFrame = {}
    frame.transparent = @options.transparent
    for key of frameDefaults
      frame[key] = options[key] or frameDefaults[key]

    # use the images width and height for options unless already set
    @setOption 'width', image.width unless @options.width?
    @setOption 'height', image.height unless @options.height?

    frame = @getFrameData image, frame, options
    if @options.applyTransparencyOptimization and options.previousImage?
      previousFrame = @getFrameData options.previousImage, previousFrame, options

    # find duplicates in frames.data
    index = @frames.length
    if index > 0 and frame.data # frame 0 contains header, do not count it
      if @groups.has(frame.data)
        @groups.get(frame.data).push index
      else
        @groups.set frame.data, [index]

    @frames.push frame
    if previousFrame.data?
      @previousFrames.set index, previousFrame

    if (@pendingFrameCount % @batchSizeForRendering) == 0
      # If all workers are occupied, then flush tasks to free workers.
      gif = this
      if @freeWorkers.length == 0 || @taskQueue.length > 0
        @flushTasks().then ->
          task = gif.addBatchForRendering()
          gif.taskQueue.push(task)
      else
        task = gif.addBatchForRendering()
        gif.taskQueue.push(task)
    @emit 'progress', 1

  render: ->
    return if @pendingFrameCount == 0

    throw new Error 'Already running' if @running

    if not @options.width? or not @options.height?
      throw new Error 'Width and height must be set prior to rendering'

    @running = true
    @nextFrame = 0
    @finishedFrames = 0

    for i in [0...Math.min @pendingFrameCount, @batchSizeForRendering]
      @imageParts.push(null)

    numWorkers = @freeWorkers.length
    # we need to wait for the palette
    if @options.globalPalette == true
      @renderNextFrame()
    else
      @renderNextFrame() for i in [0...numWorkers]

    @emit 'start'
    @emit 'progress', 0

  abort: ->
    loop
      worker = @activeWorkers.shift()
      break unless worker?
      @log "killing active worker"
      worker.terminate()
    @running = false
    @emit 'abort'

  addBatchForRendering: ->
    framesToRender = Math.min @pendingFrameCount, @batchSizeForRendering
    @curBatchSizeLastIndex = @curBatchSizeLastIndex + framesToRender
    gif = this
    task = new Promise (resolve) ->
      setTimeout ->
        gif.render()
        resolve()
    @taskQueue.push(task)

  # private


  flushTasks: ->
    gif = this
    Promise.all(gif.taskQueue)
      .then () ->
        gif.running = false
        gif.taskQueue = []
      .catch (error) ->
        throw error

  spawnWorkers: ->
    numWorkers = Math.min(@options.workers, @frames.length)
    [@freeWorkers.length...numWorkers].forEach (i) =>
      @log "spawning worker #{ i }"
      worker = new Worker @options.workerScript
      worker.onmessage = (event) =>
        @activeWorkers.splice @activeWorkers.indexOf(worker), 1
        @freeWorkers.push worker
        @frameFinished event.data, false
      @freeWorkers.push worker
    return numWorkers

  frameFinished: (frame, duplicate) ->
    @finishedFrames++
    @pendingFrameCount--
    if not duplicate
      @log "frame #{ frame.index + 1 } finished - #{ @activeWorkers.length } active"
      @emit 'progress', 1
      @imageParts[frame.index] = frame
    else
      indexOfDuplicate = @frames.indexOf frame
      indexOfFirstInGroup = @groups.get(frame.data)[0]
      @log "frame #{ indexOfDuplicate + 1 } is duplicate of #{ indexOfFirstInGroup } - #{ @activeWorkers.length } active"
      @imageParts[indexOfDuplicate] = { indexOfFirstInGroup: indexOfFirstInGroup } # do not put frame here, as it may not be available still. Put index.
    # remember calculated palette, spawn the rest of the workers
    if @options.globalPalette == true and not duplicate
      @options.globalPalette = frame.globalPalette
      @log "global palette analyzed"
      @renderNextFrame() for i in [1...@freeWorkers.length] if @frames.length > 2
    if null in @imageParts
      @renderNextFrame()
    else if @canFinish
      @running = false
      @finishRendering()
    else
      @taskQueue = []
      @running = false

  flush: ->
    gif = this
    @flushTasks().then ->
      gif.running = false
      gif.canFinish = true
      gif.addBatchForRendering()


  finishRendering: ->
    for frame, index in @imageParts
      @imageParts[index] = @imageParts[frame.indexOfFirstInGroup] if frame.indexOfFirstInGroup
    len = 0
    for frame in @imageParts
      len += (frame.data.length - 1) * frame.pageSize + frame.cursor
    len += frame.pageSize - frame.cursor
    @log "rendering finished - filesize #{ Math.round(len / 1000) }kb"
    data = new Uint8Array len
    offset = 0
    for frame in @imageParts
      for page, i in frame.data
        data.set page, offset
        if i is frame.data.length - 1
          offset += frame.cursor
        else
          offset += frame.pageSize

    image = new Blob [data],
      type: 'image/gif'

    @emit 'finished', image, data

  renderNextFrame: ->
    throw new Error 'No free workers' if @freeWorkers.length is 0
    return if @nextFrame >= @frames.length || @nextFrame >= @imageParts.length # no new frame to render

    index = @nextFrame++
    frame = @frames[index]

    # check if one of duplicates, but not the first in group
    previousFrame = null
    if @previousFrames.has(index - 1)
      previousFrame = @previousFrames.get(index - 1)

    if index > 0 and @groups.has(frame.data) and @groups.get(frame.data)[0] != index
      setTimeout =>
        @frameFinished frame, true
      , 0
      return

    worker = @freeWorkers.shift()
    task = @getTask frame, previousFrame

    @log "starting frame #{ task.index + 1 } of #{ @frames.length }"
    @activeWorkers.push worker
    worker.postMessage task#, [task.data.buffer]
    # Dispose unused memory.
    @frames[index] = null
    @previousFrames[index - 1] = null

  getContextData: (ctx) ->
    return ctx.getImageData(0, 0, @options.width, @options.height).data

  getImageData: (image) ->
    if not @_canvas?
      @_canvas = document.createElement 'canvas'
      @_canvas.width = @options.width
      @_canvas.height = @options.height

    ctx = @_canvas.getContext '2d'
    ctx.setFill = @options.background
    ctx.fillRect 0, 0, @options.width, @options.height
    ctx.drawImage image, 0, 0

    return @getContextData ctx

  getFrameDataForTask: (frame) ->
    if frame.data?
      return frame.data
    else if frame.context?
      return @getContextData frame.context
    else if frame.image?
      return @getImageData frame.image
    else
      throw new Error 'Invalid frame'

  getTask: (frame, previousFrame) ->
    index = @frames.indexOf frame
    task =
      index: index
      last: index is (@frames.length - 1)
      delay: frame.delay
      transparent: frame.transparent
      width: @options.width
      height: @options.height
      quality: @options.quality
      dither: @options.dither
      globalPalette: @options.globalPalette
      repeat: @options.repeat
      canTransfer: true
      data: @getFrameDataForTask frame
      applyCropOptimization: @options.applyCropOptimization
      transparencyDifferenceThreshold: @options.transparencyDifferenceThreshold
      dispose: @options.dispose
      applyTransparencyOptimization: @options.applyTransparencyOptimization

    if previousFrame?
      task.previousFrameData = @getFrameDataForTask previousFrame

    return task

  log: (msg) ->
    console.log msg if @options.debug

module.exports = GIF