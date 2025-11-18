const { connectToVoiceChannel, getCurrentConnection, safeDestroyWithDelay } = require('../utils/voiceManager');
const { playSound } = require('../utils/audioPlayer');
const { EmbedBuilder } = require('discord.js');

const CYLINDER_SLOTS = 6;
const IMAGES = {
  click: 'https://i.imgur.com/bHpIcj1.jpeg',
  shot: 'https://i.imgur.com/Rfk4JJj.jpeg'
};

const command = {
  name: 'duelo',
  description: 'Retar a otro usuario a un duelo de ruleta rusa',
  usage: '!duelo @usuario [balas]',
  
  async execute(msg, args) {
    // Validar mención de usuario
    const mentionedUser = msg.mentions.users.first();
    if (!mentionedUser) {
      return msg.reply('❌ Debes mencionar a un usuario para retarlo. Ejemplo: `!duelo @usuario 2`');
    }

    // No puedes retarte a ti mismo
    if (mentionedUser.id === msg.author.id) {
      return msg.reply('❌ No puedes retarte a ti mismo.');
    }

    // Validar que ambos estén en canal de voz
    const targetMember = msg.guild.members.cache.get(mentionedUser.id);
    if (!msg.member?.voice?.channel || !targetMember?.voice?.channel) {
      return msg.reply('❌ Ambos deben estar en un canal de voz.');
    }

    if (msg.member.voice.channel.id !== targetMember.voice.channel.id) {
      return msg.reply('❌ Ambos deben estar en el mismo canal de voz.');
    }

    // Obtener número de balas
    let bullets = 1;
    if (args.length >= 2 && !isNaN(args[1])) {
      bullets = Math.min(Math.max(parseInt(args[1]), 1), 6);
    }

    const loadingMsg = await msg.reply('⚡ Preparando duelo...');

    try {
      const connection = await connectToVoiceChannel(msg);
      if (!connection) {
        return loadingMsg.edit('❌ No pude conectarme al canal de voz.');
      }

      await loadingMsg.delete().catch(() => {});
      await startDuelGame(msg, connection, mentionedUser, bullets);
      
    } catch (error) {
      console.error('Error en comando duelo:', error);
      loadingMsg.edit('❌ Ocurrió un error al ejecutar el duelo.');
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

async function startDuelGame(msg, connection, opponent, bullets) {
  const bulletSlots = generateBulletSlots(bullets);
  const players = [
    { member: msg.member, user: msg.author },
    { member: msg.guild.members.cache.get(opponent.id), user: opponent }
  ];

  // Embed inicial del duelo
  const startEmbed = new EmbedBuilder()
    .setTitle('⚔️ Duelo de Ruleta Rusa')
    .setDescription(`**Retador:** ${msg.author}\n**Retado:** ${opponent}\n**Balas:** ${bullets}/${CYLINDER_SLOTS}`)
    .setColor(0xFFA500)
    .setTimestamp();

  await msg.reply({ embeds: [startEmbed] });

  // Sonido del tambor
  await playSound(connection, 'drum', 0.5).catch(console.error);

  // Iniciar duelo después de un breve delay
  setTimeout(async () => {
    await executeDuel(msg, connection, players, bulletSlots);
  }, 700);
}

async function executeDuel(msg, connection, players, bulletSlots) {
  let currentPlayerIndex = 0;
  let currentSlot = 1;
  let duelEnded = false;

  while (!duelEnded) {
    const currentPlayer = players[currentPlayerIndex];
    const isShot = bulletSlots.includes(currentSlot);

    // Crear embed del turno
    const turnEmbed = new EmbedBuilder()
      .setTitle(`🎯 Turno de ${currentPlayer.user.username}`)
      .setDescription(`**Slot:** ${currentSlot}/${CYLINDER_SLOTS}\n**Balas en el tambor:** ${bulletSlots.join(', ')}`)
      .setColor(0x00FF00)
      .setTimestamp();

    await msg.reply({ embeds: [turnEmbed] });

    // Breve pausa para suspense
    await new Promise(resolve => setTimeout(resolve, 1500));

    if (isShot) {
      // JUGADOR PERDIÓ
      await playSound(connection, 'shot', 0.7);
      
      const loseEmbed = new EmbedBuilder()
        .setTitle('💥 ¡DISPARO!')
        .setDescription(`${currentPlayer.user} ha perdido el duelo.\n\n**${players[1 - currentPlayerIndex].user} es el ganador!**`)
        .setImage(IMAGES.shot)
        .setColor(0xFF0000)
        .setTimestamp();

      await msg.reply({ embeds: [loseEmbed] });

      // Desconectar al perdedor
      if (currentPlayer.member.voice.channel) {
        currentPlayer.member.voice.disconnect().catch(console.error);
      }

      duelEnded = true;
    } else {
      // JUGADOR SE SALVÓ
      await playSound(connection, 'click', 0.7);
      
      const safeEmbed = new EmbedBuilder()
        .setTitle('✅ ¡Safe!')
        .setDescription(`${currentPlayer.user} se ha salvado.`)
        .setImage(IMAGES.click)
        .setColor(0x00FF00)
        .setTimestamp();

      await msg.reply({ embeds: [safeEmbed] });

      // Pasar al siguiente jugador
      currentPlayerIndex = 1 - currentPlayerIndex;
      currentSlot++;
      
      // Si hemos pasado por todos los slots sin disparar, reiniciar
      if (currentSlot > CYLINDER_SLOTS) {
        currentSlot = 1;
        await msg.reply('🔄 **El tambor se reinicia...**');
        await playSound(connection, 'drum', 0.3).catch(console.error);
      }
    }

    // Pequeña pausa entre turnos
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Desconectar al bot después del duelo
  safeDestroyWithDelay(connection, 3000);
}

// Para futura expansión con múltiples comandos
const commands = new Map();
commands.set('duelo', command);

function getCommand(name) {
  return commands.get(name);
}

module.exports = {
  getCommand
};
