var readability = require('./readability');
var request     = require('request');
var crypto      = require('crypto');
var fs          = require('fs');
var charset     = require('charset');
var Iconv       = require('iconv').Iconv;

var urlLink = 'http://www.spidersweb.pl/2012/06/jednak-tablety-od-microsoftu-surface-dwoch-wersjach-niezlymi-dodatkami.html';

request({ url: urlLink }, function (error, response, body) {

  readability.parse(body, urlLink, { debug: true }, function(result) {
    console.log(result.content);
    console.log(result.images);
  });
});
/*
var url     = 'http://m.natemat.pl/06be2f47a472d427d2b3cce3a0101a31,641,0,0,0.jpg';

var request = require("request");
var fs      = require("fs");
Constant = {
  
}


http://packagefinder1-enome.dotcloud.com/packages/show/charset
/*var url = 'http://mambiznes.pl/public/upload/922.jpg';



request({url: url, encoding: 'binary'}, function(error, response, content) {
  var type = response.headers["content-type"],
    prefix = "data:" + type + ";base64,";
  var base64 = new Buffer(content, 'binary').toString('base64'),
    data = prefix + base64;
    
  fs.writeFile('./test.html', '<img src="'+data+'" />', function(err) {
    if (err) throw err;
    console.log("finished!");
  });
});*/

//crypto.createHash('sha1').update(url).digest("hex")
/*
request('http://f.cl.ly/items/132a2c2m1T1M0e2b3U3i/skitched-20120623-190958.jpg', function(error, response, content){
  console.log(response);
}).pipe(fs.createWriteStream("./test.png"));*/