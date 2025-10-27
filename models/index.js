const dbConfig = require('../config/db.config.js');
const { Sequelize, DataTypes } = require('sequelize');

// ===============================
// Inicialización de Sequelize
// ===============================
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

// ===============================
// Modelos actuales (Auth / Pagos)
// ===============================
db.User = require('./user')(sequelize, DataTypes);
db.Card = require('./card')(sequelize, DataTypes);
db.Payment = require('./payment')(sequelize, DataTypes);
db.Invoice = require('./invoice')(sequelize, DataTypes);

// ===============================
// Nuevos modelos (Parqueo)
// ===============================
db.Cliente = require('./cliente.model')(sequelize, Sequelize);
db.Ticket = require('./ticket.model')(sequelize, Sequelize);
db.Espacio = require('./espacio.model')(sequelize, Sequelize);
db.Tarifa = require('./tarifa.model')(sequelize, Sequelize);

// ===============================
// Associations: Auth / Pagos
// ===============================
db.User.hasMany(db.Card, { as: 'cards', foreignKey: 'userId' });
db.Card.belongsTo(db.User, { as: 'user', foreignKey: 'userId' });

db.User.hasMany(db.Payment, { as: 'payments', foreignKey: 'userId' });
db.Payment.belongsTo(db.User, { as: 'user', foreignKey: 'userId' });

db.Payment.hasOne(db.Invoice, { as: 'invoice', foreignKey: 'paymentId' });
db.Invoice.belongsTo(db.Payment, { as: 'payment', foreignKey: 'paymentId' });

// ===============================
// Associations: Parqueo
// ===============================
// Cliente -> Ticket (1:N)
db.Cliente.hasMany(db.Ticket, { foreignKey: "id_cliente", as: "tickets" });
db.Ticket.belongsTo(db.Cliente, { foreignKey: "id_cliente", as: "cliente" });

// Espacio -> Ticket (1:N)
db.Espacio.hasMany(db.Ticket, { foreignKey: "id_espacio", as: "tickets" });
db.Ticket.belongsTo(db.Espacio, { foreignKey: "id_espacio", as: "espacio" });

// Tarifa -> Ticket (1:N)
db.Tarifa.hasMany(db.Ticket, { foreignKey: "id_tarifa", as: "tickets" });
db.Ticket.belongsTo(db.Tarifa, { foreignKey: "id_tarifa", as: "tarifa" });

// ===============================
// Export
// ===============================
module.exports = db;
