const express = require("express");
const router = express.Router();
const controller = require("../controllers/requestController");

router.post("/", controller.createRequest);
router.get("/:id", controller.getRequest);
router.post("/:id/status", controller.updateStatus);


router.get("/:id/action", controller.handleAction);

router.get("/dashboard", controller.renderDashboard);
router.get("/requests/:id/view", controller.viewRequest);

module.exports = router;