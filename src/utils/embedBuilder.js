import { EmbedBuilder } from 'discord.js';
import { getEffect, getEffectDisplayString } from '../data/effectsData.js';

/**
 * EmbedBuilder utility for creating Discord embeds for different game screens
 * Based on RULES.txt specifications and user requirements
 */

// Game configuration for images and colors
const config = {
    colors: {
        primary: '#3498db',
        success: '#2ecc71',
        warning: '#f39c12',
        error: '#e74c3c',
        combat: '#9b59b6',
        exploration: '#16a085',
        treasure: '#f1c40f'
    },
    images: {
        logo: 'https://media.discordapp.net/attachments/1243047159524495361/1243732590863847485/Logo_Dark_Background.png?ex=67e2023d&is=67e0b0bd&hm=b040dd966b05b23db9a5537a30365666812b130dd61f28fa7eeb291a156739a2&=&format=webp&quality=lossless&width=810&height=810',
        heroSelect: 'https://media.discordapp.net/attachments/1351696887165616169/1353934280622866432/image.png?ex=67e3750f&is=67e2238f&hm=e13658e07a8ff12433639a1936044ea1d05875444c29faa68b6488049d9c1276&=&format=webp&quality=lossless&width=823&height=593',
        dungeonEntrance: 'https://media.discordapp.net/attachments/1351696887165616169/1353999603896156200/image.png?ex=67e3b1e5&is=67e26065&hm=2a7e5a31379b1f67c0db80bc6034b2ae6116dc6a6ed65c3d4010b3585c6e440e&=&format=webp&quality=lossless&width=411&height=315',
        victory: 'https://media.discordapp.net/attachments/1351696887165616169/1354030366897209365/image.png?ex=67e3ce8c&is=67e27d0c&hm=30e4ab75f70057ba055d0fa380e9dab58c906ebab89ebfa2f38319cfb49c18c3&=&format=webp&quality=lossless&width=834&height=465',
        newFloor: 'https://media.discordapp.net/attachments/1351696887165616169/1355065567228465152/image.png?ex=67e792a7&is=67e64127&hm=af5ca5dc2441836e8572fcc85304099d67d7ac8278e277b3f9ced6b0879fafc0&=&format=webp&quality=lossless&width=824&height=576',
        foundNothing: [
            'https://media.discordapp.net/attachments/1351696887165616169/1356511792045752381/image.png?ex=67ee270d&is=67ecd58d&hm=38754b2fe36861b42f6e827627a146efe9a54e730714e35cfc2c7fce1c7beb6e&=&format=webp&quality=lossless&width=813&height=589',
            'https://media.discordapp.net/attachments/1351696887165616169/1356552671699665016/image.png?ex=67eda460&is=67ec52e0&hm=cd26527333c08fbc9fc51f90276c9817c800dd531eedb8f2406e83ce43cfbbbd&=&format=webp&quality=lossless&width=805&height=578'
        ],
        hiddenRoom: 'https://media.discordapp.net/attachments/1351696887165616169/1356488744588283974/image.png?ex=67ee1197&is=67ecc017&hm=97a81d6e7238808f135a8ffcffd6ea9592a2256502e34df60f5ec313e5ab330f&=&format=webp&quality=lossless&width=809&height=579',
        flee: 'https://media.discordapp.net/attachments/1351696887165616169/1356488743422529656/image.png?ex=67ee1196&is=67ecc016&hm=2d2e0245a718c27037dd0ba623fbce2dcd47f90d9376cb6d812604d87f72bb7a&=&format=webp&quality=lossless&width=824&height=588',
        sneakAway: 'https://media.discordapp.net/attachments/1351696887165616169/1356409841010344106/image.png?ex=67edc81a&is=67ec769a&hm=c47efacf0028c1ef27b9b83f931df9673f7f153709d9b22350545903ac42b9a0&=&format=webp&quality=lossless&width=820&height=589'
    }
};

/**
 * Create Start Menu/Welcome Screen embed
 */
