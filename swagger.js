const swaggerJSDoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Parqueo Pagos API',
      version: '1.0.0',
      description: 'Servicio de pagos que consume API principal en Render'
    }
  },
  apis: ['./routes/*.js']
};

const swaggerSpec = swaggerJSDoc(options);
module.exports = swaggerSpec;
