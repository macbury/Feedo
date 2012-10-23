
/*
 * GET home page.
 */
var readability = require('readability');
var request = require('request');


exports.index = function(req, res){
  var url = 'http://endokrynolog.waw.pl/2012/10/21/namawiam-do-ograniczenia-spozycia-cukry-fruktozy/';
  request(url, function (error, response, body) {
    if (!error && response.statusCode == 200) {
      readability.parse(body, url, function(result) {
        res.send(result.content);
      });
    } else {
      res.status(response.statusCode).render('index', { message: error, title: "test" });
    }
  });
  
};