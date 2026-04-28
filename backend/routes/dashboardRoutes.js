const express = require("express");
const router = express.Router();
const controller = require("../controllers/dashboardController");

router.get("/dashboard", controller.renderDashboard);
router.get("/requests/:id/view", controller.viewRequest);

module.exports = router;