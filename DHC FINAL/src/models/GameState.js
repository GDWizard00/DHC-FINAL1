/**
 * GameState Model for Dungeonites Heroes Challenge
 * Represents the current state of a player's game session
 */

class GameState {
    constructor(playerId, economyType = 'gold') {
        this.playerId = playerId;
        this.playerName = 'Player'; // Will be set from Discord user
        this.currentScreen = 'start_menu'; // Current UI screen
        this.economyType = economyType; // Current division: 'gold', 'tokens', 'dng', 'hero', 'eth'
        
        // Current game state
        this.currentFloor = 0; // 0 = Dungeon Entrance, 1+ = Floor numbers
        this.currentFloorExplorations = 0; // Track explorations on current floor
        
        // Selected hero
        this.selectedHero = null;
        
        // Player info
        this.player = {
            selectedHero: null,
            hero: null, // Full hero object when selected
            currentHealth: 0,
            currentMana: 0,
            currentArmor: 0,
            effects: [], // Active status effects
            inventory: {
                weapons: [], // Max 20
                armor: [], // Max 20
                consumables: [], // Max 20 (with quantities)
                shards: [], // Max 20 (with quantities)
                scrolls: [], // Max 20 (with quantities)
                chests: [], // Unopened chests
                keys: 0, // Max 100
                gold: 100 // Unlimited, starting gold
            },
            unlockedHeroes: ['grim_stonebeard'], // Starting hero always unlocked
            lastPlayed: new Date()
        };

        // Current battle state (if in combat)
        this.battle = {
            active: false,
            monster: null,
            playerLastMove: null,
            monsterLastMove: null,
            turnCount: 0,
            playerEffects: [],
            monsterEffects: []
        };

        // Game progression
        this.progress = {
            highestFloorReached: 0,
            totalFloorsCompleted: 0,
            floorsCompleted: [],
            totalMonstersDefeated: 0,
            totalLootFound: 0,
            dungeonEntranceExplored: false, // Track if player has looked around entrance
            unlockedHeroes: ['grim_stonebeard'],
            achievements: []
        };

        // Game statistics
        this.stats = {
            battlesWon: 0,
            battlesLost: 0,
            totalDamageDealt: 0,
            totalDamageTaken: 0,
            totalExplorations: 0,
            monstersDefeated: 0,
            treasuresFound: 0
        };

        // Temporary exploration state (e.g., detected/ambush monsters, hidden rooms)
        this.exploration = {};

        // Backwards compatibility alias
        Object.defineProperty(this, 'inventory', {
            get: () => this.player.inventory,
            set: (val) => {
                this.player.inventory = val;
            }
        });

        // Economy system (5-layer tokenomics)
        this.economy = {
            gold: 100, // In-game currency (free division)
            tokens: 0, // First paid tier (costs 1 token to play)
            dng: 0, // Second tier web3 token
            hero: 0, // Third tier web3 token  
            eth: 0 // Premium tier web3 token
        };

        // Exchange rates (1000:1 as per requirements)
        this.exchangeRates = {
            goldToTokens: 1000, // 1000 gold = 1 token
            tokensToGold: 1000, // 1 token = 1000 gold
            tokensToDng: 1000, // 1000 tokens = 1 $DNG
            dngToHero: 1000, // 1000 $DNG = 1 $HERO
            heroToEth: 1000 // 1000 $HERO = 1 $ETH
        };

        // Division costs per game
        this.divisionCosts = {
            gold: 0, // Free
            tokens: 1, // 1 token per game
            dng: 1, // 1 $DNG per game
            hero: 1, // 1 $HERO per game
            eth: 0 // Free for $ETH division
        };

        // Game settings
        this.settings = {
            difficulty: 'normal',
            autoSave: false
        };

        // Session data
        this.session = {
            userId: playerId,
            startTime: Date.now(),
            lastAction: new Date(),
            lastActivity: Date.now(), // For timeout tracking
            lastSaved: null,
            messageId: null, // Current game message ID for editing
            channelId: null
        };
    }

    /**
     * Update last activity timestamp
     */
    updateActivity() {
        this.session.lastAction = new Date();
        this.session.lastActivity = Date.now();
    }

    /**
     * Get display currency based on economy type
     */
    getDisplayCurrency() {
        return this.economy[this.economyType] || 0;
    }

