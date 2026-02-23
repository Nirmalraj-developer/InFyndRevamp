'use strict';

const config = require('../config');

const LOG_LEVELS = { ERROR: 0, WARN: 1, INFO: 2, DEBUG: 3 };
const CURRENT_LEVEL = LOG_LEVELS[(process.env.LOG_LEVEL || 'INFO').toUpperCase()] ?? LOG_LEVELS.INFO;
const IS_PROD = config.service.env === 'production';
const SERVICE_NAME = config.service.name || 'auth-service';

/**
 * Structured logger — outputs JSON in production, human-readable in dev.
 * Usage:
 *   logger.info('User created', { userId, email });
 *   logger.error('DB failed', { error: err.message, stack: err.stack });
 */
function formatMessage(level, msg, meta = {}) {
    const entry = {
        level,
        ts: new Date().toISOString(),
        service: SERVICE_NAME,
        msg,
        ...meta
    };

    // Strip stack traces from production JSON unless level is ERROR
    if (IS_PROD && level !== 'ERROR') {
        delete entry.stack;
    }

    return IS_PROD ? JSON.stringify(entry) : `[${entry.ts}] [${level}] [${SERVICE_NAME}] ${msg} ${Object.keys(meta).length ? JSON.stringify(meta) : ''}`.trim();
}

const logger = {
    info(msg, meta) {
        if (CURRENT_LEVEL >= LOG_LEVELS.INFO) {
            console.log(formatMessage('INFO', msg, meta));
        }
    },

    warn(msg, meta) {
        if (CURRENT_LEVEL >= LOG_LEVELS.WARN) {
            console.warn(formatMessage('WARN', msg, meta));
        }
    },

    error(msg, meta) {
        if (CURRENT_LEVEL >= LOG_LEVELS.ERROR) {
            console.error(formatMessage('ERROR', msg, meta));
        }
    },

    debug(msg, meta) {
        if (CURRENT_LEVEL >= LOG_LEVELS.DEBUG) {
            console.log(formatMessage('DEBUG', msg, meta));
        }
    }
};

module.exports = logger;