export function createStartMenuEmbed() {
    return new EmbedBuilder()
        .setTitle('🏰 DUNGEONITES HEROES CHALLENGE')
        .setDescription(
            '**Welcome to the ultimate dungeon crawler RPG!**\n\n' +
            'Brave adventurer, choose your path:\n\n' +
            '🎮 **Start Game** - Begin your heroic journey\n' +
            '📚 **Tutorial** - Learn the basics of survival\n' +
            '👤 **Profile** - View your stats and achievements\n' +
            '🏆 **Leaderboard** - See the greatest champions\n\n' +
            '*Select an option from the dropdown below to continue...*'
        )
        .setImage(config.images.logo)
        .setColor(config.colors.primary)
        .setFooter({ text: 'Dungeonites Heroes Challenge | Ready for Adventure!' });
}

/**
 * Create Hero Selection Screen embed
 */
export function createHeroSelectionEmbed(availableHeroes, playerStats = null) {
    const embed = new EmbedBuilder()
        .setTitle('⚔️ CHOOSE YOUR HERO')
        .setDescription(
            '**Select your champion for this adventure:**\n\n' +
            'Each hero has unique abilities and starting equipment.\n' +
            'Choose wisely - your survival depends on it!\n\n' +
            '*Select a hero from the dropdown below...*'
        )
        .setImage(config.images.heroSelect)
        .setColor(config.colors.primary);

    if (playerStats) {
        embed.addFields([
            {
                name: '💰 Your Economy',
                value: `🪙 Gold: ${playerStats.economy.gold}\n` +
                      `🎟️ Tokens: ${playerStats.economy.tokens}\n` +
                      `💎 $DNG: ${playerStats.economy.dng}\n` +
                      `🦸 $HERO: ${playerStats.economy.hero}\n` +
                      `⚡ $ETH: ${playerStats.economy.eth}`,
                inline: true
            },
            {
                name: '🏆 Progress',
                value: `Highest Floor: ${playerStats.progress?.highestFloorReached || 0}\n` +
                      `Heroes Unlocked: ${availableHeroes.length}`,
                inline: true
            }
        ]);
    }

    return embed;
}

/**
 * Create Hero Confirmation Screen embed
 */
export function createHeroConfirmationEmbed(hero) {
    const weaponsText = hero.weapons ? hero.weapons.map(w => `• ${w.name}`).join('\n') : 'None';
    const abilitiesText = hero.abilities ? hero.abilities.map(a => `• ${a.name}`).join('\n') : 'None';

    return new EmbedBuilder()
        .setTitle(`⚔️ CONFIRM YOUR HERO: ${hero.name.toUpperCase()}`)
        .setDescription(hero.description || 'A legendary hero ready for adventure')
        .setThumbnail(hero.imageUrl)
        .setColor(config.colors.primary)
        .addFields([
            {
                name: '💪 Stats',
                value: `❤️ Health: ${hero.health}\n` +
                      `🔮 Mana: ${hero.mana}\n` +
                      `🛡️ Armor: ${hero.armor}\n` +
                      `🎯 Crit Chance: ${hero.critChance}%`,
                inline: true
            },
            {
                name: '⚔️ Starting Weapons',
                value: weaponsText,
                inline: true
            },
            {
                name: '✨ Abilities',
                value: abilitiesText,
                inline: true
            }
        ])
        .setFooter({ text: 'Confirm your selection or choose another hero' });
}

/**
 * Create Dungeon Entrance Screen embed
 */
export function createDungeonEntranceEmbed(gameState) {
    const embed = new EmbedBuilder()
        .setTitle('🏰 DUNGEON ENTRANCE')
        .setDescription(
            '**You stand before the ancient dungeon entrance...**\n\n' +
            'Dark passages stretch into the depths below. Ancient magic crackles in the air.\n' +
            'Prepare yourself, brave adventurer - glory and treasure await those bold enough to descend!\n\n' +
            '*What would you like to do?*'
        )
        .setImage(config.images.dungeonEntrance)
        .setColor(config.colors.primary);

    // Add player stats
    if (gameState && gameState.hero) {
        embed.addFields([
            {
                name: `⚔️ ${gameState.hero.name}`,
                value: `❤️ ${gameState.hero.health}/${gameState.hero.maxHealth} HP\n` +
                      `🔮 ${gameState.hero.mana}/${gameState.hero.maxMana} MP\n` +
                      `🛡️ ${gameState.hero.armor} Armor`,
                inline: true
            },
            {
                name: '💰 Resources',
                value: `🪙 Gold: ${gameState.inventory.gold}\n` +
                      `🗝️ Keys: ${gameState.inventory.keys}\n` +
                      `Division: ${gameState.economyType.toUpperCase()}`,
                inline: true
            }
        ]);

        if (gameState.hero.activeEffects && gameState.hero.activeEffects.length > 0) {
            embed.addFields([{
                name: '✨ Active Effects',
                value: getEffectDisplayString(gameState.hero.activeEffects),
                inline: false
            }]);
        }
    }

    return embed;
}

