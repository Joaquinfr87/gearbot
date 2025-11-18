const { connectToVoiceChannel, getCurrentConnection, safeDestroyWithDelay } = require('../utils/voiceManager');
const { playSound } = require('../utils/audioPlayer');
const { EmbedBuilder } = require('discord.js');

const CYLINDER_SLOTS = 6;
const IMAGES = {
  click: 'https://i.imgur.com/bHpIcj1.jpeg',
  shot: 'https://i.imgur.com/Rfk4JJj.jpeg'
};

const command = {
  name: 'supervivencia',
  description: 'Modo supervivencia para todos los usuarios en el canal de voz',
  usage: '!supervivencia [balas]',
  
  async execute(msg, args) {
    // Validar que el usuario esté en canal de voz
    if (!msg.member?.voice?.channel) {
      return msg.reply('🎤 Entra a un canal de voz primero.');
    }

    // Obtener todos los usuarios en el canal (excluyendo bots)
    const voiceChannel = msg.member.voice.channel;
    const participants = voiceChannel.members.filter(member => !member.user.bot);
    
    if (participants.size < 2) {
      return msg.reply('❌ Se necesitan al menos 2 usuarios en el canal de voz (excluyendo bots).');
    }

    // Obtener número de balas
    let bullets = 1;
    if (args.length >= 1 && !isNaN(args[0])) {
      bullets = Math.min(Math.max(parseInt(args[0]), 1), 6);
    }

    const loadingMsg = await msg.reply('⚡ Iniciando modo supervivencia...');

    try {
      const connection = await connectToVoiceChannel(msg);
      if (!connection) {
        return loadingMsg.edit('❌ No pude conectarme al canal de voz.');
      }

      await loadingMsg.delete().catch(() => {});
      await startSurvivalGame(msg, connection, Array.from(participants.values()), bullets);
      
    } catch (error) {
      console.error('Error en comando supervivencia:', error);
      loadingMsg.edit('❌ Ocurrió un error al ejecutar el modo supervivencia.');
    }
  }
};

function generateBulletSlots(bulletCount) {
  const allSlots = Array.from({ length: CYLINDER_SLOTS }, (_, i) => i + 1);
  const bulletSlots = [];
  const availableSlots = [...allSlots];
  
  for (let i = 0; i < bulletCount; i++) {
    const randomIndex = Math.floor(Math.random() * availableSlots.length);
    bulletSlots.push(availableSlots[randomIndex]);
    availableSlots.splice(randomIndex, 1);
  }
  
  return bulletSlots;
}

