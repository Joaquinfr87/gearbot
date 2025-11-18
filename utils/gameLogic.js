const { playSound } = require('./audioPlayer');
const { disconnectUser, safeDestroyWithDelay, getCurrentConnection } = require('./voiceManager');
const { EmbedBuilder } = require('discord.js');

const CYLINDER_SLOTS = 6;

// Usando tus imágenes de Imgur
const IMAGES = {
  click: 'https://i.imgur.com/bHpIcj1.jpeg',
  shot: 'https://i.imgur.com/Rfk4JJj.jpeg'
};

// Cache para mayor velocidad y bloqueo de juegos simultáneos
const gameCache = new Map();
const activeGames = new Map();

function generateBulletSlots(bulletCount) {
  const cacheKey = `bullets_${bulletCount}_${Date.now()}`;
  if (gameCache.has(cacheKey)) {
    return [...gameCache.get(cacheKey)];
  }
  
  const allSlots = Array.from({ length: CYLINDER_SLOTS }, (_, i) => i + 1);
  const bulletSlots = [];
  
  const availableSlots = [...allSlots];
  for (let i = 0; i < bulletCount; i++) {
    const randomIndex = Math.floor(Math.random() * availableSlots.length);
    bulletSlots.push(availableSlots[randomIndex]);
    availableSlots.splice(randomIndex, 1);
  }
  
  gameCache.set(cacheKey, bulletSlots);
  setTimeout(() => gameCache.delete(cacheKey), 10000);
  
  return bulletSlots;
}

function determineOutcome(bulletSlots) {
  const playerSlot = Math.floor(Math.random() * CYLINDER_SLOTS) + 1;
  const isShot = bulletSlots.includes(playerSlot);
  
  return {
    slot: playerSlot,
    isShot,
    bulletSlots
  };
}

async function executeModerationAction(msg, action) {
  const targetMember = msg.member;
  
  try {
    switch (action) {
      case 'kick':
        await targetMember.kick('💥 Perdiste en la ruleta rusa');
        return '🦵 **Expulsado** del servidor';
        
      case 'timeout':
        // Timeout fijo de 2 días (en milisegundos)
        const timeoutDuration = 2 * 24 * 60 * 60 * 1000;
        await targetMember.timeout(timeoutDuration, '💥 Perdiste en la ruleta rusa');
        return '⏰ **Aislado temporalmente** por 2 días';
        
      case 'disconnect':
      default:
        disconnectUser(targetMember);
        return '🔇 **Desconectado** del canal de voz';
    }
  } catch (error) {
    console.error(`Error ejecutando acción ${action}:`, error);
    throw new Error(`No pude ejecutar la acción ${action}`);
  }
}

function getActionDescription(action) {
  const actions = {
    kick: '🦵 **Expulsión** del servidor',
    timeout: '⏰ **Aislamiento** por 2 días',
    disconnect: '🔇 **Desconexión** de voz'
  };
  return actions[action] || actions.disconnect;
}

