// espacio.js
module.exports = (sequelize, Sequelize) => {
    const Espacio = sequelize.define("espacio", {
        id_espacio: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        numero: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true
        },
        estado: {
            type: Sequelize.ENUM('Libre', 'Ocupado', 'Reservado'),
            allowNull: false,
            defaultValue: 'Libre'
        }
    });

    Espacio.associate = (models) => {
        Espacio.hasMany(models.ticket, { foreignKey: 'id_espacio', as: 'tickets' });
    };

    return Espacio;
};
