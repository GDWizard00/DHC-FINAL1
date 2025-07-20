import { StateService, stateService } from './StateService.js';
import { logger } from './logger.js';
import { DatabaseManager } from '../database/DatabaseManager.js';
import { web3Manager } from './Web3Manager.js';

/**
 * ServiceRegistry manages all game services and their dependencies
 * Provides centralized access to services throughout the application
 */
class ServiceRegistry {
    constructor() {
        this.services = new Map();
        this.initialized = false;
    }

    /**
     * Register all core services
     */
    async registerServices() {
        try {
            logger.info('Registering core services...');

            // Register StateService (already instantiated)
            this.services.set('stateService', stateService);
            logger.debug('StateService registered');

            // Register DatabaseManager
            this.services.set('databaseManager', DatabaseManager);
            logger.debug('DatabaseManager registered');

            // Initialize and register Web3Manager
            await web3Manager.initialize();
            this.services.set('web3Manager', web3Manager);
            logger.debug('Web3Manager registered');

            // Setup periodic cleanup
            this.setupPeriodicCleanup();

            this.initialized = true;
            logger.info('All services registered successfully');

        } catch (error) {
            logger.error('Failed to register services:', error);
            throw error;
        }
    }

    /**
     * Get a service by name
     * @param {string} serviceName - Name of the service
     * @returns {Object} The requested service
     */
    getService(serviceName) {
        if (!this.initialized) {
            throw new Error('ServiceRegistry not initialized. Call registerServices() first.');
        }

        const service = this.services.get(serviceName);
        if (!service) {
            throw new Error(`Service '${serviceName}' not found`);
        }

        return service;
    }

    /**
     * Get StateService instance
     * @returns {StateService} StateService instance
     */
    getStateService() {
        return this.getService('stateService');
    }

    /**
     * Get DatabaseManager instance
     * @returns {DatabaseManager} DatabaseManager instance
     */
    getDatabaseManager() {
        return this.getService('databaseManager');
    }

    /**
     * Get Web3Manager instance
     * @returns {Web3Manager} Web3Manager instance
     */
    getWeb3Manager() {
        return this.getService('web3Manager');
    }

    /**
     * Setup periodic cleanup tasks
     */
    setupPeriodicCleanup() {
        // Clean up expired sessions every 10 minutes
        setInterval(() => {
            try {
                this.getStateService().cleanupExpiredSessions();
            } catch (error) {
                logger.error('Error during session cleanup:', error);
            }
        }, 10 * 60 * 1000);

        logger.debug('Periodic cleanup tasks scheduled');
    }

    /**
     * Shutdown all services gracefully
     */
    async shutdown() {
        logger.info('Shutting down services...');

        try {
            // Clear all active sessions
            const stateService = this.getStateService();
            const activeSessions = stateService.getActiveSessionsCount();
            if (activeSessions > 0) {
                logger.info(`Clearing ${activeSessions} active sessions`);
                stateService.userStates.clear();
                stateService.sessionTimeouts.forEach(timeout => clearTimeout(timeout));
                stateService.sessionTimeouts.clear();
            }

            // Close database connection
            const databaseManager = this.getDatabaseManager();
            await databaseManager.close();

            this.services.clear();
            this.initialized = false;

            logger.info('All services shut down successfully');

        } catch (error) {
            logger.error('Error during service shutdown:', error);
            throw error;
        }
    }

    /**
     * Check if services are initialized
     * @returns {boolean} True if initialized
     */
    isInitialized() {
        return this.initialized;
    }

    /**
     * Get service status information
     * @returns {Object} Service status information
     */
    getServiceStatus() {
        return {
            initialized: this.initialized,
            serviceCount: this.services.size,
            activeSessions: this.initialized ? this.getStateService().getActiveSessionsCount() : 0,
            registeredServices: Array.from(this.services.keys())
        };
    }
}

// Export singleton instance
export const serviceRegistry = new ServiceRegistry();

/**
 * Initialize all services
 * Called from main application startup
 */
export async function initializeServices() {
    if (!serviceRegistry.isInitialized()) {
        await serviceRegistry.registerServices();
    }
    return serviceRegistry;
}

/**
 * Get service registry instance
 * @returns {ServiceRegistry} Service registry instance
 */
export function getServiceRegistry() {
    return serviceRegistry;
} 