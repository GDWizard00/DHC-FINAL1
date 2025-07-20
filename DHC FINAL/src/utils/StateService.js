import { logger } from './logger.js';
import { GameState } from '../models/GameState.js';

/**
 * StateService manages game states and user sessions
 * Handles state persistence, validation, and cleanup
 */
export class StateService {
    constructor() {
        this.userStates = new Map();
        this.sessionTimeouts = new Map();
        this.SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
    }

    /**
     * Get user's current game state
     * @param {string} userId - Discord user ID
     * @returns {GameState|null} Current game state or null if none exists
     */
    getUserState(userId) {
        return this.userStates.get(userId) || null;
    }

    /**
     * Set user's game state
     * @param {string} userId - Discord user ID
     * @param {GameState} gameState - Game state to set
     */
    setUserState(userId, gameState) {
        this.userStates.set(userId, gameState);
        this.refreshSessionTimeout(userId);
        logger.debug(`State set for user ${userId}:`, { 
            screen: gameState.currentScreen,
            floor: gameState.currentFloor,
            hero: gameState.selectedHero?.name 
        });
    }

    /**
     * Create new game state for user
     * @param {string} userId - Discord user ID
     * @param {string} economyType - Economy division (gold, tokens, dng, hero, eth)
     * @returns {GameState} New game state
     */
    createNewGameState(userId, economyType = 'gold') {
        const gameState = new GameState(userId, economyType);
        this.setUserState(userId, gameState);
        return gameState;
    }

    /**
     * Update user's current screen
     * @param {string} userId - Discord user ID
     * @param {string} screen - Screen name
     * @param {Object} data - Additional data to update
     */
    updateUserScreen(userId, screen, data = {}) {
        const gameState = this.getUserState(userId);
        if (gameState) {
            gameState.currentScreen = screen;
            Object.assign(gameState, data);
            this.setUserState(userId, gameState);
        }
    }

    /**
     * Clear user's game state
     * @param {string} userId - Discord user ID
     */
    clearUserState(userId) {
        this.userStates.delete(userId);
        this.clearSessionTimeout(userId);
        logger.debug(`State cleared for user ${userId}`);
    }

    /**
     * Check if user has active game session
     * @param {string} userId - Discord user ID
     * @returns {boolean} True if user has active session
     */
    hasActiveSession(userId) {
        return this.userStates.has(userId);
    }

    /**
     * Refresh session timeout for user
     * @param {string} userId - Discord user ID
     */
    refreshSessionTimeout(userId) {
        this.clearSessionTimeout(userId);
        
        const timeout = setTimeout(() => {
            logger.info(`Session timeout for user ${userId}`);
            this.clearUserState(userId);
        }, this.SESSION_TIMEOUT);
        
        this.sessionTimeouts.set(userId, timeout);
    }

    /**
     * Clear session timeout for user
     * @param {string} userId - Discord user ID
     */
    clearSessionTimeout(userId) {
        const timeout = this.sessionTimeouts.get(userId);
        if (timeout) {
            clearTimeout(timeout);
            this.sessionTimeouts.delete(userId);
        }
    }

    /**
     * Get all active sessions count
     * @returns {number} Number of active sessions
     */
    getActiveSessionsCount() {
        return this.userStates.size;
    }

    /**
     * Cleanup expired sessions (called periodically)
     */
    cleanupExpiredSessions() {
        const expiredSessions = [];
        const now = Date.now();
        
        for (const [userId, gameState] of this.userStates.entries()) {
            if (now - gameState.lastActivity > this.SESSION_TIMEOUT) {
                expiredSessions.push(userId);
            }
        }
        
        expiredSessions.forEach(userId => this.clearUserState(userId));
        
        if (expiredSessions.length > 0) {
            logger.info(`Cleaned up ${expiredSessions.length} expired sessions`);
        }
    }

    /**
     * Update user's economy balance
     * @param {string} userId - Discord user ID
     * @param {string} economyType - Economy type (gold, tokens, dng, hero, eth)
     * @param {number} amount - Amount to add/subtract
     */
    updateUserEconomy(userId, economyType, amount) {
        const gameState = this.getUserState(userId);
        if (gameState && gameState.economy[economyType] !== undefined) {
            gameState.economy[economyType] = Math.max(0, gameState.economy[economyType] + amount);
            this.setUserState(userId, gameState);
            logger.debug(`Updated ${economyType} for user ${userId}: ${amount} (new total: ${gameState.economy[economyType]})`);
        }
    }

    /**
     * Check if user can afford economy cost
     * @param {string} userId - Discord user ID
     * @param {string} economyType - Economy type
     * @param {number} cost - Cost amount
     * @returns {boolean} True if user can afford
     */
    canAffordCost(userId, economyType, cost) {
        const gameState = this.getUserState(userId);
        return gameState && gameState.economy[economyType] >= cost;
    }

    /**
     * Deduct economy cost from user
     * @param {string} userId - Discord user ID
     * @param {string} economyType - Economy type
     * @param {number} cost - Cost amount
     * @returns {boolean} True if successful
     */
    deductCost(userId, economyType, cost) {
        if (this.canAffordCost(userId, economyType, cost)) {
            this.updateUserEconomy(userId, economyType, -cost);
            return true;
        }
        return false;
    }
}

// Export singleton instance
export const stateService = new StateService(); 