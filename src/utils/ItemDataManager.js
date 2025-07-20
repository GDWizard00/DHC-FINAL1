import fs from 'fs/promises';
import path from 'path';
import { logger } from './logger.js';
import { auditLogger } from './auditLogger.js';

/**
 * ItemDataManager - Comprehensive item management system
 * Handles custom item creation, storage, statistics, and operations
 */
export class ItemDataManager {
    
    static ITEM_TYPES = {
        WEAPON: 'weapon',
        ARMOR: 'armor',
        CONSUMABLE: 'consumable',
        SPECIAL: 'special'
    };

    static WEAPON_SUBTYPES = {
        SWORD: 'sword',
        HAMMER: 'hammer',
        STAFF: 'staff',
        BOW: 'bow'
    };

    static ARMOR_SUBTYPES = {
        HELMET: 'helmet',
        CHEST: 'chest',
        LEGS: 'legs',
        BOOTS: 'boots'
    };

    static CONSUMABLE_SUBTYPES = {
        POTION: 'potion',
        SCROLL: 'scroll',
        FOOD: 'food'
    };

    static SPECIAL_SUBTYPES = {
        KEY: 'key',
        ARTIFACT: 'artifact',
        TOOL: 'tool'
    };

    static RARITY_LEVELS = {
        COMMON: { name: 'common', color: 0x808080, mintLimit: 'infinite' },
        UNCOMMON: { name: 'uncommon', color: 0x1EFF00, mintLimit: 1000 },
        RARE: { name: 'rare', color: 0x0070DD, mintLimit: 500 },
        EPIC: { name: 'epic', color: 0xA335EE, mintLimit: 100 },
        LEGENDARY: { name: 'legendary', color: 0xFF8000, mintLimit: 10 },
        MYTHICAL: { name: 'mythical', color: 0xE6CC80, mintLimit: 1 }
    };

    static EFFECT_TYPES = {
        DAMAGE_OVER_TIME: 'damage_over_time',
        HEALING_OVER_TIME: 'healing_over_time',
        STAT_BOOST: 'stat_boost',
        STAT_DEBUFF: 'stat_debuff',
        SPECIAL_ABILITY: 'special_ability',
        RESISTANCE: 'resistance'
    };

    static customItemsPath = path.join(process.cwd(), 'src', 'data', 'customItems.json');
    static backupPath = path.join(process.cwd(), 'src', 'data', 'backups');
    static statisticsPath = path.join(process.cwd(), 'src', 'data', 'itemStatistics.json');

    /**
     * Initialize the ItemDataManager
     */
    static async initialize() {
        try {
            // Ensure data directory exists
            await fs.mkdir(path.dirname(this.customItemsPath), { recursive: true });
            await fs.mkdir(this.backupPath, { recursive: true });

            // Initialize custom items file if it doesn't exist
            try {
                await fs.access(this.customItemsPath);
            } catch {
                await this.saveCustomItems([]);
            }

            // Initialize statistics file if it doesn't exist
            try {
                await fs.access(this.statisticsPath);
            } catch {
                await this.saveStatistics({
                    totalCreated: 0,
                    totalRemoved: 0,
                    usageStats: {},
                    creationHistory: [],
                    lastUpdated: new Date().toISOString()
                });
            }

            logger.info('ItemDataManager initialized successfully');
        } catch (error) {
            logger.error('Error initializing ItemDataManager:', error);
            throw error;
        }
    }

