/**
 * Weapons Data for Dungeonites Heroes Challenge
 * Based on RULES.txt specifications, organized by rarity
 */

export const weaponsData = [
    // COMMON WEAPONS (Damage: 1)
    // Melee
    {
        id: 'holy_thats_worth_something',
        name: 'Holy. Thats worth something!',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'common',
        damage: 1,
        effects: [{ type: 'bleeding', chance: 100 }],
        description: 'A surprisingly valuable holy weapon that causes bleeding.',
        emoji: '✨',
        goldValue: 10
    },
    {
        id: 'sword',
        name: 'Sword',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'common',
        damage: 1,
        effects: [],
        description: 'A basic sword for combat.',
        emoji: '⚔️',
        goldValue: 5
    },
    {
        id: 'hammer',
        name: 'Hammer',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'common',
        damage: 1,
        effects: [],
        description: 'A sturdy hammer for crushing enemies.',
        emoji: '🔨',
        goldValue: 5
    },
    {
        id: 'bite',
        name: 'Bite',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'common',
        damage: 1,
        effects: [],
        description: 'Natural bite attack.',
        emoji: '🦷',
        goldValue: 0
    },
    {
        id: 'claw',
        name: 'Claw',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'common',
        damage: 1,
        effects: [],
        description: 'Sharp claws for slashing.',
        emoji: '🪶',
        goldValue: 0
    },
    {
        id: 'forgotten_sword',
        name: 'Forgotten Sword',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'common',
        damage: 1,
        effects: [],
        description: 'An old, forgotten blade.',
        emoji: '⚔️',
        goldValue: 3
    },
    {
        id: 'gnaw_attack',
        name: 'Gnaw Attack',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'common',
        damage: 1,
        effects: [],
        description: 'Persistent gnawing attack.',
        emoji: '🦷',
        goldValue: 0
    },
    {
        id: 'wing_slash',
        name: 'Wing Slash',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'common',
        damage: 1,
        effects: [],
        description: 'Sharp wing attack.',
        emoji: '🪶',
        goldValue: 0
    },
    {
        id: 'fluffy_hop',
        name: 'Fluffy Hop',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'common',
        damage: 1,
        effects: [],
        description: 'Adorable but surprisingly effective hop attack.',
        emoji: '🐰',
        goldValue: 0
    },
    {
        id: 'filthy_bite',
        name: 'Filthy Bite',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'common',
        damage: 1,
        effects: [{ type: 'poison', chance: 10 }],
        description: 'A dirty bite that can poison enemies.',
        emoji: '🦷',
        goldValue: 2
    },
    {
        id: 'bone_club',
        name: 'Bone Club',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'common',
        damage: 1,
        effects: [],
        description: 'A club made of old bones.',
        emoji: '🦴',
        goldValue: 3
    },
    {
        id: 'sharp_dagger',
        name: 'Sharp Dagger',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'common',
        damage: 1,
        effects: [{ type: 'bleeding', chance: 5 }],
        description: 'A keen-edged dagger.',
        emoji: '🗡️',
        goldValue: 8
    },

    // Common Ranged
    {
        id: 'bow',
        name: 'Bow',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'common',
        damage: 1,
        effects: [],
        description: 'A simple wooden bow.',
        emoji: '🏹',
        goldValue: 10
    },
    {
        id: 'cursed_crossbow',
        name: 'Cursed Crossbow',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'common',
        damage: 1,
        effects: [],
        description: 'A crossbow with a dark aura.',
        emoji: '🏹',
        goldValue: 12
    },
    {
        id: 'common_bow',
        name: 'Common Bow',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'common',
        damage: 1,
        effects: [],
        description: 'A standard hunting bow.',
        emoji: '🏹',
        goldValue: 8
    },
    {
        id: 'sonic_screech',
        name: 'Sonic Screech',
        type: 'weapon',
        weaponType: 'magic',
        rarity: 'common',
        damage: 1,
        manaCost: 1,
        effects: [],
        description: 'Piercing sonic attack that uses magical energy.',
        emoji: '🔊',
        goldValue: 0
    },
    {
        id: 'carrot_toss',
        name: 'Carrot Toss',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'common',
        damage: 1,
        effects: [],
        description: 'Surprisingly effective vegetable projectile.',
        emoji: '🥕',
        goldValue: 1
    },
    {
        id: 'sling',
        name: 'Sling',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'common',
        damage: 1,
        effects: [],
        description: 'Simple stone-throwing sling.',
        emoji: '🪨',
        goldValue: 5
    },

    // Common Magic
    {
        id: 'staff',
        name: 'Staff',
        type: 'weapon',
        weaponType: 'magic',
        rarity: 'common',
        damage: 1,
        manaCost: 1,
        effects: [],
        description: 'A basic magical staff.',
        emoji: '🪄',
        goldValue: 15
    },
    {
        id: 'village_staff',
        name: 'Village Staff',
        type: 'weapon',
        weaponType: 'magic',
        rarity: 'common',
        damage: 1,
        manaCost: 1,
        effects: [],
        description: 'A staff used by village healers.',
        emoji: '🪄',
        goldValue: 12
    },
    {
        id: 'basic_staff',
        name: 'Basic Staff',
        type: 'weapon',
        weaponType: 'magic',
        rarity: 'common',
        damage: 1,
        manaCost: 1,
        effects: [],
        description: 'An entry-level magical focus.',
        emoji: '🪄',
        goldValue: 10
    },

    // UNCOMMON WEAPONS (Damage: 2)
    // Melee
    {
        id: 'gdwizards_personal_dagger',
        name: 'GDWizards personal dagger',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'uncommon',
        damage: 1, // Special: 1 extra damage per floor descended
        effects: [{ type: 'regenerating' }],
        description: 'Secret weapon with floor-based scaling damage.',
        emoji: '🗡️',
        goldValue: 1000,
        special: 'floor_scaling'
    },
    {
        id: 'iron_sword',
        name: 'Iron Sword',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'uncommon',
        damage: 2,
        effects: [{ type: 'bleeding', chance: 1 }],
        description: 'A well-forged iron blade.',
        emoji: '⚔️',
        goldValue: 20
    },
    {
        id: 'goblin_sword',
        name: 'Goblin Sword',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'uncommon',
        damage: 2,
        effects: [{ type: 'poison', chance: 1 }],
        description: 'A crude but effective goblin weapon.',
        emoji: '⚔️',
        goldValue: 18
    },
    {
        id: 'shadow_claws',
        name: 'Shadow Claws',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'uncommon',
        damage: 2,
        effects: [{ type: 'health_drain', chance: 1 }],
        description: 'Claws wreathed in shadow energy.',
        emoji: '🪶',
        goldValue: 25
    },
    {
        id: 'bone_crush',
        name: 'Bone Crush',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'uncommon',
        damage: 2,
        effects: [{ type: 'stunned', chance: 1 }],
        description: 'Devastating bone-crushing attack.',
        emoji: '🦴',
        goldValue: 22
    },
    {
        id: 'stone_strike',
        name: 'Stone Strike',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'uncommon',
        damage: 2,
        effects: [{ type: 'stunned', chance: 1 }],
        description: 'Heavy stone-based attack.',
        emoji: '🪨',
        goldValue: 20
    },
    {
        id: 'brutal_slam',
        name: 'Brutal Slam',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'uncommon',
        damage: 2,
        effects: [{ type: 'stunned', chance: 1 }],
        description: 'A devastating slamming attack.',
        emoji: '👊',
        goldValue: 24
    },
    {
        id: 'bandage_wrap',
        name: 'Bandage Wrap',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'uncommon',
        damage: 2,
        effects: [{ type: 'paralyzed', chance: 2 }],
        description: 'Constricting bandage attack.',
        emoji: '🧻',
        goldValue: 26
    },
    {
        id: 'heavy_hammer',
        name: 'Heavy Hammer',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'uncommon',
        damage: 2,
        effects: [{ type: 'stunned', chance: 1 }],
        description: 'A massive, stunning hammer.',
        emoji: '🔨',
        goldValue: 25
    },
    {
        id: 'dirty_trick',
        name: 'Dirty Trick',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'uncommon',
        damage: 2,
        manaCost: 1,
        effects: [{ type: 'paralyzed', chance: 3 }],
        description: 'Underhanded combat technique.',
        emoji: '😈',
        goldValue: 30
    },

    // Uncommon Ranged
    {
        id: 'longbow',
        name: 'Longbow',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'uncommon',
        damage: 2,
        effects: [{ type: 'pierce', chance: 1 }],
        description: 'A powerful long-range bow.',
        emoji: '🏹',
        goldValue: 35
    },
    {
        id: 'goblin_bow',
        name: 'Goblin Bow',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'uncommon',
        damage: 2,
        effects: [{ type: 'poison', chance: 1 }],
        description: 'Crude but poisoned goblin bow.',
        emoji: '🏹',
        goldValue: 28
    },
    {
        id: 'light_fire_bow',
        name: 'Light Fire Bow',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'uncommon',
        damage: 2,
        effects: [{ type: 'burning', chance: 2 }],
        description: 'Bow that shoots flaming arrows.',
        emoji: '🏹',
        goldValue: 40
    },

    // Uncommon Magic
    {
        id: 'wooden_staff',
        name: 'Wooden Staff',
        type: 'weapon',
        weaponType: 'magic',
        rarity: 'uncommon',
        damage: 2,
        manaCost: 1,
        effects: [{ type: 'stunned', chance: 1 }],
        description: 'A solid wooden magical focus.',
        emoji: '🪄',
        goldValue: 30
    },
    {
        id: 'apprentice_staff',
        name: 'Apprentice Staff',
        type: 'weapon',
        weaponType: 'magic',
        rarity: 'uncommon',
        damage: 2,
        manaCost: 1,
        effects: [{ type: 'paralyzed', chance: 1 }],
        description: 'Staff used by magic apprentices.',
        emoji: '🪄',
        goldValue: 35
    },
    {
        id: 'staff_of_pure_joy',
        name: 'Staff of Pure Joy',
        type: 'weapon',
        weaponType: 'magic',
        rarity: 'uncommon',
        damage: 2,
        manaCost: 1,
        effects: [{ type: 'regenerating' }],
        description: 'A staff that brings joy and healing.',
        emoji: '🪄',
        goldValue: 50
    },

    // RARE WEAPONS (Damage: 3)
    // Melee
    {
        id: 'steel_sword',
        name: 'Steel Sword',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'rare',
        damage: 3,
        effects: [{ type: 'bleeding', chance: 2 }],
        description: 'A sharp steel blade.',
        emoji: '⚔️',
        goldValue: 75
    },
    {
        id: 'orc_sword',
        name: 'Orc Sword',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'rare',
        damage: 3,
        effects: [{ type: 'broken_armor', chance: 2 }],
        description: 'Heavy orcish weapon that breaks armor.',
        emoji: '⚔️',
        goldValue: 80
    },
    {
        id: 'blood_drain',
        name: 'Blood Drain',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'rare',
        damage: 3,
        effects: [{ type: 'health_drain', chance: 5 }],
        description: 'Vampiric attack that drains life.',
        emoji: '🩸',
        goldValue: 100
    },
    {
        id: 'talon_dive',
        name: 'Talon Dive',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'rare',
        damage: 3,
        effects: [{ type: 'bleeding', chance: 2 }],
        description: 'Diving attack with sharp talons.',
        emoji: '🦅',
        goldValue: 85
    },
    {
        id: 'axe_strike',
        name: 'Axe Strike',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'rare',
        damage: 3,
        manaCost: 2,
        effects: [{ type: 'stunned', chance: 2 }],
        description: 'Powerful axe attack.',
        emoji: '🪓',
        goldValue: 90
    },
    {
        id: 'snake_bite',
        name: 'Snake Bite',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'rare',
        damage: 3,
        manaCost: 1,
        effects: [{ type: 'poison', chance: 5 }],
        description: 'Venomous snake-like attack.',
        emoji: '🐍',
        goldValue: 95
    },
    {
        id: '2_handed_hammer_of_poison',
        name: '2 Handed Hammer of Poison',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'rare',
        damage: 3,
        effects: [{ type: 'poison', chance: 50 }],
        description: 'Massive poisoned hammer.',
        emoji: '🔨',
        goldValue: 120
    },

    // Rare Ranged
    {
        id: 'composite_bow',
        name: 'Composite Bow',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'rare',
        damage: 3,
        effects: [{ type: 'pierce', chance: 2 }],
        description: 'A masterfully crafted composite bow.',
        emoji: '🏹',
        goldValue: 90
    },
    {
        id: 'orc_longbow',
        name: 'Orc Longbow',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'rare',
        damage: 3,
        effects: [{ type: 'broken_armor', chance: 2 }],
        description: 'Heavy orcish longbow that breaks armor.',
        emoji: '🏹',
        goldValue: 85
    },
    {
        id: 'elven_bow',
        name: 'Elven Bow',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'rare',
        damage: 3,
        effects: [{ type: 'pierce', chance: 2 }],
        description: 'Elegant elven bow with perfect balance.',
        emoji: '🏹',
        goldValue: 100
    },
    {
        id: 'poison_breath',
        name: 'Poison Breath',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'rare',
        damage: 3,
        manaCost: 2,
        effects: [{ type: 'poison', chance: 4 }],
        description: 'Toxic breath attack.',
        emoji: '☠️',
        goldValue: 0
    },
    {
        id: 'acid_splash',
        name: 'Acid Splash',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'rare',
        damage: 3,
        manaCost: 2,
        effects: [{ type: 'poison', chance: 5 }],
        description: 'Corrosive acid attack.',
        emoji: '🧪',
        goldValue: 0
    },
    {
        id: 'sonic_shriek',
        name: 'Sonic Shriek',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'rare',
        damage: 3,
        manaCost: 2,
        effects: [{ type: 'stunned', chance: 4 }],
        description: 'Piercing shriek that stuns enemies.',
        emoji: '🔊',
        goldValue: 0
    },
    {
        id: 'stone_barrage',
        name: 'Stone Barrage',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'rare',
        damage: 3,
        manaCost: 2,
        effects: [{ type: 'stunned', chance: 2 }],
        description: 'Barrage of stone projectiles.',
        emoji: '🪨',
        goldValue: 0
    },
    {
        id: 'fire_spit',
        name: 'Fire Spit',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'rare',
        damage: 3,
        manaCost: 1,
        effects: [{ type: 'burning', chance: 30 }],
        description: 'Spits fire at enemies.',
        emoji: '🔥',
        goldValue: 0
    },
    {
        id: 'body_boulder',
        name: 'Body Boulder',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'rare',
        damage: 3,
        healthCost: 2,
        effects: [{ type: 'stunned', chance: 2 }],
        description: 'Hurls body like a boulder, damaging self.',
        emoji: '🪨',
        goldValue: 0
    },
    {
        id: 'venom_arrow',
        name: 'Venom Arrow',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'rare',
        damage: 3,
        manaCost: 2,
        effects: [{ type: 'poison', chance: 60 }],
        description: 'Arrow coated with deadly venom.',
        emoji: '🏹',
        goldValue: 95
    },

    // Rare Magic
    {
        id: 'oak_staff',
        name: 'Oak Staff',
        type: 'weapon',
        weaponType: 'magic',
        rarity: 'rare',
        damage: 3,
        manaCost: 1,
        effects: [{ type: 'stunned', chance: 2 }],
        description: 'Staff carved from ancient oak.',
        emoji: '🪄',
        goldValue: 85
    },
    {
        id: 'dark_staff',
        name: 'Dark Staff',
        type: 'weapon',
        weaponType: 'magic',
        rarity: 'rare',
        damage: 3,
        manaCost: 1,
        effects: [{ type: 'decay', chance: 2 }],
        description: 'Staff imbued with dark magic.',
        emoji: '🪄',
        goldValue: 90
    },
    {
        id: 'adept_staff',
        name: 'Adept Staff',
        type: 'weapon',
        weaponType: 'magic',
        rarity: 'rare',
        damage: 3,
        manaCost: 1,
        effects: [{ type: 'paralyzed', chance: 2 }],
        description: 'Staff for skilled magic users.',
        emoji: '🪄',
        goldValue: 95
    },
    {
        id: 'adventurer_staff',
        name: 'Adventurer Staff',
        type: 'weapon',
        weaponType: 'magic',
        rarity: 'rare',
        damage: 3,
        manaCost: 1,
        effects: [{ type: 'empowered', chance: 2 }],
        description: 'Staff that empowers its wielder.',
        emoji: '🪄',
        goldValue: 100
    },

    // LEGENDARY WEAPONS (Damage: 5)
    {
        id: 'dragon_slayer_sword',
        name: 'Dragon Slayer Sword',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'legendary',
        damage: 5,
        effects: [{ type: 'burning', chance: 10 }],
        description: 'A legendary blade forged to slay dragons.',
        emoji: '⚔️',
        goldValue: 500
    },
    {
        id: 'black_dragon_sword',
        name: 'Black Dragon Sword',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'legendary',
        damage: 5,
        effects: [{ type: 'burning', chance: 10 }],
        description: 'Forged from the essence of black dragons.',
        emoji: '⚔️',
        goldValue: 600
    },

    // MYTHICAL WEAPONS (Damage: 10)
    {
        id: 'divine_sword',
        name: 'Divine Sword',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'mythical',
        damage: 10,
        effects: [{ type: 'healing', chance: 15 }],
        description: 'A sword blessed by the gods themselves.',
        emoji: '⚔️',
        goldValue: 2000
    },
    {
        id: 'titans_sword',
        name: 'Titans Sword',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'mythical',
        damage: 10,
        effects: [{ type: 'broken_armor', chance: 15 }],
        description: 'Forged by ancient titans.',
        emoji: '⚔️',
        goldValue: 2500
    },

    // PROMOTIONAL BETA TESTER WEAPONS
    {
        id: 'testers_dagger_of_beta',
        name: 'Testers Dagger of Beta',
        type: 'weapon',
        weaponType: 'melee',
        rarity: 'legendary',
        damage: 4,
        effects: [
            { type: 'bleeding', chance: 5 },
            { type: 'regenerating', healPerTurn: 1 }
        ],
        description: 'Legendary beta tester weapon with regenerative powers.',
        emoji: '🗡️',
        goldValue: 0,
        isPromotional: true,
        requiredRole: 'Beta Tester',
        maxMint: 50
    },
    {
        id: 'testers_staff_of_observations',
        name: 'Testers Staff of Observations',
        type: 'weapon',
        weaponType: 'magic',
        rarity: 'legendary',
        damage: 4,
        manaCost: 1,
        effects: [
            { type: 'burning', chance: 5 },
            { type: 'mana_regenerating', manaPerTurn: 1 }
        ],
        description: 'Legendary staff that enhances observation and burns foes.',
        emoji: '🪄',
        goldValue: 0,
        isPromotional: true,
        requiredRole: 'Bug Stomper',
        maxMint: 50
    },
    {
        id: 'testers_bow_of_insight',
        name: 'Testers Bow of Insight',
        type: 'weapon',
        weaponType: 'ranged',
        rarity: 'legendary',
        damage: 4,
        effects: [
            { type: 'pierce', chance: 5 },
            { type: 'bleeding', chance: 10 }
        ],
        description: 'Insightful bow that pierces through enemy defenses.',
        emoji: '🏹',
        goldValue: 0,
        isPromotional: true,
        requiredRole: 'Informative Hero',
        maxMint: 50
    },
    {
        id: 'golden_pouch',
        name: 'Golden Pouch',
        type: 'item',
        rarity: 'legendary',
        effects: [
            { type: 'daily_gold_generation', goldPerDay: 2.5 }
        ],
        description: 'Legendary pouch that generates 2.5 gold per day (stackable). Triple role reward.',
        emoji: '💰',
        goldValue: 0,
        isPromotional: true,
        requiredRole: 'Triple Role',  // Beta Tester + Bug Stomper + Informative Hero
        maxMint: 25,  // Fewer since it requires all 3 roles
        isStackable: true
    }
];

/**
 * Get weapon by ID
 */
function getWeaponById(weaponId) {
    return weaponsData.find(weapon => weapon.id === weaponId);
}

/**
 * Get weapons by rarity
 */
function getWeaponsByRarity(rarity) {
    return weaponsData.filter(weapon => weapon.rarity === rarity);
}

/**
 * Get weapons by type
 */
function getWeaponsByType(weaponType) {
    return weaponsData.filter(weapon => weapon.weaponType === weaponType);
}

/**
 * Get random weapon by rarity
 */
function getRandomWeaponByRarity(rarity) {
    const weapons = getWeaponsByRarity(rarity);
    return weapons[Math.floor(Math.random() * weapons.length)];
}

/**
 * Calculate weapon damage based on floor
 * Capped at floor 500 for balanced progression
 */
function calculateWeaponDamage(weapon, currentFloor = 1) {
    // Import floor scaling utility
    const { calculateWeaponDamageScaling } = require('../utils/floorScaling.js');
    
    // Use centralized scaling system
    return calculateWeaponDamageScaling(weapon.damage, currentFloor);
}

export { 
    getWeaponById, 
    getWeaponsByRarity, 
    getWeaponsByType, 
    getRandomWeaponByRarity, 
    calculateWeaponDamage 
}; 