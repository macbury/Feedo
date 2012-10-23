var readability = require('./readability');
var request     = require('request');
var url ='http://natemat.pl/36583,konferencja-apple-jest-najnowszy-ipad-mini-i-zapowiadany-ipad-4';
request(url, function (error, response, body) {
  readability.parse(body, url, function(result) {
    console.log(result.images);
  });
});