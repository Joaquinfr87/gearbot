const { connectToVoiceChannel, getCurrentConnection } = require('../utils/voiceManager');
const { startRouletteGame } = require('../utils/gameLogic');

const command = {
  name: 'ruleta',
  description: 'Juega a la ruleta rusa con diferentes consecuencias',
  usage: '!ruleta [kick/timeout] [número de balas]',
  
  async execute(msg, args) {
    // Respuesta inmediata
    const loadingMsg = await msg.reply('⚡ Cargando ruleta...');
    
    // Validar que el usuario esté en un canal de voz
    if (!msg.member?.voice?.channel) {
      return loadingMsg.edit('🎤 Entra a un canal de voz primero.');
    }

    // Validar permisos básicos
    if (!msg.member.permissions.has('SEND_MESSAGES')) {
      return loadingMsg.edit('❌ No tienes permisos para usar este comando.');
    }

    let action = 'disconnect';
    let bullets = 1;

    // Análisis simple de argumentos
    if (args.length === 0) {
      bullets = 1;
    } else if (args.length === 1) {
      const firstArg = args[0].toLowerCase();
      if (!isNaN(firstArg)) {
        bullets = Math.min(Math.max(parseInt(firstArg), 1), 6);
      } else if (firstArg === 'kick' || firstArg === 'timeout') {
        action = firstArg;
        bullets = 1;
      }
    } else if (args.length >= 2) {
      action = args[0].toLowerCase();
      if (!isNaN(args[1])) {
        bullets = Math.min(Math.max(parseInt(args[1]), 1), 6);
      }
    }

    const botMember = msg.guild.members.me;
    
    // Validar permisos del BOT
    if (action === 'kick' && !botMember.permissions.has('KICK_MEMBERS')) {
      return loadingMsg.edit('❌ **El bot necesita permiso de "Expulsar Miembros"** para usar kick.\n\n🔧 **Solución:** Ve a Configuración del Servidor → Roles → @Bot → Activar "Expulsar Miembros"');
    }
    
    if (action === 'timeout' && !botMember.permissions.has('MODERATE_MEMBERS')) {
      return loadingMsg.edit('❌ **El bot necesita permiso de "Aislar Miembros"** para usar timeout.\n\n🔧 **Solución:** Ve a Configuración del Servidor → Roles → @Bot → Activar "Aislar Miembros"');
    }

    // Validar permisos del USUARIO
    if (action === 'kick' && !msg.member.permissions.has('KICK_MEMBERS')) {
      return loadingMsg.edit('❌ Necesitas permisos de **Expulsar Miembros** para usar kick.');
    }
    
    if (action === 'timeout' && !msg.member.permissions.has('MODERATE_MEMBERS')) {
      return loadingMsg.edit('❌ Necesitas permisos de **Aislar Miembros** para usar timeout.');
    }

    // Verificar jerarquía de roles (el bot no puede moderar a usuarios con mayor rol)
    if ((action === 'kick' || action === 'timeout') && 
        msg.member.roles.highest.position >= botMember.roles.highest.position) {
      return loadingMsg.edit('❌ No puedo moderar a usuarios con un rol igual o mayor al mío.');
    }

    try {
      // Usar conexión existente o crear nueva
      let connection = getCurrentConnection(msg.guild.id);
      if (!connection) {
        connection = await connectToVoiceChannel(msg);
      }
      
      if (!connection) {
        return loadingMsg.edit('❌ No pude conectarme al canal de voz.');
      }
      
      await loadingMsg.delete().catch(() => {});
      await startRouletteGame(msg, connection, bullets, action);
      
    } catch (error) {
      console.error('Error en comando ruleta:', error);
      loadingMsg.edit('❌ Ocurrió un error al ejecutar el comando.');
    }
  }
};

// Para futura expansión con múltiples comandos
const commands = new Map();
commands.set('ruleta', command);

function getCommand(name) {
  return commands.get(name);
}

module.exports = {
  getCommand
};
