import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';
import crypto from 'crypto';

/**
 * SocialHandler - Manages social media connections and engagement tracking
 * Connects X accounts to monitor social engagement for rewards
 */
export class SocialHandler {
    
    // Social platform configurations
    static PLATFORMS = {
        TWITTER: {
            name: 'X (Twitter)',
            icon: '🐦',
            baseURL: 'https://twitter.com/',
            apiEndpoint: 'https://api.twitter.com/2/',
            engagementTypes: ['follow', 'retweet', 'like', 'reply', 'quote']
        }
    };

    // Engagement rewards
    static ENGAGEMENT_REWARDS = {
        FOLLOW: { xp: 50, gold: 100 },
        RETWEET: { xp: 25, gold: 50 },
        LIKE: { xp: 10, gold: 20 },
        REPLY: { xp: 30, gold: 60 },
        QUOTE: { xp: 35, gold: 70 },
        MENTION: { xp: 40, gold: 80 }
    };

    /**
     * Show social connection menu
     */
    static async showSocialMenu(interaction) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const socialConnections = playerData?.socialConnections || {};

            let description = '**🌐 Social Media Connections**\n\n';
            description += '**Connect your social accounts to:**\n';
            description += '• Earn XP and rewards for engagement\n';
            description += '• Participate in social quests\n';
            description += '• Track your community activity\n';
            description += '• Unlock exclusive social achievements\n\n';

            // Show connection status
            description += '**📱 Connection Status:**\n';
            Object.entries(this.PLATFORMS).forEach(([key, platform]) => {
                const connection = socialConnections[key.toLowerCase()];
                const status = connection ? '✅ Connected' : '❌ Not Connected';
                const username = connection?.username ? `(@${connection.username})` : '';
                description += `${platform.icon} **${platform.name}**: ${status} ${username}\n`;
            });

            description += '\n**🎯 Engagement Rewards:**\n';
            Object.entries(this.ENGAGEMENT_REWARDS).forEach(([action, reward]) => {
                description += `• ${action}: ${reward.xp} XP, ${reward.gold} Gold\n`;
            });

            description += '\n*Select an action:*';

