const pool = require("../config/db");

exports.getHierarchy = async (id) => {
  const result = await pool.query(
    `
    SELECT 
      e.email AS employee_email,
      dm.email AS dm_email,
      rm.email AS rm_email
    FROM employees e
    LEFT JOIN employees dm ON e.dm_id = dm.id
    LEFT JOIN employees rm ON e.rm_id = rm.id
    WHERE e.id = $1
    `,
    [id]
  );

  return result.rows[0];
};