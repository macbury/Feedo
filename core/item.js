var readability = require('readability');
var request = require('request');

function Item(url) {
  console.log(url);
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      readability.parse(body, url, function(result) {
        console.log(result.title);
      });
    }
  });
}

exports.Item = Item;