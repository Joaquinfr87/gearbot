const { getCommand: getRuletaCommand } = require('../comands/ruleta');
const { getCommand: getDueloCommand } = require('../comands/duelo');
const { getCommand: getSupervivenciaCommand } = require('../comands/supervivencia');

// Mapa de comandos disponibles
const commands = new Map();

function loadCommands() {
  // Cargar comando ruleta
  const ruletaCommand = getRuletaCommand('ruleta');
  if (ruletaCommand) {
    commands.set('ruleta', ruletaCommand);
    console.log('✅ Comando cargado: ruleta');
  }

  // Cargar comando duelo
  const dueloCommand = getDueloCommand('duelo');
  if (dueloCommand) {
    commands.set('duelo', dueloCommand);
    console.log('✅ Comando cargado: duelo');
  }

  // Cargar comando supervivencia
  const supervivenciaCommand = getSupervivenciaCommand('supervivencia');
  if (supervivenciaCommand) {
    commands.set('supervivencia', supervivenciaCommand);
    console.log('✅ Comando cargado: supervivencia');
  }

  console.log(`📋 Total de comandos cargados: ${commands.size}`);
}

// Cargar comandos al iniciar
loadCommands();

module.exports = {
  name: 'messageCreate',
  execute(msg) {
    // Ignorar mensajes de bots
    if (msg.author.bot) return;
    
    // Verificar si el mensaje es un comando
    if (!msg.content.toLowerCase().startsWith('!')) return;
    
    const args = msg.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    
    const command = commands.get(commandName);
    if (!command) return;
    
    try {
      command.execute(msg, args);
    } catch (error) {
      console.error(`Error ejecutando comando ${commandName}:`, error);
      msg.reply('❌ Ocurrió un error al ejecutar el comando.').catch(() => {});
    }
  }
};