/**
 * Create Floor Exploration Screen embed
 */
export function createFloorExplorationEmbed(gameState, floorInfo = null) {
    const floor = gameState.currentFloor;
    const exploredCount = gameState.exploration.currentFloorExploreCount;
    const maxExplores = gameState.getMaxExploreCount();

    const embed = new EmbedBuilder()
        .setTitle(`🗺️ FLOOR ${floor} EXPLORATION`)
        .setDescription(
            `**You are exploring Floor ${floor} of the dungeon...**\n\n` +
            `The air grows thicker as you venture deeper. Strange sounds echo from the shadows.\n` +
            `Your torchlight reveals multiple passages ahead.\n\n` +
            `**Explorations: ${exploredCount}/${maxExplores}**\n\n` +
            '*Choose your next action carefully...*'
        )
        .setImage(config.images.newFloor)
        .setColor(config.colors.exploration);

    // Add player stats
    if (gameState.hero) {
        embed.addFields([
            {
                name: `⚔️ ${gameState.hero.name}`,
                value: `❤️ ${gameState.hero.health}/${gameState.hero.maxHealth} HP\n` +
                      `🔮 ${gameState.hero.mana}/${gameState.hero.maxMana} MP\n` +
                      `🛡️ ${gameState.hero.armor} Armor`,
                inline: true
            },
            {
                name: '💰 Resources',
                value: `🪙 Gold: ${gameState.inventory.gold}\n` +
                      `🗝️ Keys: ${gameState.inventory.keys}`,
                inline: true
            }
        ]);
    }

    return embed;
}

/**
 * Create Battle Screen embed
 */
export function createBattleEmbed(gameState, monster, turnInfo = null) {
    const hero = gameState.hero;
    
    const embed = new EmbedBuilder()
        .setTitle(`⚔️ BATTLE: ${hero.name.toUpperCase()} VS ${monster.name.toUpperCase()}`)
        .setDescription(
            `**Floor ${gameState.currentFloor} - Turn ${gameState.battle.turnCount || 1}**\n\n` +
            `${turnInfo || 'The battle begins! Choose your action wisely...'}\n\n` +
            '*Select your move from the dropdown below*'
        )
        .setThumbnail(monster.imageUrl)
        .setColor(config.colors.combat);

    // Hero stats
    embed.addFields([
        {
            name: `⚔️ ${hero.name}`,
            value: `❤️ ${hero.health}/${hero.maxHealth} HP\n` +
                  `🔮 ${hero.mana}/${hero.maxMana} MP\n` +
                  `🛡️ ${hero.armor} Armor\n` +
                  `🎯 ${hero.critChance}% Crit`,
            inline: true
        },
        {
            name: `👹 ${monster.name}`,
            value: `❤️ ${monster.health}/${monster.maxHealth} HP\n` +
                  `🔮 ${monster.mana}/${monster.maxMana} MP\n` +
                  `🛡️ ${monster.armor} Armor\n` +
                  `${monster.emoji || '👹'}`,
            inline: true
        }
    ]);

    // Active effects
    if (hero.activeEffects && hero.activeEffects.length > 0) {
        embed.addFields([{
            name: '✨ Hero Effects',
            value: getEffectDisplayString(hero.activeEffects),
            inline: true
        }]);
    }

    if (monster.activeEffects && monster.activeEffects.length > 0) {
        embed.addFields([{
            name: '🌟 Monster Effects',
            value: getEffectDisplayString(monster.activeEffects),
            inline: true
        }]);
    }

    return embed;
}

/**
 * Create Victory Screen embed
 */
