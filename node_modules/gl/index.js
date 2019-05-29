if (typeof WebGLRenderingContext !== 'undefined') {
  module.exports = require('./browser_index')
} else {
  module.exports = require('./node_index')
}
