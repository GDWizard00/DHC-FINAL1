import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { weaponsData } from '../../data/weaponsData.js';
import { InventoryHandler } from './InventoryHandler.js';

/**
 * ShopHandler - Manages the 5-tier economy shop system
 * Gold → Tokens → $DNG → $HERO → $ETH tiers with different item quality
 */
export class ShopHandler {
    
    /**
     * Show main shop screen
     */
    static async showShop(interaction, gameState, fromContext = 'dungeon_entrance') {
        try {
            const currency = gameState.economy;
            
            // Build shop description
            let description = `**🛒 DUNGEONITES HEROES SHOP 🛒**\n\n`;
            description += `Welcome to the merchant's quarters! Browse our extensive collection of weapons, armor, and mystical items.\n\n`;
            
            description += `**💰 Your Currency:**\n`;
            description += `🪙 Gold: ${currency.gold || 0}\n`;
            description += `🎫 Tokens: ${currency.tokens || 0}\n`;
            description += `💎 $DNG: ${currency.dng || 0}\n`;
            description += `🏆 $HERO: ${currency.hero || 0}\n`;
            description += `⚡ $ETH: ${currency.eth || 0}\n\n`;
            
            description += `**🛒 Shop Categories:**\n`;
            description += `Each tier offers increasingly powerful items!\n`;
            description += `*Higher tiers require premium currency earned through gameplay.*`;

            const embed = new EmbedBuilder()
                .setTitle('🛒 **MERCHANT SHOP** 🛒')
                .setDescription(description)
                .setImage('https://media.discordapp.net/attachments/1351696887165616169/1356410081700085830/image.png?ex=67edc859&is=67ec76d9&hm=fd65c9bf02e5b83f3c0c5a8c73e25e6b9e74d09f0c4a96c5c8ebe0e24a5d3ce9&=&format=webp&quality=lossless&width=825&height=585')
                .setColor(0x32CD32)
                .setFooter({ text: 'Select a currency tier to browse items' })
                .setTimestamp();

            // Create tier options
            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🪙 Gold Shop (Tier 1)')
                    .setDescription(`Basic items - Gold: ${currency.gold || 0}`)
                    .setValue('shop_gold'),
                
                new StringSelectMenuOptionBuilder()
                    .setLabel('🎫 Token Shop (Tier 2)')
                    .setDescription(`Enhanced items - Tokens: ${currency.tokens || 0}`)
                    .setValue('shop_tokens'),
                
                new StringSelectMenuOptionBuilder()
                    .setLabel('💎 $DNG Shop (Tier 3)')
                    .setDescription(`Premium items - $DNG: ${currency.dng || 0}`)
                    .setValue('shop_dng'),
                
                new StringSelectMenuOptionBuilder()
                    .setLabel('🏆 $HERO Shop (Tier 4)')
                    .setDescription(`Elite items - $HERO: ${currency.hero || 0}`)
                    .setValue('shop_hero'),
                
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚡ $ETH Shop (Tier 5)')
                    .setDescription(`Mythical items - $ETH: ${currency.eth || 0}`)
                    .setValue('shop_eth')
            ];

            // Add currency exchange option
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('💱 Currency Exchange')
                    .setDescription('Convert between different currency tiers')
                    .setValue('currency_exchange')
            );

