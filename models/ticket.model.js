// ticket.js
module.exports = (sequelize, Sequelize) => {
    const Ticket = sequelize.define("ticket", {
        id_ticket: {
            type: Sequelize.INTEGER,
            primaryKey: true,
            autoIncrement: true
        },
        id_cliente: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'clientes', key: 'id_cliente' }
        },
        id_espacio: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'espacios', key: 'id_espacio' }
        },
        id_tarifa: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: 'tarifas', key: 'id_tarifa' }
        },
        hora_ingreso: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.NOW
        },
        horas_estadia: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true
        },
        monto_total: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: true
        },
        estado: {
            type: Sequelize.ENUM('Activo', 'Finalizado'),
            allowNull: false,
            defaultValue: 'Activo'
        }
    });

    Ticket.associate = (models) => {
        Ticket.belongsTo(models.cliente, { foreignKey: 'id_cliente', as: 'cliente' });
        Ticket.belongsTo(models.espacio, { foreignKey: 'id_espacio', as: 'espacio' });
        Ticket.belongsTo(models.tarifa, { foreignKey: 'id_tarifa', as: 'tarifa' });
    };

    return Ticket;
};
