const express = require("express");
const router = express.Router();
const controller = require("../controllers/employeeController");

router.get("/:id/hierarchy", controller.getHierarchy);

module.exports = router;