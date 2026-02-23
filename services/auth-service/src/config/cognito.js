const { CognitoIdentityProviderClient } = require('@aws-sdk/client-cognito-identity-provider');
const config = require('./index');

// Single client instance (region-based)
let cognitoClient;
let cognitoCredentialsValidated = false;

function getEnvCredentials() {
  const accessKeyId = process.env.AWS_ACCESS_KEY_ID;
  const secretAccessKey = process.env.AWS_SECRET_ACCESS_KEY;
  const sessionToken = process.env.AWS_SESSION_TOKEN;

  if (accessKeyId && secretAccessKey) {
    return {
      accessKeyId,
      secretAccessKey,
      ...(sessionToken ? { sessionToken } : {})
    };
  }

  return undefined;
}

function initCognito() {
  const explicitCredentials = getEnvCredentials();

  cognitoClient = new CognitoIdentityProviderClient({
    region: config.aws.cognitoRegion,
    // If env credentials are absent, SDK falls back to the default provider chain
    // (ECS task role, EC2 IMDS, shared config/credentials, etc).
    ...(explicitCredentials ? { credentials: explicitCredentials } : {})
  });
  
  console.log('[AUTH] Cognito client initialized', {
    region: config.aws.cognitoRegion,
    credentialSource: explicitCredentials ? 'environment' : 'default-provider-chain'
  });
}

function getCognitoClient() {
  if (!cognitoClient) throw new Error('Cognito client not initialized');
  return cognitoClient;
}

async function validateCognitoCredentials() {
  if (cognitoCredentialsValidated) return;

  const client = getCognitoClient();
  const resolved = await client.config.credentials();
  if (!resolved?.accessKeyId || !resolved?.secretAccessKey) {
    throw new Error('AWS credentials not resolved for Cognito client');
  }

  cognitoCredentialsValidated = true;
}

module.exports = { initCognito, getCognitoClient, validateCognitoCredentials };
