const pool = require("../config/db");

exports.getConfig = async (type) => {
  const result = await pool.query(
    `SELECT * FROM workflow_config WHERE workflow_type = $1`,
    [type]
  );

  return result.rows[0];
};