export function createVictoryEmbed(gameState, monster, rewards) {
    const embed = new EmbedBuilder()
        .setTitle('🎉 VICTORY!')
        .setDescription(
            `**${gameState.hero.name} has defeated the ${monster.name}!**\n\n` +
            `With skill and determination, you have emerged victorious from this battle.\n` +
            `The fallen enemy drops rewards for your triumph!\n\n` +
            '**Rewards Earned:**'
        )
        .setImage(config.images.victory)
        .setColor(config.colors.success);

    // Add rewards
    if (rewards) {
        let rewardsText = '';
        if (rewards.gold > 0) rewardsText += `🪙 ${rewards.gold} Gold\n`;
        if (rewards.keys > 0) rewardsText += `🗝️ ${rewards.keys} Keys\n`;
        if (rewards.items && rewards.items.length > 0) {
            rewardsText += `📦 ${rewards.items.length} Items\n`;
        }

        if (rewardsText) {
            embed.addFields([{
                name: '💰 Battle Rewards',
                value: rewardsText,
                inline: true
            }]);
        }
    }

    // Hero stats after battle
    embed.addFields([
        {
            name: `⚔️ ${gameState.hero.name}`,
            value: `❤️ ${gameState.hero.health}/${gameState.hero.maxHealth} HP\n` +
                  `🔮 ${gameState.hero.mana}/${gameState.hero.maxMana} MP\n` +
                  `Current Floor: ${gameState.currentFloor}`,
            inline: true
        }
    ]);

    return embed;
}

/**
 * Create Defeat/Death Screen embed
 */
export function createDefeatEmbed(gameState, monster, causeOfDeath) {
    return new EmbedBuilder()
        .setTitle('💀 GAME OVER')
        .setDescription(
            `**${gameState.hero.name} has fallen in battle...**\n\n` +
            `${causeOfDeath || `Defeated by ${monster.name} on Floor ${gameState.currentFloor}`}\n\n` +
            `Your adventure ends here, but heroes never truly die.\n` +
            `Rise again and challenge the dungeon once more!\n\n` +
            '*All items have been lost, but your progress remains.*'
        )
        .setColor(config.colors.error)
        .addFields([
            {
                name: '📊 Final Stats',
                value: `Floor Reached: ${gameState.currentFloor}\n` +
                      `Monsters Defeated: ${gameState.progress.totalMonstersDefeated || 0}\n` +
                      `Items Found: ${gameState.progress.totalLootFound || 0}`,
                inline: true
            }
        ])
        .setFooter({ text: 'Better luck next time, brave adventurer!' });
}

/**
 * Create Inventory Screen embed
 */
export function createInventoryEmbed(gameState) {
    const inventory = gameState.inventory;
    
    const embed = new EmbedBuilder()
        .setTitle('🎒 INVENTORY')
        .setDescription(`**${gameState.hero.name}'s Equipment & Items**\n\nManage your gear and consumables below.`)
        .setColor(config.colors.primary);

    // Current equipment
    let equipmentText = '';
    if (gameState.hero.currentWeapon) {
        equipmentText += `⚔️ Weapon: ${gameState.hero.currentWeapon.name}\n`;
    }
    if (gameState.hero.equippedArmor) {
        equipmentText += `🛡️ Armor: ${gameState.hero.equippedArmor.name}\n`;
    }
    if (!equipmentText) equipmentText = 'No equipment equipped';

    embed.addFields([
        {
            name: '🎽 Currently Equipped',
            value: equipmentText,
            inline: false
        },
        {
            name: '💰 Resources',
            value: `🪙 Gold: ${inventory.gold}\n🗝️ Keys: ${inventory.keys}`,
            inline: true
        },
        {
            name: '📦 Storage',
            value: `⚔️ Weapons: ${inventory.weapons.length}/20\n` +
                  `🛡️ Armor: ${inventory.armor.length}/20\n` +
                  `🧪 Consumables: ${inventory.consumables.length}/20\n` +
                  `📜 Scrolls: ${inventory.scrolls?.length || 0}/20`,
            inline: true
        }
    ]);

    return embed;
}

/**
 * Create Shop Screen embed
 */
export function createShopEmbed(gameState, shopItems) {
    const embed = new EmbedBuilder()
        .setTitle('🏪 DUNGEON SHOP')
        .setDescription(
            '**Welcome to the Dungeon Shop!**\n\n' +
            'Purchase weapons, armor, and consumables to aid your journey.\n' +
            'The deeper you go, the better the merchandise becomes!\n\n' +
            '*Browse available items below...*'
        )
        .setColor(config.colors.warning);

    embed.addFields([
        {
            name: '💰 Your Resources',
            value: `🪙 Gold: ${gameState.inventory.gold}\n` +
                  `🗝️ Keys: ${gameState.inventory.keys}\n` +
                  `Division: ${gameState.economyType.toUpperCase()}`,
            inline: true
        },
        {
            name: '📦 Inventory Space',
            value: `⚔️ Weapons: ${gameState.inventory.weapons.length}/20\n` +
                  `🛡️ Armor: ${gameState.inventory.armor.length}/20\n` +
                  `🧪 Consumables: ${gameState.inventory.consumables.length}/20`,
            inline: true
        }
    ]);

    return embed;
}

