const express = require("express");
const router = express.Router();

const requestRoutes = require("./requestRoutes");
const employeeRoutes = require("./employeeRoutes");
const configRoutes = require("./configRoutes");


const dashboardRoutes = require("./dashboardRoutes");

router.use("/requests", requestRoutes);
router.use("/employees", employeeRoutes);
router.use("/workflow-config", configRoutes);
router.use("/", dashboardRoutes);


module.exports = router;