/**
 * Monsters Data for Dungeonites Heroes Challenge
 * Based on RULES.txt specifications
 */

export const monstersData = [
    {
        id: 'rat',
        name: 'Rat',
        floorNumber: 1,
        health: 2,
        mana: 0,
        armor: 0,
        critChance: 5,
        weapons: ['gnaw_attack', 'filthy_bite'],
        abilities: [],
        spells: [],
        specialMoves: [],
        emoji: '🐀',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697027209367562/Screenshot_2025-03-19_092009.png?ex=67e291b4&is=67e14034&hm=b75f87b1f3ba5b82ad0ced8e517feab69078e7d3934db18a59217fe25cac613d&=&format=webp&quality=lossless&width=819&height=517'
    },
    {
        id: 'bat',
        name: 'Bat',
        floorNumber: 2,
        health: 3,
        mana: 0,
        armor: 0,
        critChance: 5,
        weapons: ['wing_slash', 'sonic_screech'],
        abilities: [],
        spells: [],
        specialMoves: [],
        emoji: '🦇',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697027603501076/Screenshot_2025-03-19_092133.png?ex=67e291b4&is=67e14034&hm=c0ab61d2a33d734a947448116adc64b6dd454b4cea441705f59085c718b2ea30&=&format=webp&quality=lossless&width=820&height=609'
    },
    {
        id: 'skeleton',
        name: 'Skeleton',
        floorNumber: 3,
        health: 6,
        mana: 0,
        armor: 0,
        critChance: 5,
        weapons: ['bone_club', 'rusted_sword'],
        abilities: [],
        spells: [],
        specialMoves: [],
        emoji: '💀',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697027943235614/Screenshot_2025-03-19_092232.png?ex=67e291b4&is=67e14034&hm=f9007c2afca485cebcabbf0612e1d2b8f22f8bb30440e6ee730ebe77ea975e88&=&format=webp&quality=lossless&width=737&height=580'
    },
    {
        id: 'mummy',
        name: 'Mummy',
        floorNumber: 4,
        health: 4,
        mana: 2,
        armor: 0,
        critChance: 5,
        weapons: ['bandage_wrap'],
        abilities: [],
        spells: ['ancient_curse'],
        specialMoves: [],
        emoji: '🧟',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697028299620392/Screenshot_2025-03-19_092357.png?ex=67e291b4&is=67e14034&hm=189d266464778afbf91dbe088e0b66cdc88e8cd223fee730c25538ca34dd1b70&=&format=webp&quality=lossless&width=722&height=573'
    },
    {
        id: 'necromancer',
        name: 'Necromancer',
        floorNumber: 5,
        health: 6,
        mana: 6,
        armor: 0,
        critChance: 5,
        weapons: ['dark_staff'],
        abilities: ['accepting_fate'],
        spells: ['soul_drain', 'death_bolt'],
        specialMoves: [],
        emoji: '🧙‍♂️',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697030744899595/Screenshot_2025-03-19_093101.png?ex=67e291b5&is=67e14035&hm=49e41bfa346ded8b3b1477babbfa97f293b929498aacbfdc523b919cb92eacbb&=&format=webp&quality=lossless&width=741&height=604'
    },
    {
        id: 'goblin',
        name: 'Goblin',
        floorNumber: 6,
        health: 8,
        mana: 0,
        armor: 1,
        critChance: 10,
        weapons: ['sharp_dagger', 'sling'],
        abilities: ['dodge'],
        spells: [],
        specialMoves: ['dirty_trick'],
        emoji: '👺',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697029151330406/Screenshot_2025-03-19_092629.png?ex=67e291b5&is=67e14035&hm=fbba36ea7a03d3a7f01bfd0bb743d58ad74bea8a4d7ac220e1bdf67a517ee580&=&format=webp&quality=lossless&width=804&height=593'
    },
    {
        id: 'orc',
        name: 'Orc',
        floorNumber: 7,
        health: 7,
        mana: 2,
        armor: 0,
        critChance: 5,
        weapons: ['orc_sword', 'orc_longbow'],
        abilities: ['dodge', 'counter', 'rage_toss'],
        spells: ['war_cry'],
        specialMoves: [],
        emoji: '👹',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697030023741520/Screenshot_2025-03-19_092900.png?ex=67e291b5&is=67e14035&hm=390514a91a493c4262b1181c64bb19d8cdeadde1f1635dcc1d193f5f48f2922e&=&format=webp&quality=lossless&width=805&height=592'
    },
    {
        id: 'vampire',
        name: 'Vampire',
        floorNumber: 8,
        health: 8,
        mana: 4,
        armor: 0,
        critChance: 5,
        weapons: ['vampire_sword'],
        abilities: ['dodge', 'counter', 'silence', 'accepting_fate'],
        spells: [],
        specialMoves: ['blood_drain'],
        emoji: '🧛',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697030367416350/Screenshot_2025-03-19_092952.png?ex=67e291b5&is=67e14035&hm=90035dce76f49be080806228770d65ab9adcde98767ed430d24e4115699255b2&=&format=webp&quality=lossless&width=804&height=598'
    },
    {
        id: 'lych',
        name: 'Lych',
        floorNumber: 9,
        health: 8,
        mana: 6,
        armor: 0,
        critChance: 5,
        weapons: ['lych_staff'],
        abilities: ['dodge', 'silence'],
        spells: ['soul_harvest', 'heal'],
        specialMoves: [],
        emoji: '🧙‍♀️',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697136193900585/Screenshot_2025-03-19_093121.png?ex=67e291ce&is=67e1404e&hm=b457aab3abd7a38b36d1e2f3b636ccb48f1ef44d1a5ab0c071cf1184aa49c66f&=&format=webp&quality=lossless&width=798&height=595'
    },
    {
        id: 'wyvern',
        name: 'Wyvern',
        floorNumber: 10,
        health: 10,
        mana: 8,
        armor: 0,
        critChance: 5,
        weapons: ['tail_sweep', 'poison_breath'],
        abilities: ['dodge', 'counter', 'silence'],
        spells: ['heal', 'wyverns_breath'],
        specialMoves: [],
        emoji: '🐉',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697136613326889/Screenshot_2025-03-19_093233.png?ex=67e291ce&is=67e1404e&hm=2b90b1579c79d7c68b1603ac893681dc26c7831dafd1d1e39bac7adb02faab7f&=&format=webp&quality=lossless&width=780&height=573'
    },
    {
        id: 'slime',
        name: 'Slime',
        floorNumber: 11,
        health: 10,
        mana: 8,
        armor: 0,
        critChance: 5,
        weapons: ['acid_splash', 'engulf'],
        abilities: ['silence'],
        spells: ['heal'],
        specialMoves: [],
        emoji: '🟢',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697137649319986/Screenshot_2025-03-19_093442.png?ex=67e291ce&is=67e1404e&hm=3dde36ccc48a96edc3c5b41e50f8aa4d37fa3191b25a1cd7873d3f30756e8c8d&=&format=webp&quality=lossless&width=677&height=567'
    },
    {
        id: 'gargoyle',
        name: 'Gargoyle',
        floorNumber: 12,
        health: 10,
        mana: 4,
        armor: 0,
        critChance: 5,
        weapons: ['stone_strike', 'wing_slash'],
        abilities: ['dodge', 'silence'],
        spells: ['heal'],
        specialMoves: [],
        emoji: '🗿',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697138060365916/Screenshot_2025-03-19_093559.png?ex=67e291cf&is=67e1404f&hm=ec64c6d43f3a62134a963e3fd9382775d7d59c1b03f2182efd9a405c0d554a46&=&format=webp&quality=lossless&width=760&height=616'
    },
    {
        id: 'harpy',
        name: 'Harpy',
        floorNumber: 13,
        health: 10,
        mana: 6,
        armor: 0,
        critChance: 5,
        weapons: ['village_staff', 'sonic_shriek'],
        abilities: ['dodge', 'counter', 'silence'],
        spells: ['heal'],
        specialMoves: ['talon_dive'],
        emoji: '🦅',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697138450432010/Screenshot_2025-03-19_093724.png?ex=67e291cf&is=67e1404f&hm=b77fc35b23068bc12d8f9dfaf047d369f1d4cd5a01dad2189164ddbb17782bae&=&format=webp&quality=lossless&width=818&height=589'
    },
    {
        id: 'phoenix',
        name: 'Phoenix',
        floorNumber: 14,
        health: 11,
        mana: 6,
        armor: 0,
        critChance: 5,
        weapons: ['basic_staff'],
        abilities: ['dodge', 'counter', 'silence', 'accepting_fate'],
        spells: ['rising_flames'],
        specialMoves: ['infernal_dive'],
        emoji: '🔥',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697138903683142/Screenshot_2025-03-19_093829.png?ex=67e291cf&is=67e1404f&hm=ccf46fd8f9d07a8c4740c5d27946792936e625eea34a206a75d65d57df2b79d9&=&format=webp&quality=lossless&width=809&height=585'
    },
    {
        id: 'dark_elf',
        name: 'Dark Elf',
        floorNumber: 15,
        health: 10,
        mana: 12,
        armor: 0,
        critChance: 5,
        weapons: ['crystal_staff', 'dark_elf_bow'],
        abilities: ['dodge', 'counter', 'silence', 'accepting_fate'],
        spells: [],
        specialMoves: ['shadow_strike'],
        emoji: '🧝‍♀️',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697139499139202/Screenshot_2025-03-19_094034.png?ex=67e291cf&is=67e1404f&hm=4d95658cc0024d1e43de16a89a279b12b1e7e08e5473b5512a84309cb826b37d&=&format=webp&quality=lossless&width=807&height=587'
    },
    {
        id: 'earth_elemental',
        name: 'Earth Elemental',
        floorNumber: 16,
        health: 16,
        mana: 4,
        armor: 0,
        critChance: 5,
        weapons: ['stone_barrage', 'body_boulder'],
        abilities: [],
        spells: ['heal'],
        specialMoves: ['seismic_slam'],
        emoji: '🪨',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697140107186289/Screenshot_2025-03-19_094129.png?ex=67e291cf&is=67e1404f&hm=e208e41fb5ea58e6cc03c7c2c0014f73dad84cd2eb12aa0f9de1a2f35827164e&=&format=webp&quality=lossless&width=799&height=590'
    },
    {
        id: 'air_elemental',
        name: 'Air Elemental',
        floorNumber: 17,
        health: 6,
        mana: 6,
        armor: 0,
        critChance: 5,
        weapons: ['tornado_spin'],
        abilities: ['dodge', 'counter'],
        spells: ['lightning_strike'],
        specialMoves: [],
        emoji: '💨',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697140656898140/Screenshot_2025-03-19_094226.png?ex=67e291cf&is=67e1404f&hm=6429e781c3e94ad7b2820ce4ec75d637c36739fa88f32acf5123c81644782069&=&format=webp&quality=lossless&width=778&height=604'
    },
    {
        id: 'beholder',
        name: 'Beholder',
        floorNumber: 18,
        health: 7,
        mana: 8,
        armor: 0,
        critChance: 5,
        weapons: ['beholder_staff'],
        abilities: ['silence'],
        spells: ['death_ray', 'mind_blast', 'heal', 'frost_touch'],
        specialMoves: [],
        emoji: '👁️',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1353837987837902878/image.png?ex=67e31b61&is=67e1c9e1&hm=3d273c5460713710606995e8124ecf0cd7171fa00ceb4f6db7da3b43ae053442&=&format=webp&quality=lossless&width=829&height=583'
    },
    {
        id: 'bunny',
        name: 'Bunny',
        floorNumber: 19,
        health: 4,
        mana: 0,
        armor: 0,
        critChance: 5,
        weapons: ['fluffy_hop', 'carrot_toss'],
        abilities: [],
        spells: [],
        specialMoves: [],
        emoji: '🐰',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697185900597371/Screenshot_2025-03-19_094623.png?ex=67e291da&is=67e1405a&hm=9e31748f011e07aae9413f9cd7aa2e9fb19089f85458c197ed622ee85f5e9a08&=&format=webp&quality=lossless&width=709&height=556'
    },
    {
        id: 'black_dragon',
        name: 'Black Dragon',
        floorNumber: 20,
        health: 20,
        mana: 20,
        armor: 0,
        critChance: 7,
        weapons: ['bite', 'claw', 'tail_crush'],
        abilities: ['roar', 'wing_buffet'],
        spells: ['fire_breath', 'inferno', 'meteor_strike'],
        specialMoves: [],
        emoji: '🐲',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1351697186798305320/Screenshot_2025-03-19_094803.png?ex=67e291da&is=67e1405a&hm=818f099bdf84cda823f94fd94a9748e65f347be031596de7adfcc05b07191158&=&format=webp&quality=lossless&width=816&height=592',
        rewards: {
            gold: 200
        }
    },
    // Special monster - Mimic (not tied to a specific floor)
    {
        id: 'mimic',
        name: 'Mimic',
        floorNumber: null, // Can appear anywhere
        health: 10,
        mana: 10,
        armor: 1,
        critChance: 20,
        weapons: ['venomous_bite', 'tornado_spin'],
        abilities: ['dodge', 'counter', 'silence', 'lucky_guy'],
        spells: ['death_bolt'],
        specialMoves: [],
        emoji: '📦',
        imageUrl: 'https://media.discordapp.net/attachments/1351696887165616169/1354339210370220042/image.png?ex=67e4ee2e&is=67e39cae&hm=97cb02a715f7793c551160f522a4999662531d2c10fd02e93152ff89be3978b8&=&format=webp&quality=lossless&width=808&height=581',
        rewards: {
            description: 'Random rarities, Reward between 1-5 Items, weapons, spells, gold, armor, keys, spells, scrolls, consumables'
        }
    }
];

