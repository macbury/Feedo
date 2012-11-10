function GoogleImporter(dbHelper, currentUser, subscriptions) {
  this.user          = currentUser;
  this.dbHelper      = dbHelper;
  this.subscriptions = subscriptions;
}

GoogleImporter.prototype.onFinish = function() {}

GoogleImporter.prototype.next = function() {
  var subscription = this.subscriptions.pop();

  if (subscription) {

  } else {
    this.onFinish();
  }
}

exports.klass = GoogleImporter;