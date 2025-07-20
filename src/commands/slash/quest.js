import { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, MessageFlags } from 'discord.js';
import { DatabaseManager } from '../../database/DatabaseManager.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';

const data = new SlashCommandBuilder()
    .setName('quest')
    .setDescription('Participate in server quests')
    .addSubcommand(sub => sub
        .setName('list')
        .setDescription('View available quests on this server')
        .addStringOption(opt => opt.setName('type').setDescription('Filter by quest type').setRequired(false)
            .addChoices(
                { name: 'Standard - Game rewards', value: 'standard' },
                { name: 'Whitelist - WL distribution', value: 'whitelist' },
                { name: 'Special - Premium rewards', value: 'special' }
            ))
        .addStringOption(opt => opt.setName('category').setDescription('Filter by category').setRequired(false)
            .addChoices(
                { name: 'Daily', value: 'daily' },
                { name: 'Weekly', value: 'weekly' },
                { name: 'Event', value: 'event' },
                { name: 'Seasonal', value: 'seasonal' }
            )))
    .addSubcommand(sub => sub
        .setName('join')
        .setDescription('Join a quest')
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to join').setRequired(true)))
    .addSubcommand(sub => sub
        .setName('leave')
        .setDescription('Leave a quest')
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to leave').setRequired(true)))
    .addSubcommand(sub => sub
        .setName('progress')
        .setDescription('View your quest progress')
        .addStringOption(opt => opt.setName('quest_id').setDescription('Specific quest ID (optional)').setRequired(false)))
    .addSubcommand(sub => sub
        .setName('details')
        .setDescription('View detailed information about a quest')
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID to view').setRequired(true)))
    .addSubcommand(sub => sub
        .setName('my-quests')
        .setDescription('View all your active quests'))
    .addSubcommand(sub => sub
        .setName('leaderboard')
        .setDescription('View quest leaderboard')
        .addStringOption(opt => opt.setName('quest_id').setDescription('Quest ID for leaderboard').setRequired(true)));

export { data };

/**
 * Format quest for display
 */
function formatQuestDisplay(quest, isParticipant = false, userProgress = null) {
    const statusEmoji = quest.status === 'active' ? '🟢' : 
                       quest.status === 'pending_payment' ? '🟡' : 
                       quest.status === 'completed' ? '✅' : '❌';
    
    const typeEmoji = quest.type === 'standard' ? '🎯' : 
                     quest.type === 'whitelist' ? '🎫' : '💎';
    
    const difficultyEmoji = quest.parameters?.difficulty === 'easy' ? '🟢' :
                           quest.parameters?.difficulty === 'medium' ? '🟡' :
                           quest.parameters?.difficulty === 'hard' ? '🔴' :
                           quest.parameters?.difficulty === 'expert' ? '🟣' : '⚪';

    let displayText = `${statusEmoji} ${typeEmoji} **${quest.title}**`;
    
    if (quest.parameters?.difficulty) {
        displayText += ` ${difficultyEmoji}`;
    }
    
    displayText += `\n${quest.description}`;
    
    if (quest.type === 'standard') {
        displayText += `\n**Target:** ${quest.target}`;
        if (quest.parameters?.specific_target) {
            displayText += ` (${quest.parameters.specific_target})`;
        }
        if (quest.parameters?.time_limit_minutes) {
            displayText += `\n**Time Limit:** ${quest.parameters.time_limit_minutes} minutes`;
        }
        if (quest.rewards) {
            const rewards = [];
            if (quest.rewards.gold > 0) rewards.push(`${quest.rewards.gold} gold`);
            if (quest.rewards.xp > 0) rewards.push(`${quest.rewards.xp} XP`);
            if (quest.rewards.items && quest.rewards.items.length > 0) {
                rewards.push(`Items: ${quest.rewards.items.join(', ')}`);
            }
            if (rewards.length > 0) {
                displayText += `\n**Rewards:** ${rewards.join(', ')}`;
            }
        }
    } else if (quest.type === 'whitelist') {
        displayText += `\n**Project:** ${quest.projectName}`;
        displayText += `\n**WL Spots:** ${quest.wlSpots}`;
        displayText += `\n**Selection:** ${quest.winnerSelection || 'random'}`;
    } else if (quest.type === 'special') {
        displayText += `\n**Reward:** ${quest.rewardType} - ${quest.rewardDetails}`;
    }
    
    displayText += `\n**Participants:** ${quest.participants?.length || 0}`;
    if (quest.parameters?.max_participants && quest.parameters.max_participants > 0) {
        displayText += `/${quest.parameters.max_participants}`;
    }
    
    displayText += `\n**Expires:** <t:${Math.floor(quest.expiresAt.getTime() / 1000)}:R>`;
    
    if (isParticipant && userProgress !== null) {
        displayText += `\n**Your Progress:** ${userProgress}/${quest.target || 'N/A'}`;
    }
    
    displayText += `\n**Quest ID:** \`${quest.id}\``;
    
    return displayText;
}

/**
 * Check if user can join quest
 */
function canJoinQuest(quest, userId) {
    if (quest.status !== 'active') {
        return { canJoin: false, reason: 'Quest is not active' };
    }
    
    if (quest.expiresAt && new Date() > quest.expiresAt) {
        return { canJoin: false, reason: 'Quest has expired' };
    }
    
    if (quest.participants && quest.participants.some(p => p.userId === userId)) {
        return { canJoin: false, reason: 'You are already participating in this quest' };
    }
    
    if (quest.parameters?.max_participants && quest.parameters.max_participants > 0) {
        if (quest.participants && quest.participants.length >= quest.parameters.max_participants) {
            return { canJoin: false, reason: 'Quest is full' };
        }
    }
    
    return { canJoin: true };
}

/**
 * Get user's progress in a quest
 */
function getUserQuestProgress(quest, userId) {
    if (!quest.participants) return null;
    
    const participant = quest.participants.find(p => p.userId === userId);
    return participant ? participant.progress || 0 : null;
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
                    '*Regular users can participate in quests through the dashboard interface.*'
                )
                .setColor(0xff0000)
                .setFooter({ text: 'Quest System • Bot Developer Access Required' })
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
        switch (sub) {
            case 'list': {
                const typeFilter = interaction.options.getString('type');
                const categoryFilter = interaction.options.getString('category');
                
                const quests = await DatabaseManager.getServerQuests(serverId);
                
                if (!quests || quests.length === 0) {
                    await interaction.reply({ 
                        content: '📋 No quests available on this server yet.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                let filteredQuests = quests.filter(q => q.status === 'active');
                
                if (typeFilter) {
                    filteredQuests = filteredQuests.filter(q => q.type === typeFilter);
                }
                
                if (categoryFilter) {
                    filteredQuests = filteredQuests.filter(q => q.parameters?.category === categoryFilter);
                }

                const embed = new EmbedBuilder()
                    .setTitle('📋 **AVAILABLE QUESTS**')
                    .setDescription(filteredQuests.length > 0 ? 
                        `Found ${filteredQuests.length} active quest${filteredQuests.length === 1 ? '' : 's'}` : 
                        'No active quests match your filters.')
                    .setColor(0x00CED1)
                    .setTimestamp();

                if (filteredQuests.length === 0) {
                    embed.addFields({
                        name: 'No Quests Found',
                        value: 'Try adjusting your filters or check back later for new quests.',
                        inline: false
                    });
                } else {
                    // Group by type
                    const grouped = {};
                    filteredQuests.forEach(quest => {
                        if (!grouped[quest.type]) grouped[quest.type] = [];
                        grouped[quest.type].push(quest);
                    });

                    Object.entries(grouped).forEach(([type, questList]) => {
                        const typeTitle = type.charAt(0).toUpperCase() + type.slice(1);
                        const questSummaries = questList.map(quest => formatQuestDisplay(quest)).join('\n\n');
                        
                        embed.addFields({
                            name: `${typeTitle} Quests (${questList.length})`,
                            value: questSummaries.substring(0, 1024), // Discord field limit
                            inline: false
                        });
                    });
                }

                await interaction.reply({ embeds: [embed] });
                break;
            }

            case 'join': {
                const questId = interaction.options.getString('quest_id');
                const quest = await DatabaseManager.getQuestById(questId);
                
                if (!quest || quest.serverId !== serverId) {
                    await interaction.reply({ 
                        content: '❌ Quest not found or not available on this server.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                const joinCheck = canJoinQuest(quest, userId);
                if (!joinCheck.canJoin) {
                    await interaction.reply({ 
                        content: `❌ Cannot join quest: ${joinCheck.reason}`, 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                await DatabaseManager.addQuestParticipant(questId, userId, {
                    progress: 0,
                    completed: false
                });

                const embed = new EmbedBuilder()
                    .setTitle('✅ **QUEST JOINED**')
                    .setDescription(`You have successfully joined "${quest.title}"!`)
                    .addFields([
                        {
                            name: '🎯 Quest Details',
                            value: formatQuestDisplay(quest, true, 0),
                            inline: false
                        },
                        {
                            name: '📝 Next Steps',
                            value: 'Start playing the game to make progress on this quest. Use `/quest progress` to check your progress.',
                            inline: false
                        }
                    ])
                    .setColor(0x00FF00)
                    .setTimestamp();

                await interaction.reply({ embeds: [embed] });
                auditLogger.log('QUEST', `User ${userId} joined quest ${questId} on server ${serverId}`, 'quest_joined');
                break;
            }

            case 'leave': {
                const questId = interaction.options.getString('quest_id');
                const quest = await DatabaseManager.getQuestById(questId);
                
                if (!quest || quest.serverId !== serverId) {
                    await interaction.reply({ 
                        content: '❌ Quest not found or not available on this server.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                if (!quest.participants || !quest.participants.some(p => p.userId === userId)) {
                    await interaction.reply({ 
                        content: '❌ You are not participating in this quest.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                // Remove participant from quest
                const updatedParticipants = quest.participants.filter(p => p.userId !== userId);
                await DatabaseManager.updateQuest(questId, { participants: updatedParticipants });

                await interaction.reply({ 
                    content: `✅ You have left the quest "${quest.title}".`, 
                    flags: MessageFlags.Ephemeral 
                });
                
                auditLogger.log('QUEST', `User ${userId} left quest ${questId} on server ${serverId}`, 'quest_left');
                break;
            }

            case 'progress': {
                const questId = interaction.options.getString('quest_id');
                
                if (questId) {
                    // Show progress for specific quest
                    const quest = await DatabaseManager.getQuestById(questId);
                    
                    if (!quest || quest.serverId !== serverId) {
                        await interaction.reply({ 
                            content: '❌ Quest not found or not available on this server.', 
                            flags: MessageFlags.Ephemeral 
                        });
                        return;
                    }

                    const userProgress = getUserQuestProgress(quest, userId);
                    if (userProgress === null) {
                        await interaction.reply({ 
                            content: '❌ You are not participating in this quest.', 
                            flags: MessageFlags.Ephemeral 
                        });
                        return;
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('📊 **QUEST PROGRESS**')
                        .setDescription(`Your progress in "${quest.title}"`)
                        .addFields([
                            {
                                name: '🎯 Quest Details',
                                value: formatQuestDisplay(quest, true, userProgress),
                                inline: false
                            },
                            {
                                name: '📈 Progress Details',
                                value: `**Current Progress:** ${userProgress}/${quest.target || 'N/A'}\n**Completion:** ${quest.target ? Math.round((userProgress / quest.target) * 100) : 0}%`,
                                inline: false
                            }
                        ])
                        .setColor(0x00CED1)
                        .setTimestamp();

                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                } else {
                    // Show progress for all user's quests
                    const quests = await DatabaseManager.getServerQuests(serverId);
                    const userQuests = quests.filter(q => 
                        q.participants && q.participants.some(p => p.userId === userId)
                    );

                    if (userQuests.length === 0) {
                        await interaction.reply({ 
                            content: '📋 You are not participating in any quests on this server.', 
                            flags: MessageFlags.Ephemeral 
                        });
                        return;
                    }

                    const embed = new EmbedBuilder()
                        .setTitle('📊 **YOUR QUEST PROGRESS**')
                        .setDescription(`You are participating in ${userQuests.length} quest${userQuests.length === 1 ? '' : 's'}`)
                        .setColor(0x00CED1)
                        .setTimestamp();

                    userQuests.forEach(quest => {
                        const userProgress = getUserQuestProgress(quest, userId);
                        embed.addFields({
                            name: `${quest.title}`,
                            value: `**Progress:** ${userProgress}/${quest.target || 'N/A'}\n**Status:** ${quest.status}\n**ID:** \`${quest.id}\``,
                            inline: true
                        });
                    });

                    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                }
                break;
            }

            case 'details': {
                const questId = interaction.options.getString('quest_id');
                const quest = await DatabaseManager.getQuestById(questId);
                
                if (!quest || quest.serverId !== serverId) {
                    await interaction.reply({ 
                        content: '❌ Quest not found or not available on this server.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                const isParticipant = quest.participants && quest.participants.some(p => p.userId === userId);
                const userProgress = isParticipant ? getUserQuestProgress(quest, userId) : null;

                const embed = new EmbedBuilder()
                    .setTitle(`🔍 **QUEST DETAILS**`)
                    .setDescription(formatQuestDisplay(quest, isParticipant, userProgress))
                    .setColor(quest.status === 'active' ? 0x00FF00 : 0xFF0000)
                    .setTimestamp();

                // Add parameter details if available
                if (quest.parameters) {
                    let paramDetails = [];
                    if (quest.parameters.min_floor) paramDetails.push(`**Min Floor:** ${quest.parameters.min_floor}`);
                    if (quest.parameters.max_floor) paramDetails.push(`**Max Floor:** ${quest.parameters.max_floor}`);
                    if (quest.parameters.required_hero) paramDetails.push(`**Required Hero:** ${quest.parameters.required_hero}`);
                    if (quest.parameters.forbidden_items) paramDetails.push(`**Forbidden Items:** ${quest.parameters.forbidden_items}`);
                    if (quest.parameters.required_items) paramDetails.push(`**Required Items:** ${quest.parameters.required_items}`);
                    if (quest.parameters.allow_death === false) paramDetails.push(`**No Death Challenge:** Yes`);

                    if (paramDetails.length > 0) {
                        embed.addFields({
                            name: '⚙️ Quest Parameters',
                            value: paramDetails.join('\n'),
                            inline: false
                        });
                    }
                }

                // Add action buttons
                const actionRow = new ActionRowBuilder();
                
                if (quest.status === 'active') {
                    if (isParticipant) {
                        actionRow.addComponents(
                            new ButtonBuilder()
                                .setCustomId(`quest_leave_${questId}`)
                                .setLabel('Leave Quest')
                                .setStyle(ButtonStyle.Danger)
                                .setEmoji('🚪')
                        );
                    } else {
                        const joinCheck = canJoinQuest(quest, userId);
                        if (joinCheck.canJoin) {
                            actionRow.addComponents(
                                new ButtonBuilder()
                                    .setCustomId(`quest_join_${questId}`)
                                    .setLabel('Join Quest')
                                    .setStyle(ButtonStyle.Success)
                                    .setEmoji('✅')
                            );
                        }
                    }
                }

                actionRow.addComponents(
                    new ButtonBuilder()
                        .setCustomId(`quest_refresh_${questId}`)
                        .setLabel('Refresh')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🔄')
                );

                await interaction.reply({ 
                    embeds: [embed], 
                    components: actionRow.components.length > 0 ? [actionRow] : [] 
                });
                break;
            }

            case 'my-quests': {
                const quests = await DatabaseManager.getServerQuests(serverId);
                const userQuests = quests.filter(q => 
                    q.participants && q.participants.some(p => p.userId === userId)
                );

                if (userQuests.length === 0) {
                    await interaction.reply({ 
                        content: '📋 You are not participating in any quests on this server.\n\nUse `/quest list` to see available quests.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setTitle('📋 **YOUR ACTIVE QUESTS**')
                    .setDescription(`You are participating in ${userQuests.length} quest${userQuests.length === 1 ? '' : 's'}`)
                    .setColor(0x00CED1)
                    .setTimestamp();

                userQuests.forEach(quest => {
                    const userProgress = getUserQuestProgress(quest, userId);
                    embed.addFields({
                        name: `${quest.title}`,
                        value: formatQuestDisplay(quest, true, userProgress),
                        inline: false
                    });
                });

                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
                break;
            }

            case 'leaderboard': {
                const questId = interaction.options.getString('quest_id');
                const quest = await DatabaseManager.getQuestById(questId);
                
                if (!quest || quest.serverId !== serverId) {
                    await interaction.reply({ 
                        content: '❌ Quest not found or not available on this server.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                if (!quest.participants || quest.participants.length === 0) {
                    await interaction.reply({ 
                        content: '📊 No participants in this quest yet.', 
                        flags: MessageFlags.Ephemeral 
                    });
                    return;
                }

                // Sort participants by progress
                const sortedParticipants = quest.participants
                    .sort((a, b) => (b.progress || 0) - (a.progress || 0))
                    .slice(0, 10); // Top 10

                const embed = new EmbedBuilder()
                    .setTitle(`🏆 **QUEST LEADERBOARD**`)
                    .setDescription(`Top participants in "${quest.title}"`)
                    .setColor(0xFFD700)
                    .setTimestamp();

                const leaderboardText = sortedParticipants.map((participant, index) => {
                    const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
                    return `${medal} <@${participant.userId}> - ${participant.progress || 0}/${quest.target || 'N/A'}`;
                }).join('\n');

                embed.addFields({
                    name: `Top ${sortedParticipants.length} Participants`,
                    value: leaderboardText,
                    inline: false
                });

                await interaction.reply({ embeds: [embed] });
                break;
            }

            default:
                await interaction.reply({ content: '❌ Unknown quest command.', flags: MessageFlags.Ephemeral });
        }

    } catch (error) {
        logger.error('Quest command error:', error);
        await interaction.reply({ content: `❌ Error: ${error.message}`, flags: MessageFlags.Ephemeral });
        auditLogger.log('ERROR', `Quest command ${sub} failed: ${error.message}`, 'quest_command_error');
    }
} 