/**
 * Created by ciroreed on 3/30/16.
 */

var krasny = require("./src/krasny.js");

if (typeof module !== "undefined") module.exports = new krasny(require("ejs"));
else window.K = new krasny(ejs);
