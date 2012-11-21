var request = require('request');
var jsonxml = require('jsontoxml');
var Constants = require('../core/constants');
exports.scan = function(req, res) {
  var url = req.param('url');
  if (url && url.match(/(http|https):\/\//i)) {
    request({ url: url, timeout: Constants.FeedScrapingTimeout * 1000 }, function (error, response, body) {
      if (error) {
        res.send(401, jsonxml({ error: "could not download url", url: url }));
      } else {
        res.send(200, jsonxml({ error: "Found", url: url }));
      }
    });
  } else {
    res.send(401, jsonxml({ error: "invalid url!" }));
  }
}