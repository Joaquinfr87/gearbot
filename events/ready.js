module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    console.log(`✅ Bot listo como ${client.user.tag}`);
    console.log(`📊 Conectado a ${client.guilds.cache.size} servidores`);
    
    // Establecer actividad del bot
    client.user.setActivity('!ruleta | Russian Roulette', { type: 'PLAYING' });
  }
};
