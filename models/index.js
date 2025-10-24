const dbConfig = require('../config/db.config.js');
const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(dbConfig.DB, dbConfig.USER, dbConfig.PASSWORD, {
  host: dbConfig.HOST,
  dialect: dbConfig.dialect,
  dialectOptions: dbConfig.dialectOptions,
  pool: dbConfig.pool,
  logging: false
});

const db = {};
db.Sequelize = Sequelize;
db.sequelize = sequelize;

db.User = require('./user')(sequelize, DataTypes);
db.Card = require('./card')(sequelize, DataTypes);
db.Payment = require('./payment')(sequelize, DataTypes);
db.Invoice = require('./invoice')(sequelize, DataTypes);

// Associations
db.User.hasMany(db.Card, { as: 'cards', foreignKey: 'userId' });
db.Card.belongsTo(db.User, { as: 'user', foreignKey: 'userId' });

db.User.hasMany(db.Payment, { as: 'payments', foreignKey: 'userId' });
db.Payment.belongsTo(db.User, { as: 'user', foreignKey: 'userId' });

db.Payment.hasOne(db.Invoice, { as: 'invoice', foreignKey: 'paymentId' });
db.Invoice.belongsTo(db.Payment, { as: 'payment', foreignKey: 'paymentId' });

module.exports = db;
