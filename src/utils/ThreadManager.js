import { logger } from './logger.js';
import { auditLogger } from './auditLogger.js';
import { PermanentEmbedHandler } from '../handlers/ui/PermanentEmbedHandler.js';

/**
 * ThreadManager - Centralized thread management system
 * Provides admin controls and system-wide thread operations
 */
export class ThreadManager {
    static isInitialized = false;

    /**
     * Initialize the thread management system
     */
    static initialize() {
        if (this.isInitialized) {
            logger.warn('ThreadManager already initialized');
            return;
        }

        try {
            // Initialize the PermanentEmbedHandler thread cleanup system
            PermanentEmbedHandler.initializeThreadCleanup();
            
            this.isInitialized = true;
            logger.info('ThreadManager initialized successfully');
            
            auditLogger.log('SYSTEM', 'Thread management system initialized', 'thread_manager_init', {
                timestamp: new Date(),
                cleanupInterval: '5 minutes'
            });

        } catch (error) {
            logger.error('Error initializing ThreadManager:', error);
            throw error;
        }
    }

    /**
     * Get comprehensive thread statistics across all handlers
     */
    static getSystemThreadStats() {
        try {
            const stats = {
                timestamp: new Date().toISOString(),
                permanentEmbedThreads: PermanentEmbedHandler.getThreadStats(),
                systemInfo: {
                    initialized: this.isInitialized,
                    cleanupActive: !!PermanentEmbedHandler.threadCleanupInterval
                }
            };

            return stats;
        } catch (error) {
            logger.error('Error getting system thread stats:', error);
            return { error: error.message };
        }
    }

    /**
     * Force cleanup of all threads across the system (admin function)
     */
    static async forceSystemCleanup() {
        try {
            logger.info('[THREAD_MANAGER] Starting force system cleanup...');
            
            const results = {
                timestamp: new Date().toISOString(),
                cleanupResults: {}
            };

            // Cleanup PermanentEmbedHandler threads
            try {
                const embedStats = await PermanentEmbedHandler.forceCleanupAllThreads();
                results.cleanupResults.permanentEmbedThreads = {
                    success: true,
                    clearedCount: embedStats.totalActive,
                    details: embedStats
                };
                logger.info(`[THREAD_MANAGER] Cleaned up ${embedStats.totalActive} permanent embed threads`);
            } catch (error) {
                results.cleanupResults.permanentEmbedThreads = {
                    success: false,
                    error: error.message
                };
                logger.error('[THREAD_MANAGER] Error cleaning up permanent embed threads:', error);
            }

            // Add other thread handler cleanups here as needed in the future

            auditLogger.log('ADMIN', 'Force system thread cleanup performed', 'thread_system_cleanup', results);
            
            logger.info('[THREAD_MANAGER] Force system cleanup completed');
            return results;

        } catch (error) {
            logger.error('[THREAD_MANAGER] Error in force system cleanup:', error);
            throw error;
        }
    }

    /**
     * Archive a specific user's threads across all systems
     */
    static async archiveUserThreads(userId, guild) {
        try {
            logger.info(`[THREAD_MANAGER] Archiving all threads for user ${userId}`);
            
            const results = {
                userId: userId,
                timestamp: new Date().toISOString(),
                archived: []
            };

            // Archive PermanentEmbedHandler threads
            try {
                await PermanentEmbedHandler.archiveUserThreads(userId, guild);
                results.archived.push('permanentEmbedThreads');
            } catch (error) {
                logger.error(`[THREAD_MANAGER] Error archiving permanent embed threads for user ${userId}:`, error);
            }

            // Add other thread handler archiving here as needed

            auditLogger.log('THREAD_MANAGEMENT', `Threads archived for user ${userId}`, 'user_thread_archive', results);
            
            return results;

        } catch (error) {
            logger.error(`[THREAD_MANAGER] Error archiving threads for user ${userId}:`, error);
            throw error;
        }
    }

    /**
     * Get a user's active threads across all systems
     */
    static getUserThreadInfo(userId) {
        try {
            const threadInfo = {
                userId: userId,
                timestamp: new Date().toISOString(),
                activeThreads: {}
            };

            // Get PermanentEmbedHandler thread info
            const embedThreadData = PermanentEmbedHandler.getUserThreadData(userId);
            if (embedThreadData) {
                threadInfo.activeThreads.permanentEmbedThread = {
                    threadId: embedThreadData.threadId,
                    createdAt: new Date(embedThreadData.createdAt).toISOString(),
                    username: embedThreadData.username,
                    channelId: embedThreadData.channelId,
                    age: Math.round((Date.now() - embedThreadData.createdAt) / 1000 / 60) // minutes
                };
            }

            // Add other thread handler info here as needed

            return threadInfo;

        } catch (error) {
            logger.error(`[THREAD_MANAGER] Error getting thread info for user ${userId}:`, error);
            return { error: error.message, userId: userId };
        }
    }

