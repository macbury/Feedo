var Constants                   = require('../core/constants');
var GoogleImporter              = require('../core/google_importer').klass;
var jsonxml                     = require('jsontoxml');
var logger                      = require('../core/logger').logger(module);
var crypto                      = require('crypto');
var request                     = require("request");
var GOOGLE_AUTH_URL             = 'http://www.google.com/reader/api/0/user-info';
var GOOGLE_SUBSCRIPTIONS_IMPORT = 'http://www.google.com/reader/api/0/subscription/list?output=json';

function register(dbHelper, body, cb) {
  dbHelper.User.create({
    email:    body["userEmail"],
    googleId: body["userId"]
  }).complete(function(error, user){
    cb(user);
  });
}

exports.import = function(req, res) {
  var dbHelper           = req.app.get('dbHelper');
  var registration_token = req.param('google_auth_token');
  logger.info("Downloading url: ", GOOGLE_SUBSCRIPTIONS_IMPORT);
  request({ 
    url:     GOOGLE_SUBSCRIPTIONS_IMPORT, 
    timeout: Constants.ItemDownloadTimeout * 1000, 
    headers: {
      "Authorization": "GoogleLogin auth="+registration_token
    } 
  }, function (error, response, body) {
    logger.debug("Recived data from google");
    if(error || response.statusCode != 200) {
      logger.debug("Starting authorization with token: ", error);
      res.send(401, jsonxml({ error: "invalid google token" }));
    } else {
      body = JSON.parse(body);
      var feed_urls = [];
      for (var i = body.subscriptions.length - 1; i >= 0; i--) {
        var subscription = body.subscriptions[i];
        var url          = subscription.id.replace(/^feed\//i,'');
        logger.info("Found url: ", url);
        feed_urls.push(url);
      }
      
      var gi = new GoogleImporter(dbHelper, res.locals.user, feed_urls);
      gi.onFinish = function() { res.send(200, jsonxml({ status: "ok" })); };
      gi.run();
    }
  });
}


exports.gcm = function(req, res) {
  var registration_token = req.param('registration_token');
  res.locals.token.gcm_key = registration_token;
  res.locals.token.save().complete(function(error, token){
    res.send(201, jsonxml({ session_token: token.hash, registration_token: registration_token }));
  });
}

exports.auth = function(req, res){
  var authToken = req.param('google_auth_token');
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
            res.send(201, jsonxml({ token: token.hash, email: user.email }));
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