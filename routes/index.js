var asyncxml  = require('asyncxml');
var streamify = require('dt-stream');

exports.index = function(req, res){
  res.contentType("text/xml");
  var xml = new asyncxml.Builder({pretty:true})
  streamify(xml).stream.pipe(res);

  xml.tag("xml", {version:"1.0"})
        .tag("list")
            .tag("entry", function () {
                this.attr('id', 1)
            }).up()
            .tag("entry", {id:2}, "foo").up()
        .up()
    .up()
.end();
};