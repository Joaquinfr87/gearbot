require('dotenv').config();
const client = require('./config/client');
const { registerEvents } = require('./events/eventHandler');

// Registrar eventos
registerEvents(client);

// Iniciar el bot
client.login(process.env.DISCORD_TOKEN).then(() => {
  console.log('🤖 Bot iniciándose...');
}).catch(console.error);

