const express = require("express");
const router = express.Router();
const controller = require("../controllers/logController");

router.post("/error", controller.createErrorLog);

module.exports = router;