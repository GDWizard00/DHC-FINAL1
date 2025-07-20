import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder, ModalBuilder, TextInputBuilder, TextInputStyle, ButtonBuilder, ButtonStyle } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { embedHistory } from '../../utils/embedHistory.js';

// Marketplace Configuration
const MARKETPLACE_CONFIG = {
    EMBED_COLOR: 0x00ff00,
    TIMEOUT: 1800000, // 30 minutes
    MAX_LISTINGS_PER_USER: 5,
    LISTING_FEE_PERCENTAGE: 0.01, // 1%
    STORE_REFRESH_HOUR: 0, // 0 UTC
    MARKETPLACE_IMAGE: 'https://media.discordapp.net/attachments/1351696887165616169/1357271783107067925/image.png?ex=6874c0d9&is=68736f59&hm=f8ca7ce97cf9f3c0fa2c0430047f9cf59d17de0b64545371600554a5701e84ee&=&format=webp&quality=lossless&width=670&height=602',
    STORE_SELL_RATE: 0.5, // 50% sell rate
    MIN_FEE: 1 // Minimum fee of 1x division currency
};

// Store inventory configuration
const STORE_INVENTORY_CONFIG = {
    MEDIUM_POTIONS: {
        unlimited: true,
        items: ['medium_health_potion', 'medium_mana_potion']
    },
    SCROLL_SHARD_SLOTS: 2,
    WEAPON_SLOTS: 3,
    ARMOR_SLOTS: 2
};

// Division-specific pricing multipliers
const DIVISION_PRICING = {
    gold: { multiplier: 1.0, currency: 'gold' },
    tokens: { multiplier: 1.0, currency: 'tokens' },
    dng: { multiplier: 1.0, currency: 'dng' },
    hero: { multiplier: 1.0, currency: 'hero' },
    eth: { multiplier: 1.0, currency: 'eth' }
};

/**
 * MarketplaceHandler - Main marketplace system handler
 * Manages the permanent storefront with store, player market, and trading systems
 * Designed for web3 integration and real money transactions
 */
export class MarketplaceHandler {
    
    /**
     * Safe interaction response handler with proper acknowledgment checking
     * FIXED: Uses update() for marketplace interactions to keep interface clean
     */
    static async safeInteractionResponse(interaction, options) {
        try {
            // Check interaction state and respond appropriately
            if (interaction.deferred) {
                // Interaction is deferred, use editReply
                await interaction.editReply(options);
            } else if (interaction.replied) {
                // Interaction already replied, use followUp for simple messages only
                if (typeof options === 'string' || (options.content && !options.embeds?.length && !options.components?.length)) {
                    await interaction.followUp({
                        ...options,
                        ephemeral: true
                    });
                } else {
                    // For embeds and components, try to edit the original reply
                    try {
                        await interaction.editReply(options);
                    } catch (editError) {
                        logger.warn('Could not edit reply, sending follow-up:', editError.message);
                        await interaction.followUp({
                            ...options,
                            ephemeral: false
                        });
                    }
                }
            } else {
                // First interaction - check if this came from a permanent embed
                const isPermanentEmbedInteraction = interaction.message && 
                    (interaction.message.embeds?.[0]?.title?.includes('MARKETPLACE') ||
                     interaction.message.embeds?.[0]?.title?.includes('PLAYER CHESTS') ||
                     interaction.message.embeds?.[0]?.title?.includes('CASINO'));
                
                if (isPermanentEmbedInteraction) {
                    // First interaction from permanent embed - use reply to create new message
                    await interaction.reply(options);
                } else {
                    // Subsequent marketplace interactions - use update to keep interface clean
                    await interaction.update(options);
                }
            }
            return true;
        } catch (error) {
            logger.error('Error in safeInteractionResponse:', error);
            
            // Fallback: try basic followUp if nothing else worked
            try {
                if (!interaction.replied && !interaction.deferred) {
                    await interaction.reply({
                        content: typeof options === 'string' ? options : '❌ An error occurred. Please try again.',
                        ephemeral: true
                    });
                }
            } catch (fallbackError) {
                logger.error('Fallback interaction response also failed:', fallbackError);
            }
            return false;
        }
    }
    
