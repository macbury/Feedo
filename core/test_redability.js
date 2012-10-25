var readability = require('./readability');
var request     = require('request');
var crypto      = require('crypto');
var fs          = require('fs');
var charset     = require('charset');
var Iconv       = require('iconv').Iconv;

var urlLink = 'http://film.wp.pl/idGallery,10761,idPhoto,330074,galeria.html?ticaid=1f689&_ticrsn=3';

request({ url: urlLink, encoding: 'binary' }, function (error, response, body) {
  var encoding = charset(response.headers, body);
  
  var bufferHtml = new Buffer(body, 'binary');

  var html = body.toString();
  if (encoding != 'utf-8') {
    console.log("encoding is not utf-8, but it is:" + encoding);
    var iconv = new Iconv(encoding, 'utf-8');
    body      = iconv.convert(bufferHtml);

  }

  readability.parse(body.toString(), urlLink, { debug: false }, function(result) {
    console.log(result.content);
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