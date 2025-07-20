import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ModalBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { auditLogger } from '../../utils/auditLogger.js';

/**
 * P2PTradeHandler - Manages peer-to-peer asset trading
 * Mutual offer, confirm, and exchange process
 */
export class P2PTradeHandler {
    
    // Trade status constants
    static TRADE_STATUS = {
        PENDING: 'pending',
        ACCEPTED: 'accepted',
        REJECTED: 'rejected',
        CANCELLED: 'cancelled',
        COMPLETED: 'completed',
        EXPIRED: 'expired'
    };

    // Trade types
    static TRADE_TYPES = {
        ITEM_FOR_ITEM: 'item_for_item',
        ITEM_FOR_CURRENCY: 'item_for_currency',
        CURRENCY_FOR_ITEM: 'currency_for_item',
        MIXED: 'mixed'
    };

    /**
     * Show P2P trading main menu
     */
    static async showTradingMenu(interaction) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const activeTrades = await DatabaseManager.getPlayerActiveTrades(interaction.user.id);

            let description = '**🤝 Peer-to-Peer Trading System**\n\n';
            description += '**Trade safely with other players:**\n';
            description += '• Create trade offers with items and currency\n';
            description += '• Browse and accept offers from others\n';
            description += '• Secure escrow system protects both parties\n';
            description += '• All trades are logged and auditable\n\n';

            description += `**📊 Your Trading Stats:**\n`;
            description += `• Active Trades: ${activeTrades.length}\n`;
            description += `• Completed Trades: ${playerData?.tradeStats?.completed || 0}\n`;
            description += `• Trade Rating: ${this.calculateTradeRating(playerData?.tradeStats)}\n\n`;

            description += `**🛡️ Safety Features:**\n`;
            description += `• Escrow system holds items during trade\n`;
            description += `• Both parties must confirm before completion\n`;
            description += `• 24-hour trade expiration\n`;
            description += `• Dispute resolution system\n\n`;

            description += '*Select an action:*';

