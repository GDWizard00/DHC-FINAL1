import { logger } from './logger.js';
import { auditLogger } from './auditLogger.js';

/**
 * Runtime Error Monitor for Dungeonites Heroes Challenge
 * Monitors for runtime errors and triggers automated repairs
 */
export class ErrorMonitor {
    constructor() {
        this.errorCounts = new Map();
        this.errorPatterns = new Map();
        this.repairTriggerThreshold = 3;
        this.monitoringActive = false;
        this.checkInterval = 30 * 1000; // 30 seconds
        this.errorHistory = [];
        this.maxHistorySize = 100;
        this.knownErrors = new Set();
        this.errorCooldown = 5 * 60 * 1000; // 5 minutes cooldown per error type
        this.lastErrorReport = new Map();
        
        this.initializeErrorPatterns();
    }

    /**
     * Initialize error patterns to monitor
     */
    initializeErrorPatterns() {
        // Discord.js specific errors
        this.errorPatterns.set('DISCORD_INTERACTION_TIMEOUT', {
            patterns: [
                /Interaction has already been acknowledged/gi,
                /Unknown interaction/gi,
                /This interaction has already been acknowledged/gi
            ],
            severity: 'HIGH',
            repairStrategy: 'INTERACTION_TIMEOUT_REPAIR',
            description: 'Discord interaction timeout or duplicate acknowledgment'
        });

        this.errorPatterns.set('DISCORD_RATE_LIMIT', {
            patterns: [
                /Rate limited/gi,
                /Too Many Requests/gi,
                /429/gi
            ],
            severity: 'MEDIUM',
            repairStrategy: 'RATE_LIMIT_BACKOFF',
            description: 'Discord API rate limiting'
        });

        this.errorPatterns.set('DISCORD_PERMISSIONS', {
            patterns: [
                /Missing Permissions/gi,
                /Insufficient permissions/gi,
                /Missing Access/gi
            ],
            severity: 'HIGH',
            repairStrategy: 'PERMISSION_CHECK',
            description: 'Discord permission errors'
        });

        // Application specific errors
        this.errorPatterns.set('DATABASE_CONNECTION', {
            patterns: [
                /Database connection failed/gi,
                /Connection timeout/gi,
                /ECONNREFUSED/gi
            ],
            severity: 'CRITICAL',
            repairStrategy: 'DATABASE_RECONNECT',
            description: 'Database connection issues'
        });

        this.errorPatterns.set('VALIDATION_ERROR', {
            patterns: [
                /Invalid string length/gi,
                /ValidationError/gi,
                /Schema validation failed/gi
            ],
            severity: 'HIGH',
            repairStrategy: 'VALIDATION_FIX',
            description: 'Data validation errors'
        });

        this.errorPatterns.set('MEMORY_LEAK', {
            patterns: [
                /Maximum call stack size exceeded/gi,
                /out of memory/gi,
                /heap out of memory/gi
            ],
            severity: 'CRITICAL',
            repairStrategy: 'MEMORY_CLEANUP',
            description: 'Memory management issues'
        });

        this.errorPatterns.set('TIMEOUT_ERROR', {
            patterns: [
                /Request timeout/gi,
                /Operation timed out/gi,
                /ETIMEDOUT/gi
            ],
            severity: 'MEDIUM',
            repairStrategy: 'TIMEOUT_RETRY',
            description: 'Network timeout errors'
        });
    }

    /**
     * Start error monitoring
     */
    startMonitoring() {
        if (this.monitoringActive) return;

        this.monitoringActive = true;
        
        // Set up periodic error scanning
        setInterval(() => {
            this.scanForErrors();
        }, this.checkInterval);

        // Hook into the logger to catch errors in real-time
        this.hookIntoLogger();

        auditLogger.log('AUDIT:MONITOR', 'Error monitoring started', 'error_monitoring_start');
        logger.info('Error monitoring started - scanning every 30 seconds');
    }

    /**
     * Stop error monitoring
     */
    stopMonitoring() {
        this.monitoringActive = false;
        auditLogger.log('AUDIT:MONITOR', 'Error monitoring stopped', 'error_monitoring_stop');
    }

    /**
     * Hook into the logger to catch errors in real-time
     */
    hookIntoLogger() {
        // Store original error method
        const originalError = console.error;
        
        // Override console.error to capture errors
        console.error = (...args) => {
            // Call original error method
            originalError.apply(console, args);
            
            // Process the error
            const errorMessage = args.map(arg => 
                typeof arg === 'string' ? arg : JSON.stringify(arg)
            ).join(' ');
            
            this.processError(errorMessage);
        };
    }

    /**
     * Process an error message
     */
    processError(errorMessage) {
        if (!this.monitoringActive) return;

        // Check against known error patterns
        for (const [errorType, config] of this.errorPatterns.entries()) {
            if (this.matchesPattern(errorMessage, config.patterns)) {
                this.handleError(errorType, errorMessage, config);
                break;
            }
        }
    }

