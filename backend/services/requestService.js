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
  const request = result.rows[0];
  const employeeResult = await pool.query(
    `SELECT name FROM employees WHERE id = $1`,
    [request.employee_id],
  );
  const employee = employeeResult.rows[0];

  await axios.post("http://localhost:5678/webhook-test/leave-request", {
    requestId: request.id,
    employee_id: request.employee_id,
    employeeId: request.employee_id,
    employee_name: employee?.name,
    employeeName: employee?.name,
    status: request.status,
    leaveStart: request.leave_start,
    leaveEnd: request.leave_end,
    workflowType: request.workflow_type,
  });

  return request;
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



// exports.handleAction = async (id, action, email) => {
//   let status = action === "approve" ? "approved" : "rejected";

//   // Get hierarchy
//   const result = await pool.query(
//     `SELECT wr.*, 
//             dm.email AS dm_email,
//             rm.email AS rm_email
//      FROM workflow_requests wr
//      JOIN employees e ON wr.employee_id = e.id
//      LEFT JOIN employees dm ON e.dm_id = dm.id
//      LEFT JOIN employees rm ON e.rm_id = rm.id
//      WHERE wr.id = $1`,
//     [id]
//   );

//   const request = result.rows[0];

//   let actorRole = "";

//   if (email === request.dm_email) actorRole = "DM";
//   if (email === request.rm_email) actorRole = "RM";

//   // update request
//   await pool.query(
//     `UPDATE workflow_requests
//      SET status = $1, updated_at = NOW()
//      WHERE id = $2`,
//     [status, id]
//   );

//   // log
//   await pool.query(
//     `INSERT INTO workflow_status_logs
//      (request_id, action, actor_email, step, status)
//      VALUES ($1,$2,$3,$4,$5)`,
//     [id, action.toUpperCase(), email, actorRole, status]
//   );

//   // trigger n8n
//   await axios.post("http://localhost:5678/webhook-test/dlm-action", {
//     requestId: id,
//     employee_id: request.employee_id,
//     action: status,
//     actorRole  
//   });

//   return { success: true };
// };

exports.handleAction = async (id, action, email) => {
  const isApprove = action === "approve";

  // 1. get hierarchy + request
  const result = await pool.query(
    `SELECT wr.*, 
            dm.email AS dm_email,
            rm.email AS rm_email
     FROM workflow_requests wr
     JOIN employees e ON wr.employee_id = e.id
     LEFT JOIN employees dm ON e.dm_id = dm.id
     LEFT JOIN employees rm ON e.rm_id = rm.id
     WHERE wr.id = $1`,
    [id]
  );

  const request = result.rows[0];

  let actorRole = "";
  if (email === request.dm_email) actorRole = "DM";
  if (email === request.rm_email) actorRole = "RM";

  if (!actorRole) {
    throw new Error("Unauthorized actor");
  }

  // 🚫 prevent double execution
  if (request.current_step === "COMPLETED") {
    return { success: false, message: "Already processed" };
  }

  // ===============================
  // CASE 1: DM APPROVES → MOVE TO RM
  // ===============================
  if (actorRole === "DM" && isApprove) {
    await pool.query(
      `UPDATE workflow_requests
       SET current_step = 'RM', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await pool.query(
      `INSERT INTO workflow_status_logs
       (request_id, action, actor_email, step, status)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, "DM_APPROVED", email, "RM", "pending"]
    );

    await axios.post("http://localhost:5678/webhook-test/dlm-action", {
      requestId: id,
      employee_id: request.employee_id,
      action: "dm_approved",
      actorRole: "DM"
    });

    return { success: true };
  }

  // ===============================
  // CASE 2: RM APPROVES → FINAL
  // ===============================
  if (actorRole === "RM" && isApprove) {
    await pool.query(
      `UPDATE workflow_requests
       SET status = 'approved', current_step = 'COMPLETED', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await pool.query(
      `INSERT INTO workflow_status_logs
       (request_id, action, actor_email, step, status)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, "APPROVED", email, "FINAL", "approved"]
    );

    await axios.post("http://localhost:5678/webhook-test/dlm-action", {
      requestId: id,
      employee_id: request.employee_id,
      action: "approved",
      actorRole: "RM"
    });

    return { success: true };
  }

  // ===============================
  // CASE 3: DM REJECT
  // ===============================
  if (actorRole === "DM" && !isApprove) {
    await pool.query(
      `UPDATE workflow_requests
       SET status = 'rejected', current_step = 'COMPLETED', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await pool.query(
      `INSERT INTO workflow_status_logs
       (request_id, action, actor_email, step, status)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, "DM_REJECTED", email, "DM", "rejected"]
    );

    await axios.post("http://localhost:5678/webhook-test/dlm-action", {
      requestId: id,
      employee_id: request.employee_id,
      action: "dm_rejected",
      actorRole: "DM"
    });

    return { success: true };
  }

  // ===============================
  // CASE 4: RM REJECT
  // ===============================
  if (actorRole === "RM" && !isApprove) {
    await pool.query(
      `UPDATE workflow_requests
       SET status = 'rejected', current_step = 'COMPLETED', updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await pool.query(
      `INSERT INTO workflow_status_logs
       (request_id, action, actor_email, step, status)
       VALUES ($1,$2,$3,$4,$5)`,
      [id, "REJECTED", email, "RM", "rejected"]
    );

    await axios.post("http://localhost:5678/webhook-test/dlm-action", {
      requestId: id,
      employee_id: request.employee_id,
      action: "rejected",
      actorRole: "RM"
    });

    return { success: true };
  }
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
