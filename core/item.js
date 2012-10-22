var readability = require('readability');
var request = require('request');

function Item(article) {
  //console.log(article);
  if (typeof(article.link) == 'string') {
    this.url = article.link;  
  } else {
    this.url = article.link.href;
  }
  
  this.body = null;
}

Item.prototype.onFinish = function() {

}

Item.prototype.download = function() {
  var _this = this;
  console.log("Downloading html for page: "+ this.url);
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