module.exports = {
  port: Number(process.env.PORT || 5000),
  databaseUrl:
    process.env.DATABASE_URL ||
    "postgres://appuser:apppass@localhost:5432/appdb",
  jwtSecret: process.env.JWT_SECRET || "sigurna-banka-dev-secret-change-me",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "8h",
};
