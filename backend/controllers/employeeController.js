const service = require("../services/employeeService");

exports.getHierarchy = async (req, res) => {
  const data = await service.getHierarchy(req.params.id);
  res.json(data);
};