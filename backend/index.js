const express = require("express");
const app = express();

app.use(express.json());

app.get("/", (req, res) => {
  res.send("Workflow Engine Running");
});


const pool = require("./config/db");

app.get("/db-test", async (req, res) => {
  const result = await pool.query("SELECT NOW()");
  res.json(result.rows);
});


const routes = require("./routes");

app.use("/api", routes);

app.set("view engine", "ejs");
app.set("views", __dirname + "/views");

const PORT = 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});