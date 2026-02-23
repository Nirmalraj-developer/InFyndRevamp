function renderWelcomeTemplate(params) {
  const {
    companyName,
    logoUrl,
    userName,
    hostName,
    supportEmail
  } = params;

  return `<!doctype html>
<html>
  <body style="font-family:Arial,sans-serif;background:#f4f6f8;margin:0;padding:24px;">
    <table width="100%" cellpadding="0" cellspacing="0" style="max-width:620px;margin:0 auto;background:#ffffff;border-radius:8px;">
      <tr>
        <td style="padding:24px 24px 12px;text-align:center;">
          <img src="${logoUrl}" alt="${companyName}" style="max-height:48px;max-width:180px;" />
        </td>
      </tr>
      <tr>
        <td style="padding:12px 24px;">
          <h2 style="margin:0 0 12px;color:#1f2937;">Welcome to ${companyName}</h2>
          <p style="margin:0 0 10px;color:#374151;">Hi ${userName || 'there'}, your account has been activated successfully.</p>
          <p style="margin:0;color:#374151;">You can now access your workspace at ${hostName}.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px 24px;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;">
          For assistance, contact ${supportEmail}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

module.exports = { renderWelcomeTemplate };
