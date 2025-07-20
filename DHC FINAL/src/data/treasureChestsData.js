/**
 * Treasure Chests Data for Dungeonites Heroes Challenge
 * Based on RULES.txt specifications
 */

export const treasureChests = {
    common: {
        id: 'common_chest',
        name: 'Common Chest',
        emoji: '🗃️',
        keysRequired: 1,
        description: 'A simple wooden chest that might hold something useful',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1354594374612156626/image.png?ex=67e5dbd2&is=67e48a52&hm=bd25d9229bf701ffdaad0b7517c5557c0e161167dafba562fdb730466a3c11f0&=&format=webp&quality=lossless&width=832&height=596',
        rarity: 'common',
        rewardPools: {
            gold: { min: 10, max: 50 },
            items: {
                common: 80, // 80% chance for common items
                uncommon: 20 // 20% chance for uncommon items
            },
            keyRewards: { min: 0, max: 2 },
            consumables: ['Health Potion', 'Mana Potion']
        }
    },

    uncommon: {
        id: 'uncommon_chest',
        name: 'Uncommon Chest',
        emoji: '🧰',
        keysRequired: 2,
        description: 'A sturdy metal chest with modest decorations',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1354594374171885659/image.png?ex=67e5dbd1&is=67e48a51&hm=50290f6172ba90a76373250c78db991a1271f6a1013f10fa9df4eacddb7aa924&=&format=webp&quality=lossless&width=806&height=589',
        rarity: 'uncommon',
        rewardPools: {
            gold: { min: 25, max: 100 },
            items: {
                common: 60,
                uncommon: 35,
                rare: 5
            },
            keyRewards: { min: 1, max: 3 },
            consumables: ['Health Potion', 'Mana Potion', 'Greater Health Potion']
        }
    },

    rare: {
        id: 'rare_chest',
        name: 'Rare Chest',
        emoji: '🗄️',
        keysRequired: 3,
        description: 'An ornate chest with precious metal inlays',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1354594375057015015/image.png?ex=67e5dbd2&is=67e48a52&hm=b9b7d560a2c33b84707c78cea02aa7afc68fc6571090c4dbd167b28911d9bdc2&=&format=webp&quality=lossless&width=828&height=593',
        rarity: 'rare',
        rewardPools: {
            gold: { min: 50, max: 200 },
            items: {
                common: 40,
                uncommon: 40,
                rare: 18,
                epic: 2
            },
            keyRewards: { min: 2, max: 5 },
            consumables: ['Greater Health Potion', 'Greater Mana Potion', 'Elixir of Vitality']
        }
    },

    epic: {
        id: 'epic_chest',
        name: 'Epic Chest',
        emoji: '🧳',
        keysRequired: 5,
        description: 'A magnificent chest adorned with jewels',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1354594375514062968/image.png?ex=67e5dbd2&is=67e48a52&hm=1fc74e63fbd1704b60462b034dc575b6ee9b229ea8c0c1d39c2a75c2f62bf4f4&=&format=webp&quality=lossless&width=824&height=593',
        rarity: 'epic',
        rewardPools: {
            gold: { min: 100, max: 500 },
            items: {
                common: 20,
                uncommon: 30,
                rare: 35,
                epic: 14,
                legendary: 1
            },
            keyRewards: { min: 3, max: 8 },
            consumables: ['Greater Health Potion', 'Greater Mana Potion', 'Elixir of Vitality', 'What\'s This Then?']
        }
    },

    legendary: {
        id: 'legendary_chest',
        name: 'Legendary Chest',
        emoji: '🎁',
        keysRequired: 10,
        description: 'An ancient chest pulsing with mysterious energy',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1354594604388843731/image.png?ex=67e5dc08&is=67e48a88&hm=e3c560ca8dfc760c70d4f6900ea0079e4c95fa5454a130cec8ec57efbea136e3&=&format=webp&quality=lossless&width=823&height=600',
        rarity: 'legendary',
        rewardPools: {
            gold: { min: 200, max: 1000 },
            items: {
                uncommon: 15,
                rare: 25,
                epic: 40,
                legendary: 18,
                mythical: 2
            },
            keyRewards: { min: 5, max: 15 },
            consumables: ['Greater Health Potion', 'Greater Mana Potion', 'Elixir of Vitality', 'What\'s This Then?']
        }
    },

    mythical: {
        id: 'mythical_chest',
        name: 'Mythical Chest',
        emoji: '🏺',
        keysRequired: 25,
        description: 'A divine chest of godly origins that radiates immense power',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1354594604942364885/image.png?ex=67e5dc08&is=67e48a88&hm=a77b11bb06e376284e51f204e5167d760162f0525ee4e3e90bef7a935c86aebf&=&format=webp&quality=lossless&width=825&height=590',
        rarity: 'mythical',
        rewardPools: {
            gold: { min: 500, max: 2500 },
            items: {
                rare: 10,
                epic: 25,
                legendary: 40,
                mythical: 25
            },
            keyRewards: { min: 10, max: 30 },
            consumables: ['Greater Health Potion', 'Greater Mana Potion', 'Elixir of Vitality', 'What\'s This Then?']
        }
    },

    mysterious: {
        id: 'mysterious_chest',
        name: 'Mysterious Chest',
        emoji: '📦',
        keysRequired: 0, // No keys required - but 50% chance of being a mimic
        description: 'A mysterious chest that could contain great rewards... or great danger',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1354594372250898472/image.png?ex=67e5dbd1&is=67e48a51&hm=ab41786e0b703d69adc5292e31bdc74c064a234037c2a522c4b5db7a9723397c&=&format=webp&quality=lossless&width=812&height=601',
        rarity: 'mysterious',
        mimicChance: 50, // 50% chance of being a mimic
        rewardPools: {
            // Can contain any rarity of chest rewards
            gold: { min: 10, max: 2500 },
            items: {
                common: 20,
                uncommon: 20,
                rare: 20,
                epic: 20,
                legendary: 15,
                mythical: 5
            },
            keyRewards: { min: 0, max: 30 },
            consumables: ['Health Potion', 'Mana Potion', 'Greater Health Potion', 'Greater Mana Potion', 'Elixir of Vitality', 'What\'s This Then?']
        }
    }
};

