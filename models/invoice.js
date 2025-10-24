module.exports = (sequelize, DataTypes) => {
  const Invoice = sequelize.define('Invoice', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    paymentId: { type: DataTypes.INTEGER, allowNull: false },
    ticketIdOrigen: { type: DataTypes.STRING, allowNull: false },
    pdfPath: { type: DataTypes.STRING, allowNull: false },
    createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW }
  }, { tableName: 'invoices', updatedAt: false });
  return Invoice;
};
