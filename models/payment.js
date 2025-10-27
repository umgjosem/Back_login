module.exports = (sequelize, DataTypes) => {
  const Payment = sequelize.define('Payment', {
    id: { 
      type: DataTypes.INTEGER, 
      autoIncrement: true, 
      primaryKey: true 
    },
    ticketIdOrigen: { 
      type: DataTypes.STRING, 
      allowNull: false 
    },
    userId: { 
      type: DataTypes.INTEGER, 
      allowNull: true 
    },
    cardToken: { 
      type: DataTypes.STRING, 
      allowNull: true 
    },
    amount: { 
      type: DataTypes.DECIMAL(10,2), 
      allowNull: false 
    },
    status: { 
      type: DataTypes.ENUM('Succeeded','Failed'), 
      allowNull: false,
      defaultValue: 'Failed'   // ✅ así evitamos que quede sin valor
    },
    providerResponse: { 
      type: DataTypes.JSON 
    },
    createdAt: { 
      type: DataTypes.DATE, 
      defaultValue: DataTypes.NOW 
    }
  }, { 
    tableName: 'payments', 
    updatedAt: false 
  });

  return Payment;
};