    /**
     * Create a new custom item
     */
    static async createCustomItem(itemData, creatorId) {
        try {
            // Validate item data
            const validatedItem = this.validateItemData(itemData);
            
            // Generate unique ID
            const itemId = `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
            
            // Create complete item object
            const customItem = {
                id: itemId,
                ...validatedItem,
                isCustom: true,
                createdBy: creatorId,
                createdAt: new Date().toISOString(),
                mintedCount: 0,
                maxMint: this.calculateMintLimit(validatedItem.rarity, validatedItem.customMintAmount),
                active: true,
                usageCount: 0,
                lastUsed: null
            };

            // Load existing custom items
            const customItems = await this.loadCustomItems();
            
            // Add new item
            customItems.push(customItem);
            
            // Save updated items
            await this.saveCustomItems(customItems);
            
            // Update statistics
            await this.updateStatistics('item_created', customItem);
            
            // Create backup
            await this.createAutoBackup('item_creation');
            
            // Log creation
            auditLogger.log('ADMIN_ITEM_CREATED', {
                itemId,
                itemName: customItem.name,
                itemType: customItem.type,
                rarity: customItem.rarity,
                createdBy: creatorId
            });

            logger.info(`Custom item created: ${customItem.name} (${itemId}) by ${creatorId}`);
            return customItem;

        } catch (error) {
            logger.error('Error creating custom item:', error);
            throw error;
        }
    }

    /**
     * Validate item data structure
     */
    static validateItemData(itemData) {
        const errors = [];

        // Required fields
        if (!itemData.name || typeof itemData.name !== 'string') {
            errors.push('Item name is required and must be a string');
        }

        if (!itemData.type || !Object.values(this.ITEM_TYPES).includes(itemData.type)) {
            errors.push('Valid item type is required');
        }

        if (!itemData.rarity || !Object.keys(this.RARITY_LEVELS).includes(itemData.rarity.toUpperCase())) {
            errors.push('Valid rarity level is required');
        }

        // Type-specific validation
        if (itemData.type === this.ITEM_TYPES.WEAPON) {
            if (!itemData.subtype || !Object.values(this.WEAPON_SUBTYPES).includes(itemData.subtype)) {
                errors.push('Valid weapon subtype is required');
            }
            if (typeof itemData.damage !== 'number' || itemData.damage < 0) {
                errors.push('Weapon damage must be a positive number');
            }
        }

        if (itemData.type === this.ITEM_TYPES.ARMOR) {
            if (!itemData.subtype || !Object.values(this.ARMOR_SUBTYPES).includes(itemData.subtype)) {
                errors.push('Valid armor subtype is required');
            }
            if (typeof itemData.defense !== 'number' || itemData.defense < 0) {
                errors.push('Armor defense must be a positive number');
            }
        }

        if (itemData.type === this.ITEM_TYPES.CONSUMABLE) {
            if (!itemData.subtype || !Object.values(this.CONSUMABLE_SUBTYPES).includes(itemData.subtype)) {
                errors.push('Valid consumable subtype is required');
            }
            if (typeof itemData.effectValue !== 'number' || itemData.effectValue < 0) {
                errors.push('Consumable effect value must be a positive number');
            }
        }

        // Effect validation
        if (itemData.hasEffects && itemData.effects) {
            if (!Array.isArray(itemData.effects)) {
                errors.push('Effects must be an array');
            } else {
                itemData.effects.forEach((effect, index) => {
                    if (!effect.type || !Object.values(this.EFFECT_TYPES).includes(effect.type)) {
                        errors.push(`Effect ${index + 1}: Valid effect type is required`);
                    }
                    if (typeof effect.value !== 'number') {
                        errors.push(`Effect ${index + 1}: Effect value must be a number`);
                    }
                    if (effect.duration && typeof effect.duration !== 'number') {
                        errors.push(`Effect ${index + 1}: Duration must be a number`);
                    }
                });
            }
        }

        if (errors.length > 0) {
            throw new Error(`Item validation failed: ${errors.join(', ')}`);
        }

        return {
            name: itemData.name.trim(),
            description: itemData.description?.trim() || `A ${itemData.rarity} ${itemData.type}`,
            type: itemData.type,
            subtype: itemData.subtype,
            rarity: itemData.rarity.toLowerCase(),
            damage: itemData.damage || 0,
            defense: itemData.defense || 0,
            effectValue: itemData.effectValue || 0,
            price: itemData.price || this.calculateDefaultPrice(itemData.rarity, itemData.type),
            hasEffects: itemData.hasEffects || false,
            effects: itemData.effects || [],
            customMintAmount: itemData.customMintAmount || 'infinite',
            icon: itemData.icon || this.getDefaultIcon(itemData.type, itemData.subtype)
        };
    }

    /**
     * Calculate mint limit based on rarity and custom amount
     */
    static calculateMintLimit(rarity, customAmount) {
        if (customAmount === 'infinite') {
            return 'infinite';
        }
        
        if (typeof customAmount === 'number') {
            return Math.max(1, customAmount);
        }
        
        return this.RARITY_LEVELS[rarity.toUpperCase()]?.mintLimit || 'infinite';
    }

    /**
     * Calculate default price based on rarity and type
     */
    static calculateDefaultPrice(rarity, type) {
        const basePrice = {
            weapon: 100,
            armor: 80,
            consumable: 25,
            special: 150
        };

        const rarityMultiplier = {
            common: 1,
            uncommon: 2,
            rare: 5,
            epic: 10,
            legendary: 25,
            mythical: 100
        };

        return (basePrice[type] || 50) * (rarityMultiplier[rarity] || 1);
    }

    /**
     * Get default icon for item type/subtype
     */
    static getDefaultIcon(type, subtype) {
        const icons = {
            weapon: {
                sword: '⚔️',
                hammer: '🔨',
                staff: '🪄',
                bow: '🏹'
            },
            armor: {
                helmet: '⛑️',
                chest: '🛡️',
                legs: '🦵',
                boots: '🥾'
            },
            consumable: {
                potion: '🧪',
                scroll: '📜',
                food: '🍖'
            },
            special: {
                key: '🗝️',
                artifact: '🏺',
                tool: '🔧'
            }
        };

        return icons[type]?.[subtype] || '📦';
    }

    /**
     * Load custom items from file
     */
    static async loadCustomItems() {
        try {
            const data = await fs.readFile(this.customItemsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            logger.warn('Error loading custom items, returning empty array:', error);
            return [];
        }
    }

    /**
     * Save custom items to file
     */
    static async saveCustomItems(items) {
        try {
            await fs.writeFile(this.customItemsPath, JSON.stringify(items, null, 2));
        } catch (error) {
            logger.error('Error saving custom items:', error);
            throw error;
        }
    }

    /**
     * Get item statistics
     */
    static async getItemStatistics() {
        try {
            const customItems = await this.loadCustomItems();
            const { weaponsData } = await import('../data/weaponsData.js');
            // Import other data files as needed
            
            const stats = {
                totalItems: customItems.length + weaponsData.length,
                defaultItems: weaponsData.length,
                customItems: customItems.length,
                activeItems: customItems.filter(item => item.active).length,
                weapons: customItems.filter(item => item.type === 'weapon').length + weaponsData.length,
                armor: customItems.filter(item => item.type === 'armor').length,
                consumables: customItems.filter(item => item.type === 'consumable').length,
                special: customItems.filter(item => item.type === 'special').length,
                common: customItems.filter(item => item.rarity === 'common').length,
                uncommon: customItems.filter(item => item.rarity === 'uncommon').length,
                rare: customItems.filter(item => item.rarity === 'rare').length,
                epic: customItems.filter(item => item.rarity === 'epic').length,
                legendary: customItems.filter(item => item.rarity === 'legendary').length,
                mythical: customItems.filter(item => item.rarity === 'mythical').length
            };

            return stats;
        } catch (error) {
            logger.error('Error getting item statistics:', error);
            return {
                totalItems: 0,
                defaultItems: 0,
                customItems: 0,
                activeItems: 0,
                weapons: 0,
                armor: 0,
                consumables: 0,
                special: 0,
                common: 0,
                uncommon: 0,
                rare: 0,
                epic: 0,
                legendary: 0,
                mythical: 0
            };
        }
    }

    /**
     * Get detailed statistics
     */
    static async getDetailedStatistics() {
        try {
            const stats = await this.loadStatistics();
            const customItems = await this.loadCustomItems();
            
            // Calculate detailed metrics
            const totalValue = customItems.reduce((sum, item) => sum + item.price, 0);
            const averageValue = customItems.length > 0 ? Math.round(totalValue / customItems.length) : 0;
            const mostUsedItem = customItems.reduce((max, item) => 
                item.usageCount > (max?.usageCount || 0) ? item : max, null);
            const leastUsedItem = customItems.reduce((min, item) => 
                item.usageCount < (min?.usageCount || Infinity) ? item : min, null);

            return {
                mostUsedItem: mostUsedItem?.name || 'None',
                leastUsedItem: leastUsedItem?.name || 'None',
                averageUsage: Math.round(customItems.reduce((sum, item) => sum + item.usageCount, 0) / customItems.length) || 0,
                totalInteractions: customItems.reduce((sum, item) => sum + item.usageCount, 0),
                totalValue,
                averageValue,
                mostValuableItem: customItems.reduce((max, item) => 
                    item.price > (max?.price || 0) ? item : max, null)?.name || 'None',
                marketActivity: 85, // Placeholder
                itemsInCirculation: customItems.filter(item => item.mintedCount > 0).length,
                uniqueOwners: 0, // Would need to query player inventories
                averagePerPlayer: 0, // Would need to query player inventories
                hoardingIndex: 15, // Placeholder
                trendingItems: customItems
                    .sort((a, b) => b.usageCount - a.usageCount)
                    .slice(0, 10)
                    .map(item => ({ name: item.name, trend: '+' + item.usageCount }))
            };
        } catch (error) {
            logger.error('Error getting detailed statistics:', error);
            return {
                mostUsedItem: 'Error',
                leastUsedItem: 'Error',
                averageUsage: 0,
                totalInteractions: 0,
                totalValue: 0,
                averageValue: 0,
                mostValuableItem: 'Error',
                marketActivity: 0,
                itemsInCirculation: 0,
                uniqueOwners: 0,
                averagePerPlayer: 0,
                hoardingIndex: 0,
                trendingItems: []
            };
        }
    }

    /**
     * Get custom items
     */
    static async getCustomItems() {
        return await this.loadCustomItems();
    }

    /**
     * Remove custom item
     */
    static async removeCustomItem(itemId, removedBy) {
        try {
            const customItems = await this.loadCustomItems();
            const itemIndex = customItems.findIndex(item => item.id === itemId);
            
            if (itemIndex === -1) {
                throw new Error(`Custom item not found: ${itemId}`);
            }

            const removedItem = customItems[itemIndex];
            customItems.splice(itemIndex, 1);
            
            await this.saveCustomItems(customItems);
            await this.updateStatistics('item_removed', removedItem);
            await this.createAutoBackup('item_removal');
            
            auditLogger.log('ADMIN_ITEM_REMOVED', {
                itemId,
                itemName: removedItem.name,
                removedBy
            });

            logger.info(`Custom item removed: ${removedItem.name} (${itemId}) by ${removedBy}`);
            return removedItem;

        } catch (error) {
            logger.error('Error removing custom item:', error);
            throw error;
        }
    }

    /**
     * Update statistics
     */
    static async updateStatistics(action, itemData) {
        try {
            const stats = await this.loadStatistics();
            
            switch (action) {
                case 'item_created':
                    stats.totalCreated++;
                    stats.creationHistory.push({
                        itemId: itemData.id,
                        itemName: itemData.name,
                        createdAt: itemData.createdAt,
                        createdBy: itemData.createdBy
                    });
                    break;
                case 'item_removed':
                    stats.totalRemoved++;
                    break;
                case 'item_used':
                    if (!stats.usageStats[itemData.id]) {
                        stats.usageStats[itemData.id] = 0;
                    }
                    stats.usageStats[itemData.id]++;
                    break;
            }
            
            stats.lastUpdated = new Date().toISOString();
            await this.saveStatistics(stats);
            
        } catch (error) {
            logger.error('Error updating statistics:', error);
        }
    }

    /**
     * Load statistics
     */
    static async loadStatistics() {
        try {
            const data = await fs.readFile(this.statisticsPath, 'utf8');
            return JSON.parse(data);
        } catch (error) {
            return {
                totalCreated: 0,
                totalRemoved: 0,
                usageStats: {},
                creationHistory: [],
                lastUpdated: new Date().toISOString()
            };
        }
    }

    /**
     * Save statistics
     */
    static async saveStatistics(stats) {
        try {
            await fs.writeFile(this.statisticsPath, JSON.stringify(stats, null, 2));
        } catch (error) {
            logger.error('Error saving statistics:', error);
        }
    }

    /**
     * Create automatic backup
     */
    static async createAutoBackup(reason) {
        try {
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const backupFile = path.join(this.backupPath, `items_backup_${timestamp}_${reason}.json`);
            
            const customItems = await this.loadCustomItems();
            const stats = await this.loadStatistics();
            
            const backupData = {
                timestamp,
                reason,
                customItems,
                statistics: stats
            };
            
            await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));
            logger.info(`Auto-backup created: ${backupFile}`);
            
        } catch (error) {
            logger.error('Error creating auto-backup:', error);
        }
    }

    /**
     * Add item to player inventory
     */
    static async addItemToPlayer(playerId, itemId, quantity = 1) {
        try {
            const { DatabaseManager } = await import('../database/DatabaseManager.js');
            
            // Get player data
            const playerData = await DatabaseManager.loadPlayer(playerId);
            if (!playerData) {
                throw new Error('Player not found');
            }

            // Initialize inventory if needed
            if (!playerData.inventory) {
                playerData.inventory = {
                    weapons: [],
                    armor: [],
                    consumables: [],
                    special: []
                };
            }

            // Find item (custom or default)
            const customItems = await this.loadCustomItems();
            let item = customItems.find(i => i.id === itemId);
            
            if (!item) {
                // Try to find in default items
                const { weaponsData } = await import('../data/weaponsData.js');
                item = weaponsData.find(i => i.id === itemId);
            }

            if (!item) {
                throw new Error(`Item not found: ${itemId}`);
            }

            // Add to appropriate inventory category
            const category = item.type === 'weapon' ? 'weapons' : 
                           item.type === 'armor' ? 'armor' :
                           item.type === 'consumable' ? 'consumables' : 'special';

            // Add items
            for (let i = 0; i < quantity; i++) {
                playerData.inventory[category].push({
                    ...item,
                    acquiredAt: new Date().toISOString(),
                    uniqueId: `${itemId}_${Date.now()}_${i}`
                });
            }

            // Save player data
            await DatabaseManager.savePlayer(playerId, playerData);
            
            // Update item statistics
            if (item.isCustom) {
                await this.updateStatistics('item_used', item);
            }

            logger.info(`Added ${quantity}x ${item.name} to player ${playerId}`);
            return true;

        } catch (error) {
            logger.error('Error adding item to player:', error);
            throw error;
        }
    }

    /**
     * Remove item from player inventory
     */
    static async removeItemFromPlayer(playerId, itemId, quantity = 1) {
        try {
            const { DatabaseManager } = await import('../database/DatabaseManager.js');
            
            // Get player data
            const playerData = await DatabaseManager.loadPlayer(playerId);
            if (!playerData || !playerData.inventory) {
                throw new Error('Player or inventory not found');
            }

            let removedCount = 0;
            
            // Search all inventory categories
            for (const category of ['weapons', 'armor', 'consumables', 'special']) {
                if (!playerData.inventory[category]) continue;
                
                const items = playerData.inventory[category];
                for (let i = items.length - 1; i >= 0 && removedCount < quantity; i--) {
                    if (items[i].id === itemId) {
                        items.splice(i, 1);
                        removedCount++;
                    }
                }
            }

            if (removedCount === 0) {
                throw new Error(`Item not found in player inventory: ${itemId}`);
            }

            // Save updated player data
            await DatabaseManager.savePlayer(playerId, playerData);
            
            logger.info(`Removed ${removedCount}x ${itemId} from player ${playerId}`);
            return removedCount;

        } catch (error) {
            logger.error('Error removing item from player:', error);
            throw error;
        }
    }
}

// Initialize when module is loaded
ItemDataManager.initialize().catch(error => {
    logger.error('Failed to initialize ItemDataManager:', error);
}); 