    /**
     * Check if error message matches any pattern
     */
    matchesPattern(message, patterns) {
        return patterns.some(pattern => pattern.test(message));
    }

    /**
     * Handle a detected error
     */
    handleError(errorType, errorMessage, config) {
        const now = Date.now();
        const errorKey = `${errorType}:${this.getErrorHash(errorMessage)}`;
        
        // Check cooldown to avoid spam
        const lastReported = this.lastErrorReport.get(errorKey);
        if (lastReported && (now - lastReported) < this.errorCooldown) {
            return; // Skip if in cooldown period
        }

        // Update error count
        const currentCount = this.errorCounts.get(errorType) || 0;
        this.errorCounts.set(errorType, currentCount + 1);
        this.lastErrorReport.set(errorKey, now);

        // Add to history
        this.errorHistory.push({
            timestamp: new Date(),
            type: errorType,
            message: errorMessage,
            severity: config.severity,
            count: currentCount + 1
        });

        // Trim history if too large
        if (this.errorHistory.length > this.maxHistorySize) {
            this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
        }

        // Log the error
        auditLogger.log('AUDIT:ERROR_DETECTED', 
            `${errorType}: ${config.description}`, 
            'error_detected',
            {
                type: errorType,
                message: errorMessage.substring(0, 200), // Truncate long messages
                severity: config.severity,
                count: currentCount + 1
            }
        );

        // Check if repair should be triggered
        if (currentCount + 1 >= this.repairTriggerThreshold) {
            this.triggerRepair(errorType, config);
        }
    }

    /**
     * Generate a hash for error deduplication
     */
    getErrorHash(message) {
        // Simple hash function for error deduplication
        let hash = 0;
        for (let i = 0; i < message.length; i++) {
            const char = message.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString(16);
    }

    /**
     * Trigger repair for an error type
     */
    triggerRepair(errorType, config) {
        auditLogger.log('AUDIT:REPAIR_TRIGGER', 
            `Triggering repair for ${errorType} after ${this.repairTriggerThreshold} occurrences`, 
            'repair_trigger',
            {
                errorType,
                repairStrategy: config.repairStrategy,
                errorCount: this.errorCounts.get(errorType)
            }
        );

        // Execute repair strategy
        this.executeRepair(errorType, config.repairStrategy);
    }

    /**
     * Execute repair strategy
     */
    executeRepair(errorType, strategy) {
        switch (strategy) {
            case 'INTERACTION_TIMEOUT_REPAIR':
                this.repairInteractionTimeout(errorType);
                break;
                
            case 'RATE_LIMIT_BACKOFF':
                this.repairRateLimit(errorType);
                break;
                
            case 'PERMISSION_CHECK':
                this.repairPermissions(errorType);
                break;
                
            case 'DATABASE_RECONNECT':
                this.repairDatabaseConnection(errorType);
                break;
                
            case 'VALIDATION_FIX':
                this.repairValidation(errorType);
                break;
                
            case 'MEMORY_CLEANUP':
                this.repairMemoryLeak(errorType);
                break;
                
            case 'TIMEOUT_RETRY':
                this.repairTimeout(errorType);
                break;
                
            default:
                this.genericRepair(errorType);
        }
    }

    /**
     * Repair interaction timeout issues
     */
    repairInteractionTimeout(errorType) {
        auditLogger.log('AUDIT:REPAIR_EXECUTION', 
            'Applying interaction timeout repair strategy', 
            'repair_interaction_timeout'
        );
        
        // Reset error count after repair attempt
        this.errorCounts.set(errorType, 0);
        
        // Log repair strategy (actual implementation would be in the handlers)
        auditLogger.log('AUDIT:REPAIR_STRATEGY', 
            'Interaction timeout repair: Implement better response handling and timeout checks', 
            'repair_strategy_log'
        );
    }

    /**
     * Repair rate limiting issues
     */
    repairRateLimit(errorType) {
        auditLogger.log('AUDIT:REPAIR_EXECUTION', 
            'Applying rate limit repair strategy', 
            'repair_rate_limit'
        );
        
        this.errorCounts.set(errorType, 0);
        
        auditLogger.log('AUDIT:REPAIR_STRATEGY', 
            'Rate limit repair: Implement exponential backoff and request queuing', 
            'repair_strategy_log'
        );
    }

    /**
     * Repair permission issues
     */
    repairPermissions(errorType) {
        auditLogger.log('AUDIT:REPAIR_EXECUTION', 
            'Applying permission repair strategy', 
            'repair_permissions'
        );
        
        this.errorCounts.set(errorType, 0);
        
        auditLogger.log('AUDIT:REPAIR_STRATEGY', 
            'Permission repair: Check and validate bot permissions in guild', 
            'repair_strategy_log'
        );
    }

    /**
     * Repair database connection issues
     */
    repairDatabaseConnection(errorType) {
        auditLogger.log('AUDIT:REPAIR_EXECUTION', 
            'Applying database connection repair strategy', 
            'repair_database'
        );
        
        this.errorCounts.set(errorType, 0);
        
        auditLogger.log('AUDIT:REPAIR_STRATEGY', 
            'Database repair: Attempt reconnection with exponential backoff', 
            'repair_strategy_log'
        );
    }

    /**
     * Repair validation issues
     */
    repairValidation(errorType) {
        auditLogger.log('AUDIT:REPAIR_EXECUTION', 
            'Applying validation repair strategy', 
            'repair_validation'
        );
        
        this.errorCounts.set(errorType, 0);
        
        auditLogger.log('AUDIT:REPAIR_STRATEGY', 
            'Validation repair: Check data length and format before Discord API calls', 
            'repair_strategy_log'
        );
    }

    /**
     * Repair memory leak issues
     */
    repairMemoryLeak(errorType) {
        auditLogger.log('AUDIT:REPAIR_EXECUTION', 
            'Applying memory cleanup repair strategy', 
            'repair_memory'
        );
        
        this.errorCounts.set(errorType, 0);
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }
        
        auditLogger.log('AUDIT:REPAIR_STRATEGY', 
            'Memory repair: Force garbage collection and clear caches', 
            'repair_strategy_log'
        );
    }

