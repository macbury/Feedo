var asyncxml  = require('asyncxml');
var streamify = require('dt-stream');
/*
exports.index = function(req, res){
  res.contentType("text/xml");
  var xml = new asyncxml.Builder({pretty:true})
  streamify(xml).stream.pipe(res);
  var date = new Date();
  var db = req.app.get('dbHelper');
  var root = xml.tag("xml", {version:"1.0"});

  db.Feed.findAll({ where: { errorCount: 0 } }).success(function(feeds) {
    var channels = root.tag("channels");

    for (var i = 0; i < feeds.length; i++) {
      var feed = feeds[i];
      var channel = channels.tag("channel");
        channel.tag("title", feed.title).up();
        channel.tag("url", feed.url).up();
        channel.tag("lastRefresh", feed.lastRefresh.toString()).up();
      channel.up();
    };

    channels.up();
    root.up().end();
  }).error(function(){
    root.up().end();
  });

  /*
    .tag("channels")
      .tag("channel")
        .tag("title", "My blog posts").up()
        .tag("link", "http://blog.local").up()
        .tag("lastRefresh", date.toString()).up()
      .up()
    .up()
  .up();


  
};*/

exports.index = function(req, res){
  var xml = new asyncxml.Builder({pretty:true})
  var date = new Date();
  var db = req.app.get('dbHelper');

  res.contentType("text/xml");
  var xmlStream = streamify(xml).stream;
  res.write('<?xml version="1.0" encoding="UTF-8"?>\n');
  xmlStream.pipe(res);
  var root = xml.tag("api", {version:"1.0"});

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
    root.up().end();
  }).error(function(){
    root.up().end();
  });
}