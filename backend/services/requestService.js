const axios = require("axios");

const pool = require("../config/db");

exports.createRequest = async (body) => {
  const { employeeId, leaveStart, leaveEnd, reason, workflowType } = body;

  const result = await pool.query(
    `INSERT INTO workflow_requests 
     (employee_id, workflow_type, leave_start, leave_end, reason)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING *`,
    [employeeId, workflowType, leaveStart, leaveEnd, reason],
  );

  await axios.post("http://localhost:5678/webhook-test/leave-request", {
    requestId: result.rows[0].id,
    employeeId,
    leaveStart,
    leaveEnd,
    workflowType,
  });

  return result.rows[0];
};

exports.getRequest = async (id) => {
  const result = await pool.query(
    `SELECT * FROM workflow_requests WHERE id = $1`,
    [id],
  );
  return result.rows[0];
};

exports.updateStatus = async (id, body) => {
  const { status, step, actorEmail, comment } = body;

  // update main table
  await pool.query(
    `UPDATE workflow_requests 
     SET status = $1, current_step = $2, updated_at = NOW()
     WHERE id = $3`,
    [status, step, id],
  );

  // insert log
  await pool.query(
    `INSERT INTO workflow_status_logs
     (request_id, action, actor_email, step, status, comment)
     VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, "STATUS_UPDATE", actorEmail, step, status, comment],
  );

  return { success: true };
};


exports.handleAction = async (id, action, email) => {
  let status = "pending";

  if (action === "approve") status = "approved";
  if (action === "reject") status = "rejected";

  // update main request
  await pool.query(
    `UPDATE workflow_requests
     SET status = $1, current_step = 'COMPLETED', updated_at = NOW()
     WHERE id = $2`,
    [status, id]
  );

  // log action
  await pool.query(
    `INSERT INTO workflow_status_logs
     (request_id, action, actor_email, step, status)
     VALUES ($1,$2,$3,$4,$5)`,
    [id, action.toUpperCase(), email, "FINAL", status]
  );

  return { success: true };
};


exports.getAllRequests = async () => {
  const result = await pool.query(`
    SELECT wr.*, e.name, e.email
    FROM workflow_requests wr
    JOIN employees e ON wr.employee_id = e.id
    ORDER BY wr.created_at DESC
  `);

  return result.rows;
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