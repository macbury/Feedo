var express = require('express')
  , routes  = require('../routes')
  , opml    = require('../routes/opml')
  , http    = require('http')
  , path    = require('path');
var logger  = require('./logger').logger(module);
var gzippo  = require('gzippo');
var jsonxml = require('jsontoxml');
var app     = express();

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(gzippo.compress());
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

function error(status, msg) {
  var err = new Error(msg);
  err.status = status;
  return err;
}

var apiKeyRequired = function(req, res, next){
  var key = req.param('api-key');
  logger.info("Validating api key:", key);
  if (!key) return res.send(400, jsonxml({ error: 'api key is empty' }));
  var db   = req.app.get('dbHelper');

  db.ApiKey.find({ where: { key: key } }).success(function(apiKey) {
    if (apiKey == null) {
      res.send(401, jsonxml({ error: 'invalid api key' }));
    } else {
      res.locals.key = apiKey;
      next();
    }
  });
}

var userRequired = function(req, res, next){
  var key = req.param('token');
  logger.info("Validating token:", key);
  if (!key) return res.send(400, jsonxml({ error: 'token is required' }));
  
  req.app.get('dbHelper').userByToken(key, function(error, user, token) {
    if (user == null) {
      res.send(401, jsonxml({ error: 'token is invalid' }));
    } else {
      res.locals.token  = token;
      res.locals.user   = user;
      console.log("User validation");
      console.log(user);
      next();
    }
  });
}

app.use(function(err, req, res, next){
  res.send(err.status || 500, jsonxml({ error: err.message }));
});

app.use(app.router);

var users = require("../routes/user");

app.post('/api/auth', apiKeyRequired, users.auth);
app.post('/api/my/gcm', [apiKeyRequired, userRequired], users.gcm);
app.post('/api/my/import', [apiKeyRequired, userRequired], users.import);
app.get('/api/my/stream', [apiKeyRequired, userRequired], routes.index);


app.use(function(req, res){
  res.send(404, { error: "Lame, can't find that" });
});


exports.startHttpServer = function(config, dbHelper) {
  app.configure(function(){
    app.set('config', config);
    app.set('dbHelper', dbHelper);
  });

  http.createServer(app).listen(app.get('port'), function(){
    logger.info("Express server listening on port " + app.get('port'));
  });
}
