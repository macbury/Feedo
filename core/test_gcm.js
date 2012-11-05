var gcm = require('node-gcm');

var message = new gcm.Message();
var sender = new gcm.Sender('AIzaSyDbWdSx2VqvBqml3o1pozujgV-feboBmOY');
var registrationIds = ["APA91bFcEilK6PjWMEAIHPiAsJ7_ekQR08rtV5ju1qWkLu4H6_H_so5DxNalxYy0TZFVimfTfnd7hobGb9HB6CEroYi9q2pU5moZLHmIufOF5szZdfRp3EEzt1RU0Ibp1s1mj3bGX2nOecGNkLkQ39uvOmPIULl_jQ"];

// Optional
message.addData('key1','message1');
message.addData('key2','message2');
message.collapseKey = 'demo';
//message.delayWhileIdle = true;

sender.send(message, registrationIds, 4, function (result) {
  //console.log(result);
});

var a = ["https://github.com/mikeal/request", "http://www.obserwatorfinansowy.pl/forma/debata/poprzez-celowa-inflacje-rzady-pozbywaja-sie-dlugu/", "http://antyweb.pl/instagram-prawie-jak-facebook-profile-i-zdjecia-w-wersji-webowej/"];

var request        = require('request');
request('http://graph.facebook.com?ids='+ a.join(","), {}, function (error, response, body) {
  var body = JSON.parse(body);
  console.log(body);
});