import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';

/**
 * PvPHandler - Manages Player vs Player combat system
 * Challenge system with wager mechanics, opponent selection, match confirmation, and resolution
 */
export class PvPHandler {
    
    // PvP match status constants
    static MATCH_STATUS = {
        PENDING: 'pending',
        ACCEPTED: 'accepted',
        IN_PROGRESS: 'in_progress',
        COMPLETED: 'completed',
        CANCELLED: 'cancelled',
        EXPIRED: 'expired'
    };

    // PvP match types
    static MATCH_TYPES = {
        CASUAL: 'casual',
        RANKED: 'ranked',
        WAGER: 'wager',
        TOURNAMENT: 'tournament'
    };

    // Wager types
    static WAGER_TYPES = {
        GOLD: 'gold',
        TOKENS: 'tokens',
        ITEMS: 'items',
        MIXED: 'mixed'
    };

    /**
     * Show PvP main menu
     */
    static async showPvPMenu(interaction) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const pvpStats = playerData?.pvpStats || {};
            const activeChallenges = await DatabaseManager.getPlayerActivePvPChallenges(interaction.user.id);

            let description = '**⚔️ Player vs Player Combat**\n\n';
            description += '**Challenge other players to combat:**\n';
            description += '• Casual matches for fun and practice\n';
            description += '• Ranked matches for leaderboard position\n';
            description += '• Wager matches with currency and items\n';
            description += '• Tournament participation\n\n';

            description += `**🏆 Your PvP Stats:**\n`;
            description += `• Wins: ${pvpStats.wins || 0}\n`;
            description += `• Losses: ${pvpStats.losses || 0}\n`;
            description += `• Win Rate: ${this.calculateWinRate(pvpStats)}%\n`;
            description += `• Rank: ${pvpStats.rank || 'Unranked'}\n`;
            description += `• Rating: ${pvpStats.rating || 1000}\n\n`;

            description += `**📋 Active Challenges:**\n`;
            description += `• Pending: ${activeChallenges.pending || 0}\n`;
            description += `• Accepted: ${activeChallenges.accepted || 0}\n`;
            description += `• In Progress: ${activeChallenges.inProgress || 0}\n\n`;

            description += '*Select an action:*';

