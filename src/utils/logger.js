import winston from 'winston';

// Create logger instance
const logger = winston.createLogger({
    level: 'info',
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
    ),
    defaultMeta: { service: 'dungeonites-heroes-challenge' },
    transports: [
        new winston.transports.File({ filename: 'logs/error.log', level: 'error' }),
        new winston.transports.File({ filename: 'logs/combined.log' }),
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple()
            )
        })
    ]
});

/**
 * Enhanced logger with interaction tracking
 */
class InteractionLogger {
    constructor() {
        this.baseLogger = logger;
        this.userSessions = new Map(); // Track user sessions
    }

    /**
     * Log user interaction with detailed context
     */
    logInteraction(userId, username, action, context = {}) {
        const sessionData = this.getUserSession(userId);
        
        const logData = {
            userId,
            username,
            action,
            context,
            sessionId: sessionData.sessionId,
            sessionStart: sessionData.startTime,
            actionCount: sessionData.actionCount,
            timestamp: new Date().toISOString()
        };

        this.baseLogger.info(`[USER_INTERACTION] ${username} (${userId}) performed: ${action}`, logData);
        
        // Update session
        sessionData.actionCount++;
        sessionData.lastAction = action;
        sessionData.lastActionTime = Date.now();
        
        return logData;
    }

    /**
     * Log game outcome/result
     */
    logGameOutcome(userId, username, outcome, details = {}) {
        const sessionData = this.getUserSession(userId);
        
        const logData = {
            userId,
            username,
            outcome,
            details,
            sessionId: sessionData.sessionId,
            sessionDuration: Date.now() - sessionData.startTime,
            totalActions: sessionData.actionCount,
            timestamp: new Date().toISOString()
        };

        this.baseLogger.info(`[GAME_OUTCOME] ${username} (${userId}) result: ${outcome}`, logData);
        
        return logData;
    }

    /**
     * Log battle details
     */
    logBattle(userId, username, battleData) {
        const logData = {
            userId,
            username,
            battleData,
            timestamp: new Date().toISOString()
        };

        this.baseLogger.info(`[BATTLE] ${username} (${userId}) battle:`, logData);
        
        return logData;
    }

    /**
     * Log error with user context
     */
    logError(userId, username, error, context = {}) {
        const sessionData = this.getUserSession(userId);
        
        const logData = {
            userId,
            username,
            error: error.message,
            stack: error.stack,
            context,
            sessionId: sessionData.sessionId,
            lastAction: sessionData.lastAction,
            timestamp: new Date().toISOString()
        };

        this.baseLogger.error(`[USER_ERROR] ${username} (${userId}) encountered error:`, logData);
        
        return logData;
    }

    /**
     * Get or create user session data
     */
    getUserSession(userId) {
        if (!this.userSessions.has(userId)) {
            this.userSessions.set(userId, {
                sessionId: `session_${userId}_${Date.now()}`,
                startTime: Date.now(),
                actionCount: 0,
                lastAction: null,
                lastActionTime: null
            });
        }
        return this.userSessions.get(userId);
    }

    /**
     * End user session
     */
    endUserSession(userId, username) {
        const sessionData = this.userSessions.get(userId);
        if (sessionData) {
            const duration = Date.now() - sessionData.startTime;
            this.baseLogger.info(`[SESSION_END] ${username} (${userId}) session ended`, {
                sessionId: sessionData.sessionId,
                duration,
                totalActions: sessionData.actionCount
            });
            this.userSessions.delete(userId);
        }
    }

    /**
     * Clean up old sessions (older than 2 hours)
     */
    cleanupSessions() {
        const twoHoursAgo = Date.now() - (2 * 60 * 60 * 1000);
        
        for (const [userId, sessionData] of this.userSessions.entries()) {
            if (sessionData.lastActionTime && sessionData.lastActionTime < twoHoursAgo) {
                this.userSessions.delete(userId);
            }
        }
    }

    // Proxy all standard logger methods
    info(message, meta = {}) {
        this.baseLogger.info(message, meta);
    }

    error(message, meta = {}) {
        this.baseLogger.error(message, meta);
    }

    warn(message, meta = {}) {
        this.baseLogger.warn(message, meta);
    }

    debug(message, meta = {}) {
        this.baseLogger.debug(message, meta);
    }
}

// Create enhanced logger instance
const enhancedLogger = new InteractionLogger();

// Set up cleanup interval (every hour)
setInterval(() => {
    enhancedLogger.cleanupSessions();
}, 60 * 60 * 1000);

export { enhancedLogger as logger }; 