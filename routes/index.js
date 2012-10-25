var asyncxml  = require('asyncxml');
var streamify = require('dt-stream');

function FeedSyncResponseBuilder(req, res) {
  this.xml  = new asyncxml.Builder({pretty:true});
  this.db   = req.app.get('dbHelper');
  this.res  = res;
  this.req  = req;

  this.prepareResponse();
  this.buildXML();
}

FeedSyncResponseBuilder.prototype.prepareResponse = function() {
  this.xmlStream = streamify(this.xml).stream;
  this.xmlStream.pipe(this.res);
  this.res.write('<?xml version="1.0" encoding="UTF-8"?>\n');
}

FeedSyncResponseBuilder.prototype.buildXML = function() {
  this.root = this.xml.tag("feedo", { version:"0.1" });
  this.root.up().end();
}

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