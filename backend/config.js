module.exports = {
  port: process.env.PORT || 3000,
  pool: {
    host: 'localhost',
    user: 'postgres',
    password: 'root',
    database: 'npj',
    port: 5432,
    max: 20
  }
};