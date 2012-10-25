var asyncxml  = require('asyncxml');
var streamify = require('dt-stream');
var fs        = require('fs');
var logger    = require('../core/logger').logger(module);
var path      = require('path');
function FeedSyncResponseBuilder(req, res) {
  this.xml  = new asyncxml.Builder({pretty:true});
  this.db   = req.app.get('dbHelper');
  this.res  = res;
  this.req  = req;

  this.prepareResponse();
  this.root = this.xml.tag("feeds", { version:"0.1" });
  this.buildChannelsXML();
}

FeedSyncResponseBuilder.prototype.prepareResponse = function() {
  this.xmlStream = streamify(this.xml).stream;
  this.xmlStream.pipe(this.res);
  this.res.write('<?xml version="1.0" encoding="UTF-8"?>\n');
}

FeedSyncResponseBuilder.prototype.buildChannelsXML = function() {
  var _this = this;
  this.db.Feed.findAll().success(function(channels) {
    logger.info("Fetched feeds count: ", channels.length);
    _this.channels = channels;
    _this.channels_tag = _this.root.tag("channels");
    _this.addNextChannel();
  });
}

FeedSyncResponseBuilder.prototype.addNextChannel = function() {
  var channel = this.channels.shift();
  if (channel) {
    var channel_tag = this.channels_tag.tag("channel");
      channel_tag.tag("uid").text(channel.id).up();
      channel_tag.tag("title").text(channel.title.toString(), { escape: true }).up();
      channel_tag.tag("url").text(channel.url.toString(), { escape: true }).up();
    channel_tag.up();
    this.addNextChannel();
  } else {
    this.channels_tag.up();
    this.buildItemsXML();
  }
}

FeedSyncResponseBuilder.prototype.buildItemsXML = function() {
  var _this = this;
  this.db.Item.findAll().success(function(items) {
    logger.info("Fetched items count: ", items.length);
    _this.items     = items;
    _this.items_tag = _this.root.tag("items");
    _this.addNextItem();
  });
}

FeedSyncResponseBuilder.prototype.addNextItem = function() {
  var item = this.items.pop();
  if (item) {
    var item_tag = this.items_tag.tag("item");
      item_tag.tag("uid", item.id).up();
      item_tag.tag("title").text(item.title, { escape: true }).up();
      item_tag.tag("url").text(item.url, { escape: true }).up();
      //channel.tag("pubDate").text(feed.pubDate.toString(), { escape: true }).up();
      item_tag.tag("content").raw('<![CDATA['+item.body+']]>').up();
    item_tag.up();
    this.addNextItem();
  } else {
    this.items_tag.up();
    this.buildImagesXML();
  }
}

FeedSyncResponseBuilder.prototype.buildImagesXML = function() {
  var _this = this;
  this.db.Image.findAll().success(function(images) {
    logger.info("Fetched images count: ", images.length);
    _this.images = images;
    _this.images_tag = _this.root.tag("images");
    _this.addNextImage();
  });
}

FeedSyncResponseBuilder.prototype.addNextImage = function() {
  var image = this.images.pop();
  var _this = this;
  if (image) {
    var filename = path.join(__dirname, '../data/'+image.name);
    logger.info("Loading file: "+ filename);

    fs.readFile( filename, function (err, data) {
      if (err) {
        logger.error("Could not load file", err); 
      }

      var image_tag = _this.images_tag.tag("image");
        image_tag.tag("name").text(image.name).up();
        image_tag.tag("url").raw('<![CDATA['+image.url+']]>').up();
        image_tag.tag("description").text(image.description).up();
        image_tag.tag("data").raw('<![CDATA['+data+']]>').up();
      image_tag.up();

      _this.addNextImage();
    });

  } else {
    this.images_tag.up();
    this.root.up().end();
  }
}

//
/*

  db.Item.findAll().success(function(feeds) {
    var channels = root.tag("articles");

    for (var i = 0; i < feeds.length; i++) {
      var feed = feeds[i];
      var channel = channels.tag("article");
        channel.tag("uid", feed.id).up();
        channel.tag("title").text(feed.title, { escape: true }).up();
        channel.tag("url").text(feed.url, { escape: true }).up();
        //channel.tag("pubDate").text(feed.pubDate.toString(), { escape: true }).up();
        channel.tag("content").raw('<![CDATA['+feed.body+']]>').up();
      channel.up();
    };

    channels.up();

    var images_tag = root.tag("images");
    db.Image.findAll().complete(function(error, images) {

      for (var i = 0; i < images.length; i++) {
        var image = images[i];
        var image_tag = channels.tag("image");
          image_tag.tag("name").text(image.name).up();
          image_tag.tag("url").raw('<![CDATA['+image.url+']]>').up();
          image_tag.tag("description").text(image.description).up();
          image_tag.tag("data").raw('<![CDATA[test]]>').up();
        image_tag.up();
      };

      images_tag.up();
      root.up().end();
    });
    
  }).error(function(){
    root.up().end();
  });
*/

exports.index = function(req, res){ new FeedSyncResponseBuilder(req, res); }