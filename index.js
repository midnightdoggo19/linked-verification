const express = require('express');
const fetch = require('node-fetch');
require('dotenv').config();
const {
    Client,
    GatewayIntentBits,
    REST,
    Collection,
    Events
} = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
const { logger } = require('./functions');

const app = express();
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ]
});
const rest = new REST({ version: '10' }).setToken(process.env.TOKEN);
client.commands = new Collection();

if (!fs.existsSync('./verify.log')) {
    fs.writeFileSync('./verify.log', '', 'utf8');
}

const foldersPath = path.join(__dirname, 'commands');
const commandFolders = fs.readdirSync(foldersPath);
for (const folder of commandFolders) {
	const commandsPath = path.join(foldersPath, folder);
	const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));
	for (const file of commandFiles) {
		const filePath = path.join(commandsPath, file);
		const command = require(filePath);
		if ('data' in command && 'execute' in command) {
			client.commands.set(command.data.name, command);
		} else {
			console.log(`[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`);
		}
	}
}

client.on(Events.InteractionCreate, async interaction => {
	if (!interaction.isChatInputCommand()) return;

	const command = interaction.client.commands.get(interaction.commandName);

	if (!command) {
		logger.error(`No command matching ${interaction.commandName} was found.`);
		return;
	}

	try {
		await command.execute(interaction);
	} catch (error) {
		logger.error(error);
		if (interaction.replied || interaction.deferred) {
			await interaction.followUp({ content: 'There was an error while executing this command!', flags: 64 });
		} else {
			await interaction.reply({ content: 'There was an error while executing this command!', flags: 64 });
		}
	}
});

client.once('ready', () => {
    logger.info(`Logged in as ${client.user.tag}`);
});

client.login(process.env.TOKEN);

// --- EXPRESS ---

app.get('/', (req, res) => {
  const oauthUrl = `https://discord.com/oauth2/authorize?client_id=${process.env.ID}&response_type=code&scope=identify+guilds+role_connections.write&redirect_uri=${encodeURIComponent(process.env.REDIRECT)}`;
  res.send(`<a href="${oauthUrl}">Click here verify to your Discord account!</a>`);
});

app.get('/oauth/callback', async (req, res) => {
    const code = req.query.code;
    const state = req.query.state;

    if (!code) return res.status(400).send('Missing code');
  
    try {
        // swap code for access token
        logger.debug(`ID ${process.env.ID}`);
        const tokenRes = await fetch('https://discord.com/api/v10/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: process.env.ID,
                client_secret: process.env.SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: process.env.REDIRECT
            })
        });
    
        const tokenData = await tokenRes.json();
        const accessToken = tokenData.access_token;
    
        if (!accessToken) throw new Error('No access token');

        const guilds = await fetch('https://discord.com/api/v10/users/@me/guilds', {
            headers: {
              Authorization: `Bearer ${accessToken}`
            }
        }).then(res => res.json());
        
        // if (!guilds.some(g => g.id == process.env.GUILDID)) { res.status(403).send('No can do!'); return; } // idk
        if (!process.env.GUILDID in guilds) { res.status(403).send('No can do!'); return; } // temp
    
        // update metadata
        const metadataBody = {
            platform_name: state === 'unlink' ? null : 'Link',
            metadata: state === 'unlink' ? {} : { is_in_other_server: true }
        };
    
        const roleRes = await fetch(`https://discord.com/api/v10/users/@me/applications/${process.env.ID}/role-connection`, {
            method: 'PUT',
            headers: {
                Authorization: `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(metadataBody)
        });
    
        if (!roleRes.ok) {
            const errText = await roleRes.text();
            throw new Error(`Failed to update role connection: ${errText}`);
        }
        res.send(state === 'unlink' ? '✅ Unlinked successfully!' : '✅ Linked successfully!');
    } catch (err) {
        console.error(err);
        res.status(500).send('❌ Error during OAuth2 flow');
    }  
});

app.listen(process.env.PORT, process.env.ADDRESS || `127.0.0.1`, () => {
  console.log(`Server running at http://${process.env.ADDRESS || `127.0.0.1`}:${process.env.PORT}`);
});
