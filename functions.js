const winston = require('winston');
require('dotenv').config();
const fetch = require('node-fetch');

const serverName = process.env.SERVERNAME || 'other';

const logger = winston.createLogger({
    level: process.env.LOGLEVEL || 'info',
    format: winston.format.combine(
        winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
        winston.format.printf(info => `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message}`)
    ),
    transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: './verify.log' }),
    ]
});

const metadata = [
  {
    key: 'is_in_other_server',
    name: `Member of ${serverName}`,
    description: `User is a member of the ${serverName} server`,
    type: 7 // bool
  }
];

async function registerMetadata() {
  const res = await fetch(`https://discord.com/api/v10/applications/${process.env.ID}/role-connections/metadata`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bot ${process.env.TOKEN}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(metadata)
  });

  if (res.ok) {
    console.log('✅ Metadata registered successfully!');
  } else {
    const text = await res.text();
    console.error('❌ Failed to register metadata:', text);
  }
}

registerMetadata();

module.exports = { logger, registerMetadata, serverName }