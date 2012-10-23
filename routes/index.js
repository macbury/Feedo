var builder = require('xmlbuilder');

exports.index = function(req, res){
  var xml = builder.create('root')
  .ele('xmlbuilder', {'for': 'node-js'})
    .ele('repo', {'type': 'git'}, 'git://github.com/oozcitak/xmlbuilder-js.git')
  .end({ pretty: true});
  res.contentType("text/xml");
  res.send(xml);  
};