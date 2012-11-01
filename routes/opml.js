var OpmlParser = require('opmlparser');
var Sequelize  = require('sequelize');
var logger     = require('../core/logger').logger(module);
var fs         = require("fs");

exports.index = function(req, res){ 
  var parser = new OpmlParser();
  logger.info(JSON.stringify(req.files));
  if (req.files.file != null) {
    var chainer = new Sequelize.Utils.QueryChainer();
    var db      = req.app.get('dbHelper');

    parser.on('feed', function(feed){
      logger.info('Got feed: ', feed.xmlUrl);
      db.Feed.create({ url: feed.xmlUrl, title: " " });
    });

    parser.on('end', function(){
      chainer.run().complete(function(){
        res.send("done");  
      });
    });

    fs.createReadStream(req.files.file.path).pipe(parser.stream);
    
  } else {
    res.send("No file here");
  }
}