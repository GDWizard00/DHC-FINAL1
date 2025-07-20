import { EmbedBuilder, StringSelectMenuBuilder, ActionRowBuilder, MessageFlags } from 'discord.js';
import { logger } from '../../utils/logger.js';
import { weaponsData } from '../../data/weaponsData.js';
import { embedHistory } from '../../utils/embedHistory.js';
import { getPotionInfo } from '../../utils/potionScaling.js';

/**
 * InventoryHandler - Manages inventory with Discord dropdown limitations
 * Max 20 items per category, stacked consumables, equip/unequip functionality
 */
class InventoryHandler {
    
    /**
     * Show main inventory screen
     */
    static async showInventory(interaction, gameState, fromContext = 'normal') {
        try {
            const inventory = gameState.player.inventory;
            const hero = gameState.selectedHero;
            
            // Build inventory description
            let description = `**${hero.name}'s Inventory**\n\n`;
            description += `💰 **Gold:** ${gameState.economy.gold || 0}\n`;
            description += `🗝️ **Keys:** ${inventory.keys || 0}/100\n\n`;
            
            // Current equipment
            description += `**⚔️ Equipped Weapons:**\n`;
            if (hero.equippedWeapons && hero.equippedWeapons.length > 0) {
                hero.equippedWeapons.forEach(weapon => {
                    description += `• ${weapon.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
                });
            } else {
                description += `• None equipped\n`;
            }
            
            description += `\n**🛡️ Equipped Armor:**\n`;
            if (hero.equippedArmor && hero.equippedArmor.length > 0) {
                hero.equippedArmor.forEach(armor => {
                    description += `• ${armor.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
                });
            } else {
                description += `• None equipped\n`;
            }

            // Inventory counts
            const weaponCount = this.getWeaponCount(inventory);
            const armorCount = this.getArmorCount(inventory);
            const consumableCount = this.getConsumableCount(inventory);
            const enhancerCount = this.getEnhancerCount(inventory);

            description += `\n**📦 Inventory Slots:**\n`;
            description += `⚔️ Weapons: ${weaponCount}/20\n`;
            description += `🛡️ Armor: ${armorCount}/20\n`;
            description += `🧪 Consumables: ${consumableCount}/20\n`;
            description += `💎 Enhancers: ${enhancerCount}/20\n`;

            const embed = new EmbedBuilder()
                .setTitle('🎒 **INVENTORY** 🎒')
                .setDescription(description)
                .setColor(0x8B4513)
                .setFooter({ text: 'Select a category to manage your items' })
                .setTimestamp();

            // Create category options
            const options = [
                {
                    label: '⚔️ Weapons',
                    description: `Manage weapons (${weaponCount}/20)`,
                    value: 'weapons',
                    emoji: '⚔️'
                },
                {
                    label: '🛡️ Armor',
                    description: `Manage armor (${armorCount}/20)`,
                    value: 'armor',
                    emoji: '🛡️'
                },
                {
                    label: '🧪 Consumables',
                    description: `Use consumables (${consumableCount}/20)`,
                    value: 'consumables',
                    emoji: '🧪'
                },
                {
                    label: '💎 Enhancers',
                    description: `Use enhancers (${enhancerCount}/20)`,
                    value: 'enhancers',
                    emoji: '💎'
                }
            ];

            // Add return option based on context
            if (fromContext === 'battle') {
                options.push({
                    label: '🔙 Return to Battle',
                    description: 'Go back to combat',
                    value: 'return_to_battle',
                    emoji: '🔙'
                });
            } else {
                options.push({
                    label: '🔙 Return',
                    description: 'Go back to previous screen',
                    value: 'return',
                    emoji: '🔙'
                });
            }

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('inventory_actions')
                .setPlaceholder('Choose inventory category...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

            gameState.currentScreen = 'inventory';
            gameState.updateActivity();

            logger.info(`Inventory displayed for user ${gameState.playerId}`);

        } catch (error) {
            logger.error('Error showing inventory:', error);
            await embedHistory.updateWithHistory(interaction, {
                content: 'Error loading inventory. Please try again.',
                embeds: [],
                components: []
            }, gameState.session.userId);
        }
    }

    /**
     * Show inventory during battle (limited options)
     */
    static async showBattleInventory(interaction, gameState) {
        try {
            await this.showInventory(interaction, gameState, 'battle');
        } catch (error) {
            logger.error('Error showing battle inventory:', error);
            throw error;
        }
    }

    /**
     * Handle inventory category selection
     */
    static async handleAction(interaction, gameState, selectedValue) {
        try {
            switch (selectedValue) {
                case 'weapons':
                    await this.showWeaponsInventory(interaction, gameState);
                    break;
                
                case 'armor':
                    await this.showArmorInventory(interaction, gameState);
                    break;
                
                case 'consumables':
                    await this.showConsumablesInventory(interaction, gameState);
                    break;
                
                case 'enhancers':
                    await this.showEnhancersInventory(interaction, gameState);
                    break;
                
                case 'return_to_battle':
                    await this.returnToBattle(interaction, gameState);
                    break;
                
                case 'return':
                    await this.returnToPreviousScreen(interaction, gameState);
                    break;
                
                default:
                    // Handle specific item actions
                    await this.handleItemAction(interaction, gameState, selectedValue);
            }
        } catch (error) {
            logger.error('Error handling inventory action:', error);
            throw error;
        }
    }

    /**
     * Show weapons inventory
     */
    static async showWeaponsInventory(interaction, gameState) {
        try {
            const weapons = this.getWeaponsFromInventory(gameState.player.inventory);
            const equippedWeapons = gameState.selectedHero.equippedWeapons || [];

            let description = `**⚔️ Weapons Inventory (${weapons.length}/20)**\n\n`;
            
            if (weapons.length === 0) {
                description += `*No weapons in inventory*\n\n`;
            } else {
                description += `**Available Weapons:**\n`;
                weapons.forEach(weapon => {
                    const isEquipped = equippedWeapons.includes(weapon.id);
                    description += `${isEquipped ? '✅' : '⬜'} ${weapon.name}${isEquipped ? ' (Equipped)' : ''}\n`;
                });
                description += `\n`;
            }

            description += `**Currently Equipped:**\n`;
            if (equippedWeapons.length > 0) {
                equippedWeapons.forEach(weaponId => {
                    description += `• ${weaponId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
                });
            } else {
                description += `• None equipped\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle('⚔️ **WEAPONS INVENTORY** ⚔️')
                .setDescription(description)
                .setColor(0xFF6347)
                .setFooter({ text: 'Select a weapon to equip/unequip or drop' });

            // Create weapon options (max 20 due to Discord limitations)
            const options = [];
            
            weapons.slice(0, 20).forEach(weapon => {
                const isEquipped = equippedWeapons.includes(weapon.id);
                options.push(
                    {
                        label: `${isEquipped ? '✅' : '⬜'} ${weapon.name}`,
                        description: `${isEquipped ? 'Unequip' : 'Equip'} | Drop | Damage: ${weapon.damage}`,
                        value: `weapon_${weapon.id}`
                    }
                );
            });

            // Add back option
            options.push({
                label: '🔙 Back to Inventory',
                description: 'Return to main inventory',
                value: 'back_to_inventory'
            });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('inventory_actions')
                .setPlaceholder('Choose weapon action...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

        } catch (error) {
            logger.error('Error showing weapons inventory:', error);
            throw error;
        }
    }

    /**
     * Show armor inventory
     */
    static async showArmorInventory(interaction, gameState) {
        try {
            const armor = this.getArmorFromInventory(gameState.player.inventory);
            const equippedArmor = gameState.selectedHero.equippedArmor || [];

            let description = `**🛡️ Armor Inventory (${armor.length}/20)**\n\n`;
            
            if (armor.length === 0) {
                description += `*No armor in inventory*\n\n`;
            } else {
                description += `**Available Armor:**\n`;
                armor.forEach(armorPiece => {
                    const isEquipped = equippedArmor.includes(armorPiece.id);
                    description += `${isEquipped ? '✅' : '⬜'} ${armorPiece.name}${isEquipped ? ' (Equipped)' : ''}\n`;
                });
                description += `\n`;
            }

            description += `**Currently Equipped:**\n`;
            if (equippedArmor.length > 0) {
                equippedArmor.forEach(armorId => {
                    description += `• ${armorId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}\n`;
                });
            } else {
                description += `• None equipped\n`;
            }

            const embed = new EmbedBuilder()
                .setTitle('🛡️ **ARMOR INVENTORY** 🛡️')
                .setDescription(description)
                .setColor(0x4169E1)
                .setFooter({ text: 'Select armor to equip/unequip or drop' });

            // Create armor options (max 20 due to Discord limitations)
            const options = [];
            
            armor.slice(0, 20).forEach(armorPiece => {
                const isEquipped = equippedArmor.includes(armorPiece.id);
                options.push(
                    {
                        label: `${isEquipped ? '✅' : '⬜'} ${armorPiece.name}`,
                        description: `${isEquipped ? 'Unequip' : 'Equip'} | Drop | Defense: ${armorPiece.defense}`,
                        value: `armor_${armorPiece.id}`
                    }
                );
            });

            // Add back option
            options.push({
                label: '🔙 Back to Inventory',
                description: 'Return to main inventory',
                value: 'back_to_inventory'
            });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('inventory_actions')
                .setPlaceholder('Choose armor action...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

        } catch (error) {
            logger.error('Error showing armor inventory:', error);
            throw error;
        }
    }

    /**
     * Show consumables inventory
     */
    static async showConsumablesInventory(interaction, gameState) {
        try {
            const consumables = this.getConsumablesFromInventory(gameState.player.inventory);
            const stackedConsumables = this.stackItems(consumables);

            let description = `**🧪 Consumables Inventory (${Object.keys(stackedConsumables).length}/20)**\n\n`;
            
            if (Object.keys(stackedConsumables).length === 0) {
                description += `*No consumables in inventory*\n\n`;
            } else {
                description += `**Available Consumables:**\n`;
                Object.entries(stackedConsumables).forEach(([itemId, count]) => {
                    const displayName = itemId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    description += `• ${displayName} x${count}\n`;
                });
                description += `\n`;
            }

            description += `*Select a consumable to use it immediately.*`;

            const embed = new EmbedBuilder()
                .setTitle('🧪 **CONSUMABLES INVENTORY** 🧪')
                .setDescription(description)
                .setColor(0x32CD32)
                .setFooter({ text: 'Select a consumable to use' });

            // Create consumable options (max 20 due to Discord limitations)
            const options = [];
            
            Object.entries(stackedConsumables).slice(0, 20).forEach(([itemId, count]) => {
                const displayName = itemId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                options.push(
                    {
                        label: `🧪 ${displayName} x${count}`,
                        description: `Use this consumable`,
                        value: `use_consumable_${itemId}`
                    }
                );
            });

            // Add back option
            options.push({
                label: '🔙 Back to Inventory',
                description: 'Return to main inventory',
                value: 'back_to_inventory'
            });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('inventory_actions')
                .setPlaceholder('Choose consumable to use...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

        } catch (error) {
            logger.error('Error showing consumables inventory:', error);
            throw error;
        }
    }

    /**
     * Show enhancers inventory
     */
    static async showEnhancersInventory(interaction, gameState) {
        try {
            const enhancers = this.getEnhancersFromInventory(gameState.player.inventory);
            const stackedEnhancers = this.stackItems(enhancers);

            let description = `**💎 Enhancers Inventory (${Object.keys(stackedEnhancers).length}/20)**\n\n`;
            
            if (Object.keys(stackedEnhancers).length === 0) {
                description += `*No enhancers in inventory*\n\n`;
            } else {
                description += `**Available Enhancers:**\n`;
                Object.entries(stackedEnhancers).forEach(([itemId, count]) => {
                    const displayName = itemId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                    description += `• ${displayName} x${count}\n`;
                });
                description += `\n`;
            }

            description += `*Select an enhancer to apply it to equipment.*`;

            const embed = new EmbedBuilder()
                .setTitle('💎 **ENHANCERS INVENTORY** 💎')
                .setDescription(description)
                .setColor(0x9932CC)
                .setFooter({ text: 'Select an enhancer to use' });

            // Create enhancer options (max 20 due to Discord limitations)
            const options = [];
            
            Object.entries(stackedEnhancers).slice(0, 20).forEach(([itemId, count]) => {
                const displayName = itemId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
                options.push(
                    {
                        label: `💎 ${displayName} x${count}`,
                        description: `Apply this enhancer`,
                        value: `use_enhancer_${itemId}`
                    }
                );
            });

            // Add back option
            options.push({
                label: '🔙 Back to Inventory',
                description: 'Return to main inventory',
                value: 'back_to_inventory'
            });

            const selectMenu = new StringSelectMenuBuilder()
                .setCustomId('inventory_actions')
                .setPlaceholder('Choose enhancer to use...')
                .addOptions(options);

            const row = new ActionRowBuilder().addComponents(selectMenu);

            await embedHistory.updateWithHistory(interaction, {
                embeds: [embed],
                components: [row]
            }, gameState.session.userId);

        } catch (error) {
            logger.error('Error showing enhancers inventory:', error);
            throw error;
        }
    }

    /**
     * Handle specific item actions
     */
    static async handleItemAction(interaction, gameState, selectedValue) {
        try {
            if (selectedValue === 'back_to_inventory') {
                await this.showInventory(interaction, gameState);
                return;
            }

            const [action, type, itemId] = selectedValue.split('_', 3);
            
            if (action === 'weapon') {
                await this.handleWeaponAction(interaction, gameState, itemId);
            } else if (action === 'armor') {
                await this.handleArmorAction(interaction, gameState, itemId);
            } else if (action === 'use' && type === 'consumable') {
                await this.useConsumable(interaction, gameState, itemId);
            } else if (action === 'use' && type === 'enhancer') {
                await this.useEnhancer(interaction, gameState, itemId);
            }

        } catch (error) {
            logger.error('Error handling item action:', error);
            throw error;
        }
    }

    /**
     * Handle weapon equip/unequip
     */
    static async handleWeaponAction(interaction, gameState, weaponId) {
        try {
            const equippedWeapons = gameState.selectedHero.equippedWeapons || [];
            const isEquipped = equippedWeapons.includes(weaponId);

            if (isEquipped) {
                // Unequip weapon
                gameState.selectedHero.equippedWeapons = equippedWeapons.filter(w => w !== weaponId);
                await interaction.reply({
                    content: `✅ ${weaponId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} unequipped!`,
                    flags: MessageFlags.Ephemeral
                });
            } else {
                // Equip weapon
                if (!gameState.selectedHero.equippedWeapons) gameState.selectedHero.equippedWeapons = [];
                gameState.selectedHero.equippedWeapons.push(weaponId);
                await interaction.reply({
                    content: `⚔️ ${weaponId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} equipped!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Refresh weapons inventory
            try {
                await this.showWeaponsInventory(interaction, gameState);
            } catch (error) {
                logger.error('Error refreshing weapons inventory:', error);
            }

        } catch (error) {
            logger.error('Error handling weapon action:', error);
            throw error;
        }
    }

    /**
     * Handle armor equip/unequip
     */
    static async handleArmorAction(interaction, gameState, armorId) {
        try {
            const equippedArmor = gameState.selectedHero.equippedArmor || [];
            const isEquipped = equippedArmor.includes(armorId);

            if (isEquipped) {
                // Unequip armor
                gameState.selectedHero.equippedArmor = equippedArmor.filter(a => a !== armorId);
                await interaction.reply({
                    content: `✅ ${armorId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} unequipped!`,
                    flags: MessageFlags.Ephemeral
                });
            } else {
                // Equip armor
                if (!gameState.selectedHero.equippedArmor) gameState.selectedHero.equippedArmor = [];
                gameState.selectedHero.equippedArmor.push(armorId);
                await interaction.reply({
                    content: `🛡️ ${armorId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} equipped!`,
                    flags: MessageFlags.Ephemeral
                });
            }

            // Refresh armor inventory
            try {
                await this.showArmorInventory(interaction, gameState);
            } catch (error) {
                logger.error('Error refreshing armor inventory:', error);
            }

        } catch (error) {
            logger.error('Error handling armor action:', error);
            throw error;
        }
    }

    /**
     * Use consumable item
     */
    static async useConsumable(interaction, gameState, itemId) {
        try {
            // Apply consumable effect
            const effect = this.getConsumableEffect(itemId);
            
            if (effect.health > 0) {
                gameState.selectedHero.health = Math.min(
                    gameState.selectedHero.maxHealth, 
                    gameState.selectedHero.health + effect.health
                );
            }
            
            if (effect.mana > 0) {
                gameState.selectedHero.mana = Math.min(
                    gameState.selectedHero.maxMana, 
                    gameState.selectedHero.mana + effect.mana
                );
            }

            // Remove one instance of the item
            this.removeItemFromInventory(gameState.player.inventory, itemId);

            const displayName = itemId.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
            await interaction.reply({
                content: `🧪 Used ${displayName}! ${effect.description}`,
                flags: MessageFlags.Ephemeral
            });

            // Refresh consumables inventory
            try {
                await this.showConsumablesInventory(interaction, gameState);
            } catch (error) {
                logger.error('Error refreshing consumables inventory:', error);
            }

        } catch (error) {
            logger.error('Error using consumable:', error);
            throw error;
        }
    }

    /**
     * Use enhancer item
     */
    static async useEnhancer(interaction, gameState, itemId) {
        try {
            // Get enhancer data
            const enhancerEffect = this.getEnhancerEffect(itemId);
            
            if (!enhancerEffect) {
                await interaction.reply({
                    content: '❌ Unknown enhancer type.',
                    flags: MessageFlags.Ephemeral
                });
                return;
            }

            // Apply enhancer effect to hero
            if (enhancerEffect.type === 'health') {
                gameState.selectedHero.maxHealth += enhancerEffect.healthBonus;
                gameState.selectedHero.health += enhancerEffect.healthBonus;
            } else if (enhancerEffect.type === 'mana') {
                gameState.selectedHero.maxMana += enhancerEffect.manaBonus;
                gameState.selectedHero.mana += enhancerEffect.manaBonus;
            } else if (enhancerEffect.type === 'crit') {
                gameState.selectedHero.critChance += enhancerEffect.critBonus;
            } else if (enhancerEffect.type === 'weapon') {
                // Apply weapon enhancement (simplified for now)
                if (gameState.selectedHero.currentWeapon) {
                    gameState.selectedHero.currentWeapon.enhancementBonus = (gameState.selectedHero.currentWeapon.enhancementBonus || 0) + enhancerEffect.damageBonus;
                }
            }

            // Remove enhancer from inventory
            this.removeItemFromInventory(gameState.player.inventory, itemId);

            // Show result
            const embed = new EmbedBuilder()
                .setTitle('💎 **ENHANCER USED** 💎')
                .setDescription(`**${enhancerEffect.name}** has been applied!\n\n${enhancerEffect.description}`)
                .setColor(0x9932CC)
                .setFooter({ text: 'Enhancement applied permanently' });

            await interaction.reply({
                embeds: [embed]
            });

            logger.info(`User ${gameState.playerId} used enhancer: ${itemId}`);

        } catch (error) {
            logger.error('Error using enhancer:', error);
            throw error;
        }
    }

    /**
     * Return to battle
     */
    static async returnToBattle(interaction, gameState) {
        try {
            const { BattleHandler } = await import('../core/BattleHandler.js');
            await BattleHandler.showBattleScreen(interaction, gameState);
            
        } catch (error) {
            logger.error('Error returning to battle:', error);
            throw error;
        }
    }

    /**
     * Return to previous screen based on current screen
     */
    static async returnToPreviousScreen(interaction, gameState) {
        try {
            const currentScreen = gameState.currentScreen;
            
            if (currentScreen === 'dungeon_entrance') {
                const { DungeonEntranceHandler } = await import('../core/DungeonEntranceHandler.js');
                await DungeonEntranceHandler.showDungeonEntrance(interaction, gameState);
            } else if (currentScreen === 'floor') {
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

    // Helper methods for inventory management

    /**
     * Get weapon count (max 20)
     */
    static getWeaponCount(inventory) {
        return this.getWeaponsFromInventory(inventory).length;
    }

    /**
     * Get armor count (max 20)
     */
    static getArmorCount(inventory) {
        return this.getArmorFromInventory(inventory).length;
    }

    /**
     * Get consumable count (max 20 unique types)
     */
    static getConsumableCount(inventory) {
        const consumables = this.getConsumablesFromInventory(inventory);
        return Object.keys(this.stackItems(consumables)).length;
    }

    /**
     * Get enhancer count (max 20 unique types)
     */
    static getEnhancerCount(inventory) {
        const enhancers = this.getEnhancersFromInventory(inventory);
        return Object.keys(this.stackItems(enhancers)).length;
    }

    /**
     * Get weapons from inventory
     */
    static getWeaponsFromInventory(inventory) {
        if (!inventory.weapons) return [];
        return inventory.weapons.slice(0, 20); // Discord limitation
    }

    /**
     * Get armor from inventory
     */
    static getArmorFromInventory(inventory) {
        if (!inventory.armor) return [];
        return inventory.armor.slice(0, 20); // Discord limitation
    }

    /**
     * Get consumables from inventory
     */
    static getConsumablesFromInventory(inventory) {
        if (!inventory.consumables) return [];
        return inventory.consumables;
    }

    /**
     * Get enhancers from inventory
     */
    static getEnhancersFromInventory(inventory) {
        if (!inventory.enhancers) return [];
        return inventory.enhancers;
    }

    /**
     * Stack items by ID and count
     */
    static stackItems(items) {
        const stacked = {};
        items.forEach(item => {
            const itemId = typeof item === 'string' ? item : item.id;
            stacked[itemId] = (stacked[itemId] || 0) + 1;
        });
        return stacked;
    }

    /**
     * Get consumable effect
     */
    static getConsumableEffect(itemId) {
        // Check if it's a scaled potion
        const potionInfo = getPotionInfo(itemId);
        if (potionInfo) {
            if (potionInfo.description.includes('mana')) {
                return { health: 0, mana: potionInfo.value, description: `Restored ${potionInfo.value} mana!` };
            } else {
                return { health: potionInfo.value, mana: 0, description: `Restored ${potionInfo.value} health!` };
            }
        }
        
        const effects = {
            'health_potion': { health: 10, mana: 0, description: 'Restored 10 health!' },
            'mana_potion': { health: 0, mana: 8, description: 'Restored 8 mana!' },
            'greater_health_potion': { health: 20, mana: 0, description: 'Restored 20 health!' },
            'greater_mana_potion': { health: 0, mana: 15, description: 'Restored 15 mana!' },
            'elixir_of_vitality': { health: 15, mana: 10, description: 'Restored 15 health and 10 mana!' }
        };
        
        return effects[itemId] || { health: 0, mana: 0, description: 'Unknown effect' };
    }

    /**
     * Get enhancer effect
     */
    static getEnhancerEffect(itemId) {
        const enhancers = {
            'ancient_rune': { 
                name: 'Ancient Rune', 
                type: 'crit', 
                critBonus: 5, 
                description: 'Increased critical hit chance by 5%!' 
            },
            'vampire_tooth': { 
                name: 'Vampire Tooth', 
                type: 'weapon', 
                damageBonus: 1, 
                description: 'Weapon damage increased by 1 with 10% chance to drain health!' 
            },
            'fire_shard': { 
                name: 'Fire Shard', 
                type: 'weapon', 
                damageBonus: 2, 
                description: 'Weapon damage increased by 2 with 30% chance to burn enemy!' 
            },
            'dragons_tooth': { 
                name: "Dragon's Tooth", 
                type: 'weapon', 
                damageBonus: 3, 
                description: 'Weapon damage increased by 3 with 20% chance to burn enemy!' 
            },
            'shattered_health_shard': { 
                name: 'Shattered Health Shard', 
                type: 'health', 
                healthBonus: 1, 
                description: 'Increased max health by 1 and healed 1 health!' 
            },
            'broken_health_shard': { 
                name: 'Broken Health Shard', 
                type: 'health', 
                healthBonus: 2, 
                description: 'Increased max health by 2 and healed 2 health!' 
            },
            'worn_health_shard': { 
                name: 'Worn Health Shard', 
                type: 'health', 
                healthBonus: 4, 
                description: 'Increased max health by 4 and healed 4 health!' 
            },
            'active_health_shard': { 
                name: 'Active Health Shard', 
                type: 'health', 
                healthBonus: 8, 
                description: 'Increased max health by 8 and healed 8 health!' 
            },
            'mana_shard': { 
                name: 'Mana Shard', 
                type: 'mana', 
                manaBonus: 5, 
                description: 'Increased max mana by 5 and restored 5 mana!' 
            },
            'broken_mana_shard': { 
                name: 'Broken Mana Shard', 
                type: 'mana', 
                manaBonus: 2, 
                description: 'Increased max mana by 2!' 
            }
        };
        
        return enhancers[itemId] || null;
    }

    /**
     * Remove item from inventory
     */
    static removeItemFromInventory(inventory, itemId) {
        // Remove from consumables
        if (inventory.consumables) {
            const index = inventory.consumables.findIndex(item => 
                (typeof item === 'string' ? item : item.id) === itemId
            );
            if (index !== -1) {
                inventory.consumables.splice(index, 1);
                return;
            }
        }

        // Remove from enhancers
        if (inventory.enhancers) {
            const index = inventory.enhancers.findIndex(item => 
                (typeof item === 'string' ? item : item.id) === itemId
            );
            if (index !== -1) {
                inventory.enhancers.splice(index, 1);
                return;
            }
        }
    }

    /**
     * Check if inventory has space for new items
     */
    static hasInventorySpace(inventory, itemType) {
        switch (itemType) {
            case 'weapon':
                return this.getWeaponCount(inventory) < 20;
            case 'armor':
                return this.getArmorCount(inventory) < 20;
            case 'consumable':
                return this.getConsumableCount(inventory) < 20;
            case 'enhancer':
                return this.getEnhancerCount(inventory) < 20;
            default:
                return false;
        }
    }

    /**
     * Add item to inventory if space available
     */
    static addItemToInventory(inventory, item, itemType) {
        if (!this.hasInventorySpace(inventory, itemType)) {
            return false; // No space available
        }

        switch (itemType) {
            case 'weapon':
                if (!inventory.weapons) inventory.weapons = [];
                inventory.weapons.push(item);
                break;
            case 'armor':
                if (!inventory.armor) inventory.armor = [];
                inventory.armor.push(item);
                break;
            case 'consumable':
                if (!inventory.consumables) inventory.consumables = [];
                inventory.consumables.push(item);
                break;
            case 'enhancer':
                if (!inventory.enhancers) inventory.enhancers = [];
                inventory.enhancers.push(item);
                break;
        }

        return true; // Successfully added
    }

    /**
     * Add item with limit check and user feedback
     */
    static async addItemWithLimitCheck(interaction, gameState, item, itemType) {
        const inventory = gameState.player.inventory;
        
        if (this.addItemToInventory(inventory, item, itemType)) {
            // Item added successfully
            const itemName = typeof item === 'string' ? item : item.name || item;
            logger.info(`Added ${itemName} to ${gameState.session?.userId || 'player'} inventory`);
            return true;
        } else {
            // Inventory full - show warning embed
            const categoryNames = {
                'weapon': 'Weapons',
                'armor': 'Armor', 
                'consumable': 'Consumables',
                'enhancer': 'Enhancers'
            };
            
            const itemName = typeof item === 'string' ? item : item.name || item;
            const categoryName = categoryNames[itemType] || itemType;
            
            const embed = new EmbedBuilder()
                .setTitle('⚠️ **INVENTORY FULL** ⚠️')
                .setDescription(`Cannot add **${itemName.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}** to your inventory.\n\n**${categoryName}** category is full (20/20 items).\n\nPlease use or drop some items to make space.`)
                .setColor(0xFF6B35)
                .setFooter({ text: 'Inventory limit: 20 items per category' });

            if (interaction && !interaction.replied && !interaction.deferred) {
                await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
            } else if (interaction) {
                await interaction.followUp({ embeds: [embed], flags: MessageFlags.Ephemeral });
            }
            
            logger.warn(`Inventory full: Cannot add ${itemName} to ${gameState.session?.userId || 'player'} ${categoryName}`);
            return false;
        }
    }

    /**
     * Static method to check and add items from exploration/rewards
     */
    static async tryAddItemsWithFeedback(interaction, gameState, items) {
        const results = {
            added: [],
            rejected: []
        };

        for (const { item, type } of items) {
            const success = await this.addItemWithLimitCheck(interaction, gameState, item, type);
            if (success) {
                results.added.push({ item, type });
            } else {
                results.rejected.push({ item, type });
            }
        }

        return results;
    }
} 

export { InventoryHandler }; 