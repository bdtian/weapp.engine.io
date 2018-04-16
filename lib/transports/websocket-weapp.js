var Transport = require('../transport')
var parser = require('engine.io-parser')
var parseqs = require('parseqs')
var inherit = require('component-inherit')
var yeast = require('yeast')
var Buffer = require('buffer').Buffer
var debug = require('debug')('engine.io-client:websocket-weapp')

module.exports = WS

function WS(opts) {
  var forceBase64 = opts && opts.forceBase64
  if (forceBase64) {
    this.supportsBinary = false
  }
  this.perMessageDeflate = opts.perMessageDeflate
  this.protocols = opts.protocols

  debug('new WS: ', opts)
  Transport.call(this, opts)
}

/**
 * Inherits from Transport.
 */

inherit(WS, Transport)

/**
 * Transport name.
 *
 * @api public
 */

WS.prototype.name = 'websocket'

/*
 * WebSockets support binary
 */

WS.prototype.supportsBinary = true

/**
 * Opens socket.
 *
 * @api private
 */

WS.prototype.doOpen = function() {
  var uri = this.uri()
  var protocols = this.protocols
  var opts = {
    agent: this.agent,
    perMessageDeflate: this.perMessageDeflate,
  }

  if (this.extraHeaders) {
    opts.headers = this.extraHeaders
  }
  if (this.localAddress) {
    opts.localAddress = this.localAddress
  }

  const self = this
  const params = {
    url: uri,
    protocols,
    header: opts.headers,
    method: opts.method || 'GET',
    success: function(res) {
      debug('websocket-weapp connected success.', res)
      this.socketTaskId = res.socketTaskId
    },
    fail: function(err) {
      this.emit('error', err)
    },
  }
  debug('wx connect params: ', params)
  wx.connectSocket(params)

  this.addEventListeners()
}

/**
 * Adds event listeners to the socket
 *
 * @api private
 */

WS.prototype.addEventListeners = function() {
  var self = this

  wx.onSocketOpen(function() {
    debug('wx socket open')
    self.onOpen()
  })
  wx.onSocketClose(function() {
    self.onClose()
  })
  wx.onSocketMessage(function(ev) {
    debug('wx socket on message.')
    self.onData(ev.data)
  })
  wx.onSocketError(function(e) {
    debug('wx socket error: ', e)
    self.onError('websocket error', e)
  })
}

/**
 * Writes data to socket.
 *
 * @param {Array} array of packets.
 * @api private
 */

WS.prototype.write = function(packets) {
  debug('write: ', packets)

  var self = this
  this.writable = false

  var total = packets.length
  for (var i = 0, l = total; i < l; i++) {
    ;(function(packet) {
      parser.encodePacket(packet, self.supportsBinary, function(data) {
        debug('encoded data: ', data)
        wx.sendSocketMessage({
          data: data,
          success: function(res) {
            debug('write success: ', res)
          },
          fail: function(err) {
            debug('write fail: ', err)
          },
        })
        --total || done()
      })
    })(packets[i])
  }

  function done() {
    self.emit('flush')

    // fake drain
    // defer to next tick to allow Socket to clear writeBuffer
    setTimeout(function() {
      self.writable = true
      self.emit('drain')
    }, 0)
  }
}

/**
 * Called upon close
 *
 * @api private
 */

WS.prototype.onClose = function() {
  Transport.prototype.onClose.call(this)
}

/**
 * Closes socket.
 *
 * @api private
 */

WS.prototype.doClose = function() {
  if (typeof this.socketTaskId !== 'undefined') {
    wx.onSocketClose(function(res) {
      debug('websocket-weapp closed.', res)
    })
  }
}

/**
 * Generates uri for connection.
 *
 * @api private
 */

WS.prototype.uri = function() {
  var query = this.query || {}
  var schema = this.secure ? 'wss' : 'ws'
  var port = ''

  // avoid port if default for schema
  if (
    this.port &&
    (('wss' === schema && Number(this.port) !== 443) ||
      ('ws' === schema && Number(this.port) !== 80))
  ) {
    port = ':' + this.port
  }

  // append timestamp to URI
  if (this.timestampRequests) {
    query[this.timestampParam] = yeast()
  }

  // communicate binary support capabilities
  if (!this.supportsBinary) {
    query.b64 = 1
  }

  query = parseqs.encode(query)

  // prepend ? to query
  if (query.length) {
    query = '?' + query
  }

  var ipv6 = this.hostname.indexOf(':') !== -1
  return (
    schema +
    '://' +
    (ipv6 ? '[' + this.hostname + ']' : this.hostname) +
    port +
    this.path +
    query
  )
}
