import { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } from 'discord.js';
import { ProfileService } from '../../services/ProfileService.js';
import { Web3Manager } from '../../utils/Web3Manager.js';
import { logger } from '../../utils/logger.js';

const data = new SlashCommandBuilder()
    .setName('profile')
    .setDescription('Manage your player profile')
    .addSubcommand(sub => sub
        .setName('create')
        .setDescription('Create a new profile')
        .addStringOption(opt => opt.setName('password').setDescription('Choose a password').setRequired(true))
        .addStringOption(opt => opt.setName('email').setDescription('Email for recovery').setRequired(false)))
    .addSubcommand(sub => sub
        .setName('update')
        .setDescription('Update password or email')
        .addStringOption(opt => opt.setName('password').setDescription('New password').setRequired(false))
        .addStringOption(opt => opt.setName('email').setDescription('New email').setRequired(false)))
    .addSubcommand(sub => sub
        .setName('addwallet')
        .setDescription('Add an EVM wallet address to your profile')
        .addStringOption(opt => opt.setName('address').setDescription('Ethereum-compatible address').setRequired(true)))
    .addSubcommand(sub => sub
        .setName('removewallet')
        .setDescription('Remove a wallet address from your profile')
        .addStringOption(opt => opt.setName('address').setDescription('Address to remove').setRequired(true)))
    .addSubcommand(sub => sub
        .setName('view')
        .setDescription('View your profile summary'))
    .addSubcommand(sub => sub
        .setName('wallet')
        .setDescription('View wallet details'))
    .addSubcommand(sub => sub
        .setName('reset')
        .setDescription('Admin: reset a user password')
        .addUserOption(opt => opt.setName('user').setDescription('Target user').setRequired(true))
        .addStringOption(opt => opt.setName('newpassword').setDescription('New password').setRequired(true)))
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator);

export { data };

export async function execute(interaction) {
    const sub = interaction.options.getSubcommand();
    const userId = interaction.user.id;

    try {
        switch (sub) {
            case 'create': {
                const password = interaction.options.getString('password');
                const email = interaction.options.getString('email');
                await ProfileService.createProfile(userId, { password, email });
                await interaction.reply({ content: '✅ Profile created successfully!', ephemeral: true });
                break;
            }
            case 'update': {
                const password = interaction.options.getString('password');
                const email = interaction.options.getString('email');
                await ProfileService.updateProfile(userId, { password, email });
                await interaction.reply({ content: '✅ Profile updated.', ephemeral: true });
                break;
            }
            case 'addwallet': {
                const address = interaction.options.getString('address');
                await ProfileService.addWallet(userId, address);
                await interaction.reply({ content: `✅ Wallet ${address} added.`, ephemeral: true });
                break;
            }
            case 'removewallet': {
                const address = interaction.options.getString('address');
                await ProfileService.removeWallet(userId, address);
                await interaction.reply({ content: `✅ Wallet ${address} removed.`, ephemeral: true });
                break;
            }
            case 'view': {
                const profile = await ProfileService.getProfile(userId);
                if (!profile) {
                    await interaction.reply({ content: '❌ No profile found. Use /profile create first.', ephemeral: true });
                    return;
                }
                const embed = buildProfileEmbed(profile);
                await interaction.reply({ embeds: [embed], ephemeral: false });
                break;
            }
            case 'wallet': {
                const overview = await ProfileService.getWalletOverview(userId);
                const embed = new EmbedBuilder()
                    .setTitle('💼 Wallet Overview')
                    .setDescription('On-chain balances and assets')
                    .setColor(0x3498db);
                overview.forEach(w => {
                    embed.addFields({ name: w.address, value: `Assets: ${w.assets.length}\nNFTs: ${w.nfts.length}` });
                });
                if (overview.length === 0) {
                    embed.setDescription('No wallets linked. Add one with /profile addwallet');
                }
                await interaction.reply({ embeds: [embed], ephemeral: false });
                break;
            }
            case 'reset': {
                const isAdmin = interaction.memberPermissions.has(PermissionFlagsBits.Administrator);
                if (!isAdmin) {
                    await interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
                    return;
                }
                const target = interaction.options.getUser('user');
                const newPassword = interaction.options.getString('newpassword');
                await ProfileService.resetPassword(target.id, newPassword);
                await interaction.reply({ content: `✅ Password for <@${target.id}> has been reset.`, ephemeral: true });
                break;
            }
        }
    } catch (error) {
        logger.error('Profile command error:', error);
        await interaction.reply({ content: `❌ Error: ${error.message}`, ephemeral: true });
    }
}

function buildProfileEmbed(profile) {
    const embed = new EmbedBuilder()
        .setTitle('👤 Player Profile')
        .setColor(0x9b59b6)
        .addFields([
            { name: 'Email', value: profile.email || 'Not set', inline: true },
            { name: 'Wallets', value: profile.wallets.length.toString(), inline: true },
            { name: 'Games Played', value: profile.stats.gamesPlayed.toString(), inline: true },
            { name: 'Gold Found', value: profile.stats.totalGoldFound.toString(), inline: true },
            { name: 'Monsters Defeated', value: profile.stats.totalMonstersDefeated.toString(), inline: true },
            { name: 'Achievements', value: profile.stats.achievements.length.toString(), inline: true }
        ])
        .setTimestamp();
    return embed;
} 