/**
 * Get monster by ID
 */
export function getMonsterById(monsterId) {
    return monstersData.find(monster => monster.id === monsterId);
}

/**
 * Get monster for specific floor
 */
export function getMonsterForFloor(floorNumber) {
    // For floors 1-20, get the corresponding monster
    if (floorNumber <= 20) {
        return monstersData.find(monster => monster.floorNumber === floorNumber);
    }
    
    // After floor 20, loop back to floors 1-20 with scaling
    const baseFloor = ((floorNumber - 1) % 20) + 1;
    return monstersData.find(monster => monster.floorNumber === baseFloor);
}

/**
 * Get random monster for exploration encounters
 * Uses weighted probability based on floor ranges
 */
export function getRandomMonsterForFloor(currentFloor) {
    // Filter monsters based on probability ranges from RULES.txt
    const lowTierMonsters = monstersData.filter(m => m.floorNumber >= 1 && m.floorNumber <= 5);
    const midTierMonsters = monstersData.filter(m => m.floorNumber >= 6 && m.floorNumber <= 10);
    const highTierMonsters = monstersData.filter(m => m.floorNumber >= 11 && m.floorNumber <= 20);
    
    // Calculate probabilities based on current floor
    const floorGroup = Math.floor((currentFloor - 1) / 5) + 1;
    
    let possibleMonsters = [];
    
    // Monsters 1-5: High chance on low floors, decreases every 5 floors
    const lowTierChance = Math.max(0.1, 0.7 - (floorGroup - 1) * 0.1);
    possibleMonsters.push(...lowTierMonsters.map(m => ({ ...m, weight: lowTierChance })));
    
    // Monsters 6-10: Medium chance forever
    possibleMonsters.push(...midTierMonsters.map(m => ({ ...m, weight: 0.4 })));
    
    // Monsters 11-20: Low chance on low floors, increases every 5 floors
    const highTierChance = Math.min(0.7, 0.1 + (floorGroup - 1) * 0.1);
    possibleMonsters.push(...highTierMonsters.map(m => ({ ...m, weight: highTierChance })));
    
    // Select random monster based on weights
    const totalWeight = possibleMonsters.reduce((sum, m) => sum + m.weight, 0);
    let random = Math.random() * totalWeight;
    
    for (const monster of possibleMonsters) {
        random -= monster.weight;
        if (random <= 0) {
            return monster;
        }
    }
    
    // Fallback to first monster
    return possibleMonsters[0];
}

/**
 * Get mimic monster
 */
export function getMimic() {
    return getMonsterById('mimic');
}

/**
 * Get all floor boss monsters (floors 1-20)
 */
export function getFloorBossMonsters() {
    return monstersData.filter(monster => monster.floorNumber !== null);
} 