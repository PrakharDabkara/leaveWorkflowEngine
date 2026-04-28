const express = require("express");
const router = express.Router();
const controller = require("../controllers/configController");

router.get("/:type", controller.getConfig);

module.exports = router;