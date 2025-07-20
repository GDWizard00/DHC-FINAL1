import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { DatabaseManager } from '../../database/DatabaseManager.js';
import { ProfileService } from '../../services/ProfileService.js';
import { embedHistory } from '../../utils/embedHistory.js';

/**
 * QuestHandler - Handles daily quests and quest management
 * Complete implementation of the quest system as requested
 */
export class QuestHandler {
    
    // Define quest types and their requirements
    static QUEST_TYPES = {
        DAILY_LOGIN: {
            id: 'daily_login',
            name: 'Daily Login',
            description: 'Log into the game',
            requirement: 1,
            rewards: { gold: 50, keys: 1, xp: 25 },
            type: 'daily'
        },
        MONSTER_HUNTER: {
            id: 'monster_hunter',
            name: 'Monster Hunter',
            description: 'Defeat 3 monsters',
            requirement: 3,
            rewards: { gold: 100, keys: 2, xp: 50 },
            type: 'daily'
        },
        FLOOR_EXPLORER: {
            id: 'floor_explorer',
            name: 'Floor Explorer',
            description: 'Explore 5 areas',
            requirement: 5,
            rewards: { gold: 75, keys: 1, xp: 35 },
            type: 'daily'
        },
        TREASURE_HUNTER: {
            id: 'treasure_hunter',
            name: 'Treasure Hunter',
            description: 'Open 2 chests',
            requirement: 2,
            rewards: { gold: 150, keys: 3, xp: 75 },
            type: 'daily'
        },
        FLOOR_PROGRESSION: {
            id: 'floor_progression',
            name: 'Floor Progression',
            description: 'Reach floor 5',
            requirement: 5,
            rewards: { gold: 200, keys: 2, xp: 100 },
            type: 'daily'
        }
    };