    /**
     * Health check for the thread management system
     */
    static healthCheck() {
        try {
            const health = {
                timestamp: new Date().toISOString(),
                status: 'healthy',
                components: {}
            };

            // Check PermanentEmbedHandler
            health.components.permanentEmbedHandler = {
                initialized: !!PermanentEmbedHandler.threadCleanupInterval,
                activeThreads: PermanentEmbedHandler.activeThreads.size,
                status: PermanentEmbedHandler.threadCleanupInterval ? 'active' : 'inactive'
            };

            // Overall status
            const allComponentsHealthy = Object.values(health.components).every(component => 
                component.status === 'active'
            );

            if (!allComponentsHealthy) {
                health.status = 'degraded';
            }

            if (!this.isInitialized) {
                health.status = 'not_initialized';
            }

            return health;

        } catch (error) {
            logger.error('[THREAD_MANAGER] Error in health check:', error);
            return {
                timestamp: new Date().toISOString(),
                status: 'error',
                error: error.message
            };
        }
    }

    /**
     * Shutdown the thread management system gracefully
     */
    static shutdown() {
        try {
            logger.info('[THREAD_MANAGER] Shutting down thread management system...');

            // Clear cleanup intervals
            if (PermanentEmbedHandler.threadCleanupInterval) {
                clearInterval(PermanentEmbedHandler.threadCleanupInterval);
                PermanentEmbedHandler.threadCleanupInterval = null;
            }

            this.isInitialized = false;
            
            logger.info('[THREAD_MANAGER] Thread management system shutdown complete');
            
            auditLogger.log('SYSTEM', 'Thread management system shutdown', 'thread_manager_shutdown', {
                timestamp: new Date()
            });

        } catch (error) {
            logger.error('[THREAD_MANAGER] Error during shutdown:', error);
        }
    }

    /**
     * Clean up inactive threads
     */
    static async cleanup() {
        try {
            const now = Date.now();
            let cleanedCount = 0;
            
            for (const [userId, threadData] of this.userThreads.entries()) {
                const threadAge = now - threadData.metadata.createdAt;
                const inactiveTime = now - threadData.metadata.lastActivity;
                
                // Archive threads older than 30 minutes or inactive for 5 minutes
                if (threadAge > this.THREAD_TIMEOUT || inactiveTime > 300000) { // 5 minutes
                    try {
                        // Try to get the actual thread object
                        const guild = threadData.channel.guild;
                        const thread = guild.threads.cache.get(threadData.threadId) || 
                                     await guild.channels.fetch(threadData.threadId).catch(() => null);
                        
                        if (thread) {
                            // Send goodbye message before archiving
                            try {
                                await thread.send({
                                    embeds: [{
                                        title: '👋 **THREAD ARCHIVED** 👋',
                                        description: 
                                            `**${threadData.metadata.username}'s thread has been archived**\n\n` +
                                            '🕒 **Reason:** Inactive for 5+ minutes\n' +
                                            '🔄 **What to do:** Use the Game Hall to create a new thread\n' +
                                            '💾 **Your progress:** Automatically saved\n\n' +
                                            '*This thread will now be archived to keep channels clean.*',
                                        color: 0xFFAA00,
                                        timestamp: new Date().toISOString()
                                    }]
                                });
                            } catch (messageError) {
                                logger.warn(`Could not send goodbye message to thread ${threadData.threadId}:`, messageError.message);
                            }
                            
                            // Archive the thread
                            await thread.setArchived(true, 'Thread inactive for 5+ minutes');
                            logger.info(`Archived thread ${thread.name} (${threadData.threadId}) for user ${threadData.metadata.username}`);
                        }
                        
                        // Remove from our tracking
                        this.userThreads.delete(userId);
                        cleanedCount++;
                        
                        auditLogger.log('THREAD_CLEANUP', `Thread archived for ${threadData.metadata.username}`, 'thread_archived', {
                            userId: userId,
                            threadId: threadData.threadId,
                            threadAge: threadAge,
                            inactiveTime: inactiveTime
                        });
                        
                    } catch (threadError) {
                        logger.error(`Error cleaning up thread ${threadData.threadId}:`, threadError);
                        // Remove from tracking even if archiving failed
                        this.userThreads.delete(userId);
                        cleanedCount++;
                    }
                }
            }
            
            if (cleanedCount > 0) {
                logger.info(`Cleaned up ${cleanedCount} inactive threads`);
            }
            
            return cleanedCount;
        } catch (error) {
            logger.error('Error in thread cleanup:', error);
            return 0;
        }
    }
} 