async function startSurvivalGame(msg, connection, participants, bullets) {
  let alivePlayers = [...participants];
  let round = 1;
  const bulletSlots = generateBulletSlots(bullets);

  // Embed inicial
  const startEmbed = new EmbedBuilder()
    .setTitle('🏆 Modo Supervivencia')
    .setDescription(`**Jugadores:** ${alivePlayers.map(p => p.user).join(', ')}\n**Balas por ronda:** ${bullets}/${CYLINDER_SLOTS}\n**Total de participantes:** ${alivePlayers.length}`)
    .setColor(0xFFA500)
    .setTimestamp();

  await msg.reply({ embeds: [startEmbed] });

  await playSound(connection, 'drum', 0.5).catch(console.error);

  // Ejecutar rondas hasta que quede 1 jugador o ninguno
  while (alivePlayers.length > 1) {
    const roundResult = await executeSurvivalRound(msg, connection, alivePlayers, bulletSlots, round);
    alivePlayers = roundResult.alivePlayers;
    round++;

    if (alivePlayers.length <= 1) break;

    // Nueva ronda con nuevas balas
    const newBulletSlots = generateBulletSlots(bullets);
    
    const nextRoundEmbed = new EmbedBuilder()
      .setTitle(`🔄 Ronda ${round}`)
      .setDescription(`**Jugadores restantes:** ${alivePlayers.map(p => p.user).join(', ')}\n**Balas:** ${bullets}/${CYLINDER_SLOTS}`)
      .setColor(0x00FF00)
      .setTimestamp();

    await msg.reply({ embeds: [nextRoundEmbed] });
    await playSound(connection, 'drum', 0.5).catch(console.error);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  // Anunciar ganador o empate
  if (alivePlayers.length === 1) {
    const winnerEmbed = new EmbedBuilder()
      .setTitle('🏆 ¡TENEMOS UN GANADOR!')
      .setDescription(`**${alivePlayers[0].user}** es el último en pie.\n\n¡Felicidades!`)
      .setColor(0xFFD700)
      .setTimestamp();

    await msg.reply({ embeds: [winnerEmbed] });
  } else {
    const drawEmbed = new EmbedBuilder()
      .setTitle('😵 ¡EMPATE!')
      .setDescription('Todos los jugadores han sido eliminados.\n\nNo hay ganador.')
      .setColor(0xFF0000)
      .setTimestamp();

    await msg.reply({ embeds: [drawEmbed] });
  }

  safeDestroyWithDelay(connection, 5000);
}

async function executeSurvivalRound(msg, connection, players, bulletSlots, round) {
  const alivePlayers = [...players];
  const eliminatedPlayers = [];
  let currentSlot = 1;

  const roundEmbed = new EmbedBuilder()
    .setTitle(`🎯 Ronda ${round} - Comenzando...`)
    .setDescription(`**Jugadores:** ${alivePlayers.map(p => p.user).join(', ')}\n**Balas en el tambor:** ${bulletSlots.join(', ')}`)
    .setColor(0x00FF00)
    .setTimestamp();

  await msg.reply({ embeds: [roundEmbed] });

  // Cada jugador juega en orden
  for (let i = 0; i < alivePlayers.length; i++) {
    const player = alivePlayers[i];
    const isShot = bulletSlots.includes(currentSlot);

    const turnEmbed = new EmbedBuilder()
      .setTitle(`🎯 Turno de ${player.user.username}`)
      .setDescription(`**Slot:** ${currentSlot}/${CYLINDER_SLOTS}`)
      .setColor(0x00FF00)
      .setTimestamp();

    await msg.reply({ embeds: [turnEmbed] });

    await new Promise(resolve => setTimeout(resolve, 1500));

    if (isShot) {
      // ELIMINADO
      await playSound(connection, 'shot', 0.7);
      
      const eliminatedEmbed = new EmbedBuilder()
        .setTitle('💥 ¡ELIMINADO!')
        .setDescription(`${player.user} ha sido eliminado en la ronda ${round}.`)
        .setImage(IMAGES.shot)
        .setColor(0xFF0000)
        .setTimestamp();

      await msg.reply({ embeds: [eliminatedEmbed] });

      // Desconectar al eliminado
      if (player.voice.channel) {
        player.voice.disconnect().catch(console.error);
      }

      eliminatedPlayers.push(player);
    } else {
      // SOBREVIVE
      await playSound(connection, 'click', 0.7);
      
      const surviveEmbed = new EmbedBuilder()
        .setTitle('✅ ¡Safe!')
        .setDescription(`${player.user} sobrevive esta ronda.`)
        .setImage(IMAGES.click)
        .setColor(0x00FF00)
        .setTimestamp();

      await msg.reply({ embeds: [surviveEmbed] });
    }

    currentSlot++;
    if (currentSlot > CYLINDER_SLOTS) currentSlot = 1;

    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Filtrar jugadores eliminados
  const remainingPlayers = alivePlayers.filter(player => 
    !eliminatedPlayers.includes(player)
  );

  // Resumen de la ronda
  const summaryEmbed = new EmbedBuilder()
    .setTitle(`📊 Resumen Ronda ${round}`)
    .setDescription(`**Eliminados:** ${eliminatedPlayers.length > 0 ? eliminatedPlayers.map(p => p.user).join(', ') : 'Ninguno'}\n**Restantes:** ${remainingPlayers.length}`)
    .setColor(remainingPlayers.length > 1 ? 0xFFA500 : 0xFFD700)
    .setTimestamp();

  await msg.reply({ embeds: [summaryEmbed] });

  return { alivePlayers: remainingPlayers, eliminatedPlayers };
}

// Para futura expansión con múltiples comandos
const commands = new Map();
commands.set('supervivencia', command);

function getCommand(name) {
  return commands.get(name);
}

module.exports = {
  getCommand
};
