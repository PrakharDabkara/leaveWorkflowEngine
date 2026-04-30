const pool = require("../config/db");

const ensureErrorLogTable = async () => {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS workflow_error_logs (
      id SERIAL PRIMARY KEY,
      workflow_name TEXT,
      execution_id TEXT,
      node_name TEXT,
      error_message TEXT,
      stack TEXT,
      payload JSONB,
      created_at TIMESTAMP DEFAULT NOW()
    )
  `);
};

exports.createErrorLog = async (req, res) => {
  try {
    const {
      workflowName,
      executionId,
      nodeName,
      errorMessage,
      stack,
      payload
    } = req.body;

    await ensureErrorLogTable();

    await pool.query(
      `INSERT INTO workflow_error_logs
       (workflow_name, execution_id, node_name, error_message, stack, payload)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        workflowName || null,
        executionId || null,
        nodeName || null,
        errorMessage || "Unknown workflow error",
        stack || null,
        payload || null
      ]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("Error saving log:", err);
    res.status(500).json({ error: err.message });
  }
};
