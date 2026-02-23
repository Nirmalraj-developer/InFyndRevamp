function renderRegistrationOtpTemplate(params) {
  const { companyName, logoUrl, otp, userName } = params;

  const imgTag = logoUrl 
    ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 60px; max-width: 200px;" />`
    : `<h1 style="color: #9b0000; margin: 0;">${companyName}</h1>`;

  const htmlContent = `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f5f5f5; padding: 30px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 2px 12px rgba(0,0,0,0.08);">
      
      <!-- Header -->
      <div style="background-color: #ffffff; padding: 3px 0; text-align: center;">
        ${imgTag}
      </div>
      
      <!-- Body -->
      <div style="padding: 20px 30px;">
        <h2 style="font-size: 24px; font-weight: 700; color: #222; margin-bottom: 16px;">
          Hello <strong style="color: #9b0000;">${userName}</strong>!
        </h2>

        <p style="font-size: 16px; color: #444; margin-bottom: 16px;">
          Thank you for signing up with <strong>${companyName}</strong>. To complete your registration, please verify your email using the OTP below:
        </p>
        
        <!-- OTP Box -->
        <div style="
          font-size: 22px;
          font-weight: 700;
          color: #222;
          text-align: center;
          margin: 25px auto;
          padding: 15px 30px;
          border: 2px dashed #bbb;
          border-radius: 12px;
          width: fit-content;
          background-color: #f8f8f8;
          letter-spacing: 3px;
        ">
          ${otp}
        </div>

        <p style="font-size: 14px; color: #555; text-align: center; margin-top: 15px;">
          This OTP is valid for 10 minutes. Please do not share it with anyone.
        </p>

        <p style="font-size: 14px; color: #555; text-align: center; margin-top: 25px;">
          If you did not sign up for <strong>${companyName}</strong>, please ignore this email.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #fafafa; padding: 15px 20px; text-align: center; font-size: 12px; color: #aaaaaa;">
        © ${new Date().getFullYear()} ${companyName}. All rights reserved.
      </div>

    </div>
  </div>
  `;

  return htmlContent;
}

function renderLoginOtpTemplate(params) {
  const { companyName, logoUrl, otp } = params;

  const imgTag = logoUrl 
    ? `<img src="${logoUrl}" alt="${companyName}" style="max-height: 60px; max-width: 200px;" />`
    : `<h1 style="color: #9b0000; margin: 0;">${companyName}</h1>`;

  const htmlContent = `
  <div style="font-family: 'Segoe UI', Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
    <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);">
      <!-- Header -->
      <div style="background-color: #ffffff; padding: 3px 0; text-align: center;">
        ${imgTag}
      </div>
      <!-- Body -->
      <div style="padding: 1px 24px 24px 24px;">
        <h2 style="font-size: 22px; font-weight: 600; color: #222; margin-bottom: 12px;">
          Verify Your Login with OTP
        </h2>
        <p style="font-size: 15px; color: #444; margin: 0 0 12px;">
          Hi there,
        </p>
        <p style="font-size: 15px; color: #444; margin: 0 0 20px; line-height: 1.6;">
          Your One-Time Password (OTP) for verification is shown below:
        </p>
        <!-- OTP Box -->
        <div style="
          font-size: 20px;
          font-weight: 600;
          color: #222;
          text-align: center;
          margin: 20px auto;
          padding: 12px 24px;
          border: 2px dashed #bbb;
          border-radius: 10px;
          width: fit-content;
          background-color: #f8f8f8;
          letter-spacing: 2px;
        ">
          ${otp}
        </div>
        <p style="font-size: 13px; color: #777; text-align: center; margin-top: 18px;">
          This OTP is valid for 5 minutes. Please do not share it with anyone.
        </p>
      </div>
      <!-- Footer -->
      <div style="background-color: #fafafa; padding: 15px 20px; text-align: center; font-size: 12px; color: #aaaaaa;">
        © ${new Date().getFullYear()} ${companyName}. All rights reserved.
      </div>
    </div>
  </div>
  `;

  return htmlContent;
}

module.exports = { 
  renderRegistrationOtpTemplate,
  renderLoginOtpTemplate
};
