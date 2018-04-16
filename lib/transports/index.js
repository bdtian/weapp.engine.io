/**
 * Module dependencies
 */
// var XHR = require('./polling-xhr')
var XHR = require('./polling-xhr-weapp')
var websocket = require('./websocket-weapp')
/**
 * Export transports.
 */

exports.polling = polling
exports.websocket = websocket

/**
 * Polling transport polymorphic constructor.
 * Decides on xhr vs jsonp based on feature detection.
 *
 * @api private
 */

function polling(opts) {
  var xhr
  var xd = false
  var xs = false

  opts.xdomain = xd
  opts.xscheme = xs

  return new XHR(opts)
}
