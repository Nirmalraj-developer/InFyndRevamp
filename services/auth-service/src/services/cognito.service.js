const { AdminGetUserCommand, AdminInitiateAuthCommand, AdminCreateUserCommand, AdminConfirmSignUpCommand } = require('@aws-sdk/client-cognito-identity-provider');
const { getCognitoClient, validateCognitoCredentials } = require('../config/cognito');
const config = require('../config');

class CognitoService {
  async validateRuntime(cognitoUserPoolId) {
    if (!cognitoUserPoolId || !cognitoUserPoolId.includes('_')) {
      throw new Error('Invalid Cognito UserPoolId');
    }

    const userPoolRegion = cognitoUserPoolId.split('_')[0];
    if (userPoolRegion !== config.aws.cognitoRegion) {
      throw new Error(
        `Cognito region mismatch: AWS_REGION=${config.aws.cognitoRegion}, UserPoolId region=${userPoolRegion}`
      );
    }

    await validateCognitoCredentials();
  }

  async adminGetUser(params) {
    const { email, cognitoUserPoolId } = params;
    
    await this.validateRuntime(cognitoUserPoolId);
    const client = getCognitoClient();
    
    try {
      const command = new AdminGetUserCommand({
        UserPoolId: cognitoUserPoolId,
        Username: email
      });
      
      const result = await client.send(command);
      
      const sub = result.UserAttributes.find(attr => attr.Name === 'sub')?.Value;
      const emailVerified = result.UserAttributes.find(attr => attr.Name === 'email_verified')?.Value === 'true';
      
      return {
        sub,
        email,
        emailVerified,
        status: result.UserStatus,
        enabled: result.Enabled
      };
    } catch (error) {
      if (error.name === 'UserNotFoundException') {
        return null;
      }
      throw error;
    }
  }

  async adminCreateUser(params) {
    const { email, userName, cognitoUserPoolId } = params;
    
    await this.validateRuntime(cognitoUserPoolId);
    const client = getCognitoClient();
    
    const command = new AdminCreateUserCommand({
      UserPoolId: cognitoUserPoolId,
      Username: email,
      UserAttributes: [
        { Name: 'email', Value: email },
        { Name: 'email_verified', Value: 'false' },
        { Name: 'name', Value: userName || email }
      ],
      MessageAction: 'SUPPRESS'
    });
    
    const result = await client.send(command);
    const sub = result.User.Attributes.find(attr => attr.Name === 'sub')?.Value;
    
    return { sub };
  }

  async adminConfirmSignUp(params) {
    const { email, cognitoUserPoolId } = params;
    
    await this.validateRuntime(cognitoUserPoolId);
    const client = getCognitoClient();
    
    const command = new AdminConfirmSignUpCommand({
      UserPoolId: cognitoUserPoolId,
      Username: email
    });
    
    await client.send(command);
    return { success: true };
  }

  async getUserByEmail(params) {
    return await this.adminGetUser(params);
  }

  async authenticateUser(params) {
    const { email, password, cognitoUserPoolId, cognitoClientId } = params;
    
    await this.validateRuntime(cognitoUserPoolId);
    const client = getCognitoClient();
    
    const command = new AdminInitiateAuthCommand({
      UserPoolId: cognitoUserPoolId,
      ClientId: cognitoClientId,
      AuthFlow: 'ADMIN_NO_SRP_AUTH',
      AuthParameters: {
        USERNAME: email,
        PASSWORD: password
      }
    });
    
    const result = await client.send(command);
    return result.AuthenticationResult;
  }
}

module.exports = CognitoService;