            const embed = new EmbedBuilder()
                .setTitle('⚔️ **PVP COMBAT** ⚔️')
                .setDescription(description)
                .setColor(0xff4500)
                .setFooter({ text: 'PvP System • Challenge & Conquer' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎯 Challenge Player')
                    .setDescription('Challenge another player to combat')
                    .setValue('challenge_player'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📋 My Challenges')
                    .setDescription('View your active challenges')
                    .setValue('my_challenges'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔍 Find Opponents')
                    .setDescription('Browse available opponents')
                    .setValue('find_opponents'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🏆 Leaderboard')
                    .setDescription('View PvP rankings')
                    .setValue('pvp_leaderboard'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🏟️ Tournament')
                    .setDescription('Join or view tournaments')
                    .setValue('tournaments'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 Match History')
                    .setDescription('View your PvP match history')
                    .setValue('match_history'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚙️ PvP Settings')
                    .setDescription('Configure PvP preferences')
                    .setValue('pvp_settings'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back')
                    .setDescription('Return to previous menu')
                    .setValue('back')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('pvp_menu')
                .setPlaceholder('Select PvP action...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing PvP menu:', error);
            await interaction.reply({
                content: '❌ Error loading PvP menu.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle PvP menu selections
     */
    static async handlePvPMenuSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'challenge_player':
                    await this.showChallengePlayerMenu(interaction);
                    break;
                case 'my_challenges':
                    await this.showMyChallenges(interaction);
                    break;
                case 'find_opponents':
                    await this.showFindOpponents(interaction);
                    break;
                case 'pvp_leaderboard':
                    await this.showPvPLeaderboard(interaction);
                    break;
                case 'tournaments':
                    await this.showTournaments(interaction);
                    break;
                case 'match_history':
                    await this.showMatchHistory(interaction);
                    break;
                case 'pvp_settings':
                    await this.showPvPSettings(interaction);
                    break;
                case 'back':
                    await interaction.reply({
                        content: '🔙 Returning to previous menu...',
                        ephemeral: true
                    });
                    break;
                default:
                    await this.showPvPMenu(interaction);
            }

        } catch (error) {
            logger.error('Error handling PvP menu selection:', error);
            await interaction.reply({
                content: '❌ Error processing selection.',
                ephemeral: true
            });
        }
    }

    /**
     * Show challenge player menu
     */
    static async showChallengePlayerMenu(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🎯 **CHALLENGE PLAYER** 🎯')
                .setDescription(
                    '**Challenge another player to PvP combat:**\n\n' +
                    '**📝 Challenge Types:**\n' +
                    '• **Casual Match** - No stakes, just for fun\n' +
                    '• **Ranked Match** - Affects your ranking\n' +
                    '• **Wager Match** - Bet currency or items\n' +
                    '• **Custom Match** - Set your own rules\n\n' +
                    '**⚔️ Combat System:**\n' +
                    '• Turn-based combat using your equipped gear\n' +
                    '• Hero abilities and items can be used\n' +
                    '• Best of 3 rounds (configurable)\n' +
                    '• Real-time battle with 30-second turns\n\n' +
                    '**🛡️ Fair Play:**\n' +
                    '• Matches are based on similar levels\n' +
                    '• Anti-cheat system monitors all battles\n' +
                    '• Disputes can be reviewed by admins\n\n' +
                    '*Select challenge type:*'
                )
                .setColor(0xff4500)
                .setFooter({ text: 'Challenge Player • Choose Your Battle' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('😎 Casual Match')
                    .setDescription('Friendly match with no stakes')
                    .setValue('casual_challenge'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🏆 Ranked Match')
                    .setDescription('Competitive match affecting rankings')
                    .setValue('ranked_challenge'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💰 Wager Match')
                    .setDescription('Bet currency or items on the outcome')
                    .setValue('wager_challenge'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚙️ Custom Match')
                    .setDescription('Create match with custom rules')
                    .setValue('custom_challenge'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back')
                    .setDescription('Return to PvP menu')
                    .setValue('back_to_pvp')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('challenge_type_select')
                .setPlaceholder('Select challenge type...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing challenge player menu:', error);
            await interaction.reply({
                content: '❌ Error loading challenge menu.',
                ephemeral: true
            });
        }
    }

    /**
     * Create a PvP challenge
     */
    static async createChallenge(challengerId, challengeData) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            
            // Validate challenge data
            if (!this.validateChallengeData(challengeData)) {
                throw new Error('Invalid challenge data');
            }

            // Check if challenger can afford wager
            if (challengeData.wager) {
                const canAfford = await this.validatePlayerCanAffordWager(challengerId, challengeData.wager);
                if (!canAfford) {
                    throw new Error('Insufficient funds for wager');
                }
            }

            // Create challenge
            const challenge = {
                id: this.generateChallengeId(),
                challengerId: challengerId,
                challengerUsername: challengeData.challengerUsername,
                opponentId: challengeData.opponentId,
                opponentUsername: challengeData.opponentUsername,
                matchType: challengeData.matchType,
                wager: challengeData.wager || null,
                customRules: challengeData.customRules || null,
                message: challengeData.message || '',
                status: this.MATCH_STATUS.PENDING,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
                rounds: challengeData.rounds || 3
            };

            await DatabaseManager.createPvPChallenge(challenge);

            // Lock wager funds if applicable
            if (challengeData.wager) {
                await this.lockWagerFunds(challengerId, challengeData.wager);
            }

            auditLogger.log('pvp_challenge_created', {
                challengeId: challenge.id,
                challengerId: challengerId,
                opponentId: challengeData.opponentId,
                matchType: challengeData.matchType,
                wager: challengeData.wager
            });

            return challenge;

        } catch (error) {
            logger.error('Error creating PvP challenge:', error);
            throw error;
        }
    }

    /**
     * Accept a PvP challenge
     */
    static async acceptChallenge(challengeId, acceptorId) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const challenge = await DatabaseManager.getPvPChallenge(challengeId);

            if (!challenge) {
                throw new Error('Challenge not found');
            }

            if (challenge.status !== this.MATCH_STATUS.PENDING) {
                throw new Error('Challenge is no longer available');
            }

            if (challenge.opponentId !== acceptorId) {
                throw new Error('This challenge is not for you');
            }

            // Check if acceptor can afford wager
            if (challenge.wager) {
                const canAfford = await this.validatePlayerCanAffordWager(acceptorId, challenge.wager);
                if (!canAfford) {
                    throw new Error('Insufficient funds for wager');
                }
                
                // Lock acceptor's wager funds
                await this.lockWagerFunds(acceptorId, challenge.wager);
            }

            // Update challenge status
            await DatabaseManager.updatePvPChallenge(challengeId, {
                status: this.MATCH_STATUS.ACCEPTED,
                acceptedAt: new Date()
            });

            // Initialize battle
            const battle = await this.initializeBattle(challenge);

            auditLogger.log('pvp_challenge_accepted', {
                challengeId: challengeId,
                challengerId: challenge.challengerId,
                acceptorId: acceptorId,
                battleId: battle.id
            });

            return battle;

        } catch (error) {
            logger.error('Error accepting PvP challenge:', error);
            throw error;
        }
    }

    /**
     * Initialize PvP battle
     */
    static async initializeBattle(challenge) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            
            // Get player data
            const challenger = await DatabaseManager.getPlayer(challenge.challengerId);
            const opponent = await DatabaseManager.getPlayer(challenge.opponentId);

            // Create battle instance
            const battle = {
                id: this.generateBattleId(),
                challengeId: challenge.id,
                player1: {
                    id: challenge.challengerId,
                    username: challenge.challengerUsername,
                    hero: challenger.selectedHero,
                    health: challenger.hero?.health || 100,
                    mana: challenger.hero?.mana || 50,
                    equipment: challenger.equipment || {}
                },
                player2: {
                    id: challenge.opponentId,
                    username: challenge.opponentUsername,
                    hero: opponent.selectedHero,
                    health: opponent.hero?.health || 100,
                    mana: opponent.hero?.mana || 50,
                    equipment: opponent.equipment || {}
                },
                currentTurn: challenge.challengerId,
                round: 1,
                maxRounds: challenge.rounds,
                turnTimeLimit: 30, // seconds
                status: this.MATCH_STATUS.IN_PROGRESS,
                createdAt: new Date(),
                battleLog: []
            };

            await DatabaseManager.createPvPBattle(battle);

            return battle;

        } catch (error) {
            logger.error('Error initializing PvP battle:', error);
            throw error;
        }
    }

    /**
     * Process battle turn
     */
    static async processBattleTurn(battleId, playerId, action) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const battle = await DatabaseManager.getPvPBattle(battleId);

            if (!battle) {
                throw new Error('Battle not found');
            }

            if (battle.status !== this.MATCH_STATUS.IN_PROGRESS) {
                throw new Error('Battle is not in progress');
            }

            if (battle.currentTurn !== playerId) {
                throw new Error('Not your turn');
            }

            // Process the action
            const result = await this.processAction(battle, playerId, action);

            // Update battle state
            battle.battleLog.push({
                playerId: playerId,
                action: action,
                result: result,
                timestamp: new Date()
            });

            // Check for round/battle end
            const battleResult = this.checkBattleEnd(battle);
            
            if (battleResult.ended) {
                await this.endBattle(battle, battleResult);
            } else {
                // Switch turns
                battle.currentTurn = battle.currentTurn === battle.player1.id ? 
                    battle.player2.id : battle.player1.id;
                
                await DatabaseManager.updatePvPBattle(battleId, battle);
            }

            return { battle, result, battleResult };

        } catch (error) {
            logger.error('Error processing battle turn:', error);
            throw error;
        }
    }

    /**
     * End PvP battle
     */
    static async endBattle(battle, battleResult) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            
            // Update battle status
            battle.status = this.MATCH_STATUS.COMPLETED;
            battle.winner = battleResult.winner;
            battle.completedAt = new Date();
            
            await DatabaseManager.updatePvPBattle(battle.id, battle);

            // Update player stats
            await this.updatePvPStats(battle.player1.id, battleResult.winner === battle.player1.id);
            await this.updatePvPStats(battle.player2.id, battleResult.winner === battle.player2.id);

            // Handle wager if applicable
            const challenge = await DatabaseManager.getPvPChallenge(battle.challengeId);
            if (challenge.wager) {
                await this.processWagerPayout(challenge, battleResult.winner);
            }

            // Award XP and achievements
            const { XPHandler } = await import('../player/XPHandler.js');
            await XPHandler.awardActivityXP(battleResult.winner, 'PVP_WIN');
            await XPHandler.awardActivityXP(battleResult.loser, 'PVP_PARTICIPATION');

            auditLogger.log('pvp_battle_completed', {
                battleId: battle.id,
                winner: battleResult.winner,
                loser: battleResult.loser,
                rounds: battle.round,
                wager: challenge.wager
            });

        } catch (error) {
            logger.error('Error ending PvP battle:', error);
            throw error;
        }
    }

    /**
     * Utility methods
     */
    static generateChallengeId() {
        return `pvp_challenge_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    static generateBattleId() {
        return `pvp_battle_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    static validateChallengeData(challengeData) {
        return challengeData.opponentId && challengeData.matchType && 
               Object.values(this.MATCH_TYPES).includes(challengeData.matchType);
    }

    static calculateWinRate(pvpStats) {
        const wins = pvpStats.wins || 0;
        const losses = pvpStats.losses || 0;
        const total = wins + losses;
        
        if (total === 0) return 0;
        return Math.round((wins / total) * 100);
    }

    static async validatePlayerCanAffordWager(playerId, wager) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(playerId);
            const economy = playerData?.economy || {};

            if (wager.currency) {
                for (const [currencyType, amount] of Object.entries(wager.currency)) {
                    if ((economy[currencyType] || 0) < amount) {
                        return false;
                    }
                }
            }

            if (wager.items) {
                // Check if player has the items
                // Implementation depends on inventory structure
                return true; // Placeholder
            }

            return true;

        } catch (error) {
            logger.error('Error validating wager affordability:', error);
            return false;
        }
    }

    static async lockWagerFunds(playerId, wager) {
        // Implementation would lock funds/items in escrow
        logger.info(`Locking wager funds for player ${playerId}`);
    }

    static async processWagerPayout(challenge, winnerId) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            
            // Transfer wager to winner
            if (challenge.wager.currency) {
                const playerData = await DatabaseManager.getPlayer(winnerId);
                const economy = playerData?.economy || {};
                
                // Winner gets both wagers
                for (const [currencyType, amount] of Object.entries(challenge.wager.currency)) {
                    economy[currencyType] = (economy[currencyType] || 0) + (amount * 2);
                }
                
                await DatabaseManager.updatePlayerEconomy(winnerId, economy);
            }

            // Handle item wagers
            if (challenge.wager.items) {
                // Transfer items to winner
                // Implementation depends on inventory structure
            }

            auditLogger.log('wager_payout_processed', {
                challengeId: challenge.id,
                winnerId: winnerId,
                wager: challenge.wager
            });

        } catch (error) {
            logger.error('Error processing wager payout:', error);
        }
    }

