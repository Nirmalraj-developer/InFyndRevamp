function renderRegistrationOtpTemplate(params) {
  const {
    companyName,
    logoUrl,
    otp,
    expiryMinutes,
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
          <h2 style="margin:0 0 12px;color:#1f2937;">Verify Your Email Address</h2>
          <p style="margin:0 0 16px;color:#374151;">Use the OTP below to complete your registration for ${companyName}.</p>
          <div style="text-align:center;padding:16px 0;">
            <span style="display:inline-block;font-size:28px;letter-spacing:8px;font-weight:700;color:#111827;">${otp}</span>
          </div>
          <p style="margin:0;color:#6b7280;">This OTP expires in ${expiryMinutes} minutes.</p>
        </td>
      </tr>
      <tr>
        <td style="padding:16px 24px 24px;color:#6b7280;font-size:12px;border-top:1px solid #e5e7eb;">
          Need help? Contact ${supportEmail}
        </td>
      </tr>
    </table>
  </body>
</html>`;
}

module.exports = { renderRegistrationOtpTemplate };