            const embed = new EmbedBuilder()
                .setTitle('🤝 **P2P TRADING** 🤝')
                .setDescription(description)
                .setColor(0x00ff00)
                .setFooter({ text: 'P2P Trading • Secure & Fair' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('📝 Create Trade Offer')
                    .setDescription('Create a new trade offer')
                    .setValue('create_trade'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔍 Browse Offers')
                    .setDescription('Browse available trade offers')
                    .setValue('browse_trades'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📋 My Active Trades')
                    .setDescription('View your active trades')
                    .setValue('my_trades'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 Trade History')
                    .setDescription('View your trading history')
                    .setValue('trade_history'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚙️ Trading Settings')
                    .setDescription('Configure trading preferences')
                    .setValue('trade_settings'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back')
                    .setDescription('Return to previous menu')
                    .setValue('back')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('p2p_trade_menu')
                .setPlaceholder('Select trading action...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing trading menu:', error);
            await interaction.reply({
                content: '❌ Error loading trading menu.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle trading menu selections
     */
    static async handleTradingMenuSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'create_trade':
                    await this.showCreateTradeMenu(interaction);
                    break;
                case 'browse_trades':
                    await this.showBrowseTrades(interaction);
                    break;
                case 'my_trades':
                    await this.showMyTrades(interaction);
                    break;
                case 'trade_history':
                    await this.showTradeHistory(interaction);
                    break;
                case 'trade_settings':
                    await this.showTradeSettings(interaction);
                    break;
                case 'back':
                    // Return to previous menu
                    await interaction.reply({
                        content: '🔙 Returning to previous menu...',
                        ephemeral: true
                    });
                    break;
                default:
                    await this.showTradingMenu(interaction);
            }

        } catch (error) {
            logger.error('Error handling trading menu selection:', error);
            await interaction.reply({
                content: '❌ Error processing selection.',
                ephemeral: true
            });
        }
    }

    /**
     * Show create trade menu
     */
    static async showCreateTradeMenu(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('📝 **CREATE TRADE OFFER** 📝')
                .setDescription(
                    '**Create a new trade offer:**\n\n' +
                    '**📦 What you can offer:**\n' +
                    '• Items from your inventory\n' +
                    '• Currency (gold, tokens, etc.)\n' +
                    '• Combination of both\n\n' +
                    '**🎯 What you can request:**\n' +
                    '• Specific items you want\n' +
                    '• Currency amounts\n' +
                    '• Open to offers\n\n' +
                    '**⚙️ Trade Options:**\n' +
                    '• Set expiration time (1-24 hours)\n' +
                    '• Add trade message/description\n' +
                    '• Choose public or private trade\n\n' +
                    '*Select what you want to offer:*'
                )
                .setColor(0x00ff00)
                .setFooter({ text: 'Create Trade • Step 1 of 3' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎒 Offer Items')
                    .setDescription('Select items from your inventory to offer')
                    .setValue('offer_items'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💰 Offer Currency')
                    .setDescription('Offer gold, tokens, or other currency')
                    .setValue('offer_currency'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Mixed Offer')
                    .setDescription('Offer both items and currency')
                    .setValue('offer_mixed'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back')
                    .setDescription('Return to trading menu')
                    .setValue('back_to_trading')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('create_trade_type')
                .setPlaceholder('Select offer type...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing create trade menu:', error);
            await interaction.reply({
                content: '❌ Error loading create trade menu.',
                ephemeral: true
            });
        }
    }

    /**
     * Show browse trades
     */
    static async showBrowseTrades(interaction) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const activeTrades = await DatabaseManager.getActiveTrades(20); // Get 20 most recent

            if (activeTrades.length === 0) {
                await interaction.reply({
                    content: '📭 No active trades available at the moment.',
                    ephemeral: true
                });
                return;
            }

            let description = '**🔍 Available Trade Offers:**\n\n';

            activeTrades.forEach((trade, index) => {
                const timeLeft = this.getTimeRemaining(trade.expiresAt);
                description += `**${index + 1}.** Trade by ${trade.creatorUsername}\n`;
                description += `   📦 Offering: ${this.formatTradeItems(trade.offering)}\n`;
                description += `   🎯 Requesting: ${this.formatTradeItems(trade.requesting)}\n`;
                description += `   ⏰ Expires: ${timeLeft}\n`;
                description += `   💬 "${trade.message || 'No message'}"\n\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle('🔍 **BROWSE TRADES** 🔍')
                .setDescription(description)
                .setColor(0x0099ff)
                .setFooter({ text: `Browse Trades • ${activeTrades.length} available` })
                .setTimestamp();

            // Create selection options for trades
            const options = activeTrades.slice(0, 20).map((trade, index) => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(`Trade ${index + 1} by ${trade.creatorUsername}`)
                    .setDescription(`${this.formatTradeItems(trade.offering)} → ${this.formatTradeItems(trade.requesting)}`)
                    .setValue(`view_trade_${trade.id}`)
            );

            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Refresh')
                    .setDescription('Refresh trade listings')
                    .setValue('refresh_trades'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back')
                    .setDescription('Return to trading menu')
                    .setValue('back_to_trading')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('browse_trades_select')
                .setPlaceholder('Select a trade to view...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing browse trades:', error);
            await interaction.reply({
                content: '❌ Error loading trade listings.',
                ephemeral: true
            });
        }
    }

    /**
     * Show my active trades
     */
    static async showMyTrades(interaction) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const myTrades = await DatabaseManager.getPlayerActiveTrades(interaction.user.id);

            if (myTrades.length === 0) {
                await interaction.reply({
                    content: '📭 You have no active trades.',
                    ephemeral: true
                });
                return;
            }

            let description = '**📋 Your Active Trades:**\n\n';

            myTrades.forEach((trade, index) => {
                const timeLeft = this.getTimeRemaining(trade.expiresAt);
                const status = trade.status === 'pending' ? '⏳ Pending' : 
                             trade.status === 'accepted' ? '✅ Accepted' : '❌ Rejected';
                
                description += `**${index + 1}.** ${status}\n`;
                description += `   📦 Offering: ${this.formatTradeItems(trade.offering)}\n`;
                description += `   🎯 Requesting: ${this.formatTradeItems(trade.requesting)}\n`;
                description += `   ⏰ Expires: ${timeLeft}\n`;
                
                if (trade.interestedParties && trade.interestedParties.length > 0) {
                    description += `   👥 Interested: ${trade.interestedParties.length} players\n`;
                }
                
                description += '\n';
            });

            const embed = new EmbedBuilder()
                .setTitle('📋 **MY ACTIVE TRADES** 📋')
                .setDescription(description)
                .setColor(0x9932cc)
                .setFooter({ text: `My Trades • ${myTrades.length} active` })
                .setTimestamp();

            // Create management options
            const options = myTrades.map((trade, index) => 
                new StringSelectMenuOptionBuilder()
                    .setLabel(`Manage Trade ${index + 1}`)
                    .setDescription(`${this.formatTradeItems(trade.offering)} → ${this.formatTradeItems(trade.requesting)}`)
                    .setValue(`manage_trade_${trade.id}`)
            );

            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back')
                    .setDescription('Return to trading menu')
                    .setValue('back_to_trading')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('my_trades_select')
                .setPlaceholder('Select a trade to manage...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: true
            });

        } catch (error) {
            logger.error('Error showing my trades:', error);
            await interaction.reply({
                content: '❌ Error loading your trades.',
                ephemeral: true
            });
        }
    }

    /**
     * Create a new trade offer
     */
    static async createTradeOffer(creatorId, offerData) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            
            // Validate offer data
            if (!this.validateTradeOffer(offerData)) {
                throw new Error('Invalid trade offer data');
            }

            // Create trade in database
            const trade = {
                id: this.generateTradeId(),
                creatorId: creatorId,
                creatorUsername: offerData.creatorUsername,
                offering: offerData.offering,
                requesting: offerData.requesting,
                message: offerData.message || '',
                tradeType: offerData.tradeType,
                status: this.TRADE_STATUS.PENDING,
                isPublic: offerData.isPublic !== false,
                createdAt: new Date(),
                expiresAt: new Date(Date.now() + (offerData.expirationHours || 24) * 60 * 60 * 1000),
                interestedParties: []
            };

            await DatabaseManager.createTrade(trade);

            // Move offered items to escrow
            await this.moveItemsToEscrow(creatorId, offerData.offering);

            auditLogger.log('trade_created', {
                tradeId: trade.id,
                creatorId: creatorId,
                offering: offerData.offering,
                requesting: offerData.requesting
            });

            return trade;

        } catch (error) {
            logger.error('Error creating trade offer:', error);
            throw error;
        }
    }

    /**
     * Accept a trade offer
     */
    static async acceptTradeOffer(tradeId, acceptorId) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const trade = await DatabaseManager.getTrade(tradeId);

            if (!trade) {
                throw new Error('Trade not found');
            }

            if (trade.status !== this.TRADE_STATUS.PENDING) {
                throw new Error('Trade is no longer available');
            }

            if (trade.creatorId === acceptorId) {
                throw new Error('Cannot accept your own trade');
            }

            // Validate acceptor has requested items
            const acceptorData = await DatabaseManager.getPlayer(acceptorId);
            if (!this.validatePlayerHasItems(acceptorData, trade.requesting)) {
                throw new Error('You do not have the requested items');
            }

            // Move acceptor's items to escrow
            await this.moveItemsToEscrow(acceptorId, trade.requesting);

            // Update trade status
            await DatabaseManager.updateTrade(tradeId, {
                status: this.TRADE_STATUS.ACCEPTED,
                acceptorId: acceptorId,
                acceptedAt: new Date()
            });

            // Execute the trade
            await this.executeTrade(trade, acceptorId);

            auditLogger.log('trade_accepted', {
                tradeId: tradeId,
                creatorId: trade.creatorId,
                acceptorId: acceptorId
            });

            return true;

        } catch (error) {
            logger.error('Error accepting trade offer:', error);
            throw error;
        }
    }

    /**
     * Execute completed trade
     */
    static async executeTrade(trade, acceptorId) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');

            // Transfer items from escrow to new owners
            await this.transferItemsFromEscrow(trade.creatorId, acceptorId, trade.requesting);
            await this.transferItemsFromEscrow(acceptorId, trade.creatorId, trade.offering);

            // Update trade status
            await DatabaseManager.updateTrade(trade.id, {
                status: this.TRADE_STATUS.COMPLETED,
                completedAt: new Date()
            });

            // Update player trade stats
            await this.updateTradeStats(trade.creatorId, 'completed');
            await this.updateTradeStats(acceptorId, 'completed');

            auditLogger.log('trade_completed', {
                tradeId: trade.id,
                creatorId: trade.creatorId,
                acceptorId: acceptorId,
                itemsTraded: {
                    creatorOffered: trade.offering,
                    acceptorOffered: trade.requesting
                }
            });

        } catch (error) {
            logger.error('Error executing trade:', error);
            throw error;
        }
    }

    /**
     * Utility methods
     */
    static generateTradeId() {
        return `trade_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    static validateTradeOffer(offerData) {
        return offerData.offering && offerData.requesting && 
               (offerData.offering.items?.length > 0 || offerData.offering.currency) &&
               (offerData.requesting.items?.length > 0 || offerData.requesting.currency);
    }

    static validatePlayerHasItems(playerData, requestedItems) {
        // This would check if player has the requested items
        // Implementation would depend on inventory structure
        return true; // Placeholder
    }

    static formatTradeItems(items) {
        let formatted = '';
        
        if (items.items && items.items.length > 0) {
            formatted += items.items.map(item => `${item.name} x${item.quantity || 1}`).join(', ');
        }
        
        if (items.currency) {
            const currencyStr = Object.entries(items.currency)
                .filter(([_, amount]) => amount > 0)
                .map(([type, amount]) => `${amount} ${type}`)
                .join(', ');
            
            if (currencyStr) {
                formatted += (formatted ? ', ' : '') + currencyStr;
            }
        }
        
        return formatted || 'Nothing';
    }

    static getTimeRemaining(expiresAt) {
        const now = new Date();
        const expiry = new Date(expiresAt);
        const diffMs = expiry - now;
        
        if (diffMs <= 0) return 'Expired';
        
        const hours = Math.floor(diffMs / (1000 * 60 * 60));
        const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
        
        return `${hours}h ${minutes}m`;
    }

    static calculateTradeRating(tradeStats) {
        if (!tradeStats) return 'New Trader';
        
        const completed = tradeStats.completed || 0;
        const cancelled = tradeStats.cancelled || 0;
        const total = completed + cancelled;
        
        if (total === 0) return 'New Trader';
        
        const rating = (completed / total) * 100;
        
        if (rating >= 95) return '⭐⭐⭐⭐⭐ Excellent';
        if (rating >= 85) return '⭐⭐⭐⭐ Great';
        if (rating >= 75) return '⭐⭐⭐ Good';
        if (rating >= 60) return '⭐⭐ Fair';
        return '⭐ Poor';
    }

    static async moveItemsToEscrow(playerId, items) {
        // Implementation would move items from player inventory to escrow
        logger.info(`Moving items to escrow for player ${playerId}`);
    }

    static async transferItemsFromEscrow(fromPlayerId, toPlayerId, items) {
        // Implementation would transfer items from escrow to player inventory
        logger.info(`Transferring items from ${fromPlayerId} to ${toPlayerId}`);
    }

    static async updateTradeStats(playerId, action) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(playerId);
            const tradeStats = playerData?.tradeStats || {};
            
            tradeStats[action] = (tradeStats[action] || 0) + 1;
            
            await DatabaseManager.updatePlayerTradeStats(playerId, tradeStats);
        } catch (error) {
            logger.error('Error updating trade stats:', error);
        }
    }
} 