            // Add return option based on context
            if (fromContext === 'dungeon_entrance') {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔙 Return to Dungeon Entrance')
                        .setDescription('Go back to the entrance')
                        .setValue('return_to_entrance')
                );
            } else {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🔙 Return')
                        .setDescription('Go back to previous screen')
                        .setValue('return')
                );
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('shop_actions')
                .setPlaceholder('Choose shop tier...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Update or reply based on interaction type
            if (interaction.isRepliable() && !interaction.replied) {
                await interaction.update({
                    embeds: [embed],
                    components: [row]
                });
            } else {
                await interaction.editReply({
                    embeds: [embed],
                    components: [row]
                });
            }

            logger.info(`Shop displayed for user ${gameState.session.userId} from ${fromContext}`);

        } catch (error) {
            logger.error('Error showing shop:', error);
            throw error;
        }
    }

    /**
     * Handle shop action selection
     */
    static async handleAction(interaction, gameState, selectedValue, fromContext = 'dungeon_entrance') {
        try {
            switch (selectedValue) {
                case 'shop_gold':
                    await this.showTierShop(interaction, gameState, 'gold', fromContext);
                    break;
                
                case 'shop_tokens':
                    await this.showTierShop(interaction, gameState, 'tokens', fromContext);
                    break;
                
                case 'shop_dng':
                    await this.showTierShop(interaction, gameState, 'dng', fromContext);
                    break;
                
                case 'shop_hero':
                    await this.showTierShop(interaction, gameState, 'hero', fromContext);
                    break;
                
                case 'shop_eth':
                    await this.showTierShop(interaction, gameState, 'eth', fromContext);
                    break;
                
                case 'currency_exchange':
                    await this.showCurrencyExchange(interaction, gameState, fromContext);
                    break;
                
                case 'return_to_entrance':
                    await this.returnToEntrance(interaction, gameState);
                    break;
                
                case 'return':
                    await this.returnToPreviousScreen(interaction, gameState, fromContext);
                    break;
                
                default:
                    // Handle item purchases
                    if (selectedValue.startsWith('buy_')) {
                        await this.handlePurchase(interaction, gameState, selectedValue, fromContext);
                    } else if (selectedValue.startsWith('exchange_')) {
                        await this.handleCurrencyExchange(interaction, gameState, selectedValue, fromContext);
                    } else if (selectedValue === 'back_to_shop') {
                        await this.showShop(interaction, gameState, fromContext);
                    }
            }
        } catch (error) {
            logger.error('Error handling shop action:', error);
            throw error;
        }
    }

    /**
     * Show specific tier shop
     */
    static async showTierShop(interaction, gameState, tier, fromContext) {
        try {
            const currency = gameState.economy;
            const items = this.getItemsForTier(tier);
            const playerCurrency = currency[tier] || 0;
            
            const tierNames = {
                'gold': '🪙 Gold Shop (Tier 1)',
                'tokens': '🎫 Token Shop (Tier 2)', 
                'dng': '💎 $DNG Shop (Tier 3)',
                'hero': '🏆 $HERO Shop (Tier 4)',
                'eth': '⚡ $ETH Shop (Tier 5)'
            };

            const tierEmojis = {
                'gold': '🪙',
                'tokens': '🎫',
                'dng': '💎',
                'hero': '🏆',
                'eth': '⚡'
            };

            let description = `**${tierNames[tier]}**\n\n`;
            description += `${tierEmojis[tier]} **Your ${tier.toUpperCase()}:** ${playerCurrency}\n\n`;
            description += `**Available Items:**\n`;
            
            if (items.length === 0) {
                description += `*No items available in this tier yet*\n\n`;
            } else {
                items.forEach(item => {
                    const canAfford = playerCurrency >= item.price;
                    const hasSpace = this.checkInventorySpace(gameState, item);
                    description += `${canAfford && hasSpace ? '✅' : '❌'} **${item.name}** - ${item.price} ${tierEmojis[tier]}\n`;
                    description += `   ${item.description}\n`;
                    if (!canAfford) description += `   ❌ Insufficient currency\n`;
                    if (!hasSpace) description += `   ❌ Inventory full\n`;
                    description += `\n`;
                });
            }

            const embed = new EmbedBuilder()
                .setTitle(tierNames[tier])
                .setDescription(description)
                .setColor(this.getTierColor(tier))
                .setFooter({ text: 'Select an item to purchase' });

            // Create item options (max 20 due to Discord limitations)
            const options = [];
            
            items.slice(0, 19).forEach(item => { // Leave room for back button
                const canAfford = playerCurrency >= item.price;
                const hasSpace = this.checkInventorySpace(gameState, item);
                const canPurchase = canAfford && hasSpace;
                
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${canPurchase ? '✅' : '❌'} ${item.name} - ${item.price} ${tierEmojis[tier]}`)
                        .setDescription(`${item.description.substring(0, 97)}...`)
                        .setValue(`buy_${tier}_${item.id}`)
                );
            });

            // Add back option
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Shop')
                    .setDescription('Return to main shop menu')
                    .setValue('back_to_shop')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('shop_actions')
                .setPlaceholder('Choose item to purchase...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing tier shop:', error);
            throw error;
        }
    }

    /**
     * Show currency exchange
     */
    static async showCurrencyExchange(interaction, gameState, fromContext) {
        try {
            const currency = gameState.economy;
            
            let description = `**💱 CURRENCY EXCHANGE 💱**\n\n`;
            description += `Convert between different currency tiers to access better items!\n\n`;
            
            description += `**Your Current Currency:**\n`;
            description += `🪙 Gold: ${currency.gold || 0}\n`;
            description += `🎫 Tokens: ${currency.tokens || 0}\n`;
            description += `💎 $DNG: ${currency.dng || 0}\n`;
            description += `🏆 $HERO: ${currency.hero || 0}\n`;
            description += `⚡ $ETH: ${currency.eth || 0}\n\n`;
            
            description += `**Exchange Rates:**\n`;
            description += `🪙 100 Gold → 🎫 1 Token\n`;
            description += `🎫 10 Tokens → 💎 1 $DNG\n`;
            description += `💎 5 $DNG → 🏆 1 $HERO\n`;
            description += `🏆 3 $HERO → ⚡ 1 $ETH\n\n`;
            
            description += `*Choose an exchange below:*`;

            const embed = new EmbedBuilder()
                .setTitle('💱 **CURRENCY EXCHANGE** 💱')
                .setDescription(description)
                .setColor(0xFFD700)
                .setFooter({ text: 'Select currency conversion' });

            // Create exchange options
            const options = [];
            
            // Gold to Tokens
            if ((currency.gold || 0) >= 100) {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🪙 → 🎫 Convert 100 Gold to 1 Token')
                        .setDescription('Basic to enhanced tier')
                        .setValue('exchange_gold_to_tokens')
                );
            }

            // Tokens to $DNG
            if ((currency.tokens || 0) >= 10) {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🎫 → 💎 Convert 10 Tokens to 1 $DNG')
                        .setDescription('Enhanced to premium tier')
                        .setValue('exchange_tokens_to_dng')
                );
            }

            // $DNG to $HERO
            if ((currency.dng || 0) >= 5) {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('💎 → 🏆 Convert 5 $DNG to 1 $HERO')
                        .setDescription('Premium to elite tier')
                        .setValue('exchange_dng_to_hero')
                );
            }

            // $HERO to $ETH
            if ((currency.hero || 0) >= 3) {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('🏆 → ⚡ Convert 3 $HERO to 1 $ETH')
                        .setDescription('Elite to mythical tier')
                        .setValue('exchange_hero_to_eth')
                );
            }

            if (options.length === 0) {
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel('❌ No exchanges available')
                        .setDescription('Insufficient currency for any exchanges')
                        .setValue('no_exchanges')
                );
            }

            // Add back option
            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Shop')
                    .setDescription('Return to main shop menu')
                    .setValue('back_to_shop')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('shop_actions')
                .setPlaceholder('Choose currency exchange...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await interaction.update({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            logger.error('Error showing currency exchange:', error);
            throw error;
        }
    }

    /**
     * Handle item purchase
     */
    static async handlePurchase(interaction, gameState, selectedValue, fromContext) {
        try {
            const [, tier, itemId] = selectedValue.split('_', 3);
            const items = this.getItemsForTier(tier);
            const item = items.find(i => i.id === itemId);
            
            if (!item) {
                await interaction.reply({
                    content: 'Item not found. Please try again.',
                    ephemeral: true
                });
                return;
            }

            const currency = gameState.economy;
            const playerCurrency = currency[tier] || 0;

            // Check if player can afford
            if (playerCurrency < item.price) {
                await interaction.reply({
                    content: `❌ Insufficient ${tier.toUpperCase()}! You need ${item.price} but only have ${playerCurrency}.`,
                    ephemeral: true
                });
                return;
            }

            // Check inventory space
            if (!this.checkInventorySpace(gameState, item)) {
                await interaction.reply({
                    content: `❌ Inventory full! You need space in your ${item.category} inventory to purchase this item.`,
                    ephemeral: true
                });
                return;
            }

            // Process purchase
            currency[tier] = playerCurrency - item.price;
            
            // Add item to inventory
            const success = InventoryHandler.addItemToInventory(gameState.inventory, item, item.category);
            
            if (!success) {
                // Refund if addition failed
                currency[tier] = playerCurrency;
                await interaction.reply({
                    content: '❌ Failed to add item to inventory. Please try again.',
                    ephemeral: true
                });
                return;
            }

            const tierEmojis = {
                'gold': '🪙',
                'tokens': '🎫',
                'dng': '💎',
                'hero': '🏆',
                'eth': '⚡'
            };

            await interaction.reply({
                content: `✅ **Purchased ${item.name}!**\n\n${tierEmojis[tier]} Spent: ${item.price} ${tier.toUpperCase()}\n${tierEmojis[tier]} Remaining: ${currency[tier]}\n\n📦 Item added to your ${item.category} inventory!`,
                ephemeral: true
            });

            // Refresh shop after purchase
            try {
                await this.showTierShop(interaction, gameState, tier, fromContext);
            } catch (error) {
                logger.error('Error refreshing shop after purchase:', error);
            }

            logger.info(`User ${gameState.session.userId} purchased ${item.name} for ${item.price} ${tier}`);

        } catch (error) {
            logger.error('Error handling purchase:', error);
            throw error;
        }
    }

    /**
     * Handle currency exchange
     */
    static async handleCurrencyExchange(interaction, gameState, selectedValue, fromContext) {
        try {
            const currency = gameState.economy;
            let exchangeResult = '';

            switch (selectedValue) {
                case 'exchange_gold_to_tokens':
                    if ((currency.gold || 0) >= 100) {
                        currency.gold = (currency.gold || 0) - 100;
                        currency.tokens = (currency.tokens || 0) + 1;
                        exchangeResult = '✅ Converted 100 🪙 Gold to 1 🎫 Token!';
                    }
                    break;

                case 'exchange_tokens_to_dng':
                    if ((currency.tokens || 0) >= 10) {
                        currency.tokens = (currency.tokens || 0) - 10;
                        currency.dng = (currency.dng || 0) + 1;
                        exchangeResult = '✅ Converted 10 🎫 Tokens to 1 💎 $DNG!';
                    }
                    break;

                case 'exchange_dng_to_hero':
                    if ((currency.dng || 0) >= 5) {
                        currency.dng = (currency.dng || 0) - 5;
                        currency.hero = (currency.hero || 0) + 1;
                        exchangeResult = '✅ Converted 5 💎 $DNG to 1 🏆 $HERO!';
                    }
                    break;

                case 'exchange_hero_to_eth':
                    if ((currency.hero || 0) >= 3) {
                        currency.hero = (currency.hero || 0) - 3;
                        currency.eth = (currency.eth || 0) + 1;
                        exchangeResult = '✅ Converted 3 🏆 $HERO to 1 ⚡ $ETH!';
                    }
                    break;

                default:
                    exchangeResult = '❌ Invalid exchange option.';
            }

            if (exchangeResult) {
                await interaction.reply({
                    content: exchangeResult,
                    ephemeral: true
                });

                // Refresh exchange screen
                try {
                    await this.showCurrencyExchange(interaction, gameState, fromContext);
                } catch (error) {
                    logger.error('Error refreshing currency exchange:', error);
                }
            }

        } catch (error) {
            logger.error('Error handling currency exchange:', error);
            throw error;
        }
    }

    /**
     * Get items available for a specific tier
     */
    static getItemsForTier(tier) {
        const itemsByTier = {
            'gold': [
                {
                    id: 'health_potion',
                    name: 'Health Potion',
                    description: 'Restores 10 health points',
                    price: 15,
                    category: 'consumable'
                },
                {
                    id: 'mana_potion',
                    name: 'Mana Potion',
                    description: 'Restores 8 mana points',
                    price: 12,
                    category: 'consumable'
                },
                {
                    id: 'iron_sword',
                    name: 'Iron Sword',
                    description: 'A sturdy iron blade. Damage: 6',
                    price: 50,
                    category: 'weapon',
                    damage: 6
                },
                {
                    id: 'leather_armor',
                    name: 'Leather Armor',
                    description: 'Basic leather protection. Defense: 2',
                    price: 40,
                    category: 'armor',
                    defense: 2
                }
            ],
            'tokens': [
                {
                    id: 'greater_health_potion',
                    name: 'Greater Health Potion',
                    description: 'Restores 20 health points',
                    price: 3,
                    category: 'consumable'
                },
                {
                    id: 'steel_sword',
                    name: 'Steel Sword',
                    description: 'A sharp steel blade. Damage: 10',
                    price: 8,
                    category: 'weapon',
                    damage: 10
                },
                {
                    id: 'chainmail_armor',
                    name: 'Chainmail Armor',
                    description: 'Flexible chain protection. Defense: 4',
                    price: 6,
                    category: 'armor',
                    defense: 4
                }
            ],
            'dng': [
                {
                    id: 'elixir_of_vitality',
                    name: 'Elixir of Vitality',
                    description: 'Restores 15 health and 10 mana',
                    price: 2,
                    category: 'consumable'
                },
                {
                    id: 'enchanted_blade',
                    name: 'Enchanted Blade',
                    description: 'Magical sword with mystical properties. Damage: 15',
                    price: 3,
                    category: 'weapon',
                    damage: 15
                },
                {
                    id: 'plate_armor',
                    name: 'Plate Armor',
                    description: 'Heavy plate protection. Defense: 7',
                    price: 4,
                    category: 'armor',
                    defense: 7
                }
            ],
            'hero': [
                {
                    id: 'legendary_sword',
                    name: 'Legendary Sword',
                    description: 'A weapon of legend. Damage: 25',
                    price: 2,
                    category: 'weapon',
                    damage: 25
                },
                {
                    id: 'dragon_scale_armor',
                    name: 'Dragon Scale Armor',
                    description: 'Armor made from dragon scales. Defense: 12',
                    price: 3,
                    category: 'armor',
                    defense: 12
                }
            ],
            'eth': [
                {
                    id: 'excalibur',
                    name: 'Excalibur',
                    description: 'The ultimate legendary sword. Damage: 40',
                    price: 1,
                    category: 'weapon',
                    damage: 40
                },
                {
                    id: 'godlike_armor',
                    name: 'Godlike Armor',
                    description: 'Divine protection from the gods. Defense: 20',
                    price: 2,
                    category: 'armor',
                    defense: 20
                }
            ]
        };

        return itemsByTier[tier] || [];
    }

    /**
     * Check if player has inventory space for item
     */
    static checkInventorySpace(gameState, item) {
        return InventoryHandler.hasInventorySpace(gameState.inventory, item.category);
    }

    /**
     * Get tier color for embeds
     */
    static getTierColor(tier) {
        const colors = {
            'gold': 0xFFD700,      // Gold
            'tokens': 0x32CD32,    // Green
            'dng': 0x9932CC,       // Purple
            'hero': 0xFF6347,      // Red
            'eth': 0x00BFFF        // Blue
        };
        
        return colors[tier] || 0x808080;
    }

    /**
     * Return to dungeon entrance
     */
    static async returnToEntrance(interaction, gameState) {
        try {
            const { DungeonEntranceHandler } = await import('../core/DungeonEntranceHandler.js');
            await DungeonEntranceHandler.showDungeonEntrance(interaction, gameState);
            
        } catch (error) {
            logger.error('Error returning to dungeon entrance:', error);
            throw error;
        }
    }

    /**
     * Return to previous screen based on context
     */
    static async returnToPreviousScreen(interaction, gameState, fromContext) {
        try {
            if (fromContext === 'dungeon_entrance') {
                await this.returnToEntrance(interaction, gameState);
            } else if (fromContext === 'floor') {
                const { FloorHandler } = await import('../core/FloorHandler.js');
                await FloorHandler.showFloor(interaction, gameState);
            } else {
                // Fallback to floor
                const { FloorHandler } = await import('../core/FloorHandler.js');
                await FloorHandler.showFloor(interaction, gameState);
            }
            
        } catch (error) {
            logger.error('Error returning to previous screen:', error);
            throw error;
        }
    }
} 