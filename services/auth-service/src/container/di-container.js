const AuthService = require('../services/auth.service');
const AuthController = require('../controllers/auth.controller');
const KafkaPublisher = require('../kafka/kafka.publisher');
const UserRepository = require('../repositories/user.repository');
const CognitoService = require('../services/cognito.service');
const OtpCache = require('../cache/otp.cache');
const UserCache = require('../cache/user.cache');
const UserRegistrationListener = require('../listeners/userRegistration.listener');
const config = require('../config');
const jwtUtil = require('../utils/jwt.util');
const { getProducer } = require('../config/kafka');

class DIContainer {
  constructor() {
    this.instances = {};
  }

  async setupDependencies() {
    this.userRepository = new UserRepository();
    this.cognitoService = new CognitoService();
    this.otpCache = new OtpCache();
    this.userCache = new UserCache();
    this.kafkaPublisher = new KafkaPublisher(getProducer());
    this.authService = new AuthService({
      userRepository: this.userRepository,
      cognitoService: this.cognitoService,
      otpCache: this.otpCache,
      userCache: this.userCache,
      kafkaPublisher: this.kafkaPublisher,
      jwtUtil,
      config
    });
    this.userRegistrationListener = new UserRegistrationListener({
      kafkaPublisher: this.kafkaPublisher,
      config
    });
  }

  getAuthController() {
    if (!this.instances.authController) {
      this.instances.authController = new AuthController({
        authService: this.authService
      });
    }
    return this.instances.authController;
  }

  getUserRegistrationListener() {
    return this.userRegistrationListener;
  }
}

const container = new DIContainer();

const initContainer = async () => {
  await container.setupDependencies();
};

module.exports = { container, initContainer };
