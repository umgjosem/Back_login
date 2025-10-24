require('dotenv').config();
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3001;
const sequelize = require('./models').sequelize;
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/auth', require('./routes/auth'));
app.use('/cards', require('./routes/cards'));
app.use('/payments', require('./routes/payments'));
app.use('/invoices', require('./routes/invoices'));

// Swagger
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.get('/', (req, res) => res.json({ ok: true, service: 'parqueo-pagos' }));

// Start server after DB connect
sequelize.authenticate()
  .then(() => sequelize.sync())
  .then(() => {
    app.listen(PORT, () => console.log(`parqueo-pagos running on ${PORT}`));
  })
  .catch(err => {
    console.error('DB connection failed:', err);
    process.exit(1);
  });
