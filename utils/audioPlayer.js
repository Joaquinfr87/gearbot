const { 
  createAudioPlayer, 
  createAudioResource, 
  AudioPlayerStatus 
} = require('@discordjs/voice');
const path = require('path');

const SOUNDS = {
  drum: path.join(__dirname, '..', 'sounds', 'drum.mp3'),
  click: path.join(__dirname, '..', 'sounds', 'click.mp3'),
  shot: path.join(__dirname, '..', 'sounds', 'shot.mp3'),
  'te-salvaste': path.join(__dirname, '..', 'sounds', 'te-salvaste-animatowner.mp3')
};

// Cache de players para mayor velocidad
const playerCache = new Map();

function getAudioPlayer() {
  if (playerCache.has('default')) {
    return playerCache.get('default');
  }
  
  const player = createAudioPlayer();
  player.on('error', (error) => {
    console.error('Error en reproductor de audio:', error);
  });
  
  playerCache.set('default', player);
  return player;
}

function playSound(connection, soundName, volume = 1.0) {
  return new Promise((resolve, reject) => {
    if (!SOUNDS[soundName]) {
      reject(new Error(`Sonido no encontrado: ${soundName}`));
      return;
    }
    
    const player = getAudioPlayer();
    const resource = createAudioResource(SOUNDS[soundName], { 
      inlineVolume: true 
    });
    
    resource.volume.setVolume(volume);
    
    try {
      connection.subscribe(player);
      player.play(resource);
      
      player.once(AudioPlayerStatus.Idle, () => {
        resolve();
      });
      
      player.once('error', (error) => {
        reject(error);
      });
    } catch (error) {
      reject(error);
    }
  });
}

function destroyConnection(connection) {
  if (connection) {
    connection.destroy();
  }
  playerCache.clear(); // Limpiar cache al destruir
}

module.exports = {
  playSound,
  destroyConnection,
  getAudioPlayer,
  SOUNDS
};
