import { logger } from './logger.js';
import { auditLogger } from './auditLogger.js';
import { AuthenticationManager } from './authenticationManager.js';

/**
 * PersistentEmbedManager - Systematic reply() system for dashboard interactions
 * Now uses unified AuthenticationManager for all authentication needs
 * Ensures permanent embeds stay persistent while user responses auto-delete after 12 hours
 * Manages private thread creation and redirection for clean server experience
 */
export class PersistentEmbedManager {
    // Track user responses for auto-deletion
    static userResponses = new Map(); // userId -> { messageId, channelId, deleteAt, threadId }
    static cleanupInterval = null;
    static userThreads = new Map(); // userId -> { threadId, channelId, createdAt }

    /**
     * Initialize the persistent embed system
     */
    static initialize() {
        if (!this.cleanupInterval) {
            // Run cleanup every 10 minutes to check for expired responses
            this.cleanupInterval = setInterval(() => {
                this.cleanupExpiredResponses();
            }, 10 * 60 * 1000);
            
            logger.info('PersistentEmbedManager initialized with unified authentication system');
        }
    }

    /**
     * Handle interaction with permanent embed - creates reply that auto-deletes after 12 hours
     * Also redirects player to private thread for contained interactions
     */
    static async handlePermanentEmbedInteraction(interaction, responseData, options = {}) {
        try {
            const { 
                forceThread = true,
                skipProfileCheck = false,
                threadTitle = null
            } = options;

            const userId = interaction.user.id;
            const username = interaction.user.username;

            // STEP 1: Check if this needs profile authentication using unified system
            if (!skipProfileCheck) {
                const profileInfo = await AuthenticationManager.getUserProfileInfo(userId);
                
                if (!profileInfo.hasProfile) {
                    // User has no profile - redirect to profile creation in public reply that auto-deletes
                    const profileReply = await interaction.reply({
                        content: `🔐 **Profile Required** - Please create a profile first to access this feature.\n\n*Click the button below to create your secure player profile:*`,
                        components: await this.buildProfileCreationComponents(),
                        ephemeral: false
                    });

                    // Schedule this response for auto-deletion
                    this.scheduleResponseDeletion(userId, profileReply, interaction.channel.id);
                    return;
                }

                // Check if authenticated using unified system
                const isAuthenticated = AuthenticationManager.isAuthenticated(userId);
                if (!isAuthenticated) {
                    // User needs to authenticate - redirect to auth in public reply that auto-deletes
                    const authReply = await interaction.reply({
                        content: `🔑 **Authentication Required** - Please login to continue.\n\n*Profile Type: ${profileInfo.profileType.toUpperCase()}*\n*Click the button below to authenticate:*`,
                        components: await this.buildAuthComponents(),
                        ephemeral: false
                    });

                    this.scheduleResponseDeletion(userId, authReply, interaction.channel.id);
                    return;
                }
            }

            // STEP 2: Handle thread redirection if needed
            if (forceThread) {
                await this.redirectToPrivateThread(interaction, responseData, threadTitle);
            } else {
                // STEP 3: Send reply that auto-deletes after 12 hours
                const reply = await interaction.reply({
                    ...responseData,
                    ephemeral: false
                });

                this.scheduleResponseDeletion(userId, reply, interaction.channel.id);
            }

            logger.info(`Handled permanent embed interaction for ${username} - thread: ${forceThread}`);

        } catch (error) {
            logger.error('Error handling permanent embed interaction:', error);
            
            // Fallback: send simple ephemeral error
            try {
                if (!interaction.replied) {
                    await interaction.reply({
                        content: '❌ Error processing request. Please try again.',
                        ephemeral: true
                    });
                }
            } catch (fallbackError) {
                logger.error('Fallback error response failed:', fallbackError);
            }
        }
    }

    /**
     * Redirect user to private thread for contained interactions
     */
    static async redirectToPrivateThread(interaction, responseData, threadTitle = null) {
        try {
            const userId = interaction.user.id;
            const username = interaction.user.username;
            const guild = interaction.guild;

            // Check if user already has an active thread
            const existingThreadData = this.userThreads.get(userId);
            let thread = null;

            if (existingThreadData) {
                try {
                    thread = await guild.channels.fetch(existingThreadData.threadId);
                    if (!thread || thread.archived) {
                        thread = null;
                        this.userThreads.delete(userId);
                    }
                } catch (error) {
                    thread = null;
                    this.userThreads.delete(userId);
                }
            }

            // Create new thread if needed
            if (!thread) {
                const finalThreadTitle = threadTitle || `🎮 ${username}'s Dashboard`;
                
                thread = await interaction.channel.threads.create({
                    name: finalThreadTitle,
                    type: 12, // PrivateThread
                    invitable: false,
                    reason: `Private dashboard thread for ${username}`
                });

                await thread.members.add(userId);

                // Track the thread
                this.userThreads.set(userId, {
                    threadId: thread.id,
                    channelId: interaction.channel.id,
                    createdAt: Date.now()
                });

                logger.info(`Created private thread ${thread.id} for ${username}`);
            }

            // Send redirect message in public channel that auto-deletes
            const redirectReply = await interaction.reply({
                content: `🎮 **Redirecting to your private dashboard...** ${thread}\n\n*All your interactions will be contained in this private thread.*`,
                ephemeral: false
            });

            this.scheduleResponseDeletion(userId, redirectReply, interaction.channel.id);

            // Send the actual response data in the private thread
            await thread.send({
                ...responseData,
                content: `🎮 **Welcome to your private dashboard!**\n\n${responseData.content || ''}`
            });

            // Schedule thread cleanup after 24 hours of inactivity
            this.scheduleThreadCleanup(userId, thread.id);

        } catch (error) {
            logger.error('Error redirecting to private thread:', error);
            throw error;
        }
    }

