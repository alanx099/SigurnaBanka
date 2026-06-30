const express = require("express");
const bodyParser = require("body-parser");
const morgan = require("morgan");
const config = require("./config");
const { pool, initializeDatabase } = require("./db");

const app = express();
app.disable("x-powered-by");
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,PATCH,DELETE,OPTIONS",
  );
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});
app.use(bodyParser.json({ limit: "100kb" }));
app.use(morgan("dev"));
app.get("/api/health", (_req, res) =>
  res.json({ status: "OK", service: "Sigurna Banka API" }),
);
app.use("/api", require("./app/routes/api")(pool));
app.use((_req, res) =>
  res.status(404).json({ message: "Ruta nije pronađena." }),
);
app.use((err, _req, res, _next) => {
  console.error(err);
  res
    .status(err.status || 500)
    .json({ message: err.message || "Interna greška poslužitelja." });
});

initializeDatabase()
  .then(() =>
    app.listen(config.port, () =>
      console.log(`Sigurna Banka API sluša na portu ${config.port}`),
    ),
  )
  .catch((error) => {
    console.error("Baza nije dostupna:", error);
    process.exit(1);
  });

module.exports = app;