            const embed = new EmbedBuilder()
                .setTitle('🌐 **SOCIAL CONNECTIONS** 🌐')
                .setDescription(description)
                .setColor(0x1da1f2)
                .setFooter({ text: 'Social System • Connect & Earn Rewards' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🐦 Connect X Account')
                    .setDescription('Link your X (Twitter) account')
                    .setValue('connect_twitter'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 View Engagement Stats')
                    .setDescription('See your social engagement statistics')
                    .setValue('view_stats'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎯 Social Quests')
                    .setDescription('View available social engagement quests')
                    .setValue('social_quests'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🏆 Social Achievements')
                    .setDescription('Check social-related achievements')
                    .setValue('social_achievements'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚙️ Manage Connections')
                    .setDescription('Manage your connected accounts')
                    .setValue('manage_connections'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back')
                    .setDescription('Return to previous menu')
                    .setValue('back')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('social_menu')
                .setPlaceholder('Select social action...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing social menu:', error);
            await interaction.reply({
                content: '❌ Error loading social menu.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle social menu selections
     */
    static async handleSocialMenuSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'connect_twitter':
                    await this.showTwitterConnection(interaction);
                    break;
                case 'view_stats':
                    await this.showEngagementStats(interaction);
                    break;
                case 'social_quests':
                    await this.showSocialQuests(interaction);
                    break;
                case 'social_achievements':
                    await this.showSocialAchievements(interaction);
                    break;
                case 'manage_connections':
                    await this.showManageConnections(interaction);
                    break;
                case 'back':
                    // Return to previous menu (would need context)
                    await interaction.reply({
                        content: '🔙 Returning to previous menu...',
                        ephemeral: true
                    });
                    break;
                default:
                    await this.showSocialMenu(interaction);
            }

        } catch (error) {
            logger.error('Error handling social menu selection:', error);
            await interaction.reply({
                content: '❌ Error processing selection.',
                ephemeral: true
            });
        }
    }

    /**
     * Show Twitter connection process
     */
    static async showTwitterConnection(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🐦 **CONNECT X ACCOUNT** 🐦')
                .setDescription(
                    '**Connect your X (Twitter) account to earn rewards!**\n\n' +
                    '**🔗 Connection Process:**\n' +
                    '1. Enter your X username (without @)\n' +
                    '2. We\'ll generate a verification code\n' +
                    '3. Tweet the verification code\n' +
                    '4. Confirm the tweet link\n' +
                    '5. Account connected successfully!\n\n' +
                    '**🎯 Benefits:**\n' +
                    '• Earn XP and gold for engagement\n' +
                    '• Access to exclusive social quests\n' +
                    '• Social achievement tracking\n' +
                    '• Community leaderboards\n\n' +
                    '**🔒 Privacy:**\n' +
                    '• We only track public engagement\n' +
                    '• No access to private messages\n' +
                    '• You can disconnect anytime\n\n' +
                    '*Click below to start connection process:*'
                )
                .setColor(0x1da1f2)
                .setFooter({ text: 'X Connection • Secure & Private' })
                .setTimestamp();

            const connectButton = new ButtonBuilder()
                .setCustomId('twitter_connect_start')
                .setLabel('🔗 Start Connection')
                .setStyle(ButtonStyle.Primary);

            const backButton = new ButtonBuilder()
                .setCustomId('social_back')
                .setLabel('🔙 Back')
                .setStyle(ButtonStyle.Secondary);

            const row = new ActionRowBuilder().addComponents(connectButton, backButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing Twitter connection:', error);
            await interaction.reply({
                content: '❌ Error loading connection process.',
                ephemeral: true
            });
        }
    }

    /**
     * Start Twitter connection process
     */
    static async startTwitterConnection(interaction) {
        try {
            const modal = new ModalBuilder()
                .setCustomId('twitter_username_modal')
                .setTitle('Enter X Username');

            const usernameInput = new TextInputBuilder()
                .setCustomId('twitter_username')
                .setLabel('X Username (without @)')
                .setStyle(TextInputStyle.Short)
                .setRequired(true)
                .setPlaceholder('example_username')
                .setMaxLength(50);

            const row = new ActionRowBuilder().addComponents(usernameInput);
            modal.addComponents(row);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error starting Twitter connection:', error);
            await interaction.reply({
                content: '❌ Error starting connection process.',
                ephemeral: true
            });
        }
    }

    /**
     * Process Twitter username submission
     */
    static async processTwitterUsername(interaction) {
        try {
            const username = interaction.fields.getTextInputValue('twitter_username');
            const userId = interaction.user.id;

            // Generate verification code
            const verificationCode = crypto.randomBytes(8).toString('hex').toUpperCase();
            
            // Store pending verification
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            await DatabaseManager.storePendingSocialVerification(userId, {
                platform: 'twitter',
                username: username,
                verificationCode: verificationCode,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 30 * 60 * 1000) // 30 minutes
            });

            const embed = new EmbedBuilder()
                .setTitle('🔐 **VERIFICATION REQUIRED** 🔐')
                .setDescription(
                    `**Step 2: Verify your X account**\n\n` +
                    `**Username:** @${username}\n` +
                    `**Verification Code:** \`${verificationCode}\`\n\n` +
                    `**📝 Instructions:**\n` +
                    `1. Tweet the following message:\n` +
                    `   \`Verifying my X account for DHC: ${verificationCode}\`\n\n` +
                    `2. Copy the tweet URL\n` +
                    `3. Click "Submit Tweet URL" below\n` +
                    `4. Paste the URL to complete verification\n\n` +
                    `**⏰ Expires in 30 minutes**\n\n` +
                    `*Make sure the tweet is public and contains the exact code!*`
                )
                .setColor(0x1da1f2)
                .setFooter({ text: 'X Verification • Step 2 of 3' })
                .setTimestamp();

            const submitButton = new ButtonBuilder()
                .setCustomId('twitter_submit_url')
                .setLabel('📝 Submit Tweet URL')
                .setStyle(ButtonStyle.Success);

            const cancelButton = new ButtonBuilder()
                .setCustomId('twitter_cancel')
                .setLabel('❌ Cancel')
                .setStyle(ButtonStyle.Danger);

            const row = new ActionRowBuilder().addComponents(submitButton, cancelButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

            auditLogger.log('social_verification_started', {
                userId: userId,
                platform: 'twitter',
                username: username,
                verificationCode: verificationCode
            });

        } catch (error) {
            logger.error('Error processing Twitter username:', error);
            await interaction.reply({
                content: '❌ Error processing username. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Show engagement statistics
     */
    static async showEngagementStats(interaction) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const socialStats = playerData?.socialStats || {};
            const socialConnections = playerData?.socialConnections || {};

            let description = '**📊 Social Engagement Statistics**\n\n';

            // Connection status
            description += '**🔗 Connected Accounts:**\n';
            let hasConnections = false;
            Object.entries(this.PLATFORMS).forEach(([key, platform]) => {
                const connection = socialConnections[key.toLowerCase()];
                if (connection) {
                    hasConnections = true;
                    description += `${platform.icon} **${platform.name}**: @${connection.username}\n`;
                }
            });

            if (!hasConnections) {
                description += '*No accounts connected yet*\n';
            }

            description += '\n**🎯 Engagement Summary:**\n';
            const totalEngagements = Object.values(socialStats).reduce((sum, count) => sum + (count || 0), 0);
            description += `**Total Engagements:** ${totalEngagements}\n\n`;

            // Engagement breakdown
            Object.entries(this.ENGAGEMENT_REWARDS).forEach(([action, reward]) => {
                const count = socialStats[action.toLowerCase()] || 0;
                const totalXP = count * reward.xp;
                const totalGold = count * reward.gold;
                description += `${action}: ${count} (${totalXP} XP, ${totalGold} Gold)\n`;
            });

            // Calculate total rewards earned
            const totalXPEarned = Object.entries(this.ENGAGEMENT_REWARDS).reduce((sum, [action, reward]) => {
                return sum + ((socialStats[action.toLowerCase()] || 0) * reward.xp);
            }, 0);

            const totalGoldEarned = Object.entries(this.ENGAGEMENT_REWARDS).reduce((sum, [action, reward]) => {
                return sum + ((socialStats[action.toLowerCase()] || 0) * reward.gold);
            }, 0);

            description += `\n**💰 Total Rewards Earned:**\n`;
            description += `🎖️ XP: ${totalXPEarned}\n`;
            description += `💰 Gold: ${totalGoldEarned}\n\n`;

            description += `**📈 Recent Activity:**\n`;
            description += `*Last 7 days: ${socialStats.weeklyEngagements || 0} engagements*\n`;
            description += `*Last 30 days: ${socialStats.monthlyEngagements || 0} engagements*`;

            const embed = new EmbedBuilder()
                .setTitle('📊 **SOCIAL ENGAGEMENT STATS** 📊')
                .setDescription(description)
                .setColor(0x1da1f2)
                .setFooter({ text: 'Social Statistics • Keep engaging!' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing engagement stats:', error);
            await interaction.reply({
                content: '❌ Error loading engagement statistics.',
                ephemeral: true
            });
        }
    }

    /**
     * Show social quests
     */
    static async showSocialQuests(interaction) {
        try {
            // This would integrate with the quest system
            const embed = new EmbedBuilder()
                .setTitle('🎯 **SOCIAL QUESTS** 🎯')
                .setDescription(
                    '**Available Social Engagement Quests:**\n\n' +
                    '🐦 **Twitter Engagement**\n' +
                    '• Follow @DHCGame - 100 XP, 200 Gold\n' +
                    '• Retweet announcement - 50 XP, 100 Gold\n' +
                    '• Reply to community post - 75 XP, 150 Gold\n\n' +
                    '📱 **Daily Social Challenges**\n' +
                    '• Like 5 community posts - 25 XP, 50 Gold\n' +
                    '• Share game screenshot - 100 XP, 200 Gold\n' +
                    '• Tag 3 friends - 150 XP, 300 Gold\n\n' +
                    '🏆 **Weekly Social Goals**\n' +
                    '• Complete 10 social actions - 500 XP, 1000 Gold\n' +
                    '• Participate in community event - 1000 XP, 2000 Gold\n\n' +
                    '*Connect your social accounts to participate!*'
                )
                .setColor(0x1da1f2)
                .setFooter({ text: 'Social Quests • Engage & Earn' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing social quests:', error);
            await interaction.reply({
                content: '❌ Error loading social quests.',
                ephemeral: true
            });
        }
    }

    /**
     * Show social achievements
     */
    static async showSocialAchievements(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🏆 **SOCIAL ACHIEVEMENTS** 🏆')
                .setDescription(
                    '**Social Media Achievements:**\n\n' +
                    '🐦 **Twitter Achievements**\n' +
                    '• First Connection - Connect X account\n' +
                    '• Social Butterfly - 100 total engagements\n' +
                    '• Viral Content - Get 50 retweets\n' +
                    '• Community Leader - 500 total engagements\n\n' +
                    '💬 **Engagement Achievements**\n' +
                    '• Conversation Starter - 25 replies\n' +
                    '• Supportive Friend - 100 likes given\n' +
                    '• Share Master - 50 retweets made\n' +
                    '• Influencer - 1000 total engagements\n\n' +
                    '🎯 **Quest Achievements**\n' +
                    '• Social Quester - Complete 10 social quests\n' +
                    '• Daily Engager - 7 day engagement streak\n' +
                    '• Community Champion - Complete all social achievements\n\n' +
                    '*Progress tracked automatically when accounts are connected!*'
                )
                .setColor(0xffd700)
                .setFooter({ text: 'Social Achievements • Connect to unlock' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing social achievements:', error);
            await interaction.reply({
                content: '❌ Error loading social achievements.',
                ephemeral: true
            });
        }
    }

    /**
     * Show manage connections
     */
    static async showManageConnections(interaction) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const socialConnections = playerData?.socialConnections || {};

            let description = '**⚙️ Manage Social Connections**\n\n';

            Object.entries(this.PLATFORMS).forEach(([key, platform]) => {
                const connection = socialConnections[key.toLowerCase()];
                if (connection) {
                    description += `${platform.icon} **${platform.name}**\n`;
                    description += `   Username: @${connection.username}\n`;
                    description += `   Connected: ${new Date(connection.connectedAt).toLocaleDateString()}\n`;
                    description += `   Status: ✅ Active\n\n`;
                } else {
                    description += `${platform.icon} **${platform.name}**\n`;
                    description += `   Status: ❌ Not Connected\n\n`;
                }
            });

            const embed = new EmbedBuilder()
                .setTitle('⚙️ **MANAGE CONNECTIONS** ⚙️')
                .setDescription(description)
                .setColor(0x1da1f2)
                .setFooter({ text: 'Connection Management • Secure & Private' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing manage connections:', error);
            await interaction.reply({
                content: '❌ Error loading connection management.',
                ephemeral: true
            });
        }
    }

    /**
     * Process social engagement (called by external monitoring)
     */
    static async processSocialEngagement(userId, platform, engagementType, metadata = {}) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const reward = this.ENGAGEMENT_REWARDS[engagementType.toUpperCase()];
            
            if (!reward) {
                logger.warn(`Unknown engagement type: ${engagementType}`);
                return;
            }

            // Award XP and gold
            const { XPHandler } = await import('../player/XPHandler.js');
            await XPHandler.awardXP(userId, reward.xp, `Social engagement: ${engagementType}`);

            // Update player economy
            const playerData = await DatabaseManager.getPlayer(userId);
            const economy = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };
            economy.gold += reward.gold;
            await DatabaseManager.updatePlayerEconomy(userId, economy);

            // Update social stats
            const socialStats = playerData?.socialStats || {};
            socialStats[engagementType.toLowerCase()] = (socialStats[engagementType.toLowerCase()] || 0) + 1;
            socialStats.weeklyEngagements = (socialStats.weeklyEngagements || 0) + 1;
            socialStats.monthlyEngagements = (socialStats.monthlyEngagements || 0) + 1;
            
            await DatabaseManager.updatePlayerSocialStats(userId, socialStats);

            // Log engagement
            auditLogger.log('social_engagement_processed', {
                userId,
                platform,
                engagementType,
                rewards: reward,
                metadata
            });

            // Check for achievements
            const { AchievementHandler } = await import('../player/AchievementHandler.js');
            await AchievementHandler.updatePlayerStats(userId, {
                socialEngagements: (socialStats.totalEngagements || 0) + 1
            });

            logger.info(`Processed social engagement: ${engagementType} for user ${userId}`);

        } catch (error) {
            logger.error('Error processing social engagement:', error);
        }
    }
} 