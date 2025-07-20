import { EmbedBuilder, StringSelectMenuBuilder, StringSelectMenuOptionBuilder, ActionRowBuilder } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { weaponsData } from '../../data/weaponsData.js';
import { InventoryHandler } from './InventoryHandler.js';
import { InputValidation } from '../../utils/inputValidation.js';
import { embedHistory } from '../../utils/embedHistory.js';

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
        let description = `**🛒 GOBLINS BAZAAR 🛒**\n\n`;
            description += `Welcome to the Goblins Bazaar! Browse our collection of weapons, armor, and mystical trinkets.\n\n`;
            
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
                .setTitle('🛒 **GOBLINS BAZAAR** 🛒')
                .setDescription(description)
                .setImage('https://media.discordapp.net/attachments/1351696887165616169/1356410081700085830/image.png?ex=67edc859&is=67ec76d9&hm=fd65c9bf02e5b83f3c0c5a8c73e25e6b9e74d09f0c4a96c5c8ebe0e24a5d3ce9&=&format=webp&quality=lossless&width=825&height=585')
                .setColor(0x32CD32)
                .setFooter({ text: 'Select a currency tier to browse items' })
                .setTimestamp();

            // Create tier options
            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛒 RPG Item Shop')
                    .setDescription('Buy weapons, armor, and consumables with Gold')
                    .setValue('rpg_shop'),
                
                new StringSelectMenuOptionBuilder()
                    .setLabel('💱 Currency Exchange')
                    .setDescription('Convert between different currency tiers')
                    .setValue('currency_exchange'),
                
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
                    .setLabel('🔙 Return to Dungeon Entrance')
                    .setDescription('Go back to the entrance')
                    .setValue('return_to_entrance')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('shop_actions')
                .setPlaceholder('Choose shop tier...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            // Update or reply based on interaction type
            if (interaction.isRepliable() && !interaction.replied) {
                await embedHistory.updateWithHistory(interaction, {
                    embeds: [embed],
                    components: [row]
                }, gameState.session.userId);
            } else {
                await embedHistory.updateWithHistory(interaction, {
                    embeds: [embed],
                    components: [row]
                }, gameState.session.userId);
            }

            logger.info(`Shop displayed for user ${gameState.session.userId} from ${fromContext}`);

        } catch (error) {
            logger.error('Error showing shop:', error);
            throw error;
        }
    }

    /**
     * Handle shop action selection (alias for CommandHandler compatibility)
     */
    static async handleShopAction(interaction, gameState, selectedValue) {
        try {
            // Validate inputs
            const validatedValue = InputValidation.validateSelectedValue(selectedValue, 'shop_actions');
            if (!validatedValue) {
                logger.error('Invalid selectedValue in handleShopAction:', selectedValue);
                await InputValidation.safeInteractionResponse(interaction, '❌ Invalid action. Please try again.', 'reply');
                return;
            }

            if (!InputValidation.validateGameState(gameState, 'shop_actions')) {
                await InputValidation.safeInteractionResponse(interaction, '❌ Game state error. Please restart.', 'reply');
                return;
            }

            await this.handleAction(interaction, gameState, validatedValue);
        } catch (error) {
            logger.error('Error handling shop action:', error);
            await InputValidation.safeInteractionResponse(interaction, '❌ Shop action failed. Please try again.', 'reply');
        }
    }

    /**
     * Handle shop action selection
     */
    static async handleAction(interaction, gameState, selectedValue, fromContext = 'dungeon_entrance') {
        try {
            // Validate inputs
            const validatedValue = InputValidation.validateSelectedValue(selectedValue, 'shop_actions_handle');
            if (!validatedValue) {
                logger.error('Invalid selectedValue in handleAction:', selectedValue);
                await InputValidation.safeInteractionResponse(interaction, '❌ Invalid action. Please try again.', 'reply');
                return;
            }

            if (!InputValidation.validateGameState(gameState, 'shop_actions_handle')) {
                await InputValidation.safeInteractionResponse(interaction, '❌ Game state error. Please restart.', 'reply');
                return;
            }

            logger.info(`[SHOP_ACTION] User ${gameState.session.userId} selected: ${validatedValue}`);

            switch (validatedValue) {
                case 'rpg_shop':
                    await this.showRPGShop(interaction, gameState, fromContext);
                    break;
                
                case 'rpg_weapons':
                    await this.showRPGWeapons(interaction, gameState, fromContext);
                    break;
                
                case 'rpg_armor':
                    await this.showRPGArmor(interaction, gameState, fromContext);
                    break;
                
                case 'rpg_consumables':
                    await this.showRPGConsumables(interaction, gameState, fromContext);
                    break;
                
                case 'rpg_enhancers':
                    await this.showRPGEnhancers(interaction, gameState, fromContext);
                    break;
                
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
                    // Handle item purchases using safe string operations
                    if (InputValidation.safeStringOperation(validatedValue, 'startsWith', 'buy_rpg_')) {
                        await this.handleRPGPurchase(interaction, gameState, validatedValue, fromContext);
                    } else if (InputValidation.safeStringOperation(validatedValue, 'startsWith', 'buy_')) {
                        await this.handlePurchase(interaction, gameState, validatedValue, fromContext);
                    } else if (InputValidation.safeStringOperation(validatedValue, 'startsWith', 'exchange_')) {
                        await this.handleCurrencyExchange(interaction, gameState, validatedValue, fromContext);
                    } else if (validatedValue === 'back_to_shop') {
                        await this.showShop(interaction, gameState, fromContext);
                    } else {
                        logger.warn(`[SHOP_ACTION] Unknown action: ${validatedValue}`);
                        await InputValidation.safeInteractionResponse(interaction, '❌ Unknown action. Please try again.', 'reply');
                    }
            }
        } catch (error) {
            logger.error('Error handling shop action:', error);
            await InputValidation.safeInteractionResponse(interaction, '❌ Shop action failed. Please try again.', 'reply');
        }
    }

    /**
     * Show RPG item shop with weapons, armor, and consumables
     */
    static async showRPGShop(interaction, gameState, fromContext) {
        try {
            const playerGold = gameState.economy.gold || 0;
            
            let description = `**🛒 RPG ITEM SHOP 🛒**\n\n`;
            description += `Welcome, adventurer! Browse our selection of weapons, armor, and consumables.\n\n`;
            description += `💰 **Your Gold:** ${playerGold}\n\n`;
            description += `**Available Items:**\n`;
            description += `All items are priced fairly for adventurers!`;

            const embed = new EmbedBuilder()
                .setTitle('🛒 **RPG ITEM SHOP** 🛒')
                .setDescription(description)
                .setColor(0x32CD32)
                .setFooter({ text: 'Select a category to browse items' })
                .setTimestamp();

            // Create RPG shop options
            const options = [
                new StringSelectMenuOptionBuilder()
                    .setLabel('⚔️ Weapons')
                    .setDescription('Swords, hammers, bows and more!')
                    .setValue('rpg_weapons'),
                
                new StringSelectMenuOptionBuilder()
                    .setLabel('🛡️ Armor')
                    .setDescription('Protective gear for your adventures')
                    .setValue('rpg_armor'),
                
                new StringSelectMenuOptionBuilder()
                    .setLabel('🧪 Consumables')
                    .setDescription('Potions and useful items')
                    .setValue('rpg_consumables'),
                
                new StringSelectMenuOptionBuilder()
                    .setLabel('💎 Enhancers')
                    .setDescription('Items to improve your gear')
                    .setValue('rpg_enhancers'),
                
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to Shop')
                    .setDescription('Return to main shop menu')
                    .setValue('back_to_shop')
            ];

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('shop_actions')
                .setPlaceholder('Choose item category...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            logger.info(`RPG shop displayed for user ${gameState.session.userId}`);

        } catch (error) {
            logger.error('Error showing RPG shop:', error);
            throw error;
        }
    }

    /**
     * Show RPG weapons shop
     */
    static async showRPGWeapons(interaction, gameState, fromContext) {
        try {
            const playerGold = gameState.economy.gold || 0;
            
            // Define RPG weapons with reasonable prices
            const rpgWeapons = [
                { id: 'iron_sword', name: 'Iron Sword', price: 50, damage: 2, description: 'A sturdy iron blade' },
                { id: 'steel_hammer', name: 'Steel Hammer', price: 75, damage: 2, description: 'Heavy crushing weapon' },
                { id: 'hunting_bow', name: 'Hunting Bow', price: 60, damage: 2, description: 'Accurate ranged weapon' },
                { id: 'silver_sword', name: 'Silver Sword', price: 150, damage: 3, description: 'Enchanted silver blade' },
                { id: 'war_hammer', name: 'War Hammer', price: 200, damage: 4, description: 'Devastating two-handed weapon' }
            ];

            let description = `**⚔️ WEAPONS SHOP ⚔️**\n\n`;
            description += `💰 **Your Gold:** ${playerGold}\n\n`;
            description += `**Available Weapons:**\n`;
            rpgWeapons.forEach(weapon => {
                const canAfford = playerGold >= weapon.price ? '✅' : '❌';
                description += `${canAfford} **${weapon.name}** - ${weapon.price} Gold (${weapon.damage} damage)\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle('⚔️ **WEAPONS SHOP** ⚔️')
                .setDescription(description)
                .setColor(0xFF6347)
                .setFooter({ text: 'Select a weapon to purchase' })
                .setTimestamp();

            // Create weapon purchase options
            const options = [];
            rpgWeapons.forEach(weapon => {
                const canAfford = playerGold >= weapon.price;
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${canAfford ? '⚔️' : '❌'} ${weapon.name} - ${weapon.price} Gold`)
                        .setDescription(weapon.description)
                        .setValue(`buy_rpg_weapon_${weapon.id}`)
                );
            });

            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to RPG Shop')
                    .setDescription('Return to RPG item categories')
                    .setValue('rpg_shop')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('shop_actions')
                .setPlaceholder('Choose weapon to purchase...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

        } catch (error) {
            logger.error('Error showing RPG weapons:', error);
            throw error;
        }
    }

    /**
     * Show RPG consumables shop
     */
    static async showRPGConsumables(interaction, gameState, fromContext) {
        try {
            const playerGold = gameState.economy.gold || 0;
            
            // Define RPG consumables with reasonable prices
            const rpgConsumables = [
                { id: 'health_potion', name: 'Health Potion', price: 25, effect: '+10 Health', description: 'Restores 10 health points' },
                { id: 'mana_potion', name: 'Mana Potion', price: 30, effect: '+8 Mana', description: 'Restores 8 mana points' },
                { id: 'greater_health_potion', name: 'Greater Health Potion', price: 50, effect: '+20 Health', description: 'Restores 20 health points' },
                { id: 'greater_mana_potion', name: 'Greater Mana Potion', price: 60, effect: '+15 Mana', description: 'Restores 15 mana points' },
                { id: 'elixir_of_vitality', name: 'Elixir of Vitality', price: 100, effect: '+15 Health, +10 Mana', description: 'Restores both health and mana' }
            ];

            let description = `**🧪 CONSUMABLES SHOP 🧪**\n\n`;
            description += `💰 **Your Gold:** ${playerGold}\n\n`;
            description += `**Available Consumables:**\n`;
            rpgConsumables.forEach(item => {
                const canAfford = playerGold >= item.price ? '✅' : '❌';
                description += `${canAfford} **${item.name}** - ${item.price} Gold (${item.effect})\n`;
            });

            const embed = new EmbedBuilder()
                .setTitle('🧪 **CONSUMABLES SHOP** 🧪')
                .setDescription(description)
                .setColor(0x32CD32)
                .setFooter({ text: 'Select a consumable to purchase' })
                .setTimestamp();

            // Create consumable purchase options
            const options = [];
            rpgConsumables.forEach(item => {
                const canAfford = playerGold >= item.price;
                options.push(
                    new StringSelectMenuOptionBuilder()
                        .setLabel(`${canAfford ? '🧪' : '❌'} ${item.name} - ${item.price} Gold`)
                        .setDescription(item.description)
                        .setValue(`buy_rpg_consumable_${item.id}`)
                );
            });

            options.push(
                new StringSelectMenuOptionBuilder()
                    .setLabel('🔙 Back to RPG Shop')
                    .setDescription('Return to RPG item categories')
                    .setValue('rpg_shop')
            );

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('shop_actions')
                .setPlaceholder('Choose consumable to purchase...')
                .setMaxValues(1)
                .setMinValues(1)
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

        } catch (error) {
            logger.error('Error showing RPG consumables:', error);
            throw error;
        }
    }

    /**
     * Handle RPG item purchases
     */
    static async handleRPGPurchase(interaction, gameState, selectedValue, fromContext) {
        try {
            // Parse the purchase request: buy_rpg_weapon_iron_sword or buy_rpg_consumable_health_potion
            const parts = selectedValue.split('_');
            const itemType = parts[2]; // weapon, consumable, etc.
            const itemId = parts.slice(3).join('_'); // item identifier
            
            const playerGold = gameState.economy.gold || 0;
            let itemData = null;
            let price = 0;

            // Get item data and price based on type
            if (itemType === 'weapon') {
                const weapons = [
                    { id: 'iron_sword', name: 'Iron Sword', price: 50, damage: 2 },
                    { id: 'steel_hammer', name: 'Steel Hammer', price: 75, damage: 2 },
                    { id: 'hunting_bow', name: 'Hunting Bow', price: 60, damage: 2 },
                    { id: 'silver_sword', name: 'Silver Sword', price: 150, damage: 3 },
                    { id: 'war_hammer', name: 'War Hammer', price: 200, damage: 4 }
                ];
                itemData = weapons.find(w => w.id === itemId);
                price = itemData?.price || 0;
            } else if (itemType === 'consumable') {
                const consumables = [
                    { id: 'health_potion', name: 'Health Potion', price: 25 },
                    { id: 'mana_potion', name: 'Mana Potion', price: 30 },
                    { id: 'greater_health_potion', name: 'Greater Health Potion', price: 50 },
                    { id: 'greater_mana_potion', name: 'Greater Mana Potion', price: 60 },
                    { id: 'elixir_of_vitality', name: 'Elixir of Vitality', price: 100 }
                ];
                itemData = consumables.find(c => c.id === itemId);
                price = itemData?.price || 0;
            }

            if (!itemData) {
                await embedHistory.updateWithHistory(interaction, {
                    content: '❌ Item not found.',
                    embeds: [],
                    components: []
                }, gameState.session.userId);
                return;
            }

            // Check if player can afford it
            if (playerGold < price) {
                await embedHistory.updateWithHistory(interaction, {
                    content: `❌ Not enough gold! You need ${price} gold but only have ${playerGold}.`,
                    embeds: [],
                    components: []
                }, gameState.session.userId);
                return;
            }

            // Check inventory space
            const inventory = gameState.player.inventory;
            const hasSpace = InventoryHandler.hasInventorySpace(inventory, itemType);
            
            if (!hasSpace) {
                await embedHistory.updateWithHistory(interaction, {
                    content: `❌ Your ${itemType} inventory is full! (20/20 items)`,
                    embeds: [],
                    components: []
                }, gameState.session.userId);
                return;
            }

            // Complete the purchase
            gameState.economy.gold -= price;
            InventoryHandler.addItemToInventory(inventory, itemId, itemType);

            // Show success message
            const embed = new EmbedBuilder()
                .setTitle('✅ **PURCHASE SUCCESSFUL** ✅')
                .setDescription(`You purchased **${itemData.name}** for **${price} Gold**!\n\n💰 **Remaining Gold:** ${gameState.economy.gold}`)
                .setColor(0x00FF00)
                .setFooter({ text: 'Item added to your inventory' })
                .setTimestamp();

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: []
            }, gameState.session.userId);

            logger.info(`User ${gameState.session.userId} purchased ${itemData.name} for ${price} gold`);

        } catch (error) {
            logger.error('Error handling RPG purchase:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: '❌ Purchase failed. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Show RPG armor shop (placeholder)
     */
    static async showRPGArmor(interaction, gameState, fromContext) {
        try {
            await embedHistory.updateWithHistory(interaction, {
                content: '🛡️ Armor shop coming soon! For now, try the Weapons or Consumables shops.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        } catch (error) {
            logger.error('Error showing RPG armor:', error);
            throw error;
        }
    }

    /**
     * Show RPG enhancers shop (placeholder)
     */
    static async showRPGEnhancers(interaction, gameState, fromContext) {
        try {
            await embedHistory.updateWithHistory(interaction, {
                content: '💎 Enhancers shop coming soon! For now, try the Weapons or Consumables shops.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        } catch (error) {
            logger.error('Error showing RPG enhancers:', error);
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

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

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

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

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
                await embedHistory.updateWithHistory(interaction, {
                    content: 'Item not found. Please try again.',
                    embeds: [],
                    components: []
                }, gameState.session.userId);
                return;
            }

            const currency = gameState.economy;
            const playerCurrency = currency[tier] || 0;

            // Check if player can afford
            if (playerCurrency < item.price) {
                await embedHistory.updateWithHistory(interaction, {
                    content: `❌ Insufficient ${tier.toUpperCase()}! You need ${item.price} but only have ${playerCurrency}.`,
                    embeds: [],
                    components: []
                }, gameState.session.userId);
                return;
            }

            // Check inventory space
            if (!this.checkInventorySpace(gameState, item)) {
                await embedHistory.updateWithHistory(interaction, {
                    content: `❌ Inventory full! You need space in your ${item.category} inventory to purchase this item.`,
                    embeds: [],
                    components: []
                }, gameState.session.userId);
                return;
            }

            // Process purchase
            currency[tier] = playerCurrency - item.price;
            
            // Add item to inventory
            const success = InventoryHandler.addItemToInventory(gameState.inventory, item, item.category);
            
            if (!success) {
                // Refund if addition failed
                currency[tier] = playerCurrency;
                await embedHistory.updateWithHistory(interaction, {
                    content: '❌ Failed to add item to inventory. Please try again.',
                    embeds: [],
                    components: []
                }, gameState.session.userId);
                return;
            }

            const tierEmojis = {
                'gold': '🪙',
                'tokens': '🎫',
                'dng': '💎',
                'hero': '🏆',
                'eth': '⚡'
            };

            await embedHistory.updateWithHistory(interaction, {
                content: `✅ **Purchased ${item.name}!**\n\n${tierEmojis[tier]} Spent: ${item.price} ${tier.toUpperCase()}\n${tierEmojis[tier]} Remaining: ${currency[tier]}\n\n📦 Item added to your ${item.category} inventory!`,
                embeds: [],
                components: []
            }, gameState.session.userId);

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
                await embedHistory.updateWithHistory(interaction, {
                    content: exchangeResult,
                    embeds: [],
                    components: []
                }, gameState.session.userId);

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