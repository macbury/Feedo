var asyncxml = require('asyncxml')

exports.index = function(req, res){
  var xml = new asyncxml.Builder({pretty:true})

  xml.on('raw', function (chunk) {
    console.log("Data");
    console.log(chunk);
  })

  xml.tag("xml", {version:"1.0"})
        .tag("list")
            .tag("entry", function () {
                this.attr('id', 1)
            }).up()
            .tag("entry", {id:2}, "foo").up()
        .up()
    .up()
.end();
    
  
  //res.contentType("text/xml");
  res.send('ok');  
};