    /**
     * Show quest menu
     */
    static async showQuestMenu(interaction, gameState) {
        try {
            // Get player's current quests
            const playerQuests = await this.getPlayerQuests(gameState.session.userId);
            
            const embed = new EmbedBuilder()
                .setTitle('📜 **DAILY QUESTS** 📜')
                .setDescription('Complete daily quests to earn rewards!')
                .setColor(0x8B4513);

            // Add quest status fields
            for (const quest of playerQuests) {
                const questType = this.QUEST_TYPES[quest.questId];
                if (questType) {
                    const isCompleted = quest.completed;
                    const progress = Math.min(quest.progress, questType.requirement);
                    const status = isCompleted ? '✅ Complete' : `${progress}/${questType.requirement}`;
                    
                    embed.addFields([{
                        name: `${isCompleted ? '✅' : '📋'} ${questType.name}`,
                        value: `${questType.description}\n**Progress:** ${status}\n**Rewards:** ${this.formatRewards(questType.rewards)}`,
                        inline: true
                    }]);
                }
            }

            // Add daily reset info
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            tomorrow.setHours(0, 0, 0, 0);
            
            embed.addFields([{
                name: '🔄 Daily Reset',
                value: `Quests reset at midnight UTC\nNext reset: <t:${Math.floor(tomorrow.getTime() / 1000)}:R>`,
                inline: false
            }]);

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('quest_menu')
                .setPlaceholder('Choose an option...')
                .addOptions([
                    {
                        label: 'Claim Rewards',
                        description: 'Claim rewards from completed quests',
                        value: 'claim_rewards',
                        emoji: '🎁'
                    },
                    {
                        label: 'Reset Quests',
                        description: 'Generate new daily quests (DEV)',
                        value: 'reset_quests',
                        emoji: '🔄'
                    },
                    {
                        label: 'Back to Main Menu',
                        description: 'Return to the main menu',
                        value: 'back_to_main',
                        emoji: '⬅️'
                    }
                ]);

            const row = new ActionRowBuilder()
                .addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            gameState.currentScreen = 'quest_menu';
            gameState.updateActivity();

            logger.info(`Quest menu shown for user ${gameState.session.userId}`);

        } catch (error) {
            logger.error('Error showing quest menu:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: 'Error loading quest menu. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Handle quest menu selections
     */
    static async handleQuestMenuSelection(interaction, selectedValue, gameState) {
        try {
            switch (selectedValue) {
                case 'claim_rewards':
                    await this.claimQuestRewards(interaction, gameState);
                    break;
                    
                case 'reset_quests':
                    await this.resetDailyQuests(interaction, gameState);
                    break;
                
                case 'back_to_main':
                    const { StartMenuHandler } = await import('./StartMenuHandler.js');
                    await StartMenuHandler.showStartMenu(interaction, gameState);
                    break;
                
                default:
                    logger.warn(`Unknown quest menu selection: ${selectedValue}`);
                    await embedHistory.updateWithHistory(interaction, {
                        content: 'Unknown option selected. Please try again.',
                        embeds: [],
                        components: []
                    }, gameState.session.userId);
            }
        } catch (error) {
            logger.error('Error handling quest menu selection:', error);
            throw error;
        }
    }

    /**
     * Show daily quests
     */
    static async showDailyQuests(interaction, gameState) {
        // This method now redirects to the main quest menu
        await this.showQuestMenu(interaction, gameState);
    }

    /**
     * Get player's current quests
     */
    static async getPlayerQuests(playerId) {
        try {
            const quests = await DatabaseManager.getPlayerQuests(playerId);
            
            // If no quests exist, generate daily quests
            if (!quests || quests.length === 0) {
                return await this.generateDailyQuests(playerId);
            }
            
            return quests;
        } catch (error) {
            logger.error('Error getting player quests:', error);
            return [];
        }
    }

    /**
     * Generate daily quests for player
     */
    static async generateDailyQuests(playerId) {
        try {
            const questsToGenerate = ['DAILY_LOGIN', 'MONSTER_HUNTER', 'FLOOR_EXPLORER', 'TREASURE_HUNTER'];
            const quests = [];

            for (const questKey of questsToGenerate) {
                const questType = this.QUEST_TYPES[questKey];
                const quest = {
                    playerId,
                    questId: questKey,
                    progress: 0,
                    completed: false,
                    claimed: false,
                    createdAt: new Date(),
                    expiresAt: this.getNextMidnight()
                };
                
                quests.push(quest);
                await DatabaseManager.createQuest(quest);
            }

            // Mark daily login as completed immediately
            await this.updateQuestProgress(playerId, 'daily_login', 1);

            logger.info(`Generated ${quests.length} daily quests for player ${playerId}`);
            return quests;
        } catch (error) {
            logger.error('Error generating daily quests:', error);
            return [];
        }
    }

    /**
     * Update quest progress
     */
    static async updateQuestProgress(playerId, questType, amount = 1) {
        try {
            const quest = await DatabaseManager.getQuest(playerId, questType);
            if (!quest || quest.completed) return;

            const questTypeData = this.QUEST_TYPES[questType.toUpperCase()];
            if (!questTypeData) return;

            const newProgress = quest.progress + amount;
            let completed = false;
            
            // Check if quest is completed
            if (newProgress >= questTypeData.requirement) {
                completed = true;
                logger.info(`Quest ${questType} completed for player ${playerId}`);
            }

            await DatabaseManager.updateQuestProgress(playerId, questType, newProgress, completed);
            return { ...quest, progress: newProgress, completed };
        } catch (error) {
            logger.error('Error updating quest progress:', error);
        }
    }

    /**
     * Claim quest rewards
     */
    static async claimQuestRewards(interaction, gameState) {
        try {
            const completedQuests = await DatabaseManager.getCompletedQuests(gameState.session.userId);
            const unclaimedQuests = completedQuests.filter(q => !q.claimed);

            if (unclaimedQuests.length === 0) {
                await embedHistory.updateWithHistory(interaction, {
                    content: '❌ No completed quests to claim rewards from.',
                    embeds: [],
                    components: []
                }, gameState.session.userId);
                return;
            }

            let totalRewards = { gold: 0, keys: 0, xp: 0 };
            let rewardText = '';

            for (const quest of unclaimedQuests) {
                const questType = this.QUEST_TYPES[quest.questId];
                if (questType) {
                    totalRewards.gold += questType.rewards.gold || 0;
                    totalRewards.keys += questType.rewards.keys || 0;
                    totalRewards.xp += questType.rewards.xp || 0;
                    rewardText += `✅ ${questType.name}: ${this.formatRewards(questType.rewards)}\n`;
                    
                    // Mark as claimed
                    await DatabaseManager.updateQuest(gameState.session.userId, quest.questId, { claimed: true });
                }
            }

            // Add rewards to player inventory
            gameState.economy.gold = (gameState.economy.gold || 0) + totalRewards.gold;
            if (!gameState.player.inventory) gameState.player.inventory = {};
            gameState.player.inventory.keys = (gameState.player.inventory.keys || 0) + totalRewards.keys;
            
            // Award XP through ProfileService
            let xpResult = null;
            if (totalRewards.xp > 0) {
                xpResult = await ProfileService.addXP(gameState.session.userId, totalRewards.xp, 'Quest rewards');
            }
            
            // Save updated economy
            await DatabaseManager.updatePlayerEconomy(gameState.session.userId, gameState.economy);

            const embed = new EmbedBuilder()
                .setTitle('🎁 **QUEST REWARDS CLAIMED** 🎁')
                .setDescription('Congratulations! You have claimed your quest rewards.')
                .setColor(0x00FF00)
                .addFields([
                    {
                        name: '🏆 Completed Quests',
                        value: rewardText,
                        inline: false
                    },
                    {
                        name: '💰 Total Rewards',
                        value: `🪙 ${totalRewards.gold} Gold\n🗝️ ${totalRewards.keys} Keys\n🎖️ ${totalRewards.xp} XP`,
                        inline: true
                    }
                ]);

            // Add rank up notification if applicable
            if (xpResult && xpResult.rankChanged) {
                embed.addFields([{
                    name: '🏆 RANK UP!',
                    value: `**${xpResult.oldRank}** → **${xpResult.newRank}**\nTotal XP: ${xpResult.totalXP}`,
                    inline: true
                }]);
                embed.setColor(0xFFD700); // Gold color for rank up
            }

            embed.setFooter({ text: 'Great job, adventurer!' });

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: []
            }, gameState.session.userId);

            logger.info(`Player ${gameState.session.userId} claimed rewards for ${unclaimedQuests.length} quests${xpResult?.rankChanged ? ' and ranked up!' : ''}`);

        } catch (error) {
            logger.error('Error claiming quest rewards:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: 'Error claiming quest rewards. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Reset daily quests (for development/testing)
     */
    static async resetDailyQuests(interaction, gameState) {
        try {
            // Remove existing quests
            await DatabaseManager.removePlayerQuests(gameState.session.userId);
            
            // Generate new quests
            await this.generateDailyQuests(gameState.session.userId);

            await embedHistory.updateWithHistory(interaction, {
                content: '🔄 **Daily quests have been reset!** New quests are now available.',
                embeds: [],
                components: []
            }, gameState.session.userId);

            logger.info(`Daily quests reset for player ${gameState.session.userId}`);

        } catch (error) {
            logger.error('Error resetting daily quests:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: 'Error resetting daily quests. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Format rewards for display
     */
    static formatRewards(rewards) {
        let formatted = '';
        if (rewards.gold > 0) formatted += `🪙 ${rewards.gold} Gold `;
        if (rewards.keys > 0) formatted += `🗝️ ${rewards.keys} Keys `;
        if (rewards.xp > 0) formatted += `🎖️ ${rewards.xp} XP `;
        return formatted.trim();
    }

    /**
     * Get next midnight UTC
     */
    static getNextMidnight() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(0, 0, 0, 0);
        return tomorrow;
    }

    /**
     * Update quest progress based on game events
     */
    static async checkQuestProgress(playerId, eventType, data = {}) {
        try {
            switch (eventType) {
                case 'monster_defeated':
                    await this.updateQuestProgress(playerId, 'monster_hunter', 1);
                    break;
                    
                case 'exploration_completed':
                    await this.updateQuestProgress(playerId, 'floor_explorer', 1);
                    break;
                    
                case 'chest_opened':
                    await this.updateQuestProgress(playerId, 'treasure_hunter', 1);
                    break;
                    
                case 'floor_reached':
                    const floorReached = data.floor || 0;
                    if (floorReached >= 5) {
                        await this.updateQuestProgress(playerId, 'floor_progression', floorReached);
                    }
                    break;
                    
                default:
                    // Unknown event type
                    break;
            }
        } catch (error) {
            logger.error('Error checking quest progress:', error);
        }
    }
} 