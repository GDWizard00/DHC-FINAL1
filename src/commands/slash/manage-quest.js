import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, MessageFlags } from 'discord.js';
import { DatabaseManager } from '../../database/DatabaseManager.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';
import crypto from 'crypto';

const data = new SlashCommandBuilder()
    .setName('manage-quest')
    .setDescription('Manage server quests (Admin/Certified Members only)')
    .addSubcommand(sub => sub
        .setName('list')
        .setDescription('List all quests on this server')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true))
        .addStringOption(opt => opt.setName('status').setDescription('Filter by status').setRequired(false)
            .addChoices(
                { name: 'Active', value: 'active' },
                { name: 'Pending Payment', value: 'pending_payment' },
                { name: 'Completed', value: 'completed' },
                { name: 'Cancelled', value: 'cancelled' },
                { name: 'Expired', value: 'expired' }
            )))
    .addSubcommand(sub => sub
        .setName('view')
        .setDescription('View detailed information about a specific quest')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true))
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to view').setRequired(true)))
    .addSubcommand(sub => sub
        .setName('activate')
        .setDescription('Activate a pending quest (after payment confirmation)')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true))
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to activate').setRequired(true)))
    .addSubcommand(sub => sub
        .setName('deactivate')
        .setDescription('Deactivate an active quest')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true))
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to deactivate').setRequired(true))
        .addStringOption(opt => opt.setName('reason').setDescription('Reason for deactivation').setRequired(false)))
    .addSubcommand(sub => sub
        .setName('extend')
        .setDescription('Extend quest duration')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true))
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to extend').setRequired(true))
        .addIntegerOption(opt => opt.setName('hours').setDescription('Additional hours to add').setRequired(true)))
    .addSubcommand(sub => sub
        .setName('participants')
        .setDescription('View quest participants and progress')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true))
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to view participants').setRequired(true)))
    .addSubcommand(sub => sub
        .setName('complete')
        .setDescription('Manually complete a quest and distribute rewards')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true))
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to complete').setRequired(true)))
    .addSubcommand(sub => sub
        .setName('stats')
        .setDescription('View server quest statistics')
        .addStringOption(opt => opt.setName('password').setDescription('Admin password').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export { data };

/**
 * Hash password for validation
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password + process.env.SALT || 'dhc_salt_2024').digest('hex');
}

/**
 * Validate admin password
 */
async function validateAdminPassword(serverId, userId, password) {
    try {
        const serverConfig = await DatabaseManager.getServerConfig(serverId);
        if (!serverConfig) {
            return { valid: false, message: 'No server configuration found. Use `/setup admin` first.' };
        }

        if (serverConfig.adminId === userId) {
            const inputHash = hashPassword(password);
            if (inputHash === serverConfig.adminPasswordHash) {
                return { valid: true, role: 'admin' };
            } else {
                return { valid: false, message: 'Invalid admin password.' };
            }
        }

        return { valid: false, message: 'Only server admin can manage quests currently.' };
    } catch (error) {
        logger.error('Error validating admin password:', error);
        return { valid: false, message: 'Password validation error.' };
    }
}

/**
 * Format quest for display
 */
function formatQuestSummary(quest) {
    const status = quest.status === 'active' ? '🟢' : 
                  quest.status === 'pending_payment' ? '🟡' : 
                  quest.status === 'completed' ? '✅' : 
                  quest.status === 'cancelled' ? '❌' : '⏰';
    
    const type = quest.type === 'standard' ? '🎯' : 
                 quest.type === 'whitelist' ? '🎫' : '💎';
    
    return `${status} ${type} **${quest.title}** (${quest.id})\n` +
           `Type: ${quest.questType || quest.type} | Participants: ${quest.participants?.length || 0}\n` +
           `Expires: <t:${Math.floor(quest.expiresAt.getTime() / 1000)}:R>`;
}

/**
 * Get quest statistics
 */
async function getQuestStats(serverId) {
    try {
        const quests = await DatabaseManager.getServerQuests(serverId);
        
        const stats = {
            total: quests.length,
            active: quests.filter(q => q.status === 'active').length,
            pending: quests.filter(q => q.status === 'pending_payment').length,
            completed: quests.filter(q => q.status === 'completed').length,
            cancelled: quests.filter(q => q.status === 'cancelled').length,
            expired: quests.filter(q => q.status === 'expired').length,
            totalParticipants: quests.reduce((sum, q) => sum + (q.participants?.length || 0), 0),
            standardQuests: quests.filter(q => q.type === 'standard').length,
            whitelistQuests: quests.filter(q => q.type === 'whitelist').length,
            specialQuests: quests.filter(q => q.type === 'special').length
        };

        return stats;
    } catch (error) {
        logger.error('Error getting quest stats:', error);
        return null;
    }
}

export async function execute(interaction) {
    try {
        // Bot Developer Only Access - Command Cleanup Phase 3
        const { BotDeveloperHandler } = await import('../../handlers/admin/BotDeveloperHandler.js');
        if (!BotDeveloperHandler.isBotDeveloper(interaction.user.id)) {
            const { EmbedBuilder } = await import('discord.js');
            const embed = new EmbedBuilder()
                .setTitle('🚫 **ACCESS DENIED** 🚫')
                .setDescription(
                    '**Bot Developer Only Command**\n\n' +
                    '🔒 This command is restricted to the Bot Developer only.\n' +
                    '⚠️ **Security Notice**: This attempt has been logged.\n\n' +
                    '*Quest management is handled by the Bot Developer.*'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'Quest Management • Bot Developer Access Required' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });
            return;
        }

    const sub = interaction.options.getSubcommand();
    const serverId = interaction.guildId;
    const userId = interaction.user.id;
    const password = interaction.options.getString('password');
        // Validate admin password
        const permissionCheck = await validateAdminPassword(serverId, userId, password);
        if (!permissionCheck.valid) {
            await interaction.reply({ 
                content: `❌ ${permissionCheck.message}`, 
                flags: MessageFlags.Ephemeral 
            });
            return;
        }

        switch (sub) {
            case 'list': {
                const statusFilter = interaction.options.getString('status');
                const quests = await DatabaseManager.getServerQuests(serverId);
                
                if (!quests || quests.length === 0) {
                    await interaction.reply({ 
                        content: '📋 No quests found on this server.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                let filteredQuests = quests;
                if (statusFilter) {
                    filteredQuests = quests.filter(q => q.status === statusFilter);
                }

                const embed = new EmbedBuilder()
                    .setTitle('📋 **SERVER QUESTS**')
                    .setDescription(statusFilter ? `Showing ${statusFilter} quests` : 'Showing all quests')
                    .setColor(0x00CED1)
                    .setTimestamp();

                if (filteredQuests.length === 0) {
                    embed.addFields({
                        name: 'No Quests Found',
                        value: `No quests found with status: ${statusFilter}`,
                        inline: false
                    });
                } else {
                    // Group quests by status
                    const grouped = {};
                    filteredQuests.forEach(quest => {
                        if (!grouped[quest.status]) grouped[quest.status] = [];
                        grouped[quest.status].push(quest);
                    });

                    Object.entries(grouped).forEach(([status, questList]) => {
                        const statusTitle = status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                        const questSummaries = questList.map(formatQuestSummary).join('\n\n');
                        
                        embed.addFields({
                            name: `${statusTitle} (${questList.length})`,
                            value: questSummaries.substring(0, 1024), // Discord field limit
                            inline: false
                        });
                    });
                }

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                break;
            }

            case 'view': {
                const questId = interaction.options.getString('quest_id');
                const quest = await DatabaseManager.getQuestById(questId);
                
                if (!quest || quest.serverId !== serverId) {
                    await interaction.reply({ 
                        content: '❌ Quest not found or not accessible.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`🔍 **QUEST DETAILS: ${quest.title}**`)
                    .setDescription(quest.description)
                    .addFields([
                        {
                            name: '🆔 Quest ID',
                            value: quest.id,
                            inline: true
                        },
                        {
                            name: '📊 Status',
                            value: quest.status.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            inline: true
                        },
                        {
                            name: '🎯 Type',
                            value: quest.type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()),
                            inline: true
                        },
                        {
                            name: '👥 Participants',
                            value: quest.participants?.length?.toString() || '0',
                            inline: true
                        },
                        {
                            name: '📅 Created',
                            value: `<t:${Math.floor(quest.createdAt.getTime() / 1000)}:F>`,
                            inline: true
                        },
                        {
                            name: '⏰ Expires',
                            value: `<t:${Math.floor(quest.expiresAt.getTime() / 1000)}:F>`,
                            inline: true
                        }
                    ])
                    .setColor(quest.status === 'active' ? 0x00FF00 : 
                              quest.status === 'pending_payment' ? 0xFFFF00 : 
                              quest.status === 'completed' ? 0x00CED1 : 0xFF0000)
                    .setTimestamp();

                // Add quest-specific details
                if (quest.type === 'standard') {
                    embed.addFields({
                        name: '🎮 Quest Details',
                        value: `**Quest Type:** ${quest.questType?.replace('_', ' ')}\n**Target:** ${quest.target}${quest.parameters?.specific_target ? ` (${quest.parameters.specific_target})` : ''}\n**Rewards:** ${quest.rewards?.gold || 0} gold, ${quest.rewards?.xp || 0} XP`,
                        inline: false
                    });
                } else if (quest.type === 'whitelist') {
                    embed.addFields({
                        name: '🎫 Whitelist Details',
                        value: `**Project:** ${quest.projectName}\n**WL Spots:** ${quest.wlSpots}\n**Winner Selection:** ${quest.winnerSelection || 'random'}`,
                        inline: false
                    });
                } else if (quest.type === 'special') {
                    embed.addFields({
                        name: '💎 Special Quest Details',
                        value: `**Reward Type:** ${quest.rewardType}\n**Reward Details:** ${quest.rewardDetails}\n**Total Cost:** $${quest.pricing?.total || 0}`,
                        inline: false
                    });
                }

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                break;
            }

            case 'activate': {
                const questId = interaction.options.getString('quest_id');
                const quest = await DatabaseManager.getQuestById(questId);
                
                if (!quest || quest.serverId !== serverId) {
                    await interaction.reply({ 
                        content: '❌ Quest not found or not accessible.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                if (quest.status !== 'pending_payment') {
                    await interaction.reply({ 
                        content: '❌ Quest is not pending payment and cannot be activated.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                await DatabaseManager.updateQuest(questId, { status: 'active' });

                await interaction.reply({ 
                    content: `✅ Quest "${quest.title}" has been activated and is now live!`, 
                    flags: MessageFlags.Ephemeral 
                });
                
                auditLogger.log('QUEST', `Quest ${questId} activated by ${userId} on server ${serverId}`, 'quest_activated');
                break;
            }

            case 'deactivate': {
                const questId = interaction.options.getString('quest_id');
                const reason = interaction.options.getString('reason') || 'Deactivated by admin';
                const quest = await DatabaseManager.getQuestById(questId);
                
                if (!quest || quest.serverId !== serverId) {
                    await interaction.reply({ 
                        content: '❌ Quest not found or not accessible.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                if (quest.status !== 'active') {
                    await interaction.reply({ 
                        content: '❌ Quest is not active and cannot be deactivated.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                await DatabaseManager.updateQuest(questId, { 
                    status: 'cancelled',
                    deactivationReason: reason
                });

                await interaction.reply({ 
                    content: `✅ Quest "${quest.title}" has been deactivated.\nReason: ${reason}`, 
                    flags: MessageFlags.Ephemeral 
                });
                
                auditLogger.log('QUEST', `Quest ${questId} deactivated by ${userId} on server ${serverId}: ${reason}`, 'quest_deactivated');
                break;
            }

            case 'extend': {
                const questId = interaction.options.getString('quest_id');
                const hours = interaction.options.getInteger('hours');
                const quest = await DatabaseManager.getQuestById(questId);
                
                if (!quest || quest.serverId !== serverId) {
                    await interaction.reply({ 
                        content: '❌ Quest not found or not accessible.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                if (quest.status !== 'active') {
                    await interaction.reply({ 
                        content: '❌ Quest is not active and cannot be extended.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                const newExpiresAt = new Date(quest.expiresAt.getTime() + (hours * 60 * 60 * 1000));
                await DatabaseManager.updateQuest(questId, { expiresAt: newExpiresAt });

                await interaction.reply({ 
                    content: `✅ Quest "${quest.title}" has been extended by ${hours} hours.\nNew expiration: <t:${Math.floor(newExpiresAt.getTime() / 1000)}:F>`, 
                    flags: MessageFlags.Ephemeral 
                });
                
                auditLogger.log('QUEST', `Quest ${questId} extended by ${hours} hours by ${userId} on server ${serverId}`, 'quest_extended');
                break;
            }

            case 'participants': {
                const questId = interaction.options.getString('quest_id');
                const quest = await DatabaseManager.getQuestById(questId);
                
                if (!quest || quest.serverId !== serverId) {
                    await interaction.reply({ 
                        content: '❌ Quest not found or not accessible.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle(`👥 **PARTICIPANTS: ${quest.title}**`)
                    .setDescription(`Quest ID: ${quest.id}`)
                    .setColor(0x00CED1)
                    .setTimestamp();

                if (!quest.participants || quest.participants.length === 0) {
                    embed.addFields({
                        name: 'No Participants',
                        value: 'No one has joined this quest yet.',
                        inline: false
                    });
                } else {
                    const participantList = quest.participants.map((participant, index) => {
                        return `${index + 1}. <@${participant.userId}> - Progress: ${participant.progress || 0}/${quest.target || 'N/A'}`;
                    }).join('\n');

                    embed.addFields({
                        name: `Participants (${quest.participants.length})`,
                        value: participantList.substring(0, 1024), // Discord field limit
                        inline: false
                    });
                }

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                break;
            }

            case 'complete': {
                const questId = interaction.options.getString('quest_id');
                const quest = await DatabaseManager.getQuestById(questId);
                
                if (!quest || quest.serverId !== serverId) {
                    await interaction.reply({ 
                        content: '❌ Quest not found or not accessible.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                if (quest.status !== 'active') {
                    await interaction.reply({ 
                        content: '❌ Quest is not active and cannot be completed.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                await DatabaseManager.updateQuest(questId, { 
                    status: 'completed',
                    completedAt: new Date()
                });

                await interaction.reply({ 
                    content: `✅ Quest "${quest.title}" has been manually completed.\nRewards will be distributed to participants.`, 
                    flags: MessageFlags.Ephemeral 
                });
                
                auditLogger.log('QUEST', `Quest ${questId} manually completed by ${userId} on server ${serverId}`, 'quest_completed');
                break;
            }

            case 'stats': {
                const stats = await getQuestStats(serverId);
                
                if (!stats) {
                    await interaction.reply({ 
                        content: '❌ Error retrieving quest statistics.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle('📊 **SERVER QUEST STATISTICS**')
                    .setDescription(`Quest statistics for ${interaction.guild.name}`)
                    .addFields([
                        {
                            name: '📈 Overview',
                            value: `**Total Quests:** ${stats.total}\n**Total Participants:** ${stats.totalParticipants}`,
                            inline: true
                        },
                        {
                            name: '📊 By Status',
                            value: `**Active:** ${stats.active}\n**Pending:** ${stats.pending}\n**Completed:** ${stats.completed}\n**Cancelled:** ${stats.cancelled}\n**Expired:** ${stats.expired}`,
                            inline: true
                        },
                        {
                            name: '🎯 By Type',
                            value: `**Standard:** ${stats.standardQuests}\n**Whitelist:** ${stats.whitelistQuests}\n**Special:** ${stats.specialQuests}`,
                            inline: true
                        }
                    ])
                    .setColor(0x00CED1)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                break;
            }

            default:
                await interaction.reply({ content: '❌ Unknown quest management command.', flags: MessageFlags.Ephemeral });
        }

    } catch (error) {
        logger.error('Manage quest command error:', error);
        await interaction.reply({ content: `❌ Error: ${error.message}`, flags: MessageFlags.Ephemeral });
        auditLogger.log('ERROR', `Manage quest command ${sub} failed: ${error.message}`, 'quest_management_error');
    }
} 