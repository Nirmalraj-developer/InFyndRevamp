class LoginOtpConsumer {
  constructor(dependencies) {
    this.emailService = dependencies.emailService;
  }

  async handle(event) {
    const { 
      email, 
      otp, 
      branding, 
      emailFromName, 
      emailFromAddress,
      sesConfigurationSet 
    } = event.payload;
    
    // Load OTP template
    const otpTemplate = this.emailService.loadTemplate('login_otp.html');
    const otpHtml = this.emailService.replaceTemplateVars(otpTemplate, {
      companyName: branding.companyName,
      logoUrl: branding.logoUrl,
      primaryColor: branding.primaryColor,
      otp: otp,
      supportEmail: branding.supportEmail
    });
    
    await this.emailService.sendEmail(
      email,
      `Your ${branding.companyName} Login Code`,
      otpHtml,
      emailFromName,
      emailFromAddress,
      sesConfigurationSet
    );
    
    console.log('[NOTIFICATION] Login OTP email sent', { email });
  }
}

module.exports = LoginOtpConsumer;
