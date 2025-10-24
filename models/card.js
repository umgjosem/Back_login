module.exports = (sequelize, DataTypes) => {
  const Card = sequelize.define('Card', {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    userId: { type: DataTypes.INTEGER, allowNull: true },
    token: { type: DataTypes.STRING, allowNull: false },
    last4: { type: DataTypes.STRING(4) },
    brand: { type: DataTypes.STRING },
    expMonth: { type: DataTypes.INTEGER },
    expYear: { type: DataTypes.INTEGER },
    isDefault: { type: DataTypes.BOOLEAN, defaultValue: false }
  }, { tableName: 'cards' });
  return Card;
};
