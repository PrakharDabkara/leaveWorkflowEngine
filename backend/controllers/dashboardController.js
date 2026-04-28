const service = require("../services/dashboardService");

exports.renderDashboard = async (req, res) => {
  try {
    const requests = await service.getAllRequests();
    res.render("dashboard", { requests });
  } catch (err) {
    res.status(500).send(err.message);
  }
};

exports.viewRequest = async (req, res) => {
  try {
    const request = await service.getRequest(req.params.id);
    const logs = await service.getLogs(req.params.id);

    res.render("request", { request, logs });
  } catch (err) {
    res.status(500).send(err.message);
  }
};