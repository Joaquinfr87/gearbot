require('dotenv').config();
const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus
} = require('@discordjs/voice');
const path = require('path');

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

const SOUNDS = {
  drum: path.join(__dirname, 'sounds', 'drum.mp3'),
  click: path.join(__dirname, 'sounds', 'click.mp3'),
  shot: path.join(__dirname, 'sounds', 'shot.mp3')
};

const CYLINDER_SLOTS = 6;

const IMAGES = {
  click: 'https://i.imgur.com/bHpIcj1.jpeg',
  shot: 'https://i.imgur.com/Rfk4JJj.jpeg'
};

client.once('ready', () => {
  console.log(`Listo como ${client.user.tag}`);
});

const playFile = (player, filePath, volume = 1) => {
  const resource = createAudioResource(filePath, { inlineVolume: true });
  resource.volume.setVolume(volume);
  player.play(resource);
};

client.on('messageCreate', async (msg) => {
  if (msg.author.bot) return;
  if (!msg.content.toLowerCase().startsWith('!ruleta')) return;

  const args = msg.content.split(' ');
  const bullets = Math.min(Math.max(parseInt(args[1]) || 1, 1), CYLINDER_SLOTS);

  const member = msg.member;
  const voiceChannel = member?.voice?.channel;
  if (!voiceChannel) {
    msg.reply('Entra a un canal de voz primero.');
    return;
  }

  const connection = joinVoiceChannel({
    channelId: voiceChannel.id,
    guildId: voiceChannel.guild.id,
    adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    selfDeaf: false,
    selfMute: false
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 15_000);
  } catch (err) {
    console.error('No se pudo conectar al canal de voz:', err);
    msg.reply('No pude conectarme al canal de voz.');
    connection.destroy();
    return;
  }

  const player = createAudioPlayer();
  connection.subscribe(player);

  msg.reply(`Girando el tambor... 🎲 (balas: ${bullets})`);
  playFile(player, SOUNDS.drum, 0.5);

  // Elegir slots con balas
  const allSlots = Array.from({ length: CYLINDER_SLOTS }, (_, i) => i + 1);
  const bulletSlots = [];
  while (bulletSlots.length < bullets) {
    const pick = allSlots[Math.floor(Math.random() * allSlots.length)];
    if (!bulletSlots.includes(pick)) bulletSlots.push(pick);
  }

  const playerSlot = Math.floor(Math.random() * CYLINDER_SLOTS) + 1;

  setTimeout(() => {
    let soundToPlay, embed;
    let disconnectPlayer = false;

    if (bulletSlots.includes(playerSlot)) {
      // Disparo
      soundToPlay = SOUNDS.shot;
      disconnectPlayer = true; // jugador será desconectado
      embed = new EmbedBuilder()
        .setTitle('💥 ¡BOOM!')
        .setDescription(`${msg.author} ha perdido. (slot ${playerSlot})`)
        .setImage(IMAGES.shot)
        .setColor('Red');
    } else {
      // Click
      soundToPlay = SOUNDS.click;
      embed = new EmbedBuilder()
        .setTitle('✅ Clic')
        .setDescription(`${msg.author} se ha salvado. (slot ${playerSlot})`)
        .setImage(IMAGES.click)
        .setColor('Green');
    }

    msg.reply({ embeds: [embed] });
    playFile(player, soundToPlay, 0.7);

    // Esperar a que termine el audio
    player.once(AudioPlayerStatus.Idle, () => {
      // Desconectar al jugador si perdió
      if (disconnectPlayer) {
        if (member.voice.channel) {
          member.voice.disconnect().catch(err => console.error("No se pudo desconectar al jugador:", err));
        }
      }
      // Desconectar al bot del canal
      connection.destroy();
    });

  }, 700);

});

client.login(process.env.DISCORD_TOKEN);

