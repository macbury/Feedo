var asyncxml  = require('asyncxml');
var streamify = require('dt-stream');

exports.index = function(req, res){
  res.contentType("text/xml");
  var xml = new asyncxml.Builder({pretty:false})
  streamify(xml).stream.pipe(res);
  var date = new Date();
  var db = req.app.get('dbHelper');

  db.Feed.findAll().success(function(feeds) {
    console.log(feeds);
  });

  xml.tag("xml", {version:"1.0"})
    .tag("channels")
      .tag("channel")
        .tag("title", "My blog posts").up()
        .tag("link", "http://blog.local").up()
        .tag("lastRefresh", date.toString()).up()
      .up()
    .up()
  .up();


  xml.end();
};