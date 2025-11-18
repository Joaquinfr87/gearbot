const { joinVoiceChannel, VoiceConnectionStatus, entersState } = require('@discordjs/voice');

// Mapa para rastrear el estado de las conexiones por guild
const connectionStates = new Map();

async function connectToVoiceChannel(msg) {
  const member = msg.member;
  const voiceChannel = member?.voice?.channel;
  
  if (!voiceChannel) {
    msg.reply('🎤 Entra a un canal de voz primero.');
    return null;
  }
  
  const permissions = voiceChannel.permissionsFor(msg.guild.members.me);
  if (!permissions.has('CONNECT') || !permissions.has('SPEAK')) {
    msg.reply('❌ No tengo permisos para unirme o hablar en ese canal de voz.');
    return null;
  }
  
  // Verificar si ya existe una conexión activa para este guild
  const guildKey = msg.guild.id;
  if (connectionStates.has(guildKey)) {
    const existingState = connectionStates.get(guildKey);
    if (existingState.status === 'connected' && existingState.connection.state.status !== VoiceConnectionStatus.Destroyed) {
      return existingState.connection;
    }
  }
  
  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false
  });
  
  // Registrar el estado de la conexión
  connectionStates.set(guildKey, {
    connection: connection,
    status: 'connecting',
    guildId: msg.guild.id,
    channelId: voiceChannel.id
  });
  
  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 10_000);
    
    // Actualizar estado a conectado
    connectionStates.set(guildKey, {
      ...connectionStates.get(guildKey),
      status: 'connected'
    });
    
    // Escuchar el evento de destrucción
    connection.on('stateChange', (oldState, newState) => {
      if (newState.status === VoiceConnectionStatus.Destroyed) {
        connectionStates.delete(guildKey);
      }
    });
    
    return connection;
  } catch (error) {
    console.error('Error conectando al canal de voz:', error);
    msg.reply('❌ No pude conectarme al canal de voz.');
    safeDestroyConnection(connection, guildKey);
    return null;
  }
}

function safeDestroyConnection(connection, guildKey = null) {
  if (!connection) return;
  
  try {
    // Verificar si la conexión todavía existe y no está destruida
    if (connection.state.status !== VoiceConnectionStatus.Destroyed) {
      connection.destroy();
    }
  } catch (error) {
    // Ignorar errores de conexión ya destruida
    if (!error.message.includes('already been destroyed')) {
      console.error('Error destruyendo conexión:', error);
    }
  } finally {
    if (guildKey) {
      connectionStates.delete(guildKey);
    }
  }
}

function disconnectUser(member) {
  if (member?.voice?.channel) {
    member.voice.disconnect()
      .catch(err => {
        if (!err.message.includes('Target user is not connected to voice')) {
          console.error("Error desconectando usuario:", err);
        }
      });
  }
}

// Función para destruir conexión de forma segura después de un tiempo
function safeDestroyWithDelay(connection, delay = 2000, guildKey = null) {
  setTimeout(() => {
    safeDestroyConnection(connection, guildKey);
  }, delay);
}

// Obtener conexión actual del guild
function getCurrentConnection(guildId) {
  const state = connectionStates.get(guildId);
  return state && state.status === 'connected' ? state.connection : null;
}
function getVoiceChannelMembers(msg) {
  if (!msg.member?.voice?.channel) return [];
  return Array.from(msg.member.voice.channel.members.values()).filter(member => !member.user.bot);
}

module.exports = {
  getVoiceChannelMembers,
  connectToVoiceChannel,
  disconnectUser,
  safeDestroyConnection,
  safeDestroyWithDelay,
  getCurrentConnection,
  connectionStates
};
