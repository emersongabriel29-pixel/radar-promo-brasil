export async function withIntegrationHealth(req, res, db, name, handler) {
  let payload = null;
  const sendJson = res.json.bind(res);
  res.json = function (body) {
    payload = body;
    return sendJson(body);
  };
  try {
    return await handler(req, res);
  } finally {
    if (req.member && payload) {
      try {
        const account = (await db.query(
          "SELECT id FROM accounts WHERE owner_member_id=$1 AND status='ACTIVE' LIMIT 1",
          [String(req.member.id)]
        )).rows[0];
        if (account) {
          const status = payload.ok === true && payload.status === 'CONNECTED' ? 'OK' : 'ERROR';
          const details = String(payload.status || (payload.ok ? 'OK' : 'ERROR')).slice(0, 160);
          await db.query(
            "INSERT INTO account_integration_health(account_id,name,status,details,last_checked_at) VALUES($1,$2,$3,$4,now()) ON CONFLICT(account_id,name) DO UPDATE SET status=EXCLUDED.status,details=EXCLUDED.details,last_checked_at=EXCLUDED.last_checked_at",
            [account.id, name, status, details]
          );
        }
      } catch {
        // A health-write failure must not hide the result of the connection test.
      }
    }
  }
}
