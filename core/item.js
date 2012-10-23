var readability = require('readability');
var request     = require('request');
var logger      = require('./logger').logger(module);
function Item(url) {
  //console.log(article);
  this.url = url;
  
  this.body = null;
}

Item.prototype.onFinish = function() {

}

Item.prototype.download = function() {
  var _this = this;
  logger.info("Downloading html for page: "+ this.url);
  request(_this.url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      readability.parse(body, _this.url, function(result) {
        _this.body = result.content;
        _this.onFinish();
      });
    } else {
      _this.onFinish();
    }
  });
}

exports.Item = Item;