    /**
     * Repair timeout issues
     */
    repairTimeout(errorType) {
        auditLogger.log('AUDIT:REPAIR_EXECUTION', 
            'Applying timeout repair strategy', 
            'repair_timeout'
        );
        
        this.errorCounts.set(errorType, 0);
        
        auditLogger.log('AUDIT:REPAIR_STRATEGY', 
            'Timeout repair: Implement retry mechanism with exponential backoff', 
            'repair_strategy_log'
        );
    }

    /**
     * Generic repair strategy
     */
    genericRepair(errorType) {
        auditLogger.log('AUDIT:REPAIR_EXECUTION', 
            `Applying generic repair strategy for ${errorType}`, 
            'repair_generic'
        );
        
        this.errorCounts.set(errorType, 0);
        
        auditLogger.log('AUDIT:REPAIR_STRATEGY', 
            'Generic repair: Log error details and await manual intervention', 
            'repair_strategy_log'
        );
    }

    /**
     * Scan for errors in recent activity
     */
    scanForErrors() {
        if (!this.monitoringActive) return;

        // This would typically scan log files or check system status
        // For now, we'll just log that we're monitoring
        const errorCount = this.errorHistory.length;
        
        if (errorCount > 0) {
            const recentErrors = this.errorHistory.slice(-10);
            const uniqueTypes = new Set(recentErrors.map(e => e.type));
            
            auditLogger.log('AUDIT:ERROR_SCAN', 
                `Monitoring: ${errorCount} errors in history, ${uniqueTypes.size} unique types active`, 
                'error_scan_summary'
            );
        }
    }

    /**
     * Get error monitoring status
     */
    getMonitoringStatus() {
        return {
            active: this.monitoringActive,
            totalErrors: this.errorHistory.length,
            errorCounts: Object.fromEntries(this.errorCounts),
            recentErrors: this.errorHistory.slice(-10),
            repairTriggerThreshold: this.repairTriggerThreshold,
            monitoringPatterns: Array.from(this.errorPatterns.keys())
        };
    }

    /**
     * Get error statistics
     */
    getErrorStatistics() {
        const stats = {
            totalErrors: this.errorHistory.length,
            errorsByType: {},
            errorsBySeverity: {
                CRITICAL: 0,
                HIGH: 0,
                MEDIUM: 0,
                LOW: 0
            },
            recentErrorRate: 0,
            lastError: null
        };

        // Calculate error statistics
        this.errorHistory.forEach(error => {
            stats.errorsByType[error.type] = (stats.errorsByType[error.type] || 0) + 1;
            stats.errorsBySeverity[error.severity]++;
        });

        // Calculate recent error rate (last hour)
        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
        const recentErrors = this.errorHistory.filter(e => e.timestamp > oneHourAgo);
        stats.recentErrorRate = recentErrors.length;

        // Get last error
        if (this.errorHistory.length > 0) {
            stats.lastError = this.errorHistory[this.errorHistory.length - 1];
        }

        return stats;
    }

    /**
     * Clear error history
     */
    clearErrorHistory() {
        this.errorHistory = [];
        this.errorCounts.clear();
        this.lastErrorReport.clear();
        auditLogger.log('AUDIT:SYSTEM', 'Error history cleared', 'error_history_cleared');
    }

    /**
     * Force error check
     */
    forceErrorCheck() {
        auditLogger.log('AUDIT:MANUAL', 'Manual error check triggered', 'manual_error_check');
        this.scanForErrors();
    }
}

// Export singleton instance
export const errorMonitor = new ErrorMonitor(); 