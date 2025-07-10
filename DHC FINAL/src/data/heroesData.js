/**
 * Heroes Data for Dungeonites Heroes Challenge
 * Based on RULES.txt specifications
 */

const heroesData = [
    {
        id: 'grim_stonebeard',
        name: 'Grim Stonebeard',
        health: 10,
        mana: 5,
        armor: 0,
        critChance: 5,
        weapons: ['hammer', 'sword'],
        abilities: ['pound', 'rage_toss', 'silence', 'counter', 'dodge', 'heal'],
        description: 'A stoic dwarven warrior with a fiery temper, Grim Stonebeard wields his weapons with unmatched strength.',
        unlockFloor: 0,
        imageUrl: 'https://media.discordapp.net/attachments/1283293562942918677/1349635759186907177/image.png?ex=67d3d1c0&is=67d28040&hm=a2c540024d052f963a56ffddb11c375893a5971ffcf93f8b02c4b3a05ceb9bec&=&format=webp&quality=lossless&width=695&height=510',
        emoji: '⚒️'
    },
    {
        id: 'grenthaia_loastrum',
        name: 'Grenthaia Loastrum',
        health: 10,
        mana: 7,
        armor: 0,
        critChance: 5,
        weapons: ['bow', 'sword'],
        abilities: ['dual_shot', 'silence', 'dodge', 'heal', 'healing_rain'],
        description: 'An elven archer with a keen eye, Grenthaia blends magic and precision to strike from afar.',
        unlockFloor: 10,
        imageUrl: 'https://i.imgur.com/GrenthaiaLoastrum.jpg', // Placeholder
        emoji: '🏹'
    },
    {
        id: 'gregory_saddleman',
        name: 'Gregory Saddleman',
        health: 10,
        mana: 5,
        armor: 0,
        critChance: 5,
        weapons: ['bow', 'sword'],
        abilities: ['lucky_guy', 'silence', 'dodge', 'heal', 'counter'],
        description: 'A roguish adventurer with a knack for luck, Gregory always has a trick up his sleeve.',
        unlockFloor: 20,
        imageUrl: 'https://i.imgur.com/GregorySaddleman.jpg', // Placeholder
        emoji: '🍀'
    },
    {
        id: 'alistair_darkbane',
        name: 'Alistair Darkbane',
        health: 12,
        mana: 6,
        armor: 0,
        critChance: 5,
        weapons: ['sword'],
        abilities: ['accepting_fate', 'silence', 'counter', 'dodge', 'heal'],
        description: 'A death knight who defies death itself, Alistair uses forbidden magic to turn the tide.',
        unlockFloor: 30,
        imageUrl: 'https://i.imgur.com/AlistairDarkbane.jpg', // Placeholder
        emoji: '☠️'
    },
    {
        id: 'arcanus_nexus',
        name: 'Arcanus Nexus',
        health: 8,
        mana: 10,
        armor: 0,
        critChance: 5,
        weapons: ['staff', 'sword'],
        abilities: ['blizzard', 'firestorm', 'silence', 'dodge', 'heal'],
        description: 'A master wizard of elemental magic, Arcanus commands fire and ice with deadly precision.',
        unlockFloor: 40,
        imageUrl: 'https://i.imgur.com/ArcanusNexus.jpg', // Placeholder
        emoji: '🔮'
    }
];

/**
 * Get hero by ID
 */
function getHeroById(heroId) {
    return heroesData.find(hero => hero.id === heroId);
}

/**
 * Get all heroes unlocked at or before the given floor
 */
function getUnlockedHeroes(currentFloor) {
    return heroesData.filter(hero => hero.unlockFloor <= currentFloor);
}

/**
 * Get heroes available for selection based on player progress
 */
function getAvailableHeroes(playerProgress) {
    const highestFloor = playerProgress.highestFloorReached || 0;
    const unlockedHeroes = playerProgress.unlockedHeroes || ['grim_stonebeard'];
    
    return heroesData.filter(hero => {
        return hero.unlockFloor <= highestFloor && unlockedHeroes.includes(hero.id);
    });
}

/**
 * Check if a hero should be unlocked based on floor progression
 */
function checkHeroUnlock(currentFloor) {
    return heroesData.filter(hero => hero.unlockFloor === currentFloor);
}

/**
 * Get starting hero (Grim Stonebeard)
 */
function getStartingHero() {
    return getHeroById('grim_stonebeard');
} 

export { 
    heroesData, 
    getHeroById, 
    getUnlockedHeroes, 
    getAvailableHeroes, 
    checkHeroUnlock, 
    getStartingHero 
}; 