    /**
     * Charge cost for current economy division
     */
    chargeDivisionCost() {
        const cost = this.divisionCosts[this.economyType];
        if (cost > 0) {
            this.economy[this.economyType] = Math.max(0, this.economy[this.economyType] - cost);
        }
        return this.economy[this.economyType] >= 0;
    }

    /**
     * Convert to JSON for database storage
     */
    toJSON() {
        return {
            playerId: this.playerId,
            currentScreen: this.currentScreen,
            economyType: this.economyType,
            currentFloor: this.currentFloor,
            currentFloorExplorations: this.currentFloorExplorations,
            player: this.player,
            battle: this.battle,
            progress: this.progress,
            stats: this.stats,
            economy: this.economy,
            exchangeRates: this.exchangeRates,
            divisionCosts: this.divisionCosts,
            settings: this.settings,
            session: this.session
        };
    }

    /**
     * Create GameState from JSON data
     */
    static fromJSON(data) {
        const gameState = new GameState(data.playerId, data.economyType);
        Object.assign(gameState, data);
        return gameState;
    }

    /**
     * Initialize hero stats based on hero data
     */
    initializeHero(heroData) {
        this.player.selectedHero = heroData.id;
        this.player.hero = { ...heroData };
        this.player.currentHealth = heroData.health;
        this.player.currentMana = heroData.mana;
        this.player.currentArmor = heroData.armor;
        this.player.effects = [];
        
        // Ensure inventory is initialized
        if (!this.player.inventory) {
            this.player.inventory = {
                weapons: [],
                armor: [],
                consumables: [],
                shards: [],
                scrolls: [],
                chests: [],
                keys: 0,
                gold: 100
            };
        }
        
        // Set starting weapons
        if (heroData.weapons && heroData.weapons.length > 0) {
            // Add all starting weapons to inventory if not already there
            heroData.weapons.forEach(weapon => {
                if (!this.player.inventory.weapons.includes(weapon)) {
                    this.player.inventory.weapons.push(weapon);
                }
            });
        }
    }

    /**
     * Get maximum exploration count for current floor
     */
    getMaxExploreCount() {
        const floor = this.currentFloor;
        // Based on RULES.txt: Floor 1-9 have 3 explorations, 10-20 have 5, then +1 every 10 floors up to 10 max
        if (floor <= 9) {
            return 3;
        } else if (floor <= 20) {
            return 5;
        } else {
            const additionalExplorations = Math.floor((floor - 20) / 10);
            return Math.min(10, 5 + additionalExplorations);
        }
    }

    /**
     * Check if player can explore more on current floor
     */
    canExplore() {
        return this.currentFloorExplorations < this.getMaxExploreCount();
    }

    /**
     * Increment exploration count
     */
    incrementExploreCount() {
        this.currentFloorExplorations++;
        this.stats.totalExplorations++;
    }

    /**
     * Reset exploration count for new floor
     */
    resetExploration() {
        this.currentFloorExplorations = 0;
    }

    /**
     * Add item to inventory with limits
     */
    addToInventory(item, quantity = 1) {
        const category = this.getItemCategory(item);
        
        if (!this.canAddToInventory(category)) {
            return false;
        }

        switch (category) {
            case 'weapons':
                if (this.player.inventory.weapons.length < 20) {
                    this.player.inventory.weapons.push(item);
                    return true;
                }
                break;
            case 'armor':
                if (this.player.inventory.armor.length < 20) {
                    this.player.inventory.armor.push(item);
                    return true;
                }
                break;
            case 'consumables':
            case 'shards':
            case 'scrolls':
                return this.addStackableItem(category, item, quantity);
            case 'chests':
                if (this.player.inventory.chests.length < 20) {
                    this.player.inventory.chests.push(item);
                    return true;
                }
                break;
            case 'keys':
                if (this.player.inventory.keys < 100) {
                    this.player.inventory.keys = Math.min(100, this.player.inventory.keys + quantity);
                    return true;
                }
                break;
            case 'gold':
                this.player.inventory.gold += quantity;
                return true;
        }
        
        return false;
    }

