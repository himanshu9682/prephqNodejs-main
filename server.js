require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");

const swaggerUi = require("swagger-ui-express");
const swaggerSpec = require("./config/swagger");

const app = express();

app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  }),
);

app.options("*", cors());

app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

app.use("/uploads", express.static(path.join(__dirname, "uploads")));

app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use("/", require("./routes/index"));

if (process.env.START_SUBMISSION_WORKER !== "false") {
  require("./workers/submissionWorker");
}

app.get("/", (req, res) => {
  res.send("API Running Successfully");
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Swagger Docs: http://localhost:${PORT}/api-docs`);
});