/**
 * Create Chest Discovery embed
 */
export function createChestDiscoveryEmbed(chestData, gameState) {
    return new EmbedBuilder()
        .setTitle(`🗃️ CHEST DISCOVERED!`)
        .setDescription(
            `**You have discovered a ${chestData.name}!**\n\n` +
            `${chestData.description}\n\n` +
            `**Keys Required:** ${chestData.keysRequired}\n` +
            `**Your Keys:** ${gameState.inventory.keys}\n\n` +
            '*What would you like to do?*'
        )
        .setImage(chestData.imageUrl)
        .setColor(config.colors.treasure)
        .setFooter({ text: `Found on Floor ${gameState.currentFloor}` });
}

/**
 * Create Chest Opening embed
 */
export function createChestOpeningEmbed(chestData, rewards) {
    let rewardsText = '';
    if (rewards.gold > 0) rewardsText += `🪙 ${rewards.gold} Gold\n`;
    if (rewards.keys > 0) rewardsText += `🗝️ ${rewards.keys} Keys\n`;
    if (rewards.items && rewards.items.length > 0) {
        rewardsText += `📦 ${rewards.items.length} Items Found\n`;
    }
    if (rewards.consumables && rewards.consumables.length > 0) {
        rewardsText += `🧪 ${rewards.consumables.length} Consumables\n`;
    }

    return new EmbedBuilder()
        .setTitle(`✨ CHEST OPENED!`)
        .setDescription(
            `**The ${chestData.name} has been opened!**\n\n` +
            `Ancient treasures spill forth from within!\n\n` +
            '**Rewards Found:**'
        )
        .setImage(chestData.imageUrl)
        .setColor(config.colors.success)
        .addFields([{
            name: '🎁 Your Rewards',
            value: rewardsText || 'Empty chest... that\'s unfortunate!',
            inline: false
        }]);
}

/**
 * Create Monster Encounter embed (Detected/Chance Attack)
 */
export function createMonsterEncounterEmbed(monster, encounterType, gameState) {
    const isDetected = encounterType === 'detected';
    
    return new EmbedBuilder()
        .setTitle(isDetected ? '👁️ MONSTER DETECTED!' : '⚡ AMBUSH!')
        .setDescription(
            isDetected 
                ? `**Your instincts warn you of danger ahead...**\n\n` +
                  `You sense a ${monster.name} lurking in the shadows.\n` +
                  `You have the advantage of surprise - what will you do?`
                : `**You've been ambushed by a ${monster.name}!**\n\n` +
                  `The creature attacks without warning!\n` +
                  `Quick - defend yourself!`
        )
        .setImage(monster.imageUrl)
        .setColor(isDetected ? config.colors.warning : config.colors.error)
        .addFields([
            {
                name: `👹 ${monster.name}`,
                value: `❤️ Health: ${monster.health}\n` +
                      `🔮 Mana: ${monster.mana}\n` +
                      `🛡️ Armor: ${monster.armor}\n` +
                      `${monster.emoji || '👹'}`,
                inline: true
            }
        ])
        .setFooter({ text: `Encountered on Floor ${gameState.currentFloor}` });
}

/**
 * Create exploration result embed (found nothing)
 */
export function createFoundNothingEmbed(gameState) {
    const imageUrl = config.images.foundNothing[Math.floor(Math.random() * config.images.foundNothing.length)];
    
    return new EmbedBuilder()
        .setTitle('🔍 NOTHING FOUND')
        .setDescription(
            `**You search the area thoroughly...**\n\n` +
            `Despite your careful exploration, you find nothing of value in this area.\n` +
            `The shadows whisper of treasures elsewhere. Perhaps the next room holds better fortune.\n\n` +
            `**Explorations: ${gameState.exploration.currentFloorExploreCount}/${gameState.getMaxExploreCount()}**`
        )
        .setImage(imageUrl)
        .setColor(config.colors.primary);
}