    /**
     * Add stackable item to inventory
     */
    addStackableItem(category, item, quantity) {
        const inventory = this.player.inventory[category];
        const existingItem = inventory.find(i => i.name === item);
        
        if (existingItem) {
            existingItem.quantity += quantity;
            return true;
        } else if (inventory.length < 20) {
            inventory.push({ name: item, quantity });
            return true;
        }
        
        return false;
    }

    /**
     * Check if can add to inventory category
     */
    canAddToInventory(category) {
        switch (category) {
            case 'weapons':
                return this.player.inventory.weapons.length < 20;
            case 'armor':
                return this.player.inventory.armor.length < 20;
            case 'consumables':
            case 'shards':
            case 'scrolls':
                return this.player.inventory[category].length < 20;
            case 'chests':
                return this.player.inventory.chests.length < 20;
            case 'keys':
                return this.player.inventory.keys < 100;
            case 'gold':
                return true; // Unlimited
            default:
                return false;
        }
    }

    /**
     * Get item category for inventory limits
     */
    getItemCategory(item) {
        // This would need to be expanded based on actual item types
        if (item.includes('sword') || item.includes('bow') || item.includes('staff') || item.includes('hammer')) {
            return 'weapons';
        } else if (item.includes('armor') || item.includes('helmet') || item.includes('shield')) {
            return 'armor';
        } else if (item.includes('potion') || item.includes('elixir')) {
            return 'consumables';
        } else if (item.includes('scroll')) {
            return 'scrolls';
        } else if (item.includes('shard')) {
            return 'shards';
        } else if (item.includes('chest')) {
            return 'chests';
        } else if (item === 'keys') {
            return 'keys';
        } else if (item === 'gold') {
            return 'gold';
        }
        
        return 'consumables'; // Default
    }

    /**
     * Apply status effect to player
     */
    applyEffect(effect) {
        // Remove existing effect of same type
        this.player.effects = this.player.effects.filter(e => e.type !== effect.type);
        
        // Add new effect
        this.player.effects.push({
            type: effect.type,
            duration: effect.duration,
            value: effect.value,
            appliedAt: Date.now()
        });
    }

    /**
     * Process all active effects
     */
    processEffects() {
        this.player.effects = this.player.effects.filter(effect => {
            this.processEffect(effect);
            effect.duration--;
            return effect.duration > 0;
        });
    }

    /**
     * Process individual effect
     */
    processEffect(effect) {
        switch (effect.type) {
            case 'poison':
                this.player.currentHealth = Math.max(0, this.player.currentHealth - 1);
                break;
            case 'healing':
                this.player.currentHealth = Math.min(this.player.hero.health, this.player.currentHealth + 4);
                break;
            case 'burning':
                this.player.currentHealth = Math.max(0, this.player.currentHealth - 1);
                break;
            case 'regeneration':
                this.player.currentHealth = Math.min(this.player.hero.health, this.player.currentHealth + effect.value);
                break;
            // Add more effect types as needed
        }
    }

    /**
     * Check if player can afford division cost
     */
    canAffordDivision(economyType) {
        const cost = this.divisionCosts[economyType];
        return this.economy[economyType] >= cost;
    }

    /**
     * Deduct division cost
     */
    deductDivisionCost(economyType) {
        const cost = this.divisionCosts[economyType];
        if (this.economy[economyType] >= cost) {
            this.economy[economyType] -= cost;
            return true;
        }
        return false;
    }

    /**
     * Add currency to economy
     */
    addCurrency(type, amount) {
        if (this.economy.hasOwnProperty(type)) {
            this.economy[type] = Math.max(0, this.economy[type] + amount);
        }
    }

    /**
     * Exchange currency between types
     */
    exchangeCurrency(fromType, toType, amount) {
        if (!this.economy.hasOwnProperty(fromType) || !this.economy.hasOwnProperty(toType)) {
            return false;
        }
        
        const fromAmount = this.economy[fromType];
        let rate = 1;
        
        // Calculate exchange rate
        const rateKey = `${fromType}To${toType.charAt(0).toUpperCase() + toType.slice(1)}`;
        if (this.exchangeRates.hasOwnProperty(rateKey)) {
            rate = this.exchangeRates[rateKey];
        }
        
        const requiredAmount = amount * rate;
        if (fromAmount >= requiredAmount) {
            this.economy[fromType] -= requiredAmount;
            this.economy[toType] += amount;
            return true;
        }
        
        return false;
    }
}

export { GameState }; 