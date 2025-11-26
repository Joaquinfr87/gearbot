# 🎰 GearBot — Bot de Discord estilo Ruleta

GearBot es un bot de entretenimiento para Discord que simula una **ruleta interactiva**, pensado para pasar el rato con amigos dentro de un servidor. Permite jugar, ganar, perder, apostar y agregar emoción a las conversaciones, todo mediante comandos simples.

Creado con **Node.js**, utiliza la API de Discord para manejar mensajes, interacciones y respuestas dinámicas.

---

## ✅ Características principales

* 🎡 Ruleta virtual interactiva
* 💬 Respuestas aleatorias dinámicas
* 👥 Pensado para grupos de amigos en servidores
* ⚙️ Configurable mediante variables de entorno
* 🤖 Fácil instalación y despliegue
* 🔄 Código simple, mantenible y extensible

---

## 🛠️ Tecnologías utilizadas

* **Node.js** — entorno de ejecución
* **Discord.js** — interacción con la API de Discord
* **dotenv** — manejo de variables de entorno
* **JavaScript** — lógica principal del bot
* **npm** — gestión de dependencias

---

## 🚀 Instalación y configuración

### 1️⃣ Clonar el repositorio

```bash
git clone https://github.com/Joaquinfr87/gearbot.git
cd gearbot
```

### 2️⃣ Instalar dependencias

```bash
npm install
```

### 3️⃣ Crear archivo `.env`

Copia el archivo de ejemplo:

```bash
cp .env.example .env
```

Luego completa:

```
DISCORD_TOKEN=tu_token_del_bot
```

### 4️⃣ Iniciar el bot

```bash
npm start
```

Si utilizas nodemon:

```bash
npm run dev
```

---

## 🎮 Cómo usarlo en Discord

Una vez que el bot esté activo, escribe el comando correspondiente (ejemplo):

```
/ruleta
```

El bot realizará un giro virtual y responderá con un resultado aleatorio.

Ideal para:

* Conversaciones casuales
* Streaming o reuniones en Discord
* Juegos improvisados con amigos

---

## 🧱 Cómo extender el bot

Puedes agregar:

* Nuevas modalidades de juego
* Sistema de apuestas o puntos
* Tablas de clasificación
* Sonidos, imágenes o embeds personalizados
* Más comandos slash

La arquitectura del proyecto permite escalar sin complicaciones.

---

## 🛡️ Requisitos

* Node.js 18+ recomendado
* Cuenta de Discord Developer configurada
* Un servidor de Discord donde invitar al bot

---

## 🤝 Contribuciones

Sugerencias, mejoras, issues y PRs son bienvenidos.

Puedes contribuir:

* Documentando nuevas funciones
* Añadiendo comandos
* Mejorando la organización del código
* Optimizando respuestas o lógica

---

## 📄 Licencia

Proyecto abierto para uso personal, educativo y recreativo. Si reutilizas código, se agradece atribución.

---

## 📝 Estado del proyecto

En desarrollo intermitente, cuando se pueda se ira agregando nuevas funciones.

---

🎉 *Disfruta jugando y creando momentos divertidos en Discord con GearBot!*
