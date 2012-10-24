var readability = require('./readability');
var request     = require('request');
var crypto      = require('crypto');

var url ='http://natemat.pl/36583,konferencja-apple-jest-najnowszy-ipad-mini-i-zapowiadany-ipad-4';
request(url, function (error, response, body) {
  readability.parse(body, url, { debug: true }, function(result) {
    console.log(result.content);
    console.log(result.images);
  });
});
/*
var url     = 'http://m.natemat.pl/06be2f47a472d427d2b3cce3a0101a31,641,0,0,0.jpg';

var request = require("request");
var fs      = require("fs");
Constant = {
  ImageMimeTypes: ["image/png", "image/jpg", "image/jpeg", "image/gif"],
}
request(url, function(error, response, content) {
  var contentType = response.headers["content-type"];
  var extName     = contentType.split('/')[1];
  if (Constant.ImageMimeTypes.indexOf(contentType) > 0) {
    var buffer = new Buffer(content);
    var base64 = buffer.toString('base64');
    var shasum = crypto.createHash('sha1');
    
    fs.writeFile(shasum.update(url).digest("hex")+'.base64', base64, function(err) {
      if (err) throw err;
      console.log("finished!");
    });
  } else {
    console.log("invalid mime type:", contentType);
  }
});
*/