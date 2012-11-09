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

var apiKeys = ['test'];

app.use('/api', function(req, res, next){
  var key = req.query['api-key'];

  if (!key) return next(error(400, 'api key required'));
  var db   = req.app.get('dbHelper');

  db.ApiKey.find({ where: { key: key } }).success(function(apiKey) {
    if (apiKey == null) {
      next(error(401, 'invalid api key'));
    } else {
      req.key = key;
      next();
    }
  });
});

app.use('/api/my', function(req, res, next){
  var key = req.query['token'];

  if (!key) return next(error(400, 'token required'));
  var db = req.app.get('dbHelper');
  next();
  
  db.User.find({ where: { token: key } }).success(function(user) {
    if (user == null) {
      next(error(401, 'invalid token'));
    } else {
      req.user = user;
      next();
    }
});

app.use(function(err, req, res, next){
  res.send(err.status || 500, jsonxml({ error: err.message }));
});

app.use(app.router);

var users = require("../routes/users");

app.get('/api/auth', users.auth);
app.get('/api/my/stream', routes.index);
app.get('/api/my/gcm', users.gcm);


//app.post('/api/import', opml.index);
// our custom JSON 404 middleware. Since it's placed last
// it will be the last middleware called, if all others
// invoke next() and do not respond.
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