const service = require("../services/configService");

exports.getConfig = async (req, res) => {
  const data = await service.getConfig(req.params.type);
  res.json(data);
};