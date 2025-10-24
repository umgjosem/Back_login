module.exports = {
  HOST: process.env.DB_HOST || "ep-little-mouse-afpodxtp-pooler.c-2.us-west-2.aws.neon.tech",
  USER: process.env.DB_USER || "neondb_owner",
  PASSWORD: process.env.DB_PASS || "npg_4HVoAM2gpWIJ",
  DB: process.env.DB_NAME || "Netflix",
  dialect: process.env.DB_DIALECT || "postgres",
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false
    }
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  }
};
