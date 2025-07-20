import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';

/**
 * AchievementHandler - Manages player achievements and tracking
 * Tracks progress across various game activities
 */
export class AchievementHandler {
    
    // Achievement definitions with placeholders
    static ACHIEVEMENTS = {
        first_steps: {
            id: 'first_steps',
            name: 'First Steps',
            description: 'Complete your first dungeon floor',
            icon: '👶',
            category: 'exploration',
            requirement: 1,
            reward: { gold: 100, xp: 50 },
            rarity: 'common'
        },
        monster_slayer: {
            id: 'monster_slayer',
            name: 'Monster Slayer',
            description: 'Defeat 100 monsters',
            icon: '⚔️',
            category: 'combat',
            requirement: 100,
            reward: { gold: 500, xp: 200 },
            rarity: 'uncommon'
        },
        treasure_hunter: {
            id: 'treasure_hunter',
            name: 'Treasure Hunter',
            description: 'Open 50 treasure chests',
            icon: '🗃️',
            category: 'exploration',
            requirement: 50,
            reward: { gold: 300, xp: 150 },
            rarity: 'uncommon'
        },
        deep_explorer: {
            id: 'deep_explorer',
            name: 'Deep Explorer',
            description: 'Reach floor 50',
            icon: '🌋',
            category: 'exploration',
            requirement: 50,
            reward: { gold: 1000, xp: 500 },
            rarity: 'rare'
        },
        merchant_friend: {
            id: 'merchant_friend',
            name: 'Merchant Friend',
            description: 'Make 25 marketplace purchases',
            icon: '🛒',
            category: 'economy',
            requirement: 25,
            reward: { gold: 200, xp: 100 },
            rarity: 'common'
        },
        quest_master: {
            id: 'quest_master',
            name: 'Quest Master',
            description: 'Complete 20 daily quests',
            icon: '📋',
            category: 'quests',
            requirement: 20,
            reward: { gold: 400, xp: 200 },
            rarity: 'uncommon'
        },
        survivor: {
            id: 'survivor',
            name: 'Survivor',
            description: 'Survive 10 battles with less than 5 HP',
            icon: '❤️',
            category: 'combat',
            requirement: 10,
            reward: { gold: 250, xp: 125 },
            rarity: 'uncommon'
        },
        wealthy_adventurer: {
            id: 'wealthy_adventurer',
            name: 'Wealthy Adventurer',
            description: 'Accumulate 10,000 gold',
            icon: '💰',
            category: 'economy',
            requirement: 10000,
            reward: { gold: 1000, xp: 300 },
            rarity: 'rare'
        },
        legendary_warrior: {
            id: 'legendary_warrior',
            name: 'Legendary Warrior',
            description: 'Reach floor 100',
            icon: '🏆',
            category: 'exploration',
            requirement: 100,
            reward: { gold: 5000, xp: 1000 },
            rarity: 'epic'
        },
        completionist: {
            id: 'completionist',
            name: 'Completionist',
            description: 'Unlock all other achievements',
            icon: '🌟',
            category: 'meta',
            requirement: 9, // All other achievements
            reward: { gold: 10000, xp: 2000 },
            rarity: 'legendary'
        }
    };

    /**
     * Show player achievements
     */
    static async showAchievements(interaction) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const achievements = playerData?.achievements || {};
            const stats = playerData?.stats || {};

            // Calculate achievement progress
            const achievementProgress = this.calculateAchievementProgress(achievements, stats);
            const completedCount = Object.values(achievements).filter(a => a.completed).length;
            const totalCount = Object.keys(this.ACHIEVEMENTS).length;

            let description = `**🏆 Achievement Progress: ${completedCount}/${totalCount}**\n\n`;

            // Group achievements by category
            const categories = {
                exploration: '🗺️ **Exploration**',
                combat: '⚔️ **Combat**',
                economy: '💰 **Economy**',
                quests: '📋 **Quests**',
                meta: '🌟 **Meta**'
            };

            Object.entries(categories).forEach(([category, title]) => {
                description += `${title}\n`;
                
                Object.values(this.ACHIEVEMENTS)
                    .filter(achievement => achievement.category === category)
                    .forEach(achievement => {
                        const progress = achievementProgress[achievement.id] || { completed: false, progress: 0 };
                        const progressBar = this.createProgressBar(progress.progress, achievement.requirement);
                        const status = progress.completed ? '✅' : '⏳';
                        
                        description += `${status} ${achievement.icon} **${achievement.name}**\n`;
                        description += `   ${achievement.description}\n`;
                        description += `   ${progressBar} ${progress.progress}/${achievement.requirement}\n\n`;
                    });
            });

            const embed = new EmbedBuilder()
                .setTitle('🏆 **ACHIEVEMENTS** 🏆')
                .setDescription(description)
                .setColor(0xffd700)
                .setFooter({ text: `Achievements • ${completedCount}/${totalCount} Complete` })
                .setTimestamp();