async function startRouletteGame(msg, connection, bullets, action = 'disconnect') {
  const userId = msg.author.id;
  const guildKey = msg.guild.id;
  
  // Prevenir múltiples juegos simultáneos del mismo usuario
  if (activeGames.has(userId)) {
    msg.reply('⏳ Ya tienes un juego en curso. Espera a que termine.');
    return;
  }
  
  // Prevenir múltiples juegos simultáneos en el mismo guild
  if (activeGames.has(guildKey) && activeGames.get(guildKey) !== userId) {
    msg.reply('⏳ Ya hay un juego en curso en este servidor. Espera a que termine.');
    return;
  }
  
  activeGames.set(userId, true);
  activeGames.set(guildKey, userId);
  
  const bulletSlots = generateBulletSlots(bullets);
  const actionDescription = getActionDescription(action);

  try {
    // Embed inicial rápido
    const startEmbed = new EmbedBuilder()
      .setTitle('🎲 Ruleta Rusa')
      .setDescription(`**Jugador:** ${msg.author}\n**Balas:** ${bullets}/${CYLINDER_SLOTS}\n**Consecuencia:** ${actionDescription}`)
      .setColor(0xFFA500)
      .setTimestamp();

    await msg.reply({ embeds: [startEmbed] });

    // Sonido del tambor
    await playSound(connection, 'drum', 0.5).catch(console.error);

    // Esperar y determinar resultado
    setTimeout(async () => {
      try {
        const outcome = determineOutcome(bulletSlots);
        await handleGameOutcome(msg, connection, outcome, action, guildKey);
      } catch (error) {
        console.error('Error en el juego:', error);
        msg.reply('❌ Ocurrió un error durante el juego.');
      } finally {
        // Limpiar bloqueos después de un tiempo
        setTimeout(() => {
          activeGames.delete(userId);
          if (activeGames.get(guildKey) === userId) {
            activeGames.delete(guildKey);
          }
        }, 5000);
      }
    }, 300);
    
  } catch (error) {
    // Limpiar bloqueos en caso de error
    activeGames.delete(userId);
    activeGames.delete(guildKey);
    throw error;
  }
}

async function handleGameOutcome(msg, connection, outcome, action = 'disconnect', guildKey = null) {
  const { slot, isShot, bulletSlots } = outcome;
  
  let embed, sound;
  let moderationAction = null;

  // Crear embed inmediatamente
  if (isShot) {
    embed = new EmbedBuilder()
      .setTitle('💥 ¡BOOM!')
      .setDescription(`${msg.author} ha perdido. (Slot ${slot})\n\n⏳ **Procesando acción...**`)
      .addFields({ 
        name: '🔫 Balas en el tambor', 
        value: `Posiciones: ${bulletSlots.join(', ')}` 
      })
      .setImage(IMAGES.shot)
      .setColor(0xFF0000)
      .setTimestamp();
    
    sound = 'shot';
    moderationAction = action;
    
  } else {
    embed = new EmbedBuilder()
      .setTitle('✅ ¡Safe!')
      .setDescription(`${msg.author} se ha salvado. (Slot ${slot})\n\nNo pasa nada... esta vez.`)
      .addFields({ 
        name: '🔫 Balas en el tambor', 
        value: `Posiciones: ${bulletSlots.join(', ')}` 
      })
      .setImage(IMAGES.click)
      .setColor(0x00FF00)
      .setTimestamp();
    
    sound = 'click';
  }

  // Enviar resultado inmediatamente
  const resultMessage = await msg.reply({ embeds: [embed] });

  // Reproducir sonido primero
  try {
    await playSound(connection, sound, 0.7);
    
    // Si fue un disparo, ejecutar la acción de moderación DESPUÉS del sonido
    if (isShot && moderationAction) {
      try {
        const moderationResult = await executeModerationAction(msg, moderationAction);
        
        // Actualizar el embed con el resultado real
        const updatedEmbed = EmbedBuilder.from(embed)
          .setDescription(`${msg.author} ha perdido. (Slot ${slot})\n\n${moderationResult}`);
        
        await resultMessage.edit({ embeds: [updatedEmbed] });
        
      } catch (modError) {
        // Si falla la acción de moderación, actualizar el embed con el error
        const errorEmbed = EmbedBuilder.from(embed)
          .setDescription(`${msg.author} ha perdido. (Slot ${slot})\n\n❌ Error: ${modError.message}`)
          .setColor(0xFFA500);
        
        await resultMessage.edit({ embeds: [errorEmbed] });
      }
    }
  } catch (audioError) {
    console.error('Error reproduciendo audio:', audioError);
  } finally {
    // Solo destruir la conexión si no es un kick/timeout exitoso
    if (!isShot || action === 'disconnect') {
      safeDestroyWithDelay(connection, 1000, guildKey);
    }
  }

  return { isShot, slot, actionExecuted: isShot };
}

module.exports = {
  startRouletteGame,
  handleGameOutcome,
  generateBulletSlots,
  determineOutcome,
  CYLINDER_SLOTS
};
