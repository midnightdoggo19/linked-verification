const { SlashCommandBuilder } = require('discord.js');
require('dotenv').config();

module.exports = {
	data: new SlashCommandBuilder()
		.setName('unlink')
		.setDescription('Unlink from the bot')
        .setContexts(0, 1),

	async execute(interaction) {
    const oauthLink = `https://discord.com/oauth2/authorize?client_id=${process.env.ID}&redirect_uri=${encodeURIComponent(process.env.REDIRECT)}&response_type=code&scope=identify+role_connections.write&state=unlink`;
    await interaction.reply({ content: `To remove your linked role metadata, click [**here**](${oauthLink}).`, flags: 64 });
	},
};