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
  console.log(result);
});