            const backButton = new StringSelectMenuBuilder()
                .setCustomId('achievements_back')
                .setPlaceholder('Return to previous menu')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔙 Back')
                        .setDescription('Return to previous screen')
                        .setValue('back')
                ]);

            const row = new ActionRowBuilder().addComponents(backButton);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

            auditLogger.log('achievements_viewed', {
                userId: interaction.user.id,
                username: interaction.user.username,
                completedCount,
                totalCount
            });

        } catch (error) {
            logger.error('Error showing achievements:', error);
            await interaction.reply({
                content: '❌ Error loading achievements.',
                ephemeral: true
            });
        }
    }

    /**
     * Calculate achievement progress based on player stats
     */
    static calculateAchievementProgress(achievements, stats) {
        const progress = {};

        Object.values(this.ACHIEVEMENTS).forEach(achievement => {
            const playerAchievement = achievements[achievement.id] || { completed: false, progress: 0 };
            
            if (playerAchievement.completed) {
                progress[achievement.id] = { completed: true, progress: achievement.requirement };
                return;
            }

            let currentProgress = 0;

            // Calculate progress based on achievement type
            switch (achievement.id) {
                case 'first_steps':
                    currentProgress = stats.floorsCompleted || 0;
                    break;
                case 'monster_slayer':
                    currentProgress = stats.monstersDefeated || 0;
                    break;
                case 'treasure_hunter':
                    currentProgress = stats.chestsOpened || 0;
                    break;
                case 'deep_explorer':
                    currentProgress = stats.maxFloor || 0;
                    break;
                case 'merchant_friend':
                    currentProgress = stats.marketplacePurchases || 0;
                    break;
                case 'quest_master':
                    currentProgress = stats.questsCompleted || 0;
                    break;
                case 'survivor':
                    currentProgress = stats.lowHealthSurvival || 0;
                    break;
                case 'wealthy_adventurer':
                    currentProgress = stats.maxGold || 0;
                    break;
                case 'legendary_warrior':
                    currentProgress = stats.maxFloor || 0;
                    break;
                case 'completionist':
                    currentProgress = Object.values(achievements).filter(a => a.completed).length;
                    break;
            }

            progress[achievement.id] = {
                completed: currentProgress >= achievement.requirement,
                progress: Math.min(currentProgress, achievement.requirement)
            };
        });

        return progress;
    }

    /**
     * Create progress bar visual
     */
    static createProgressBar(current, max, length = 10) {
        const percentage = Math.min(current / max, 1);
        const filled = Math.floor(percentage * length);
        const empty = length - filled;
        
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * Check and award achievements
     */
    static async checkAchievements(playerId, stats) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(playerId);
            const achievements = playerData?.achievements || {};
            const newAchievements = [];

            Object.values(this.ACHIEVEMENTS).forEach(achievement => {
                const playerAchievement = achievements[achievement.id];
                
                if (playerAchievement?.completed) return;

                const progress = this.calculateAchievementProgress(achievements, stats);
                const achievementProgress = progress[achievement.id];

                if (achievementProgress.completed && !playerAchievement?.completed) {
                    // Award achievement
                    achievements[achievement.id] = {
                        completed: true,
                        progress: achievement.requirement,
                        completedAt: new Date(),
                        claimed: false
                    };
                    
                    newAchievements.push(achievement);
                }
            });

            if (newAchievements.length > 0) {
                await DatabaseManager.updatePlayerAchievements(playerId, achievements);
                
                // Log achievement awards
                auditLogger.log('achievements_awarded', {
                    userId: playerId,
                    achievements: newAchievements.map(a => a.id),
                    count: newAchievements.length
                });
            }

            return newAchievements;

        } catch (error) {
            logger.error('Error checking achievements:', error);
            return [];
        }
    }

    /**
     * Claim achievement reward
     */
    static async claimAchievementReward(playerId, achievementId) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const achievement = this.ACHIEVEMENTS[achievementId];
            
            if (!achievement) {
                throw new Error('Achievement not found');
            }

            const playerData = await DatabaseManager.getPlayer(playerId);
            const achievements = playerData?.achievements || {};
            const playerAchievement = achievements[achievementId];

            if (!playerAchievement?.completed || playerAchievement.claimed) {
                throw new Error('Achievement not available for claiming');
            }

            // Award rewards
            const economy = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };
            if (achievement.reward.gold) {
                economy.gold += achievement.reward.gold;
            }

            // Mark as claimed
            achievements[achievementId].claimed = true;
            achievements[achievementId].claimedAt = new Date();

            await DatabaseManager.updatePlayerEconomy(playerId, economy);
            await DatabaseManager.updatePlayerAchievements(playerId, achievements);

            // Award XP if XP system is implemented
            if (achievement.reward.xp) {
                // This would integrate with XP system when implemented
                logger.info(`Would award ${achievement.reward.xp} XP to ${playerId}`);
            }

            auditLogger.log('achievement_claimed', {
                userId: playerId,
                achievementId,
                rewards: achievement.reward
            });

            return achievement.reward;

        } catch (error) {
            logger.error('Error claiming achievement reward:', error);
            throw error;
        }
    }

    /**
     * Update player stats (called from other handlers)
     */
    static async updatePlayerStats(playerId, statUpdates) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(playerId);
            const stats = playerData?.stats || {};

            // Update stats
            Object.entries(statUpdates).forEach(([key, value]) => {
                if (typeof value === 'number') {
                    stats[key] = (stats[key] || 0) + value;
                } else {
                    stats[key] = value;
                }
            });

            await DatabaseManager.updatePlayerStats(playerId, stats);

            // Check for new achievements
            const newAchievements = await this.checkAchievements(playerId, stats);
            
            return { stats, newAchievements };

        } catch (error) {
            logger.error('Error updating player stats:', error);
            throw error;
        }
    }
} 