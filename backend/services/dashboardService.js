const pool = require("../config/db");

exports.getAllRequests = async () => {
  const result = await pool.query(`
    SELECT wr.*, e.name, e.email
    FROM workflow_requests wr
    JOIN employees e ON wr.employee_id = e.id
    ORDER BY wr.created_at DESC
  `);

  return result.rows;
};

exports.getRequest = async (id) => {
  const result = await pool.query(
    `SELECT * FROM workflow_requests WHERE id = $1`,
    [id]
  );
  return result.rows[0];
};

exports.getLogs = async (id) => {
  const result = await pool.query(
    `SELECT * FROM workflow_status_logs
     WHERE request_id = $1
     ORDER BY created_at DESC`,
    [id]
  );

  return result.rows;
};