/**
 * Create Profile Screen embed
 */
export function createProfileEmbed(playerData) {
    return new EmbedBuilder()
        .setTitle(`👤 PLAYER PROFILE`)
        .setDescription(`**${playerData.playerName || 'Unnamed Hero'}**\n\nYour adventure statistics and achievements`)
        .setColor(config.colors.primary)
        .addFields([
            {
                name: '🏆 Progress',
                value: `Highest Floor: ${playerData.progress?.highestFloorReached || 0}\n` +
                      `Heroes Unlocked: ${playerData.progress?.unlockedHeroes?.length || 1}\n` +
                      `Monsters Defeated: ${playerData.progress?.totalMonstersDefeated || 0}`,
                inline: true
            },
            {
                name: '💰 Economy',
                value: `🪙 Gold: ${playerData.economy?.gold || 0}\n` +
                      `🎟️ Tokens: ${playerData.economy?.tokens || 0}\n` +
                      `💎 $DNG: ${playerData.economy?.dng || 0}\n` +
                      `🦸 $HERO: ${playerData.economy?.hero || 0}\n` +
                      `⚡ $ETH: ${playerData.economy?.eth || 0}`,
                inline: true
            }
        ]);
}

/**
 * Create Leaderboard Screen embed
 */
export function createLeaderboardEmbed(leaderboardData) {
    const embed = new EmbedBuilder()
        .setTitle('🏆 LEADERBOARD')
        .setDescription('**The Greatest Champions of the Dungeon**\n\nThese brave heroes have ventured deeper than any others!')
        .setColor(config.colors.success);

    if (leaderboardData && leaderboardData.length > 0) {
        const topPlayers = leaderboardData.slice(0, 10).map((player, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}.`;
            return `${medal} **${player.playerName || 'Anonymous'}** - Floor ${player.highestFloor}`;
        }).join('\n');

        embed.addFields([{
            name: '🏆 Top Adventurers',
            value: topPlayers,
            inline: false
        }]);
    } else {
        embed.addFields([{
            name: '🏆 Top Adventurers',
            value: 'No champions yet... Will you be the first?',
            inline: false
        }]);
    }

    return embed;
}

/**
 * Create Tutorial embed
 */
export function createTutorialEmbed(section = 'main') {
    const tutorials = {
        main: {
            title: '📚 TUTORIAL - GAME BASICS',
            description: 'Learn the fundamentals of Dungeonites Heroes Challenge!',
            content: `**Welcome to the Tutorial!**\n\n` +
                    `🎮 **Basic Gameplay:**\n` +
                    `• Choose a hero and explore dungeon floors\n` +
                    `• Battle monsters to progress deeper\n` +
                    `• Find treasure and upgrade your equipment\n\n` +
                    `⚔️ **Combat System:**\n` +
                    `• Simultaneous turn-based combat\n` +
                    `• Use weapons, abilities, and items\n` +
                    `• Manage health, mana, and effects\n\n` +
                    `🗺️ **Exploration:**\n` +
                    `• Limited explores per floor\n` +
                    `• Find treasure, monsters, or hidden rooms\n` +
                    `• Defeat floor boss to advance\n\n` +
                    `💰 **Economy:**\n` +
                    `• 5 divisions: Gold → Tokens → $DNG → $HERO → $ETH\n` +
                    `• Higher divisions = better rewards\n` +
                    `• Exchange currencies to advance`
        }
    };

    const tutorial = tutorials[section] || tutorials.main;

    return new EmbedBuilder()
        .setTitle(tutorial.title)
        .setDescription(tutorial.content)
        .setColor(config.colors.primary)
        .setFooter({ text: 'Use the menu to navigate or return to main menu' });
}

export default {
    createStartMenuEmbed,
    createHeroSelectionEmbed,
    createHeroConfirmationEmbed,
    createDungeonEntranceEmbed,
    createFloorExplorationEmbed,
    createBattleEmbed,
    createVictoryEmbed,
    createDefeatEmbed,
    createInventoryEmbed,
    createShopEmbed,
    createChestDiscoveryEmbed,
    createChestOpeningEmbed,
    createMonsterEncounterEmbed,
    createFoundNothingEmbed,
    createProfileEmbed,
    createLeaderboardEmbed,
    createTutorialEmbed
}; 