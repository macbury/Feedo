var util = require('util'),
      fs = require('fs');
var path = require('path');

function padZero(number) {
  var n = String(number);
  if (number < 10) {
    return '0' + n;
  } else {
    return n;
  }
}

function pad2Zeros(number) {
  var n = String(number);
  if (number < 10) {
    return '00' + n;
  } else if (number < 100) {
    return '0' + n;
  } else {
    return n;
  }
}

function getDate() {
  var now = new Date();
  return now.getFullYear() + '-' + padZero(now.getMonth() + 1) + '-' + padZero(now.getDate()) + ' ' +
    padZero(now.getHours()) + ':' + padZero(now.getMinutes()) + ':' + padZero(now.getSeconds()) + '.' + pad2Zeros(now.getMilliseconds());
}

function getLine() {
  var e = new Error();
  // now magic will happen: get line number from callstack
  var line = e.stack.split('\n')[3].split(':')[1];
  return line;
}

function getClass(module) {
  if (module) {
    if (module.id) {
      if (module.id == '.') {
        return 'main';
      } else {
        return module.id;
      }
    } else {
      return module;
    }
  } else {
    return '<unknown>';
  }
}

function getMessage(items) {
  var msg = [], i;
  for (i = 0; i < items.length; i++) {
    if (typeof items[i] == 'string') {
      msg.push(items[i]);
    } else {
      msg.push(util.inspect(items[i], false, 10));
    }
  }
  return msg.join('');
}

var config = {};

var defaultLogLevel = 'trace';
var logLevels       = config.level || {};
var useColor        = config.color || (config.color == 'auto' && process.env.TERM && process.env.TERM.indexOf('color') >= 0);
var logFile         = fs.createWriteStream(__dirname+'/../log/shit.log', {'flags': 'a'});

exports.logger = function(module) {
  var methods = {
    'trace': { 'color': 32, 'priority': 1 },
    'debug': { 'color': 34, 'priority': 2 },
    'info':  { 'color': 0, 'priority': 3 },
    'warn':  { 'color': 35, 'priority': 4 },
    'error': { 'color': 31, 'priority': 5 }
  };

  var logLevel = logLevels[getClass(module)] || defaultLogLevel;
  var priority = methods[logLevel].priority;

  var logger = {};

  var defineMethod = function(level) {
    var levelStr = level.toUpperCase();
    if (levelStr.length == 4) levelStr += ' ';
    logger[level] = function(msg) {
      if (methods[level].priority >= priority) {
        logFile.write('\x1B[' + methods[level].color + 'm' + 'pid: ' + process.pid +' '+ getDate() + ' ' + levelStr + ' ' + path.basename(getClass(module)) +':' + getLine() + ' - ' + getMessage(arguments) + '\x1B[0m\n');
      }
    };
  }

  for (var level in methods) {
    defineMethod(level);
  }

  return logger;
}