    /**
     * Schedule user response for auto-deletion after 12 hours
     */
    static scheduleResponseDeletion(userId, message, channelId, threadId = null) {
        const deleteAt = Date.now() + (12 * 60 * 60 * 1000); // 12 hours from now

        const responseData = {
            messageId: message.id,
            channelId: channelId,
            deleteAt: deleteAt,
            threadId: threadId
        };

        this.userResponses.set(`${userId}_${message.id}`, responseData);

        logger.info(`Scheduled auto-deletion for user ${userId} message ${message.id} at ${new Date(deleteAt)}`);
    }

    /**
     * Schedule thread cleanup after 24 hours of inactivity
     */
    static scheduleThreadCleanup(userId, threadId) {
        // This will be expanded in Phase 2 when we implement full thread management
        logger.info(`Thread cleanup scheduled for user ${userId} thread ${threadId}`);
    }

    /**
     * Clean up expired user responses
     */
    static async cleanupExpiredResponses() {
        try {
            const now = Date.now();
            const expiredResponses = [];

            for (const [key, responseData] of this.userResponses.entries()) {
                if (now >= responseData.deleteAt) {
                    expiredResponses.push({ key, ...responseData });
                }
            }

            for (const expiredResponse of expiredResponses) {
                try {
                    // Get the channel (could be regular channel or thread)
                    const channel = global.client?.channels?.cache.get(expiredResponse.channelId) ||
                                  await global.client?.channels?.fetch(expiredResponse.channelId);

                    if (channel) {
                        // Try to delete the message
                        const message = await channel.messages.fetch(expiredResponse.messageId);
                        if (message) {
                            await message.delete();
                            logger.info(`Auto-deleted expired response ${expiredResponse.messageId}`);
                        }
                    }
                } catch (deleteError) {
                    logger.warn(`Could not delete expired response ${expiredResponse.messageId}:`, deleteError.message);
                }

                // Remove from tracking
                this.userResponses.delete(expiredResponse.key);
            }

            if (expiredResponses.length > 0) {
                logger.info(`Cleaned up ${expiredResponses.length} expired user responses`);
            }

        } catch (error) {
            logger.error('Error during expired response cleanup:', error);
        }
    }

    /**
     * Build profile creation components
     */
    static async buildProfileCreationComponents() {
        const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = await import('discord.js');

        const createButton = new ButtonBuilder()
            .setCustomId('user_profile_create_begin')
            .setLabel('🔐 Create Profile')
            .setStyle(ButtonStyle.Primary);

        const helpButton = new ButtonBuilder()
            .setCustomId('user_profile_help')
            .setLabel('❓ Why Profile?')
            .setStyle(ButtonStyle.Secondary);

        return [new ActionRowBuilder().addComponents(createButton, helpButton)];
    }

    /**
     * Build authentication components
     */
    static async buildAuthComponents() {
        const { ButtonBuilder, ButtonStyle, ActionRowBuilder } = await import('discord.js');

        const loginButton = new ButtonBuilder()
            .setCustomId('user_login_password')
            .setLabel('🔑 Login')
            .setStyle(ButtonStyle.Primary);

        const forgotButton = new ButtonBuilder()
            .setCustomId('user_forgot_password')
            .setLabel('🆘 Forgot Password')
            .setStyle(ButtonStyle.Secondary);

        return [new ActionRowBuilder().addComponents(loginButton, forgotButton)];
    }

    /**
     * Handle regular embed interaction (non-permanent) - uses existing embed history system
     */
    static async handleRegularEmbedInteraction(interaction, responseData, userId) {
        try {
            const { embedHistory } = await import('./embedHistory.js');
            return await embedHistory.updateWithHistory(interaction, responseData, userId);
        } catch (error) {
            logger.error('Error handling regular embed interaction:', error);
            throw error;
        }
    }

    /**
     * Force reply for any interaction (never update permanent embeds)
     */
    static async forceReply(interaction, responseData, options = {}) {
        try {
            const { autoDelete = false, userId = null } = options;

            const reply = await interaction.reply({
                ...responseData,
                ephemeral: false
            });

            // Schedule auto-deletion if requested
            if (autoDelete && userId) {
                this.scheduleResponseDeletion(userId, reply, interaction.channel.id);
            }

            return reply;

        } catch (error) {
            logger.error('Error in forceReply:', error);
            throw error;
        }
    }

    /**
     * Get user's private thread if it exists
     */
    static getUserThread(userId) {
        return this.userThreads.get(userId);
    }

    /**
     * Clean up all data for a user (logout, etc.)
     */
    static cleanupUserData(userId) {
        // Remove user responses
        const userResponseKeys = [...this.userResponses.keys()].filter(key => key.startsWith(`${userId}_`));
        userResponseKeys.forEach(key => this.userResponses.delete(key));

        // Remove user thread data
        this.userThreads.delete(userId);

        logger.info(`Cleaned up persistent embed data for user ${userId}`);
    }

    /**
     * Get statistics for monitoring
     */
    static getStats() {
        return {
            activeResponses: this.userResponses.size,
            activeThreads: this.userThreads.size,
            cleanupInterval: this.cleanupInterval ? 'Active' : 'Inactive'
        };
    }
}

// Auto-initialize when module is imported
PersistentEmbedManager.initialize(); 