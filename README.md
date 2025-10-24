# Parqueo Pagos - Servicio de Pagos (Stripe-ready)

Proyecto minimal para procesar cobros, generar factura PDF, y sincronizar con API principal en Render.

Principales características:
- Conexión a Neon Postgres.
- Registro y login con JWT.
- Envío de correo por Gmail (contraseña de aplicación).
- Cobros simulados o via Stripe si STRIPE_SECRET configurado.
- Swagger en /api-docs.

Instrucciones:
1. Copia `.env.example` a `.env` y completa las variables.
2. `npm install`
3. `npm start` (o `npm run dev` con nodemon)
4. Swagger: http://localhost:8082/api-docs
