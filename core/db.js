var Sequelize    = require("sequelize");
var logger       = require('./logger').logger(module);
function DatabaseHelper(config) {
  logger.info("Connecting to db: ",JSON.stringify(config));
  this.db = new Sequelize(config.name, config.user, config.password, {
    host: config.host,
    port: 3306,
    protocol: null,
    logging: logger.info,
    maxConcurrentQueries: 100,
    dialect: 'mysql',
    define: { timestamps: true },
    sync: { force: true },
    pool: { maxConnections: 5, maxIdleTime: 60}
  });

  logger.info("Appending schema");
  this.buildUser();
  this.buildImage();
  this.buildFeed();
  this.buildItem();
  this.buildApiKey();

  this.User.hasMany(this.Feed, { as: 'Subscriptions' });
  this.Feed.hasMany(this.User);
  
  this.Feed.hasMany(this.Item);
  this.Item.belongsTo(this.Feed);
  this.Item.hasMany(this.Image);
  this.Image.belongsTo(this.Item);

  this.User.hasMany(this.Token);
}

DatabaseHelper.prototype.userByToken = function(token, cb) {
  var _this = this;
  this.Token.find({where: { hash: token }}).complete(function(error, t) {
    if (error || t == null) {
      cb(error, null);
    } else {
      _this.User.find(t.UserId).complete(function(error, user) {
        cb(error, user, t);
      });
    }
  });
}

DatabaseHelper.prototype.buildUser = function() {
  this.User = this.db.define('User', {
    email:      { type: Sequelize.STRING, allowNull: false },
    googleId:   { type: Sequelize.STRING, allowNull: false }
  },{});
  
  this.Token = this.db.define('Token', {
    hash:      { type: Sequelize.STRING, allowNull: false },
    gcm_key:   { type: Sequelize.STRING }
  },{});
}

DatabaseHelper.prototype.buildApiKey = function() {
  this.ApiKey = this.db.define('ApiKey', {
    name:        { type: Sequelize.STRING, allowNull: false },
    key:         { type: Sequelize.STRING, allowNull: false },
  },{});
}

DatabaseHelper.prototype.buildImage = function() {
  this.Image = this.db.define('Image', {
    name:        { type: Sequelize.STRING, allowNull: false },
    description: { type: Sequelize.TEXT },
    url:         { type: Sequelize.STRING, allowNull: false },
    mimeType:    { type: Sequelize.STRING, allowNull: false },
    width:       { type: Sequelize.INTEGER, allowNull: false },
    height:      { type: Sequelize.INTEGER, allowNull: false }
  },{});
}

DatabaseHelper.prototype.buildFeed = function() {
  this.Feed = this.db.define('Feed', {
    url: { type: Sequelize.STRING, allowNull: false, unique: true  },
    title: { type: Sequelize.STRING },
    siteUrl: { type: Sequelize.STRING },
    nextPull: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    errorCount: { type: Sequelize.INTEGER, defaultValue: 0 },
    errorMessage: { type: Sequelize.TEXT },
    description: { type: Sequelize.TEXT },
    lastRefresh: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    feedType: { type: Sequelize.STRING },
    ready: { type: Sequelize.BOOLEAN, defaultValue: false },
    emptyFetchCount: { type: Sequelize.INTEGER, defaultValue: 0 }
  },{});
}

DatabaseHelper.prototype.buildItem = function() {
  this.Item = this.db.define('Item', {
    url: { type: Sequelize.STRING, allowNull: false  },
    title: { type: Sequelize.STRING, allowNull: false },
    pubDate: { type: Sequelize.DATE, defaultValue: Sequelize.NOW },
    body: { type: Sequelize.TEXT },
    hash: { type: Sequelize.STRING, allowNull: false }
  },{});

  this.Read = this.db.define('Read', {
    ItemId: { type: Sequelize.INTEGER, allowNull: false  },
    UserId: { type: Sequelize.INTEGER, allowNull: false  }
  },{});
}

DatabaseHelper.prototype.sync = function() {
  var chainer = new Sequelize.Utils.QueryChainer();
  chainer.add(this.User.sync());
  chainer.add(this.Feed.sync());
  chainer.add(this.Token.sync());
  chainer.add(this.Image.sync());
  chainer.add(this.Item.sync());
  chainer.add(this.Read.sync());
  chainer.add(this.ApiKey.sync());
  return chainer;
}


exports.DatabaseHelper = DatabaseHelper;