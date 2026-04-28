const service = require("../services/requestService");

exports.createRequest = async (req, res) => {
  try {
    const data = await service.createRequest(req.body);
    res.json(data);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getRequest = async (req, res) => {
  const data = await service.getRequest(req.params.id);
  res.json(data);
};

exports.updateStatus = async (req, res) => {
  const data = await service.updateStatus(req.params.id, req.body);
  res.json(data);
};

exports.handleAction = async (req, res) => {
  try {
    const { action, email } = req.query;

    const data = await service.handleAction(
      req.params.id,
      action,
      email
    );

    res.send(`<h2>Request ${action} successfully</h2>`);
  } catch (err) {
    res.status(500).send("Error processing request");
  }
};

exports.renderDashboard = async (req, res) => {
  const data = await service.getAllRequests();
  res.render("dashboard", { requests: data });
};

exports.viewRequest = async (req, res) => {
  const request = await service.getRequest(req.params.id);
  const logs = await service.getLogs(req.params.id);

  res.render("request", { request, logs });
};