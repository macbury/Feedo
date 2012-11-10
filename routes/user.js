var Constants       = require('../core/constants');
var jsonxml         = require('jsontoxml');
var logger          = require('../core/logger').logger(module);
var crypto          = require('crypto');
var request         = require("request");
var GOOGLE_AUTH_URL = 'http://www.google.com/reader/api/0/user-info';

function register(dbHelper, body, cb) {
  dbHelper.User.create({
    email:    body["userEmail"],
    googleId: body["userId"]
  }).complete(function(error, user){
    cb(user);
  });
}

exports.gcm = function(req, res) {
  
}

exports.auth = function(req, res){
  var authToken = req.param('token');
  var _this     = this;
  var dbHelper  = req.app.get('dbHelper');
  logger.info("Starting authorization with token: ", authToken);
  request({ 
    url:     GOOGLE_AUTH_URL, 
    timeout: Constants.ItemDownloadTimeout * 1000, 
    headers: {
      "Authorization": "GoogleLogin auth="+authToken
    } 
  }, function (error, response, body) {
    console.log(response.statusCode);
    if(error || response.statusCode != 200) {
      logger.debug("Starting authorization with token: ", error);
      res.send(401, jsonxml({ error: "invalid google token" }));
    } else {
      body = JSON.parse(body);
      logger.info("Google response: ", body);
      dbHelper.User.find({ where: { email: body["userEmail"] } }).complete(function(error, user){
        if (error) {
          throw(error);
        }
        
        var respondWithToken = function(user) {
          var date = new Date();
          var hash = crypto.createHash('sha1').update(user.email+date.toString()).digest("hex");
          dbHelper.Token.create({
            UserId: user.id,
            hash:   hash
          }).complete(function(error,token) {
            res.send(200, jsonxml({ token: token.hash, email: user.email }));
          });
        }
        
        if (user == null) {
          register(dbHelper, body, respondWithToken);
        } else {
          respondWithToken(user);
        }
      });
    }
  });

};