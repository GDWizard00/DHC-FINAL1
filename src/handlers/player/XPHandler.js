import { EmbedBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';

/**
 * XPHandler - Manages player XP and ranking system
 * XP earned via quests, achievements, hours played, floors cleared, etc.
 */
export class XPHandler {
    
    // Rank definitions with XP requirements
    static RANKS = [
        { name: 'Novice', minXP: 0, maxXP: 999, color: 0x808080, icon: '🥉' },
        { name: 'Apprentice', minXP: 1000, maxXP: 2499, color: 0x8B4513, icon: '🥈' },
        { name: 'Adventurer', minXP: 2500, maxXP: 4999, color: 0x228B22, icon: '🥇' },
        { name: 'Warrior', minXP: 5000, maxXP: 9999, color: 0x4169E1, icon: '⚔️' },
        { name: 'Champion', minXP: 10000, maxXP: 19999, color: 0x9932CC, icon: '🏆' },
        { name: 'Hero', minXP: 20000, maxXP: 39999, color: 0xFF4500, icon: '🦸' },
        { name: 'Legend', minXP: 40000, maxXP: 79999, color: 0xFF1493, icon: '🌟' },
        { name: 'Mythic', minXP: 80000, maxXP: 159999, color: 0xFFD700, icon: '👑' },
        { name: 'Ascended', minXP: 160000, maxXP: 319999, color: 0x00FFFF, icon: '✨' },
        { name: 'Eternal', minXP: 320000, maxXP: Infinity, color: 0xFFFFFF, icon: '🔮' }
    ];

    // XP reward values for different activities
    static XP_REWARDS = {
        FLOOR_CLEARED: 10,
        MONSTER_DEFEATED: 5,
        CHEST_OPENED: 8,
        QUEST_COMPLETED: 50,
        ACHIEVEMENT_UNLOCKED: 100,
        HOUR_PLAYED: 20,
        DEATH_SURVIVED: 15,
        BOSS_DEFEATED: 25,
        RARE_ITEM_FOUND: 12,
        MARKETPLACE_TRANSACTION: 3,
        SOCIAL_ENGAGEMENT: 30
    };

    /**
     * Award XP to player
     */
    static async awardXP(playerId, amount, reason = 'Unknown') {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(playerId);
            const currentXP = playerData?.xp || 0;
            const newXP = currentXP + amount;

            // Get current and new ranks
            const currentRank = this.getRankByXP(currentXP);
            const newRank = this.getRankByXP(newXP);
            const rankChanged = currentRank.name !== newRank.name;

            // Update player XP
            await DatabaseManager.updateOne('players', 
                { discordId: playerId },
                { 
                    $set: { 
                        xp: newXP,
                        rank: newRank.name,
                        lastXPUpdate: new Date()
                    }
                }
            );

            // Log XP award
            auditLogger.log('xp_awarded', {
                userId: playerId,
                amount,
                reason,
                totalXP: newXP,
                currentRank: currentRank.name,
                newRank: newRank.name,
                rankChanged
            });

            // Update achievements and stats
            const { AchievementHandler } = await import('./AchievementHandler.js');
            await AchievementHandler.updatePlayerStats(playerId, {
                totalXP: newXP,
                xpGained: amount
            });

            return {
                oldXP: currentXP,
                newXP,
                xpGained: amount,
                oldRank: currentRank,
                newRank,
                rankChanged,
                reason
            };

        } catch (error) {
            logger.error('Error awarding XP:', error);
            throw error;
        }
    }

    /**
     * Get rank by XP amount
     */
    static getRankByXP(xp) {
        return this.RANKS.find(rank => xp >= rank.minXP && xp <= rank.maxXP) || this.RANKS[0];
    }

    /**
     * Get XP needed for next rank
     */
    static getXPToNextRank(currentXP) {
        const currentRank = this.getRankByXP(currentXP);
        const currentRankIndex = this.RANKS.findIndex(rank => rank.name === currentRank.name);
        
        if (currentRankIndex === this.RANKS.length - 1) {
            return 0; // Max rank reached
        }
        
        const nextRank = this.RANKS[currentRankIndex + 1];
        return nextRank.minXP - currentXP;
    }

    /**
     * Show player rank and XP info
     */
    static async showPlayerRank(interaction) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const currentXP = playerData?.xp || 0;
            const currentRank = this.getRankByXP(currentXP);
            const xpToNext = this.getXPToNextRank(currentXP);
            const stats = playerData?.stats || {};

            // Calculate progress in current rank
            const progressInRank = currentXP - currentRank.minXP;
            const rankRange = currentRank.maxXP === Infinity ? 
                100000 : currentRank.maxXP - currentRank.minXP + 1;
            const progressPercentage = Math.min((progressInRank / rankRange) * 100, 100);

            let description = `**${currentRank.icon} Rank: ${currentRank.name}**\n`;
            description += `**💎 Total XP: ${currentXP.toLocaleString()}**\n\n`;

            if (xpToNext > 0) {
                description += `**📈 Progress to Next Rank:**\n`;
                description += `${this.createProgressBar(progressPercentage)} ${progressPercentage.toFixed(1)}%\n`;
                description += `**${xpToNext.toLocaleString()} XP** needed for next rank\n\n`;
            } else {
                description += `**🏆 Maximum Rank Achieved!**\n\n`;
            }

            description += `**📊 XP Sources:**\n`;
            description += `🌋 Floors Cleared: ${(stats.floorsCompleted || 0) * this.XP_REWARDS.FLOOR_CLEARED} XP\n`;
            description += `⚔️ Monsters Defeated: ${(stats.monstersDefeated || 0) * this.XP_REWARDS.MONSTER_DEFEATED} XP\n`;
            description += `🗃️ Chests Opened: ${(stats.chestsOpened || 0) * this.XP_REWARDS.CHEST_OPENED} XP\n`;
            description += `📋 Quests Completed: ${(stats.questsCompleted || 0) * this.XP_REWARDS.QUEST_COMPLETED} XP\n`;
            description += `🏆 Achievements: ${(stats.achievementsUnlocked || 0) * this.XP_REWARDS.ACHIEVEMENT_UNLOCKED} XP\n`;
            description += `⏰ Hours Played: ${Math.floor((stats.timePlayed || 0) / 3600) * this.XP_REWARDS.HOUR_PLAYED} XP\n\n`;

            // Show all ranks
            description += `**🎖️ All Ranks:**\n`;
            this.RANKS.forEach((rank, index) => {
                const status = currentXP >= rank.minXP ? '✅' : '🔒';
                const maxXPText = rank.maxXP === Infinity ? '∞' : rank.maxXP.toLocaleString();
                description += `${status} ${rank.icon} **${rank.name}** (${rank.minXP.toLocaleString()} - ${maxXPText} XP)\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle('🎖️ **PLAYER RANK & XP** 🎖️')
                .setDescription(description)
                .setColor(currentRank.color)
                .setFooter({ text: `Rank System • ${currentRank.name}` })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing player rank:', error);
            await interaction.reply({
                content: '❌ Error loading rank information.',
                ephemeral: true
            });
        }
    }

    /**
     * Create progress bar visual
     */
    static createProgressBar(percentage, length = 10) {
        const filled = Math.floor((percentage / 100) * length);
        const empty = length - filled;
        
        return '█'.repeat(filled) + '░'.repeat(empty);
    }

    /**
     * Award XP for specific activities
     */
    static async awardActivityXP(playerId, activity, count = 1) {
        const xpAmount = this.XP_REWARDS[activity] * count;
        if (xpAmount > 0) {
            return await this.awardXP(playerId, xpAmount, activity.toLowerCase().replace('_', ' '));
        }
        return null;
    }

    /**
     * Get leaderboard by XP
     */
    static async getXPLeaderboard(limit = 10) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            
            // This would need to be implemented in DatabaseManager
            const players = await DatabaseManager.getTopPlayersByXP(limit);
            
            return players.map((player, index) => ({
                rank: index + 1,
                username: player.username || 'Unknown',
                xp: player.xp || 0,
                rankInfo: this.getRankByXP(player.xp || 0)
            }));

        } catch (error) {
            logger.error('Error getting XP leaderboard:', error);
            return [];
        }
    }

    /**
     * Show XP leaderboard
     */
    static async showXPLeaderboard(interaction) {
        try {
            const leaderboard = await this.getXPLeaderboard(20);
            
            if (leaderboard.length === 0) {
                await interaction.reply({
                    content: '📊 No leaderboard data available yet.',
                    ephemeral: true
                });
                return;
            }

            let description = '**🏆 Top Players by XP:**\n\n';
            
            leaderboard.forEach((player, index) => {
                const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
                description += `${medal} **#${player.rank}** ${player.username}\n`;
                description += `   ${player.rankInfo.icon} ${player.rankInfo.name} • ${player.xp.toLocaleString()} XP\n\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle('🏆 **XP LEADERBOARD** 🏆')
                .setDescription(description)
                .setColor(0xffd700)
                .setFooter({ text: 'XP Leaderboard • Top 20 Players' })
                .setTimestamp();

            await interaction.reply({
                embeds: [embed],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing XP leaderboard:', error);
            await interaction.reply({
                content: '❌ Error loading leaderboard.',
                ephemeral: true
            });
        }
    }

    /**
     * Calculate total possible XP from stats
     */
    static calculateTotalPossibleXP(stats) {
        let totalXP = 0;
        
        totalXP += (stats.floorsCompleted || 0) * this.XP_REWARDS.FLOOR_CLEARED;
        totalXP += (stats.monstersDefeated || 0) * this.XP_REWARDS.MONSTER_DEFEATED;
        totalXP += (stats.chestsOpened || 0) * this.XP_REWARDS.CHEST_OPENED;
        totalXP += (stats.questsCompleted || 0) * this.XP_REWARDS.QUEST_COMPLETED;
        totalXP += (stats.achievementsUnlocked || 0) * this.XP_REWARDS.ACHIEVEMENT_UNLOCKED;
        totalXP += Math.floor((stats.timePlayed || 0) / 3600) * this.XP_REWARDS.HOUR_PLAYED;
        
        return totalXP;
    }
} 