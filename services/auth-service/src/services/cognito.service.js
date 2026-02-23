'use strict';

const logger = require('../utils/logger');
const { getCognitoClient, validateCognitoCredentials } = require('../config/cognito');
const {
  AdminCreateUserCommand,
  AdminSetUserPasswordCommand,
  AdminConfirmSignUpCommand,
  AdminGetUserCommand,
  AdminInitiateAuthCommand
} = require('@aws-sdk/client-cognito-identity-provider');

class CognitoService {
  async validateRuntime(cognitoUserPoolId) {
    if (!cognitoUserPoolId) {
      throw new Error('Cognito User Pool ID is required');
    }
    await validateCognitoCredentials();
  }

  async adminCreateUser(params) {
    const { emailAddress, userName, hostName } = params;
    const cognitoUserPoolId = this.getCognitoPoolIdByHostName(hostName);
    await this.validateRuntime(cognitoUserPoolId);
    const client = getCognitoClient();

    const tempPassword = `Temp${Math.random().toString(36).slice(-8)}!1`;

    const createCommand = new AdminCreateUserCommand({
      UserPoolId: cognitoUserPoolId,
      Username: emailAddress,
      TemporaryPassword: tempPassword,
      UserAttributes: [
        { Name: 'email', Value: emailAddress },
        { Name: 'email_verified', Value: 'false' },
        { Name: 'name', Value: userName }
      ],
      MessageAction: 'SUPPRESS'
    });

    const result = await client.send(createCommand);
    const sub = result.User?.Attributes?.find(a => a.Name === 'sub')?.Value;

    const setPasswordCommand = new AdminSetUserPasswordCommand({
      UserPoolId: cognitoUserPoolId,
      Username: emailAddress,
      Password: tempPassword,
      Permanent: true
    });
    await client.send(setPasswordCommand);

    const confirmCommand = new AdminConfirmSignUpCommand({
      UserPoolId: cognitoUserPoolId,
      Username: emailAddress
    });
    await client.send(confirmCommand);

    logger.info('Cognito user created and confirmed', { emailAddress, sub });
    return { sub };
  }

  async adminConfirmSignUp(params) {
    const { emailAddress, hostName } = params;
    const cognitoUserPoolId = this.getCognitoPoolIdByHostName(hostName);
    await this.validateRuntime(cognitoUserPoolId);
    const client = getCognitoClient();

    const command = new AdminConfirmSignUpCommand({
      UserPoolId: cognitoUserPoolId,
      Username: emailAddress
    });
    await client.send(command);
    logger.info('Cognito user confirmed', { emailAddress });
  }

  async adminGetUser(params) {
    const { emailAddress, hostName } = params;
    const cognitoUserPoolId = this.getCognitoPoolIdByHostName(hostName);
    await this.validateRuntime(cognitoUserPoolId);
    const client = getCognitoClient();

    const command = new AdminGetUserCommand({
      UserPoolId: cognitoUserPoolId,
      Username: emailAddress
    });

    const result = await client.send(command);
    const sub = result.UserAttributes?.find(a => a.Name === 'sub')?.Value;
    return {
      sub,
      enabled: result.Enabled,
      status: result.UserStatus
    };
  }

  getCognitoPoolIdByHostName(hostName) {
    // Map hostName to Cognito User Pool ID
    // This should be configured via environment variables or config file
    const poolMapping = {
      'app.infynd.com': process.env.COGNITO_USER_POOL_ID,
      'localhost': process.env.COGNITO_USER_POOL_ID
    };
    return poolMapping[hostName] || process.env.COGNITO_USER_POOL_ID;
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
    return {
      accessToken: result.AuthenticationResult?.AccessToken,
      idToken: result.AuthenticationResult?.IdToken,
      refreshToken: result.AuthenticationResult?.RefreshToken
    };
  }
}

module.exports = CognitoService;
