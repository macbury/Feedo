var readability = require('./readability');
var request     = require('request');
var logger      = require('./logger').logger(module);
var path        = require('path');
var Constants   = require("./constants");
var fs          = require("fs");
var charset     = require('charset');
var Iconv       = require('iconv').Iconv;

function Item(url) {
  //console.log(article);
  this.url = url;
  this.images_fetched = [];
  this.body = null;
}

Item.prototype.onFinish = function() {

}

Item.prototype.download = function() {
  var _this = this;
  logger.info("Downloading html for page: "+ this.url);
  request({ url: _this.url, timeout: Constants.ItemDownloadTimeout * 1000, encoding: 'binary' }, function (error, response, body) {
    if (!error && response.statusCode == 200) {

      var encoding = charset(response.headers, body);
      var bufferHtml = new Buffer(body, 'binary');

      if (encoding != 'utf-8') {
        logger.info("encoding is not utf-8, but it is:" + encoding);

        var iconv = new Iconv(encoding, 'utf-8');
        body      = iconv.convert(bufferHtml);
      }

      readability.parse(body.toString(), _this.url, function(result) {
        _this.body = result.content;
        _this.downloadImages(result.images);
      });
    } else {
      _this.onFinish(false);
    }
  });
}

// { url: fullURL, hash: hash, description: image.alt, ext: extName }
Item.prototype.downloadImages = function(images) {
  this.images_to_download = images;
  this.images_fetched = [];
  this.downloadNextImage();
}

Item.prototype.downloadNextImage = function() {
  var image = this.images_to_download.shift();
  var _this = this;
  if (image == null) {
    this.onFinish();
  } else {
    logger.info("Downloading image: ", image);
    var fileName = path.join(__dirname, '../data', image.hash+image.ext);

    request({url: image.url, encoding: 'binary', timeout: Constants.ImageDownloadTimeout * 1000 }, function(error, response, content) {
      if (response != null && Constants.ImageMimeTypes.indexOf(response.headers["content-type"]) > -1) {
        var contentType = response.headers["content-type"];
        var extName     = contentType.split('/')[1];
        var buffer      = new Buffer(content, 'binary');
       
        logger.info("Saving file in: "+ fileName);
        fs.writeFile(fileName, buffer.toString('base64'), function(err) {
          if (err) {
            logger.error("Could not download: ", { error: err, image: image });
          } else {
            image["mimeType"] = contentType;
            _this.images_fetched.push(image);
          }
          _this.downloadNextImage();
        });
      } else {
        logger.error("invalid mime type: " + contentType, image);
        _this.downloadNextImage();
      }
    });
  }
}

exports.Item = Item;