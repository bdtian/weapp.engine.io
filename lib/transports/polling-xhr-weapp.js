var Polling = require('./polling')
var Emitter = require('component-emitter')
var inherit = require('component-inherit')
var debug = require('debug')('engine.io-client:polling-xhr-weapp')

module.exports = XHR

function XHR(opts) {
  Polling.call(this, opts)
  this.requestTimeout = opts.requestTimeout
}

/**
 * Inherits from Polling.
 */

inherit(XHR, Polling)

XHR.prototype.request = function(opts) {
  opts = opts || {}
  opts.uri = this.uri()

  debug('new XHR: ', opts)

  return new Request(opts)
}

/**
 * Sends data.
 * @param {*} data
 * @param {*} fn
 */
XHR.prototype.doWrite = function(data, fn) {
  var isBinary = typeof data !== 'string' && data !== undefined
  var req = this.request({ method: 'POST', data: data, isBinary: isBinary })
  var self = this
  req.on('success', fn)
  req.on('error', function(err) {
    self.onError('xhr post error', err)
  })
  this.sendXhr = req
}

/**
 * Starts a poll cycle.
 */
XHR.prototype.doPoll = function() {
  debug('xhr poll')
  var req = this.request()
  var self = this
  req.on('data', function(data) {
    self.onData(data)
  })
  req.on('error', function(err) {
    self.onError('xhr poll error', err)
  })
  this.pollXhr = req
}

/**
 *
 * Request constructor
 * @param {*} opts
 */
function Request(opts) {
  this.method = opts.method || 'GET'
  this.uri = opts.uri
  this.data = undefined !== opts.data ? opts.data : null
  this.requestTimeout = opts.requestTimeout

  const self = this

  this.success = function(res) {
    self.data = res.data
    self.onLoad()
  }

  this.fail = function(err) {
    self.onError(err)
  }

  this.create()
}

/**
 * Mix in `Emitter`.
 */

Emitter(Request.prototype)

Request.prototype.create = function() {
  /**
   * create http connect
   */
  wx.request({
    url: this.uri,
    method: this.method,
    data: this.data,
    success: this.success,
    fail: this.fail,
  })
}

/**
 * Called upon successful response.
 *
 * @api private
 */

Request.prototype.onSuccess = function() {
  this.emit('success')
  this.cleanup()
}

/**
 * Called if we have data.
 *
 * @api private
 */

Request.prototype.onData = function(data) {
  this.emit('data', data)
  this.onSuccess()
}

/**
 * Called upon error.
 *
 * @api private
 */

Request.prototype.onError = function(err) {
  this.emit('error', err)
  this.cleanup(true)
}

Request.prototype.cleanup = function(fromError) {
  this.data = null
}

/**
 * Called upon load.
 *
 * @api private
 */

Request.prototype.onLoad = function() {
  this.onData(this.data)
}