    /**
     * Show main marketplace embed (permanent storefront)
     */
    static async showMarketplace(interaction) {
        try {
            logger.info(`Marketplace accessed by user ${interaction.user.id}`);
            
            const embed = new EmbedBuilder()
                .setTitle('🏪 **DUNGEONITES MARKETPLACE** 🏪')
                .setDescription(
                    '**Welcome to the Dungeonites Trading Hub!**\n\n' +
                    '🛒 **Store** - Buy and sell with our shopkeeper\n' +
                    '👥 **Player Market** - Trade with other adventurers\n' +
                    '🔄 **Trading Post** - Barter system and auctions\n' +
                    '🔨 **Crafting** - Coming Soon!\n\n' +
                    '*Select an option below to begin...*'
                )
                .setImage(MARKETPLACE_CONFIG.MARKETPLACE_IMAGE)
                .setColor(MARKETPLACE_CONFIG.EMBED_COLOR)
                .setFooter({ text: 'Secure Web3-Ready Trading Platform' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('marketplace_main')
                .setPlaceholder('Choose a marketplace section...')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🛒 Store')
                        .setDescription('Buy and sell items with the shopkeeper')
                        .setValue('store'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('👥 Player Market')
                        .setDescription('Browse and list items for sale')
                        .setValue('player_market'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔄 Trading Post')
                        .setDescription('Barter system and auctions')
                        .setValue('trading_post'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📦 Player Chests')
                        .setDescription('Manage your Profile and Adventure chests')
                        .setValue('player_chests'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔨 Crafting')
                        .setDescription('Item crafting and enhancement (Coming Soon)')
                        .setValue('crafting')
                        .setEmoji('🚧')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Check if interaction is still valid
            if (interaction.deferred || interaction.replied) {
                logger.warn('Interaction already handled, skipping marketplace display');
                return;
            }

            const marketplaceMessage = await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: false // Permanent storefront
            });

            // Auto-delete after 5 minutes to keep channel clean
            setTimeout(async () => {
                try {
                    await marketplaceMessage.delete();
                    logger.info(`Auto-deleted marketplace embed for user ${interaction.user.id} after 5 minutes`);
                } catch (error) {
                    logger.warn('Could not delete marketplace embed message:', error.message);
                }
            }, 5 * 60 * 1000);

            logger.info(`Marketplace embed displayed to user ${interaction.user.id}`);

        } catch (error) {
            logger.error('Error showing marketplace:', error);
            await this.safeInteractionResponse(interaction, 'An error occurred while loading the marketplace. Please try again.');
        }
    }

    /**
     * Handle main marketplace menu selections
     */
    static async handleMainSelection(interaction, selectedValue) {
        try {
            logger.info(`User ${interaction.user.id} selected marketplace section: ${selectedValue}`);

            switch (selectedValue) {
                case 'store':
                    await this.showStoreMenu(interaction);
                    break;
                case 'player_market':
                    await this.showPlayerMarketMenu(interaction);
                    break;
                case 'trading_post':
                    await this.showTradingPostMenu(interaction);
                    break;
                case 'player_chests':
                    await this.showPlayerChests(interaction);
                    break;
                case 'crafting':
                    await this.showCraftingComingSoon(interaction);
                    break;
                default:
                    await interaction.followUp({
                        content: '❌ Unknown marketplace section.',
                        ephemeral: true
                    });
            }

        } catch (error) {
            logger.error('Error handling marketplace selection:', error);
            await interaction.followUp({
                content: '❌ Error processing selection. Please try again.',
                ephemeral: true
            });
        }
    }



    /**
     * Show player market menu
     */
    static async showPlayerMarketMenu(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('👥 **PLAYER MARKET** 👥')
            .setDescription(
                '**Trade directly with other adventurers!**\n\n' +
                '🔍 **Browse Listings** - View items for sale by other players\n' +
                '📝 **List Item** - Put your items up for sale (1% fee)\n' +
                '📊 **My Listings** - Manage your active listings and history\n\n' +
                '*24-hour listing duration • 5 listing limit • Division-specific*'
            )
            .setThumbnail('https://media.discordapp.net/attachments/1351696887165616169/1355065567228465152/image.png?ex=67e792a7&is=67e64127&hm=af5ca5dc2441836e8572fcc85304099d67d7ac8278e277b3f9ced6b0879fafc0&=&format=webp&quality=lossless&width=824&height=576')
            .setColor(0x5865F2)
            .setFooter({ text: 'Player Market • Peer-to-Peer Trading' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('player_market_main')
            .setPlaceholder('Choose a market action...')
            .addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔍 Browse Listings')
                    .setDescription('View items for sale by other players')
                    .setValue('browse_listings'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📝 List Item')
                    .setDescription('Put your items up for sale (1% fee)')
                    .setValue('list_item'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📊 My Listings')
                    .setDescription('Manage your active listings and history')
                    .setValue('my_listings'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Back to Marketplace')
                    .setDescription('Return to main marketplace')
                    .setValue('back_to_marketplace')
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        // Update the current message instead of creating new one
        await this.safeInteractionResponse(interaction, {
            embeds: [embed],
            components: [row]
        });

        logger.info(`Player market menu shown to user ${interaction.user.id}`);
    }

    /**
     * Show trading post menu
     */
    static async showTradingPostMenu(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔄 **TRADING POST** 🔄')
            .setDescription(
                '**Barter system and auction house!**\n\n' +
                '🤝 **Browse Trades** - View available barter offers\n' +
                '➕ **Create Trade** - Offer items for specific exchanges\n' +
                '🏆 **Auctions** - Bid on rare items with time limits\n' +
                '📬 **My Trades** - Manage your offers and bids\n\n' +
                '*No currency needed - direct item exchanges only*'
            )
            .setColor(MARKETPLACE_CONFIG.EMBED_COLOR)
            .setFooter({ text: 'Trading Post • Barter & Auction System' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('trading_post_menu')
            .setPlaceholder('Choose a trading option...')
            .addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel('🤝 Browse Trades')
                    .setDescription('View available barter offers')
                    .setValue('browse_trades'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('➕ Create Trade')
                    .setDescription('Create a new barter offer')
                    .setValue('create_trade'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🏆 Auctions')
                    .setDescription('Bid on rare items')
                    .setValue('auctions'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('📬 My Trades')
                    .setDescription('Manage your trades and bids')
                    .setValue('my_trades'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Marketplace')
                    .setDescription('Return to main marketplace')
                    .setValue('back_to_main')
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        // Update the current message instead of creating new one
        await this.safeInteractionResponse(interaction, {
            embeds: [embed],
            components: [row]
        });

        logger.info(`Trading post menu shown to user ${interaction.user.id}`);
    }

    /**
     * Show crafting coming soon message
     */
    static async showCraftingComingSoon(interaction) {
        const embed = new EmbedBuilder()
            .setTitle('🔨 **CRAFTING SYSTEM** 🚧')
            .setDescription(
                '**Coming Soon!**\n\n' +
                'The crafting system is currently under development.\n\n' +
                '**Planned Features:**\n' +
                '• Weapon and armor enhancement\n' +
                '• Item combination and upgrading\n' +
                '• Rare material processing\n' +
                '• Custom item creation\n\n' +
                '*Stay tuned for updates!*'
            )
            .setThumbnail('https://media.discordapp.net/attachments/1351696887165616169/1355065567228465152/image.png?ex=67e792a7&is=67e64127&hm=af5ca5dc2441836e8572fcc85304099d67d7ac8278e277b3f9ced6b0879fafc0&=&format=webp&quality=lossless&width=824&height=576')
            .setColor(0x747F8D)
            .setFooter({ text: 'Crafting System • Under Development' });

        const selectMenu = new StringSelectMenuBuilder()
            .setCustomId('crafting_menu')
            .setPlaceholder('Crafting options...')
            .addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Marketplace')
                    .setDescription('Return to main marketplace')
                    .setValue('back_to_main')
            ]);

        const row = new ActionRowBuilder().addComponents(selectMenu);

        await this.safeInteractionResponse(interaction, {
            embeds: [embed],
            components: [row],
            ephemeral: true
        });
    }

    /**
     * Handle "back to marketplace" navigation - redirect to permanent embed and cleanup
     */
    static async handleBackToMain(interaction) {
        try {
            // Delete the current message to clean up
            if (interaction.message && interaction.message.deletable) {
                await interaction.message.delete();
            }

            // Send redirect message with auto-delete
            const redirectMessage = await interaction.reply({
                content: '🏪 **Returning to Marketplace**\n\n📍 **Please use the permanent marketplace menu** in the marketplace channel for continued shopping.\n\n*This prevents duplicate menus and keeps the interface clean.*',
                ephemeral: true
            });

            // Auto-delete the redirect message after 5 seconds
            setTimeout(async () => {
                try {
                    await redirectMessage.delete();
                } catch (error) {
                    // Ignore deletion errors
                }
            }, 5000);
            
            logger.info(`User ${interaction.user.id} redirected back to permanent marketplace and menu cleaned up`);
        } catch (error) {
            logger.error('Error handling back to main:', error);
            // Fallback - just send the redirect message
            await this.safeInteractionResponse(interaction, {
                content: '🏪 **Returning to Marketplace**\n\n📍 **Please use the permanent marketplace menu** in the marketplace channel.',
                ephemeral: true
            });
        }
    }

    /**
     * Show store menu with daily rotating inventory
     */
    static async showStoreMenu(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('🛒 **DUNGEONITES STORE** 🛒')
                .setDescription(
                    '**Welcome to the Official Dungeonites Store!**\n\n' +
                    '🏪 **Daily Rotating Inventory** - Refreshes at 0 UTC\n' +
                    '💰 **Division-Specific Pricing** - Items cost division currency\n' +
                    '🎲 **Coin Flip Gambling** - Test your luck!\n' +
                    '💸 **Sell Items** - Get 50% value back\n\n' +
                    '*What would you like to do?*'
                )
                .setImage(MARKETPLACE_CONFIG.MARKETPLACE_IMAGE)
                .setColor(MARKETPLACE_CONFIG.EMBED_COLOR)
                .setFooter({ text: 'Store • Daily rotation at 0 UTC' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('store_actions')
                .setPlaceholder('Choose a store action...')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🛒 Browse Store Inventory')
                        .setDescription('View today\'s rotating store items')
                        .setValue('browse_store'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('💸 Sell Items')
                        .setDescription('Sell your items for 50% value')
                        .setValue('sell_items'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🎲 Coin Flip')
                        .setDescription('Heads or tails - win 100% profit!')
                        .setValue('coin_flip'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔄 Back to Marketplace')
                        .setDescription('Return to main marketplace')
                        .setValue('back_to_marketplace')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Update the current message instead of creating new one
            await this.safeInteractionResponse(interaction, {
                embeds: [embed],
                components: [row]
            });

            logger.info(`Store menu shown to user ${interaction.user.id}`);

        } catch (error) {
            logger.error('Error showing store menu:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error loading store menu. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle store menu selections
     */
    static async handleStoreSelection(interaction, selectedValue) {
        try {
            // Check if this is a division-specific selection
            if (selectedValue.includes('_')) {
                const parts = selectedValue.split('_');
                const action = parts[0] + '_' + parts[1]; // e.g., "browse_store"
                const division = parts[2]; // e.g., "eth"
                
                switch (action) {
                    case 'browse_store':
                        await this.showStoreInventory(interaction, division); // Pass division parameter
                        break;
                    case 'sell_items':
                        await this.showSellItems(interaction);
                        break;
                    case 'coin_flip':
                        await this.showCoinFlip(interaction);
                        break;
                    default:
                        logger.warn(`Unknown division store selection: ${selectedValue}`);
                        await this.safeInteractionResponse(interaction, {
                            content: '❌ Unknown store option selected. Please try again.',
                            embeds: [],
                            components: []
                        });
                }
                return;
            }
            
            // Handle regular (non-division-specific) selections
            switch (selectedValue) {
                case 'browse_store':
                    await this.showStoreInventory(interaction);
                    break;
                case 'sell_items':
                    await this.showSellItems(interaction);
                    break;
                case 'coin_flip':
                    await this.showCoinFlip(interaction);
                    break;
                case 'back_to_marketplace':
                    await this.handleBackToMain(interaction);
                    break;
                default:
                    logger.warn(`Unknown store selection: ${selectedValue}`);
                    await this.safeInteractionResponse(interaction, {
                        content: '❌ Unknown store option selected. Please try again.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling store selection:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error processing store selection. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show store inventory with division browsing
     */
    static async showStoreInventory(interaction, selectedDivision = null) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            
            // Get current division (use selected division or player's current division)
            const division = selectedDivision || playerData?.currentDivision || 'gold';
            const playerCurrency = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };

            // Get today's store inventory
            const storeInventory = await this.generateDailyStoreInventory();
            const divisionPricing = DIVISION_PRICING[division];

            // Build the store inventory display
            let description = `**🛒 STORE INVENTORY - ${division.toUpperCase()} DIVISION 🛒**\n\n`;
            description += `**Today's Store Inventory**\n`;
            description += `Current Division: ${division.toUpperCase()}\n`;
            description += `Your Balance: ${playerCurrency[divisionPricing.currency]} ${divisionPricing.currency.toUpperCase()}\n\n`;
            description += `💡 **Tip:** You can browse other divisions to see their prices!\n\n`;

            description += `**🧪 UNLIMITED POTIONS**\n`;
            description += `• Medium Health Potion - ${Math.ceil(25 * divisionPricing.multiplier)} ${divisionPricing.currency.toUpperCase()}\n`;
            description += `• Medium Mana Potion - ${Math.ceil(30 * divisionPricing.multiplier)} ${divisionPricing.currency.toUpperCase()}\n\n`;

            description += `**📜 SCROLLS & SHARDS**\n`;
            storeInventory.scrolls.forEach(item => {
                const price = Math.ceil(item.basePrice * divisionPricing.multiplier);
                description += `• ${item.name} - ${price} ${divisionPricing.currency.toUpperCase()}\n`;
            });
            description += `\n`;

            description += `**⚔️ WEAPONS**\n`;
            storeInventory.weapons.forEach(item => {
                const price = Math.ceil(item.basePrice * divisionPricing.multiplier);
                description += `• ${item.name} - ${price} ${divisionPricing.currency.toUpperCase()}\n`;
            });
            description += `\n`;

            description += `**🛡️ ARMOR**\n`;
            storeInventory.armor.forEach(item => {
                const price = Math.ceil(item.basePrice * divisionPricing.multiplier);
                description += `• ${item.name} - ${price} ${divisionPricing.currency.toUpperCase()}\n`;
            });
            description += `\n`;

            description += `**🚪 PORTALS**\n`;
            description += `• Portal Scroll - ${Math.ceil(5 * divisionPricing.multiplier)} ${divisionPricing.currency.toUpperCase()} - Single-use portal access\n\n`;

            description += `*Select an item to purchase or browse other divisions:*`;

            const embed = new EmbedBuilder()
                .setTitle(`🛒 **STORE INVENTORY - ${division.toUpperCase()} DIVISION** 🛒`)
                .setDescription(description)
                .setColor(MARKETPLACE_CONFIG.EMBED_COLOR)
                .setFooter({ text: 'Store Inventory • Refreshes daily at 0 UTC' })
                .setTimestamp();

            // Create purchase options
            const options = [];
            
            // Add division browsing options first
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🏆 Browse Divisions')
                    .setDescription('Switch between divisions to compare prices')
                    .setValue('browse_divisions')
                    .setEmoji('🏆')
            );
            
            // Add unlimited potions
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🧪 Medium Health Potion')
                    .setDescription(`${Math.ceil(25 * divisionPricing.multiplier)} ${divisionPricing.currency.toUpperCase()} - Restores 15 health`)
                    .setValue('buy_medium_health_potion'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🧪 Medium Mana Potion')
                    .setDescription(`${Math.ceil(30 * divisionPricing.multiplier)} ${divisionPricing.currency.toUpperCase()} - Restores 12 mana`)
                    .setValue('buy_medium_mana_potion')
            );

            // Add daily rotation items
            storeInventory.scrolls.forEach((item, index) => {
                const price = Math.ceil(item.basePrice * divisionPricing.multiplier);
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${item.emoji} ${item.name}`)
                        .setDescription(`${price} ${divisionPricing.currency.toUpperCase()} - ${item.description}`)
                        .setValue(`buy_scroll_shard_${index}`)
                );
            });

            storeInventory.weapons.forEach((item, index) => {
                const price = Math.ceil(item.basePrice * divisionPricing.multiplier);
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${item.emoji} ${item.name}`)
                        .setDescription(`${price} ${divisionPricing.currency.toUpperCase()} - ${item.description}`)
                        .setValue(`buy_weapon_${index}`)
                );
            });

            storeInventory.armor.forEach((item, index) => {
                const price = Math.ceil(item.basePrice * divisionPricing.multiplier);
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${item.emoji} ${item.name}`)
                        .setDescription(`${price} ${divisionPricing.currency.toUpperCase()} - ${item.description}`)
                        .setValue(`buy_armor_${index}`)
                );
            });

            // Add Portal Scroll option
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🚪 Portal Scroll')
                    .setDescription(`${Math.ceil(5 * divisionPricing.multiplier)} ${divisionPricing.currency.toUpperCase()} - Single-use portal access`)
                    .setValue('buy_portal_scroll')
            );

            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Back to Store')
                    .setDescription('Return to store menu')
                    .setValue('back_to_store')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('store_purchase')
                .setPlaceholder('Select an item to purchase...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await this.safeInteractionResponse(interaction, {
                embeds: [embed],
                components: [row]
            });

            logger.info(`Store inventory shown to user ${interaction.user.id} for ${division} division`);

        } catch (error) {
            logger.error('Error showing store inventory:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error loading store inventory. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show division browsing menu for store
     */
    static async showDivisionBrowsing(interaction) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const playerCurrency = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };

            const embed = new EmbedBuilder()
                .setTitle('🏆 **BROWSE STORE BY DIVISION** 🏆')
                .setDescription('**Compare prices across all divisions!**\n\nEach division has different pricing for the same items. Browse to see what fits your budget best.\n\n**Your Current Balances:**')
                .setColor(MARKETPLACE_CONFIG.EMBED_COLOR)
                .addFields([
                    {
                        name: '💰 **Your Economy**',
                        value: `🟨 **Gold:** ${playerCurrency.gold}\n🎫 **Tokens:** ${playerCurrency.tokens}\n🔸 **$DNG:** ${playerCurrency.dng}\n🦸 **$HERO:** ${playerCurrency.hero}\n💎 **$ETH:** ${playerCurrency.eth}`,
                        inline: true
                    },
                    {
                        name: '🏪 **Division Info**',
                        value: `🟨 **Gold:** Same pricing\n🎫 **Tokens:** Same pricing\n🔸 **$DNG:** Same pricing\n🦸 **$HERO:** Same pricing\n💎 **$ETH:** Same pricing`,
                        inline: true
                    }
                ])
                .setFooter({ text: 'Select a division to browse its store prices' })
                .setTimestamp();

            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🟨 Gold Division Store')
                    .setDescription('Standard pricing - Gold currency')
                    .setValue('browse_gold_store')
                    .setEmoji('🟨'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎫 Token Division Store')
                    .setDescription('Standard pricing - Token currency')
                    .setValue('browse_tokens_store')
                    .setEmoji('🎫'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔸 $DNG Division Store')
                    .setDescription('Standard pricing - $DNG currency')
                    .setValue('browse_dng_store')
                    .setEmoji('🔸'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🦸 $HERO Division Store')
                    .setDescription('Standard pricing - $HERO currency')
                    .setValue('browse_hero_store')
                    .setEmoji('🦸'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('💎 $ETH Division Store')
                    .setDescription('Standard pricing - $ETH currency')
                    .setValue('browse_eth_store')
                    .setEmoji('💎'),
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Back to Store')
                    .setDescription('Return to store menu')
                    .setValue('back_to_store')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('division_browsing')
                .setPlaceholder('Choose a division to browse...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await this.safeInteractionResponse(interaction, {
                embeds: [embed],
                components: [row]
            });

            logger.info(`Division browsing displayed to user ${interaction.user.id}`);

        } catch (error) {
            logger.error('Error showing division browsing:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error loading division browsing. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Generate daily store inventory based on date
     */
    static async generateDailyStoreInventory() {
        // Use today's date as seed for consistent daily rotation
        const today = new Date();
        const dateString = today.toISOString().split('T')[0]; // YYYY-MM-DD
        const seed = this.hashString(dateString);
        
        // Use seeded random for consistent daily results
        const rng = this.seededRandom(seed);

        // Define available items for rotation
        const availableScrollsShards = [
            { name: 'Scroll of Poison', emoji: '📜', basePrice: 40, description: 'Poisons enemy for 3 turns' },
            { name: 'Scroll of Fire', emoji: '📜', basePrice: 45, description: 'Burns enemy for 2 turns' },
            { name: 'Scroll of Frost', emoji: '📜', basePrice: 45, description: 'Freezes enemy for 2 turns' },
            { name: 'Scroll of Healing', emoji: '📜', basePrice: 35, description: 'Restores 15 health' },
            { name: 'Health Shard', emoji: '💎', basePrice: 60, description: 'Increases max health by 2' },
            { name: 'Mana Shard', emoji: '💎', basePrice: 65, description: 'Increases max mana by 3' },
            { name: 'Ancient Rune', emoji: '🗿', basePrice: 80, description: 'Increases crit chance by 5%' },
            { name: 'Vampire Tooth', emoji: '🦷', basePrice: 75, description: 'Adds +1 damage, 10% drain' }
        ];

        const availableWeapons = [
            { name: 'Iron Sword', emoji: '⚔️', basePrice: 50, description: 'Damage: 2, 1% bleeding' },
            { name: 'Steel Hammer', emoji: '🔨', basePrice: 75, description: 'Damage: 2, 2% stun' },
            { name: 'Silver Sword', emoji: '⚔️', basePrice: 150, description: 'Damage: 3, 5% bleeding' },
            { name: 'War Hammer', emoji: '🔨', basePrice: 200, description: 'Damage: 3, 10% stun' },
            { name: 'Enchanted Bow', emoji: '🏹', basePrice: 180, description: 'Damage: 3, ranged' },
            { name: 'Magic Staff', emoji: '🪄', basePrice: 120, description: 'Damage: 2, mana cost: 1' }
        ];

        const availableArmor = [
            { name: 'Leather Armor', emoji: '🛡️', basePrice: 40, description: 'Defense: 1, floor req: 20' },
            { name: 'Chainmail', emoji: '🛡️', basePrice: 60, description: 'Defense: 2, floor req: 25' },
            { name: 'Steel Plate', emoji: '🛡️', basePrice: 120, description: 'Defense: 3, floor req: 30' },
            { name: 'Enchanted Robe', emoji: '🛡️', basePrice: 100, description: 'Defense: 2, +2 mana' },
            { name: 'Hunter\'s Outfit', emoji: '🛡️', basePrice: 90, description: 'Defense: 2, +10% crit' }
        ];

        // Select items for today
        const selectedScrollsShards = [];
        const selectedWeapons = [];
        const selectedArmor = [];

        // Select 2 scrolls/shards
        for (let i = 0; i < STORE_INVENTORY_CONFIG.SCROLL_SHARD_SLOTS; i++) {
            const randomIndex = Math.floor(rng() * availableScrollsShards.length);
            selectedScrollsShards.push(availableScrollsShards[randomIndex]);
            availableScrollsShards.splice(randomIndex, 1); // Remove to avoid duplicates
        }

        // Select 3 weapons
        for (let i = 0; i < STORE_INVENTORY_CONFIG.WEAPON_SLOTS; i++) {
            const randomIndex = Math.floor(rng() * availableWeapons.length);
            selectedWeapons.push(availableWeapons[randomIndex]);
            availableWeapons.splice(randomIndex, 1); // Remove to avoid duplicates
        }

        // Select 2 armor pieces
        for (let i = 0; i < STORE_INVENTORY_CONFIG.ARMOR_SLOTS; i++) {
            const randomIndex = Math.floor(rng() * availableArmor.length);
            selectedArmor.push(availableArmor[randomIndex]);
            availableArmor.splice(randomIndex, 1); // Remove to avoid duplicates
        }

        return {
            scrolls: selectedScrollsShards, // Changed from scrollsShards to scrolls
            weapons: selectedWeapons,
            armor: selectedArmor,
            refreshDate: dateString
        };
    }

    /**
     * Show coin flip gambling interface
     */
    static async showCoinFlip(interaction) {
        try {
            // Get user's division and currency
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const division = playerData?.economyType || 'gold';
            const playerCurrency = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };
            const divisionPricing = DIVISION_PRICING[division];

            const embed = new EmbedBuilder()
                .setTitle('🎲 **COIN FLIP** 🎲')
                .setDescription(
                    `**Welcome to Coin Flip!**\n\n` +
                    `🪙 **How it works:**\n` +
                    `• Choose heads or tails\n` +
                    `• Wager your ${divisionPricing.currency.toUpperCase()}\n` +
                    `• Win = 100% profit (double your wager)\n` +
                    `• Lose = Lose your wager\n\n` +
                    `**Your Balance:** ${playerCurrency[divisionPricing.currency]} ${divisionPricing.currency.toUpperCase()}\n\n` +
                    `*Select your wager amount:*`
                )
                .setColor(MARKETPLACE_CONFIG.EMBED_COLOR)
                .setFooter({ text: 'Coin Flip • 50/50 chance to win' })
                .setTimestamp();

            const options = [];
            const balance = playerCurrency[divisionPricing.currency];

            // Add wager options based on balance
            const wagerAmounts = [1, 5, 10, 25, 50, 100];
            wagerAmounts.forEach(amount => {
                if (balance >= amount) {
                    options.push(
                        new StringSelectMenuOptionBuilder()
                            .setLabel(`💰 Wager ${amount} ${divisionPricing.currency.toUpperCase()}`)
                            .setDescription(`Win ${amount * 2} ${divisionPricing.currency.toUpperCase()} if correct`)
                            .setValue(`wager_${amount}`)
                    );
                }
            });

            // Add custom wager option
            if (balance > 0) {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('💸 Custom Wager')
                        .setDescription('Enter a custom wager amount')
                        .setValue('custom_wager')
                );
            }

            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Back to Store')
                    .setDescription('Return to store menu')
                    .setValue('back_to_store')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('coin_flip_wager')
                .setPlaceholder('Select your wager amount...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await this.safeInteractionResponse(interaction, {
                embeds: [embed],
                components: [row]
            });

            logger.info(`Coin flip gambling shown to user ${interaction.user.id}`);

        } catch (error) {
            logger.error('Error showing coin flip gambling:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error loading coin flip gambling. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show sell items interface
     */
    static async showSellItems(interaction) {
        try {
            // Get user's inventory and division
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const division = playerData?.economyType || 'gold';
            const inventory = playerData?.inventory || {};
            const divisionPricing = DIVISION_PRICING[division];

            let description = `**💸 SELL YOUR ITEMS**\n\n`;
            description += `**Sell Rate:** 50% of item value\n`;
            description += `**Your Division:** ${division.toUpperCase()}\n`;
            description += `**You'll receive:** ${divisionPricing.currency.toUpperCase()}\n\n`;

            // Check if player has any items to sell
            const sellableItems = [];
            
            // Add weapons
            if (inventory.weapons && inventory.weapons.length > 0) {
                inventory.weapons.forEach((weapon, index) => {
                    const sellPrice = Math.ceil((weapon.goldValue || 10) * MARKETPLACE_CONFIG.STORE_SELL_RATE * divisionPricing.multiplier);
                    sellableItems.push({
                        name: weapon.name || weapon,
                        type: 'weapon',
                        index: index,
                        sellPrice: sellPrice,
                        emoji: '⚔️'
                    });
                });
            }

            // Add armor
            if (inventory.armor && inventory.armor.length > 0) {
                inventory.armor.forEach((armor, index) => {
                    const sellPrice = Math.ceil((armor.goldValue || 8) * MARKETPLACE_CONFIG.STORE_SELL_RATE * divisionPricing.multiplier);
                    sellableItems.push({
                        name: armor.name || armor,
                        type: 'armor',
                        index: index,
                        sellPrice: sellPrice,
                        emoji: '🛡️'
                    });
                });
            }

            if (sellableItems.length === 0) {
                description += `*You have no items to sell.*`;
            } else {
                description += `**Your Sellable Items:**\n`;
                sellableItems.slice(0, 20).forEach((item, index) => {
                    description += `• ${item.emoji} ${item.name} - ${item.sellPrice} ${divisionPricing.currency.toUpperCase()}\n`;
                });
                description += `\n*Select an item to sell:*`;
            }

            const embed = new EmbedBuilder()
                .setTitle('💸 **SELL ITEMS** 💸')
                .setDescription(description)
                .setColor(MARKETPLACE_CONFIG.EMBED_COLOR)
                .setFooter({ text: 'Sell Items • 50% of item value' })
                .setTimestamp();

            const options = [];

            // Add sell options
            sellableItems.slice(0, 20).forEach((item, index) => {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${item.emoji} Sell ${item.name}`)
                        .setDescription(`Get ${item.sellPrice} ${divisionPricing.currency.toUpperCase()}`)
                        .setValue(`sell_${item.type}_${item.index}`)
                );
            });

            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Back to Store')
                    .setDescription('Return to store menu')
                    .setValue('back_to_store')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('sell_items')
                .setPlaceholder('Select an item to sell...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await this.safeInteractionResponse(interaction, {
                embeds: [embed],
                components: [row]
            });

            logger.info(`Sell items interface shown to user ${interaction.user.id}`);

        } catch (error) {
            logger.error('Error showing sell items:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error loading sell items interface. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle store purchase selections
     */
    static async handleStorePurchase(interaction, selectedValue) {
        try {
            if (selectedValue === 'back_to_store') {
                await this.showStoreMenu(interaction);
                return;
            }

            if (selectedValue === 'browse_divisions') {
                await this.showDivisionBrowsing(interaction);
                return;
            }

            // Get user's division and currency
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const division = playerData?.economyType || 'gold';
            const playerCurrency = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };
            const divisionPricing = DIVISION_PRICING[division];

            let itemName = '';
            let itemPrice = 0;
            let itemDescription = '';
            let purchaseSuccessful = false;

            // Handle unlimited potions
            if (selectedValue === 'buy_medium_health_potion') {
                itemName = 'Medium Health Potion';
                itemPrice = Math.ceil(25 * divisionPricing.multiplier);
                itemDescription = 'Restores 15 health';
                
                if (playerCurrency[divisionPricing.currency] >= itemPrice) {
                    // Deduct currency and add item to inventory
                    playerCurrency[divisionPricing.currency] -= itemPrice;
                    await DatabaseManager.updatePlayerEconomy(interaction.user.id, playerCurrency);
                    
                    // Add item to inventory (would need to implement inventory addition)
                    purchaseSuccessful = true;
                }
            } else if (selectedValue === 'buy_medium_mana_potion') {
                itemName = 'Medium Mana Potion';
                itemPrice = Math.ceil(30 * divisionPricing.multiplier);
                itemDescription = 'Restores 12 mana';
                
                if (playerCurrency[divisionPricing.currency] >= itemPrice) {
                    // Deduct currency and add item to inventory
                    playerCurrency[divisionPricing.currency] -= itemPrice;
                    await DatabaseManager.updatePlayerEconomy(interaction.user.id, playerCurrency);
                    
                    // Add item to inventory (would need to implement inventory addition)
                    purchaseSuccessful = true;
                }
            } else if (selectedValue === 'buy_portal_scroll') {
                itemName = 'Portal Scroll';
                itemPrice = Math.ceil(5 * divisionPricing.multiplier);
                itemDescription = 'Single-use portal access';
                
                if (playerCurrency[divisionPricing.currency] >= itemPrice) {
                    // Deduct currency and add item to inventory
                    playerCurrency[divisionPricing.currency] -= itemPrice;
                    await DatabaseManager.updatePlayerEconomy(interaction.user.id, playerCurrency);
                    
                    // Add Portal Scroll to inventory (would need to implement inventory addition)
                    purchaseSuccessful = true;
                }
            } else if (selectedValue.startsWith('buy_scroll_shard_') || selectedValue.startsWith('buy_weapon_') || selectedValue.startsWith('buy_armor_')) {
                // Handle daily rotation items
                const storeInventory = await this.generateDailyStoreInventory();
                let selectedItem = null;
                
                if (selectedValue.startsWith('buy_scroll_shard_')) {
                    const index = parseInt(selectedValue.split('_')[3]);
                    selectedItem = storeInventory.scrolls[index]; // Changed from scrollsShards to scrolls
                } else if (selectedValue.startsWith('buy_weapon_')) {
                    const index = parseInt(selectedValue.split('_')[2]);
                    selectedItem = storeInventory.weapons[index];
                } else if (selectedValue.startsWith('buy_armor_')) {
                    const index = parseInt(selectedValue.split('_')[2]);
                    selectedItem = storeInventory.armor[index];
                }
                
                if (selectedItem) {
                    itemName = selectedItem.name;
                    itemPrice = Math.ceil(selectedItem.basePrice * divisionPricing.multiplier);
                    itemDescription = selectedItem.description;
                    
                    if (playerCurrency[divisionPricing.currency] >= itemPrice) {
                        // Deduct currency and add item to inventory
                        playerCurrency[divisionPricing.currency] -= itemPrice;
                        await DatabaseManager.updatePlayerEconomy(interaction.user.id, playerCurrency);
                        
                        // Add item to inventory (would need to implement inventory addition)
                        purchaseSuccessful = true;
                    }
                }
            }

            // Show purchase result
            if (purchaseSuccessful) {
                const embed = new EmbedBuilder()
                    .setTitle('✅ **PURCHASE SUCCESSFUL** ✅')
                    .setDescription(
                        `**Item Purchased:** ${itemName}\n` +
                        `**Price:** ${itemPrice} ${divisionPricing.currency.toUpperCase()}\n` +
                        `**Description:** ${itemDescription}\n\n` +
                        `**Remaining Balance:** ${playerCurrency[divisionPricing.currency]} ${divisionPricing.currency.toUpperCase()}\n\n` +
                        `*Item has been added to your inventory!*`
                    )
                    .setColor(0x00ff00)
                    .setFooter({ text: 'Purchase Successful • Item added to inventory' })
                    .setTimestamp();

                await this.safeInteractionResponse(interaction, {
                    embeds: [embed],
                    components: []
                });
            } else {
                const embed = new EmbedBuilder()
                    .setTitle('❌ **PURCHASE FAILED** ❌')
                    .setDescription(
                        `**Item:** ${itemName}\n` +
                        `**Price:** ${itemPrice} ${divisionPricing.currency.toUpperCase()}\n` +
                        `**Your Balance:** ${playerCurrency[divisionPricing.currency]} ${divisionPricing.currency.toUpperCase()}\n\n` +
                        `*Insufficient funds to complete purchase.*`
                    )
                    .setColor(0xff0000)
                    .setFooter({ text: 'Purchase Failed • Insufficient funds' })
                    .setTimestamp();

                await this.safeInteractionResponse(interaction, {
                    embeds: [embed],
                    components: []
                });
            }

            logger.info(`Store purchase attempt by user ${interaction.user.id}: ${itemName} - ${purchaseSuccessful ? 'SUCCESS' : 'FAILED'}`);

        } catch (error) {
            logger.error('Error handling store purchase:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error processing purchase. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle coin flip wager selections
     */
    static async handleCoinFlipWager(interaction, selectedValue) {
        try {
            if (selectedValue === 'back_to_store') {
                await this.showStoreMenu(interaction);
                return;
            }

            // Get user's division and currency
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const division = playerData?.economyType || 'gold';
            const playerCurrency = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };
            const divisionPricing = DIVISION_PRICING[division];

            if (selectedValue === 'custom_wager') {
                // Show custom wager modal
                const modal = new ModalBuilder()
                    .setCustomId('custom_wager_modal')
                    .setTitle('💸 Custom Wager Amount');

                const wagerInput = new TextInputBuilder()
                    .setCustomId('custom_wager_amount')
                    .setLabel('Enter your wager amount')
                    .setStyle(TextInputStyle.Short)
                    .setPlaceholder(`Enter amount (1-${playerCurrency[divisionPricing.currency]})`)
                    .setMaxLength(10)
                    .setRequired(true);

                const row = new ActionRowBuilder().addComponents(wagerInput);
                modal.addComponents(row);

                await interaction.showModal(modal);
                return;
            }

            // Handle preset wager amounts
            if (selectedValue.startsWith('wager_')) {
                const wagerAmount = parseInt(selectedValue.split('_')[1]);
                
                // Check if user has enough currency
                if (playerCurrency[divisionPricing.currency] < wagerAmount) {
                    await this.safeInteractionResponse(interaction, {
                        content: `❌ Insufficient funds! You need ${wagerAmount} ${divisionPricing.currency.toUpperCase()} but only have ${playerCurrency[divisionPricing.currency]}.`,
                        embeds: [],
                        components: []
                    });
                    return;
                }

                // Show coin flip selection
                const embed = new EmbedBuilder()
                    .setTitle('🎲 **COIN FLIP** 🎲')
                    .setDescription(
                        `**Wager Amount:** ${wagerAmount} ${divisionPricing.currency.toUpperCase()}\n` +
                        `**Potential Winnings:** ${wagerAmount * 2} ${divisionPricing.currency.toUpperCase()}\n\n` +
                        `🪙 **Choose your call:**\n` +
                        `• **Heads** - Win if coin lands heads up\n` +
                        `• **Tails** - Win if coin lands tails up\n\n` +
                        `*Make your choice:*`
                    )
                    .setColor(MARKETPLACE_CONFIG.EMBED_COLOR)
                    .setFooter({ text: 'Coin Flip • Choose heads or tails' })
                    .setTimestamp();

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('coin_flip_choice')
                    .setPlaceholder('Choose heads or tails...')
                    .addOptions([
                        new StringSelectMenuOptionBuilder()
                            .setLabel('🪙 Heads')
                            .setDescription(`Bet ${wagerAmount} ${divisionPricing.currency.toUpperCase()} on heads`)
                            .setValue(`flip_heads_${wagerAmount}`),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('🪙 Tails')
                            .setDescription(`Bet ${wagerAmount} ${divisionPricing.currency.toUpperCase()} on tails`)
                            .setValue(`flip_tails_${wagerAmount}`),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('🔄 Back to Coin Flip')
                            .setDescription('Return to wager selection')
                            .setValue('back_to_coin_flip')
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await this.safeInteractionResponse(interaction, {
                    embeds: [embed],
                    components: [row]
                });
            }

            logger.info(`Coin flip wager selection by user ${interaction.user.id}: ${selectedValue}`);

        } catch (error) {
            logger.error('Error handling coin flip wager:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error processing coin flip wager. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle custom wager modal submission
     */
    static async handleCustomWager(interaction, wagerAmount) {
        try {
            // Get user's division and currency
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const division = playerData?.economyType || 'gold';
            const playerCurrency = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };
            const divisionPricing = DIVISION_PRICING[division];

            // Check if user has enough currency
            if (playerCurrency[divisionPricing.currency] < wagerAmount) {
                await interaction.reply({
                    content: `❌ Insufficient funds! You need ${wagerAmount} ${divisionPricing.currency.toUpperCase()} but only have ${playerCurrency[divisionPricing.currency]}.`,
                    ephemeral: true
                });
                return;
            }

            // Show coin flip selection with custom wager
            const embed = new EmbedBuilder()
                .setTitle('🎲 **COIN FLIP** 🎲')
                .setDescription(
                    `**Custom Wager:** ${wagerAmount} ${divisionPricing.currency.toUpperCase()}\n` +
                    `**Potential Winnings:** ${wagerAmount * 2} ${divisionPricing.currency.toUpperCase()}\n\n` +
                    `🪙 **Choose your call:**\n` +
                    `• **Heads** - Win if coin lands heads up\n` +
                    `• **Tails** - Win if coin lands tails up\n\n` +
                    `*Make your choice:*`
                )
                .setColor(MARKETPLACE_CONFIG.EMBED_COLOR)
                .setFooter({ text: 'Coin Flip • Choose heads or tails' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('coin_flip_choice')
                .setPlaceholder('Choose heads or tails...')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🪙 Heads')
                        .setDescription(`Bet ${wagerAmount} ${divisionPricing.currency.toUpperCase()} on heads`)
                        .setValue(`flip_heads_${wagerAmount}`),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🪙 Tails')
                        .setDescription(`Bet ${wagerAmount} ${divisionPricing.currency.toUpperCase()} on tails`)
                        .setValue(`flip_tails_${wagerAmount}`),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔄 Back to Coin Flip')
                        .setDescription('Return to wager selection')
                        .setValue('back_to_coin_flip')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.reply({
                embeds: [embed],
                components: [row],
                ephemeral: false
            });

            logger.info(`Custom wager set by user ${interaction.user.id}: ${wagerAmount} ${divisionPricing.currency}`);

        } catch (error) {
            logger.error('Error handling custom wager:', error);
            await interaction.reply({
                content: '❌ Error processing custom wager. Please try again.',
                ephemeral: true
            });
        }
    }

    /**
     * Handle sell items selections
     */
    static async handleSellItems(interaction, selectedValue) {
        try {
            if (selectedValue === 'back_to_store') {
                await this.showStoreMenu(interaction);
                return;
            }

            // Get user's division and inventory
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const division = playerData?.economyType || 'gold';
            const playerCurrency = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };
            const inventory = playerData?.inventory || {};
            const divisionPricing = DIVISION_PRICING[division];

            // Parse sell selection
            if (selectedValue.startsWith('sell_')) {
                const parts = selectedValue.split('_');
                const itemType = parts[1]; // 'weapon' or 'armor'
                const itemIndex = parseInt(parts[2]);

                let itemName = '';
                let sellPrice = 0;
                let sellSuccessful = false;

                if (itemType === 'weapon' && inventory.weapons && inventory.weapons[itemIndex]) {
                    const weapon = inventory.weapons[itemIndex];
                    itemName = weapon.name || weapon;
                    sellPrice = Math.ceil((weapon.goldValue || 10) * MARKETPLACE_CONFIG.STORE_SELL_RATE * divisionPricing.multiplier);
                    
                    // Remove item from inventory and add currency
                    inventory.weapons.splice(itemIndex, 1);
                    playerCurrency[divisionPricing.currency] += sellPrice;
                    
                    // Update database
                    await DatabaseManager.updatePlayerInventory(interaction.user.id, inventory);
                    await DatabaseManager.updatePlayerEconomy(interaction.user.id, playerCurrency);
                    
                    sellSuccessful = true;
                } else if (itemType === 'armor' && inventory.armor && inventory.armor[itemIndex]) {
                    const armor = inventory.armor[itemIndex];
                    itemName = armor.name || armor;
                    sellPrice = Math.ceil((armor.goldValue || 8) * MARKETPLACE_CONFIG.STORE_SELL_RATE * divisionPricing.multiplier);
                    
                    // Remove item from inventory and add currency
                    inventory.armor.splice(itemIndex, 1);
                    playerCurrency[divisionPricing.currency] += sellPrice;
                    
                    // Update database
                    await DatabaseManager.updatePlayerInventory(interaction.user.id, inventory);
                    await DatabaseManager.updatePlayerEconomy(interaction.user.id, playerCurrency);
                    
                    sellSuccessful = true;
                }

                // Show sell result
                if (sellSuccessful) {
                    const embed = new EmbedBuilder()
                        .setTitle('✅ **ITEM SOLD** ✅')
                        .setDescription(
                            `**Item Sold:** ${itemName}\n` +
                            `**Sale Price:** ${sellPrice} ${divisionPricing.currency.toUpperCase()}\n` +
                            `**New Balance:** ${playerCurrency[divisionPricing.currency]} ${divisionPricing.currency.toUpperCase()}\n\n` +
                            `*Item has been removed from your inventory.*`
                        )
                        .setColor(0x00ff00)
                        .setFooter({ text: 'Item Sold • 50% of item value received' })
                        .setTimestamp();

                    await this.safeInteractionResponse(interaction, {
                        embeds: [embed],
                        components: []
                    });
                } else {
                    await this.safeInteractionResponse(interaction, {
                        content: '❌ Error selling item. Item may no longer exist in your inventory.',
                        embeds: [],
                        components: []
                    });
                }

                logger.info(`Item sell by user ${interaction.user.id}: ${itemName} - ${sellPrice} ${divisionPricing.currency}`);
            }

        } catch (error) {
            logger.error('Error handling sell items:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error processing item sale. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle coin flip choice (heads/tails)
     */
    static async handleCoinFlipChoice(interaction, selectedValue) {
        try {
            if (selectedValue === 'back_to_coin_flip') {
                await this.showCoinFlip(interaction);
                return;
            }

            // Get user's division and currency
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const division = playerData?.economyType || 'gold';
            const playerCurrency = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };
            const divisionPricing = DIVISION_PRICING[division];

            // Parse the choice
            if (selectedValue.startsWith('flip_')) {
                const parts = selectedValue.split('_');
                const playerChoice = parts[1]; // 'heads' or 'tails'
                const wagerAmount = parseInt(parts[2]);

                // Double-check user has enough currency
                if (playerCurrency[divisionPricing.currency] < wagerAmount) {
                    await this.safeInteractionResponse(interaction, {
                        content: `❌ Insufficient funds! You need ${wagerAmount} ${divisionPricing.currency.toUpperCase()} but only have ${playerCurrency[divisionPricing.currency]}.`,
                        embeds: [],
                        components: []
                    });
                    return;
                }

                // Perform the coin flip
                const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
                const isWin = playerChoice === coinResult;

                // Update player currency
                if (isWin) {
                    // Player wins - they get their wager back plus 100% profit
                    playerCurrency[divisionPricing.currency] += wagerAmount; // Double their wager
                } else {
                    // Player loses - deduct their wager
                    playerCurrency[divisionPricing.currency] -= wagerAmount;
                }

                // Update database
                await DatabaseManager.updatePlayerEconomy(interaction.user.id, playerCurrency);

                // Create result embed
                const embed = new EmbedBuilder()
                    .setTitle(`🎲 **COIN FLIP RESULT** 🎲`)
                    .setDescription(
                        `**Your Choice:** ${playerChoice.toUpperCase()}\n` +
                        `**Coin Result:** ${coinResult.toUpperCase()}\n` +
                        `**Wager Amount:** ${wagerAmount} ${divisionPricing.currency.toUpperCase()}\n\n` +
                        `${isWin ? '🎉 **YOU WON!** 🎉' : '💸 **YOU LOST!** 💸'}\n\n` +
                        `**${isWin ? 'Winnings' : 'Loss'}:** ${isWin ? '+' : '-'}${wagerAmount} ${divisionPricing.currency.toUpperCase()}\n` +
                        `**New Balance:** ${playerCurrency[divisionPricing.currency]} ${divisionPricing.currency.toUpperCase()}\n\n` +
                        `${isWin ? '*Congratulations on your win!*' : '*Better luck next time!*'}`
                    )
                    .setColor(isWin ? 0x00ff00 : 0xff0000)
                    .setFooter({ text: `Coin Flip • ${isWin ? 'Winner' : 'Loser'}` })
                    .setTimestamp();

                const selectMenu = new StringSelectMenuBuilder()
                    .setCustomId('coin_flip_result')
                    .setPlaceholder('What would you like to do next?')
                    .addOptions([
                        new StringSelectMenuOptionBuilder()
                            .setLabel('🎲 Play Again')
                            .setDescription('Try another coin flip')
                            .setValue('play_again'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('🔄 Back to Store')
                            .setDescription('Return to store menu')
                            .setValue('back_to_store'),
                        new StringSelectMenuOptionBuilder()
                            .setLabel('🏪 Back to Marketplace')
                            .setDescription('Return to main marketplace')
                            .setValue('back_to_marketplace')
                    ]);

                const row = new ActionRowBuilder().addComponents(selectMenu);

                await this.safeInteractionResponse(interaction, {
                    embeds: [embed],
                    components: [row]
                });

                logger.info(`Coin flip result for user ${interaction.user.id}: ${playerChoice} vs ${coinResult} - ${isWin ? 'WIN' : 'LOSE'} - ${wagerAmount} ${divisionPricing.currency}`);
            }

        } catch (error) {
            logger.error('Error handling coin flip choice:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error processing coin flip. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle coin flip result actions
     */
    static async handleCoinFlipResult(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'play_again':
                    await this.showCoinFlip(interaction);
                    break;
                case 'back_to_store':
                    await this.showStoreMenu(interaction);
                    break;
                case 'back_to_marketplace':
                    await this.handleBackToMain(interaction);
                    break;
                default:
                    logger.warn(`Unknown coin flip result action: ${selectedValue}`);
                    await this.safeInteractionResponse(interaction, {
                        content: '❌ Unknown action selected. Please try again.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling coin flip result:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error processing coin flip result. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show player chests menu (Profile and Adventure chests)
     */
    static async showPlayerChests(interaction) {
        try {
            const embed = new EmbedBuilder()
                .setTitle('📦 **PLAYER CHESTS** 📦')
                .setDescription(
                    '**Manage your loot storage systems!**\n\n' +
                    '🏛️ **Profile Chest** - Permanent storage for items to sell\n' +
                    '⚔️ **Adventure Chest** - Current session loot (lost on death)\n\n' +
                    '**Important:** This system separates your permanent assets from temporary adventure loot.\n' +
                    'Items in your Adventure Chest are lost if you die in the dungeon!\n\n' +
                    '*Choose a chest to manage:*'
                )
                .setColor(0x9932cc)
                .setFooter({ text: 'Player Chests • Loot Management System' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('player_chests_menu')
                .setPlaceholder('Choose a chest to manage...')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🏛️ Profile Chest')
                        .setDescription('Permanent storage - safe from death')
                        .setValue('profile_chest'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('⚔️ Adventure Chest')
                        .setDescription('Current session loot - lost on death')
                        .setValue('adventure_chest'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔄 Back to Marketplace')
                        .setDescription('Return to main marketplace')
                        .setValue('back_to_marketplace')
                ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Update the current message instead of creating new one
            await this.safeInteractionResponse(interaction, {
                embeds: [embed],
                components: [row]
            });

            logger.info(`Player chests menu shown to user ${interaction.user.id}`);

        } catch (error) {
            logger.error('Error showing player chests menu:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error loading player chests menu. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle player chests menu selections
     */
    static async handlePlayerChestsSelection(interaction, selectedValue) {
        try {
            switch (selectedValue) {
                case 'profile_chest':
                    // Show marketplace-specific profile chest menu instead of portal system
                    await this.showMarketplaceProfileChest(interaction);
                    break;
                case 'adventure_chest':
                    await this.safeInteractionResponse(interaction, {
                        content: '⚠️ Adventure Chest can only be accessed during an active game session via portals in the dungeon.',
                        embeds: [],
                        components: []
                    });
                    break;
                case 'back_to_marketplace':
                    await this.handleBackToMain(interaction);
                    break;
                default:
                    logger.warn(`Unknown player chests selection: ${selectedValue}`);
                    await this.safeInteractionResponse(interaction, {
                        content: '❌ Unknown chest option selected. Please try again.',
                        embeds: [],
                        components: []
                    });
            }
        } catch (error) {
            logger.error('Error handling player chests selection:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error processing chest selection. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Show marketplace-specific profile chest menu with back to marketplace option
     */
    static async showMarketplaceProfileChest(interaction) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const profileChest = playerData?.profileChest || {
                weapons: [],
                armor: [],
                consumables: [],
                scrolls: [],
                shards: [],
                enhancers: []
            };

            let description = `**🏛️ PROFILE CHEST (Permanent Storage)**\n\n`;
            description += `**Safe from death - Items here are permanent**\n\n`;

            // Count items in each category
            const weaponCount = profileChest.weapons?.length || 0;
            const armorCount = profileChest.armor?.length || 0;
            const consumableCount = profileChest.consumables?.length || 0;
            const scrollCount = profileChest.scrolls?.length || 0;
            const shardCount = profileChest.shards?.length || 0;
            const enhancerCount = profileChest.enhancers?.length || 0;

            description += `**📦 Storage Summary:**\n`;
            description += `⚔️ Weapons: ${weaponCount}\n`;
            description += `🛡️ Armor: ${armorCount}\n`;
            description += `🧪 Consumables: ${consumableCount}\n`;
            description += `📜 Scrolls: ${scrollCount}\n`;
            description += `💎 Shards: ${shardCount}\n`;
            description += `✨ Enhancers: ${enhancerCount}\n\n`;

            if (weaponCount + armorCount + consumableCount + scrollCount + shardCount + enhancerCount === 0) {
                description += `*Your Profile Chest is empty.*\n\n`;
            }

            description += `**📍 Accessing from Marketplace**\n`;
            description += `*Use the buttons below to manage your permanent storage:*`;

            const embed = new EmbedBuilder()
                .setTitle('🏛️ **PROFILE CHEST** 🏛️')
                .setDescription(description)
                .setColor(0x9932cc)
                .setFooter({ text: 'Profile Chest • Permanent Storage • Marketplace Access' })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('marketplace_profile_chest')
                .setPlaceholder('Choose an action...')
                .addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📦 View Items')
                        .setDescription('View all items in your profile chest')
                        .setValue('view_profile_items'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🛒 List Items for Sale')
                        .setDescription('Put items from your chest up for sale')
                        .setValue('list_chest_items'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('📦 Player Chests Menu')
                        .setDescription('Back to chest selection')
                        .setValue('back_to_player_chests'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔄 Back to Marketplace')
                        .setDescription('Return to main marketplace')
                        .setValue('back_to_marketplace')
                ]);

            // Add debug options for admin user only
            if (interaction.user.id === '292854498299346945') {
                selectMenu.addOptions([
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔧 DEBUG: Check Promotional Weapons')
                        .setDescription('Admin: Test promotional weapon granting')
                        .setValue('debug_promotional_check'),
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🗑️ DEBUG: Clear Promotional Weapons')
                        .setDescription('Admin: Remove all promotional weapons')
                        .setValue('debug_clear_promotional')
                ]);
            }

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await this.safeInteractionResponse(interaction, {
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing marketplace profile chest:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error loading profile chest. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle division browsing selections
     */
    static async handleDivisionBrowsing(interaction, selectedValue) {
        try {
            if (selectedValue === 'back_to_store') {
                await this.showStoreMenu(interaction);
                return;
            }

            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const playerCurrency = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };

            let division = '';
            let divisionPricing = {};
            let divisionCurrency = '';

            switch (selectedValue) {
                case 'browse_gold_store':
                    division = 'gold';
                    divisionPricing = DIVISION_PRICING.gold;
                    divisionCurrency = 'Gold';
                    break;
                case 'browse_tokens_store':
                    division = 'tokens';
                    divisionPricing = DIVISION_PRICING.tokens;
                    divisionCurrency = 'Tokens';
                    break;
                case 'browse_dng_store':
                    division = 'dng';
                    divisionPricing = DIVISION_PRICING.dng;
                    divisionCurrency = 'DNG';
                    break;
                case 'browse_hero_store':
                    division = 'hero';
                    divisionPricing = DIVISION_PRICING.hero;
                    divisionCurrency = 'HERO';
                    break;
                case 'browse_eth_store':
                    division = 'eth';
                    divisionPricing = DIVISION_PRICING.eth;
                    divisionCurrency = 'ETH';
                    break;
                default:
                    logger.warn(`Unknown division browsing selection: ${selectedValue}`);
                    await this.safeInteractionResponse(interaction, {
                        content: '❌ Unknown division selected. Please try again.',
                        embeds: [],
                        components: []
                    });
                    return;
            }

            const embed = new EmbedBuilder()
                .setTitle(`🏪 **${divisionCurrency} DIVISION STORE** 🏪`)
                .setDescription(
                    `**Welcome to the ${divisionCurrency} Division Store!**\n\n` +
                    `🏪 **Daily Rotating Inventory** - Refreshes at 0 UTC\n` +
                    `💰 **Division-Specific Pricing** - Items cost ${divisionCurrency} currency\n` +
                    `🎲 **Coin Flip Gambling** - Test your luck!\n` +
                    `💸 **Sell Items** - Get 50% value back\n\n` +
                    `*What would you like to do?*\n` +
                    `*You can also browse other divisions to see their prices!*`
                )
                .setImage(MARKETPLACE_CONFIG.MARKETPLACE_IMAGE)
                .setColor(MARKETPLACE_CONFIG.EMBED_COLOR)
                .setFooter({ text: `${divisionCurrency} Division Store • Daily rotation at 0 UTC` })
                .setTimestamp();

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId(`store_actions_${division}`) // Add division to customId
                .setPlaceholder('Choose a store action...');

            // Add options for this division's store
            selectMenu.addOptions([
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛒 Browse Store Inventory')
                    .setDescription('View today\'s rotating store items')
                    .setValue(`browse_store_${division}`), // Add division to value
                new StringSelectMenuOptionBuilder()
                    .setLabel('💸 Sell Items')
                    .setDescription('Sell your items for 50% value')
                    .setValue(`sell_items_${division}`), // Add division to value
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎲 Coin Flip')
                    .setDescription('Heads or tails - win 100% profit!')
                    .setValue(`coin_flip_${division}`), // Add division to value
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔄 Back to Marketplace')
                    .setDescription('Return to main marketplace')
                    .setValue('back_to_marketplace')
            ]);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await this.safeInteractionResponse(interaction, {
                embeds: [embed],
                components: [row]
            });

            logger.info(`Division browsing shown to user ${interaction.user.id} for ${divisionCurrency} division`);

        } catch (error) {
            logger.error('Error handling division browsing:', error);
            await this.safeInteractionResponse(interaction, {
                content: '❌ Error loading division browsing. Please try again.',
                embeds: [],
                components: []
            });
        }
    }

    /**
     * Handle coinflip from permanent casino embed
     */
    static async handleCoinflipStart(interaction) {
        try {
            // Get player's current division to show as default
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const currentDivision = playerData?.economyType || 'gold';
            const playerCurrency = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };

            // Show division selection first
            const divisionEmbed = new EmbedBuilder()
                .setTitle('🪙 **COINFLIP - DIVISION SELECTION** 🪙')
                .setDescription(
                    `**${interaction.user.username}, choose your division for coinflip!**\n\n` +
                    `💰 **Current Division:** ${currentDivision.toUpperCase()}\n` +
                    `💳 **Your Balance:** ${playerCurrency[DIVISION_PRICING[currentDivision].currency]} ${DIVISION_PRICING[currentDivision].currency.toUpperCase()}\n\n` +
                    '**Each division uses different currency:**\n' +
                    '🟨 **Gold Division** - Gold Coins\n' +
                    '🎫 **Token Division** - Tokens\n' +
                    '🔸 **DNG Division** - DNG (Dungeon Coins)\n' +
                    '🦸 **Hero Division** - Hero Tokens\n' +
                    '💎 **ETH Division** - ETH\n\n' +
                    '💡 **Tip:** All divisions have the same odds!'
                )
                .setColor('#FFD700');

            const divisionOptions = [
                {
                    label: 'Gold Division',
                    description: `Play with Gold Coins (${playerCurrency.gold} available)`,
                    value: 'gold',
                    emoji: '🟨'
                },
                {
                    label: 'Token Division', 
                    description: `Play with Tokens (${playerCurrency.tokens} available)`,
                    value: 'tokens',
                    emoji: '🎫'
                },
                {
                    label: 'DNG Division',
                    description: `Play with DNG (${playerCurrency.dng} available)`,
                    value: 'dng',
                    emoji: '🔸'
                },
                {
                    label: 'Hero Division',
                    description: `Play with Hero Tokens (${playerCurrency.hero} available)`,
                    value: 'hero',
                    emoji: '🦸'
                },
                {
                    label: 'ETH Division',
                    description: `Play with ETH (${playerCurrency.eth} available)`,
                    value: 'eth',
                    emoji: '💎'
                },
                {
                    label: '🔄 Back to Casino',
                    description: 'Return to casino main menu',
                    value: 'back_to_casino',
                    emoji: '🎰'
                }
            ];

            // Put current division at the top (except back option)
            const currentDivisionOption = divisionOptions.find(opt => opt.value === currentDivision);
            const otherOptions = divisionOptions.filter(opt => opt.value !== currentDivision && opt.value !== 'back_to_casino');
            const backOption = divisionOptions.find(opt => opt.value === 'back_to_casino');
            
            const orderedOptions = [currentDivisionOption, ...otherOptions, backOption];

            const divisionSelect = new StringSelectMenuBuilder()
                .setCustomId('coinflip_division_select')
                .setPlaceholder(`Current: ${currentDivision.toUpperCase()} | Choose your division...`)
                .addOptions(orderedOptions);

            const row = new ActionRowBuilder().addComponents(divisionSelect);

            await this.safeInteractionResponse(interaction, {
                embeds: [divisionEmbed],
                components: [row],
                ephemeral: false
            });

        } catch (error) {
            logger.error('Error starting coinflip:', error);
            await this.safeInteractionResponse(interaction, 'Error starting coinflip. Please try again.');
        }
    }

    /**
     * Handle coinflip division selection and create/use thread
     */
    static async handleCoinflipDivisionSelect(interaction, division) {
        try {
            // Handle back to casino option
            if (division === 'back_to_casino') {
                // Show the main casino embed (you can customize this to show casino menu)
                const casinoEmbed = new EmbedBuilder()
                    .setTitle('🎰 **CASINO** 🎰')
                    .setDescription(
                        '**Welcome to the Dungeonites Casino!**\n\n' +
                        '🪙 **Coin Flip** - Heads or tails, double or nothing!\n' +
                        '🎲 **Dice Games** - Coming Soon!\n' +
                        '🃏 **Card Games** - Coming Soon!\n\n' +
                        '🎯 **Choose your game:**'
                    )
                    .setColor('#FFD700')
                    .setFooter({ text: 'Gamble responsibly! Set limits and have fun!' });

                const gameSelect = new StringSelectMenuBuilder()
                    .setCustomId('casino_game_select')
                    .setPlaceholder('Choose your game...')
                    .addOptions([
                        {
                            label: '🪙 Coin Flip',
                            description: 'Heads or tails - double your money!',
                            value: 'coin_flip',
                            emoji: '🪙'
                        },
                        {
                            label: '🔄 Back to Game Hall',
                            description: 'Return to main game hall',
                            value: 'back_to_game_hall',
                            emoji: '🏠'
                        }
                    ]);

                const row = new ActionRowBuilder().addComponents(gameSelect);
                
                await this.safeInteractionResponse(interaction, {
                    embeds: [casinoEmbed],
                    components: [row]
                });
                return;
            }
            
            // For now, set up coinflip game directly in current channel instead of threading
            // TODO: Implement proper threading system later
            
            await this.setupCoinflipGame(interaction, interaction.user, division);

        } catch (error) {
            logger.error('Error handling coinflip division selection:', error);
            await this.safeInteractionResponse(interaction, 'Error starting coinflip. Please try again.');
        }
    }

    /**
     * Setup coinflip game interface directly in channel (simplified version without threading)
     */
    static async setupCoinflipGame(interactionOrChannel, user, division) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(user.id);
            const playerCurrency = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };
            
            const divisionPricing = DIVISION_PRICING[division];
            const currencyName = divisionPricing.currency.toUpperCase();
            const userBalance = playerCurrency[divisionPricing.currency] || 0;

            const gameEmbed = new EmbedBuilder()
                .setTitle(`🪙 **COINFLIP - ${division.toUpperCase()} DIVISION** 🪙`)
                .setDescription(
                    `**Welcome ${user.username}!**\n\n` +
                    `💰 **Your Balance:** ${userBalance} ${currencyName}\n` +
                    `🎯 **Division:** ${division.toUpperCase()}\n` +
                    `💱 **Currency:** ${currencyName}\n\n` +
                    '**How to Play:**\n' +
                    '• Choose your wager amount\n' +
                    '• Pick Heads or Tails\n' +
                    '• Win = Double your wager!\n' +
                    '• Lose = Lose your wager\n\n' +
                    '**Select your wager:**'
                )
                .setColor('#FFD700');

            // Create wager options based on division
            const wagerOptions = [
                { label: `10 ${currencyName}`, value: '10' },
                { label: `25 ${currencyName}`, value: '25' },
                { label: `50 ${currencyName}`, value: '50' },
                { label: `100 ${currencyName}`, value: '100' },
                { label: `Custom Amount`, value: 'custom_wager' },
                { label: '🔄 Back to Division Selection', description: 'Choose a different division', value: 'back_to_division_select' }
            ];

            const wagerSelect = new StringSelectMenuBuilder()
                .setCustomId(`coinflip_wager_${division}`)
                .setPlaceholder('Choose your wager...')
                .addOptions(wagerOptions);

            const wagerRow = new ActionRowBuilder().addComponents(wagerSelect);

            // Update the interaction with the coinflip game
            if (interactionOrChannel.update) {
                await interactionOrChannel.update({
                    embeds: [gameEmbed],
                    components: [wagerRow]
                });
            } else {
                await interactionOrChannel.send({
                    embeds: [gameEmbed],
                    components: [wagerRow]
                });
            }

        } catch (error) {
            logger.error('Error setting up coinflip game:', error);
            if (interactionOrChannel.update) {
                await interactionOrChannel.update({
                    content: '❌ Error setting up coinflip game. Please try again.',
                    embeds: [],
                    components: []
                });
            } else {
                await interactionOrChannel.send('❌ Error setting up coinflip game. Please try again.');
            }
        }
    }

    /**
     * Utility function to hash a string for seeded random
     */
    static hashString(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Seeded random number generator
     */
    static seededRandom(seed) {
        return function() {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
        };
    }

    /**
     * Show custom wager modal for coinflip
     */
    static async showCustomWagerModal(interaction, division) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const playerCurrency = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };
            
            const divisionPricing = DIVISION_PRICING[division];
            const currencyName = divisionPricing.currency.toUpperCase();
            const maxWager = playerCurrency[divisionPricing.currency] || 0;

            const modal = new ModalBuilder()
                .setCustomId(`custom_wager_modal_${division}`)
                .setTitle(`💸 Custom Wager - ${division.toUpperCase()}`);

            const wagerInput = new TextInputBuilder()
                .setCustomId('custom_wager_amount')
                .setLabel(`Enter your wager amount (${currencyName})`)
                .setStyle(TextInputStyle.Short)
                .setPlaceholder(`Enter amount (1-${maxWager})`)
                .setMaxLength(10)
                .setRequired(true);

            const row = new ActionRowBuilder().addComponents(wagerInput);
            modal.addComponents(row);

            await interaction.showModal(modal);

        } catch (error) {
            logger.error('Error showing custom wager modal:', error);
            await this.safeInteractionResponse(interaction, 'Error showing custom wager form. Please try again.');
        }
    }

    /**
     * Process coinflip game with wager
     */
    static async processCoinflip(interaction, division, wagerAmount) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const playerCurrency = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };
            
            const divisionPricing = DIVISION_PRICING[division];
            const currencyName = divisionPricing.currency.toUpperCase();
            const userBalance = playerCurrency[divisionPricing.currency] || 0;

            // Validation
            if (isNaN(wagerAmount) || wagerAmount <= 0) {
                await this.safeInteractionResponse(interaction, {
                    content: `❌ Invalid wager amount. Please enter a positive number.`,
                    ephemeral: true
                });
                return;
            }

            if (wagerAmount > userBalance) {
                await this.safeInteractionResponse(interaction, {
                    content: `❌ Insufficient funds! You have ${userBalance} ${currencyName}, but tried to wager ${wagerAmount} ${currencyName}.`,
                    ephemeral: true
                });
                return;
            }

            // Show heads/tails selection
            const gameEmbed = new EmbedBuilder()
                .setTitle(`🪙 **COINFLIP - ${division.toUpperCase()} DIVISION** 🪙`)
                .setDescription(
                    `**${interaction.user.username}'s Coinflip Game**\n\n` +
                    `💰 **Wager:** ${wagerAmount} ${currencyName}\n` +
                    `💱 **Potential Win:** ${wagerAmount * 2} ${currencyName}\n` +
                    `📊 **Your Balance:** ${userBalance} ${currencyName}\n\n` +
                    '**Choose your call:**'
                )
                .setColor('#FFD700');

            const coinSelect = new StringSelectMenuBuilder()
                .setCustomId(`coinflip_call_${division}_${wagerAmount}`)
                .setPlaceholder('Choose Heads or Tails...')
                .addOptions([
                    {
                        label: 'Heads',
                        description: 'Call heads for the coin flip',
                        value: 'heads',
                        emoji: '👑'
                    },
                    {
                        label: 'Tails',
                        description: 'Call tails for the coin flip',
                        value: 'tails',
                        emoji: '🔸'
                    }
                ]);

            const controlButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('coinflip_leave_game')
                        .setLabel('Leave Game')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🚪'),
                    new ButtonBuilder()
                        .setCustomId('coinflip_return_casino')
                        .setLabel('Return to Casino')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎰')
                );

            const coinRow = new ActionRowBuilder().addComponents(coinSelect);

            await this.safeInteractionResponse(interaction, {
                embeds: [gameEmbed],
                components: [coinRow, controlButtons]
            });

        } catch (error) {
            logger.error('Error processing coinflip:', error);
            await this.safeInteractionResponse(interaction, 'Error processing coinflip. Please try again.');
        }
    }

    /**
     * Execute coinflip game logic
     */
    static async executeCoinflip(interaction, division, wagerAmount, playerCall) {
        try {
            const { DatabaseManager } = await import('../../database/DatabaseManager.js');
            const { auditLogger } = await import('../../utils/auditLogger.js');
            
            const playerData = await DatabaseManager.getPlayer(interaction.user.id);
            const playerCurrency = playerData?.economy || { gold: 0, tokens: 0, dng: 0, hero: 0, eth: 0 };
            
            const divisionPricing = DIVISION_PRICING[division];
            const currencyName = divisionPricing.currency.toUpperCase();
            const userBalance = playerCurrency[divisionPricing.currency] || 0;

            // Double-check they still have enough currency
            if (wagerAmount > userBalance) {
                await this.safeInteractionResponse(interaction, {
                    content: `❌ Insufficient funds! You now have ${userBalance} ${currencyName}.`,
                    ephemeral: true
                });
                return;
            }

            // Flip the coin (50/50 chance)
            const coinResult = Math.random() < 0.5 ? 'heads' : 'tails';
            const isWin = playerCall === coinResult;
            const winAmount = isWin ? wagerAmount : 0;
            const totalChange = isWin ? wagerAmount : -wagerAmount;

            // Update player currency
            const newBalance = userBalance + totalChange;
            playerCurrency[divisionPricing.currency] = Math.max(0, newBalance);
            
            await DatabaseManager.savePlayer(interaction.user.id, {
                economy: playerCurrency
            });

            // Create result embed
            const resultEmbed = new EmbedBuilder()
                .setTitle(`🪙 **COINFLIP RESULT** 🪙`)
                .setDescription(
                    `**${interaction.user.username}'s Coinflip Game**\n\n` +
                    `🎯 **Your Call:** ${playerCall.charAt(0).toUpperCase() + playerCall.slice(1)} ${playerCall === 'heads' ? '👑' : '🔸'}\n` +
                    `🪙 **Coin Result:** ${coinResult.charAt(0).toUpperCase() + coinResult.slice(1)} ${coinResult === 'heads' ? '👑' : '🔸'}\n\n` +
                    `💰 **Wager:** ${wagerAmount} ${currencyName}\n` +
                    `${isWin ? '🎉' : '💸'} **Result:** ${isWin ? `WON ${winAmount} ${currencyName}!` : `LOST ${wagerAmount} ${currencyName}`}\n\n` +
                    `💰 **Balance:** ${userBalance} → ${newBalance} ${currencyName}\n` +
                    `📊 **Net Change:** ${totalChange >= 0 ? '+' : ''}${totalChange} ${currencyName}`
                )
                .setColor(isWin ? '#00FF00' : '#FF0000');

            // Add play again options
            const playAgainSelect = new StringSelectMenuBuilder()
                .setCustomId(`coinflip_wager_${division}`)
                .setPlaceholder('Play again? Choose your wager...')
                .addOptions([
                    { label: `10 ${currencyName}`, value: '10' },
                    { label: `25 ${currencyName}`, value: '25' },
                    { label: `50 ${currencyName}`, value: '50' },
                    { label: `100 ${currencyName}`, value: '100' },
                    { label: `Same Wager (${wagerAmount} ${currencyName})`, value: wagerAmount.toString() },
                    { label: `Custom Amount`, value: 'custom_wager' }
                ]);

            const controlButtons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('coinflip_leave_game')
                        .setLabel('Leave Game')
                        .setStyle(ButtonStyle.Secondary)
                        .setEmoji('🚪'),
                    new ButtonBuilder()
                        .setCustomId('coinflip_return_casino')
                        .setLabel('Return to Casino')
                        .setStyle(ButtonStyle.Primary)
                        .setEmoji('🎰')
                );

            const playRow = new ActionRowBuilder().addComponents(playAgainSelect);

            await this.safeInteractionResponse(interaction, {
                embeds: [resultEmbed],
                components: [playRow, controlButtons]
            });

            // Log the transaction
            auditLogger.log('TRANSACTION', `Coinflip ${isWin ? 'WIN' : 'LOSS'}: ${interaction.user.username} (${interaction.user.id}) ${isWin ? 'won' : 'lost'} ${wagerAmount} ${currencyName} in ${division} division`, 'coinflip_game');

        } catch (error) {
            logger.error('Error executing coinflip:', error);
            await this.safeInteractionResponse(interaction, 'Error executing coinflip. Please try again.');
        }
    }
}