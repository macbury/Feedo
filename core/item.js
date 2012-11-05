var readability = require('./readability');
var logger      = require('./logger').logger(module);
var Constants   = require("./constants");
var request     = require('request');
var path        = require('path');
var fs          = require("fs");
var charset     = require('charset');
var Iconv       = require('iconv').Iconv;
var HTML5       = require('html5');
var jsdom       = require('jsdom');
var URL         = require('url');
var crypto      = require('crypto');

function Item(url, rss) {
  //console.log(article);
  this.url = url;
  this.rss = rss;
  this.images_fetched = [];
  this.body = null;
}

Item.prototype.processRssDescription = function() {
  logger.info("Item: "+ this.url + " description from readability is shitty, transforming rss description");

  if (this.rss.description == null) {
    this.hash = crypto.createHash('sha1').update(this.url).digest("hex");
    logger.info("Item: "+ this.url + " description of rss is more shitty than website :/");
    this.onFinish(false);
    return;
  };

  var browser = jsdom.browserAugmentation(jsdom.defaultLevel, {
    url: this.rss.link,
    features : {
      FetchExternalResources   : [],
      ProcessExternalResources : false
    }
  });
  var doc     = new browser.HTMLDocument();
  var parser  = new HTML5.Parser({document: doc});
  var baseURL = URL.parse(this.url);
  baseURL     = baseURL.protocol + baseURL.host;
  parser.parse(this.rss.description.replace('<![CDATA[', '').replace(']]>',''));

  var win = doc.parentWindow;
  win = win || doc.createWindow();

  var images = mapImages(baseURL, doc.getElementsByTagName('img'));
  this.body  = doc.body.innerHTML.toString('utf8');

  this.hash = crypto.createHash('sha1').update(this.body).digest("hex");
  this.downloadImages(images);
}

Item.prototype.onFinish = function() {

}

Item.prototype.analyzeRedabilityResult = function(result) {
  if (this.rss.description == null || result.content.toString().length >= this.rss.description.toString().length) {
    this.hash = crypto.createHash('sha1').update(result.content).digest("hex");
    var _this = this;
    this.dbHelper.Item.count({ where: { hash: this.hash } }).complete(function(error, count) {
      if (count == 0) {
        _this.body = result.content;
        _this.downloadImages(result.images);
      } else {
        logger.info("Found similary item in db for item description, using rss description");
        _this.processRssDescription();
      }
    });
    
  } else {
    this.processRssDescription();
  }
} 

Item.prototype.download = function() {
  var _this = this;
  logger.info("Downloading html for page: "+ this.url);
  request({ url: _this.url, timeout: Constants.ItemDownloadTimeout * 1000, encoding: 'binary' }, function (error, response, body) {
    if (!error && response.statusCode == 200 && response.headers["content-type"] == "text/html") {

      var encoding = charset(response.headers, body);
      var bufferHtml = new Buffer(body, 'binary');

      if (encoding && !encoding.match(/utf/)) {
        logger.info("encoding is not utf-8, but it is:" + encoding);

        var iconv = new Iconv(encoding, 'utf-8');
        body      = iconv.convert(bufferHtml);
      } else {
        body = bufferHtml;
      }

      readability.parse(body.toString('utf-8'), _this.url, function(result) {
        _this.analyzeRedabilityResult(result);
      });
    } else {
      _this.processRssDescription();
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
      if (response != null && response.statusCode == 200) {
        var contentType = response.headers["content-type"];
        var extName     = contentType.split('/')[1];
        var buffer      = null;
        try {
          buffer = new Buffer(content, 'binary');
        } catch (error) {
          logger.error("could not download image: ", error);
          _this.downloadNextImage();
          return;
        }
        logger.info("Saving file in: "+ fileName);
        fs.writeFile(fileName, buffer.toString('base64'), function(err) {
          if (err) {
            logger.error("Could not download: ", { error: err, image: image });
          } else {
            image["mimeType"] = contentType;
            _this.images_fetched.push(image);
          }
          _this.downloadNextImage(); //todo implement process.nextTick for this
        });
      } else {
        logger.error("invalid response: " + JSON.stringify(response), image);
        _this.downloadNextImage();
      }
    });
  }
}

function mapImages(baseURL, images) {
  var images_url = [];
  for(var i = 0; i < images.length; i++) {
    var image = images[i];
    var src   = image.src;
    if (src) {
      var fullURL = URL.resolve(baseURL, src);
      var hash    = crypto.createHash('sha1').update(fullURL).digest("hex");
      var extName = path.extname(fullURL).split("?")[0];
      images_url.push({ url: fullURL, hash: hash, description: image.alt, ext: extName });
      image.src = hash + extName;
    }
    
  }

  return images_url;
}

exports.mapImages = mapImages;

exports.Item = Item;