var asyncxml  = require('asyncxml');
var streamify = require('dt-stream');
var fs        = require('fs');
var logger    = require('../core/logger').logger(module);
var path      = require('path');

function FeedSyncResponseBuilder(req, res) {
  this.xml          = new asyncxml.Builder({pretty:false});
  this.db           = req.app.get('dbHelper');
  this.res          = res;
  this.req          = req;

  this.currentUser  = res.locals.user;
  this.channels_ids = [];
  this.items_ids    = [];
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
  this.currentUser.getSubscriptions().success(function(channels) {
    logger.info("Fetched feeds count: ", channels.length);
    _this.channels = channels;
    _this.channels_tag = _this.root.tag("channels");
    _this.addNextChannel();
  });
}

FeedSyncResponseBuilder.prototype.addNextChannel = function() {
  var channel = this.channels.shift();
  if (channel) {
    this.channels_ids.push(channel.id);
    var channel_tag = this.channels_tag.tag("channel");
      channel_tag.tag("uid").text(channel.id.toString()).up();
      channel_tag.tag("title").text(channel.title.toString(), { escape: true }).up();
      channel_tag.tag("url").text(channel.url.toString(), { escape: true }).up();
    channel_tag.up();

    var _this = this;
    process.nextTick(function() {
      _this.addNextChannel();
    });
    
  } else {
    this.channels_tag.up();
    this.buildItemsXML();
  }
}

FeedSyncResponseBuilder.prototype.buildItemsXML = function() {
  var _this = this;
  this.db.Item.findAll({ order: "createdAt DESC", where: { id: this.channels_ids } }).success(function(items) {
    logger.info("Fetched items count: ", items.length);
    _this.items     = items;
    _this.items_tag = _this.root.tag("items");
    _this.addNextItem();
  });
}

FeedSyncResponseBuilder.prototype.addNextItem = function() {
  var item = this.items.pop();
  if (item) {
    var item_tag = this.items_tag.tag("item", { uid: item.id.toString() });
      this.items_ids.push(item.id);
      item_tag.tag("feed-uid", item.FeedId.toString()).up();
      item_tag.tag("title").text(item.title, { escape: true }).up();
      item_tag.tag("url").text(item.url, { escape: true }).up();
      channel.tag("pubDate").text(feed.createdAt.toString(), { escape: true }).up();
      item_tag.tag("content").raw('<![CDATA['+item.body+']]>').up();
    item_tag.up();

    var _this = this;
    process.nextTick(function() {
      _this.addNextItem();
    });
  } else {
    this.items_tag.up();
    this.buildImagesXML();
  }
}

FeedSyncResponseBuilder.prototype.buildImagesXML = function() {
  var _this = this;
  this.db.Image.findAll({ where: { ItemId: this.items_ids } }).success(function(images) {
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

      var image_tag = _this.images_tag.tag("image", { uid: image.ItemId.toString() });
        image_tag.tag("name").text(image.name).up();
        image_tag.tag("width").raw(image.width.toString()).up();
        image_tag.tag("height").raw(image.height.toString()).up();
        image_tag.tag("url").raw('<![CDATA['+image.url+']]>').up();
        image_tag.tag("description").text(image.description).up();
        image_tag.tag("data", { as: "base64", mimeType: image.mimeType.toString() }).raw('<![CDATA['+data+']]>').up();
      image_tag.up();

      process.nextTick(function() {
        _this.addNextImage();
      });
    });

  } else {
    this.images_tag.up();
    this.root.up().end();
  }
}

exports.index = function(req, res){ new FeedSyncResponseBuilder(req, res); }