/**
 * Get chest data by rarity
 */
export function getChestByRarity(rarity) {
    return treasureChests[rarity] || null;
}

/**
 * Get all chest rarities
 */
export function getAllChestRarities() {
    return Object.keys(treasureChests);
}

/**
 * Get random chest rarity based on floor and luck modifiers
 */
export function getRandomChestRarity(floor = 1, luckModifier = 0) {
    // Base chances
    let chances = {
        common: 40,
        uncommon: 30,
        rare: 20,
        epic: 8,
        legendary: 2,
        mythical: 0
    };

    // Adjust based on floor (higher floors = better chances)
    if (floor >= 10) {
        chances.uncommon += 10;
        chances.common -= 10;
        if (floor >= 20) {
            chances.rare += 10;
            chances.uncommon -= 10;
            if (floor >= 30) {
                chances.epic += 5;
                chances.rare -= 5;
                if (floor >= 40) {
                    chances.legendary += 3;
                    chances.epic -= 3;
                    if (floor >= 50) {
                        chances.mythical += 2;
                        chances.legendary -= 2;
                    }
                }
            }
        }
    }

    // Apply luck modifier
    if (luckModifier > 0) {
        // Redistribute some common chance to higher rarities
        const boost = Math.min(luckModifier * 2, 20);
        chances.common = Math.max(0, chances.common - boost);
        chances.mythical += boost * 0.1;
        chances.legendary += boost * 0.2;
        chances.epic += boost * 0.3;
        chances.rare += boost * 0.4;
    }

    // Normalize to 100%
    const total = Object.values(chances).reduce((sum, chance) => sum + chance, 0);
    Object.keys(chances).forEach(key => {
        chances[key] = (chances[key] / total) * 100;
    });

    // Roll for rarity
    const roll = Math.random() * 100;
    let cumulative = 0;

    for (const [rarity, chance] of Object.entries(chances)) {
        cumulative += chance;
        if (roll <= cumulative) {
            return rarity;
        }
    }

    return 'common'; // Fallback
}

/**
 * Generate chest rewards based on chest data and floor
 */
export function generateChestRewards(chestData, floor = 1) {
    const rewards = {
        gold: 0,
        keys: 0,
        items: [],
        consumables: []
    };

    // Generate gold
    const goldRange = chestData.rewardPools.gold;
    rewards.gold = Math.floor(Math.random() * (goldRange.max - goldRange.min + 1)) + goldRange.min;

    // Scale gold by floor
    rewards.gold = Math.floor(rewards.gold * (1 + floor * 0.1));

    // Generate keys
    const keyRange = chestData.rewardPools.keyRewards;
    rewards.keys = Math.floor(Math.random() * (keyRange.max - keyRange.min + 1)) + keyRange.min;

    // Generate 1-3 items based on rarity weights
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const itemRarities = chestData.rewardPools.items;

    for (let i = 0; i < itemCount; i++) {
        const rarity = getWeightedRarity(itemRarities);
        rewards.items.push({ rarity, type: 'random' });
    }

    // Generate consumables (20% chance per consumable type)
    for (const consumable of chestData.rewardPools.consumables) {
        if (Math.random() < 0.2) {
            rewards.consumables.push(consumable);
        }
    }

    return rewards;
}

/**
 * Get weighted rarity based on percentages
 */
function getWeightedRarity(rarities) {
    const roll = Math.random() * 100;
    let cumulative = 0;

    for (const [rarity, chance] of Object.entries(rarities)) {
        cumulative += chance;
        if (roll <= cumulative) {
            return rarity;
        }
    }

    return 'common'; // Fallback
}

export default treasureChests; 