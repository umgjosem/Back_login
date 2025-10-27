// tarifa.js
module.exports = (sequelize, Sequelize) => {
    const Tarifa = sequelize.define("tarifa", {
        id_tarifa: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        descripcion: {
            type: Sequelize.STRING,
            allowNull: false
        },
        monto_por_hora: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false
        },
        activo: {
            type: Sequelize.BOOLEAN,
            defaultValue: true
        }
    });

    Tarifa.associate = (models) => {
        Tarifa.hasMany(models.ticket, { foreignKey: 'id_tarifa', as: 'tickets' });
    };

    return Tarifa;
};