    static async updatePvPStats(playerId, won) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(playerId);
            const pvpStats = playerData?.pvpStats || { wins: 0, losses: 0, rating: 1000 };

            if (won) {
                pvpStats.wins = (pvpStats.wins || 0) + 1;
                pvpStats.rating = Math.min(3000, (pvpStats.rating || 1000) + 25);
            } else {
                pvpStats.losses = (pvpStats.losses || 0) + 1;
                pvpStats.rating = Math.max(500, (pvpStats.rating || 1000) - 20);
            }

            // Update rank based on rating
            pvpStats.rank = this.calculateRank(pvpStats.rating);

            await DatabaseManager.updatePlayerPvPStats(playerId, pvpStats);

        } catch (error) {
            logger.error('Error updating PvP stats:', error);
        }
    }

    static calculateRank(rating) {
        if (rating >= 2500) return 'Grandmaster';
        if (rating >= 2000) return 'Master';
        if (rating >= 1750) return 'Diamond';
        if (rating >= 1500) return 'Platinum';
        if (rating >= 1250) return 'Gold';
        if (rating >= 1000) return 'Silver';
        return 'Bronze';
    }

    static processAction(battle, playerId, action) {
        // Implementation would process the combat action
        // This is a complex system that would handle:
        // - Attack calculations
        // - Ability usage
        // - Item effects
        // - Damage/healing
        // - Status effects
        return { damage: 10, message: 'Attack successful' }; // Placeholder
    }

    static checkBattleEnd(battle) {
        // Check if either player's health is 0 or below
        if (battle.player1.health <= 0) {
            return { ended: true, winner: battle.player2.id, loser: battle.player1.id };
        }
        if (battle.player2.health <= 0) {
            return { ended: true, winner: battle.player1.id, loser: battle.player2.id };
        }
        
        // Check if max rounds reached
        if (battle.round >= battle.maxRounds) {
            // Determine winner by health
            const winner = battle.player1.health > battle.player2.health ? 
                battle.player1.id : battle.player2.id;
            const loser = winner === battle.player1.id ? battle.player2.id : battle.player1.id;
            
            return { ended: true, winner, loser };
        }

        return { ended: false };
    }

    // Placeholder methods for menu items
    static async showMyChallenges(interaction) {
        await interaction.reply({
            content: '📋 **My Challenges** - Implementation in progress...',
            ephemeral: true
        });
    }

    static async showFindOpponents(interaction) {
        await interaction.reply({
            content: '🔍 **Find Opponents** - Implementation in progress...',
            ephemeral: true
        });
    }

    static async showPvPLeaderboard(interaction) {
        await interaction.reply({
            content: '🏆 **PvP Leaderboard** - Implementation in progress...',
            ephemeral: true
        });
    }

    static async showTournaments(interaction) {
        await interaction.reply({
            content: '🏟️ **Tournaments** - Implementation in progress...',
            ephemeral: true
        });
    }

    static async showMatchHistory(interaction) {
        await interaction.reply({
            content: '📊 **Match History** - Implementation in progress...',
            ephemeral: true
        });
    }

    static async showPvPSettings(interaction) {
        await interaction.reply({
            content: '⚙️ **PvP Settings** - Implementation in progress...',
            ephemeral: true
        });
    }
} 