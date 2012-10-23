var express = require('express')
  , routes = require('../routes')
  , user = require('../routes/user')
  , http = require('http')
  , path = require('path');

var app = express();
var logger       = require('./logger').logger(module);

app.configure(function(){
  app.set('port', process.env.PORT || 3000);
  app.use(express.favicon());
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
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

  // key isnt present
  if (!key) return next(error(400, 'api key required'));

  // key is invalid
  if (!~apiKeys.indexOf(key)) return next(error(401, 'invalid api key'));

  // all good, store req.key for route access
  req.key = key;
  next();
});

app.use(function(err, req, res, next){
  // whatever you want here, feel free to populate
  // properties on `err` to treat it differently in here.
  res.send(err.status || 500, { error: err.message });
});

app.use(app.router);

app.get('/api', routes.index);
app.get('/api/users', user.list);

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