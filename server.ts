import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { moderateText } from './src/moderation.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export interface ChatMessage {
  id: string;
  uid: string;
  username: string;
  text: string;
  timestamp: number;
}

// Historial en memoria de mensajes globales (servidor backend)
const inMemoryMessages: ChatMessage[] = [
  {
    id: 'system_welcome_1',
    uid: 'system',
    username: '👑 Moderación Oficial',
    text: '¡Bienvenidos al Chat Global de Golpea a Omar! Respeta a los demás jugadores y diviértete.',
    timestamp: Date.now() - 3600000,
  },
  {
    id: 'system_welcome_2',
    uid: 'system',
    username: '🥊 Arbitro Ragdoll',
    text: 'Recuerda que el filtro de moderación prohíbe groserías, lenguaje explícito o insultos.',
    timestamp: Date.now() - 1800000,
  }
];

async function startServer() {
  const app = express();
  const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

  app.use(express.json());

  // Endpoint de moderación estricta en el Backend
  app.post('/api/chat/moderate', (req, res) => {
    const { text } = req.body || {};
    const result = moderateText(text);
    if (!result.allowed) {
      return res.status(400).json(result);
    }
    return res.json(result);
  });

  // Endpoint de obtención de mensajes recientes
  app.get('/api/chat/messages', (req, res) => {
    return res.json({
      messages: inMemoryMessages.slice(-50),
    });
  });

  // Endpoint de envío de mensajes moderados en el Backend
  app.post('/api/chat/send', (req, res) => {
    const { text, username, uid } = req.body || {};

    if (!username || !uid) {
      return res.status(401).json({
        allowed: false,
        reason: 'Debes estar registrado e iniciar sesión para enviar mensajes en el chat global.',
      });
    }

    const modResult = moderateText(text);
    if (!modResult.allowed) {
      return res.status(400).json({
        allowed: false,
        reason: modResult.reason || 'Mensaje bloqueado por el filtro estricto de moderación.',
        flaggedCategory: modResult.flaggedCategory,
        matchedWord: modResult.matchedWord,
      });
    }

    const cleanUsername = String(username).trim().substring(0, 30);
    const cleanText = String(text).trim().substring(0, 250);

    const newMsg: ChatMessage = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8),
      uid: String(uid),
      username: cleanUsername,
      text: cleanText,
      timestamp: Date.now(),
    };

    inMemoryMessages.push(newMsg);
    if (inMemoryMessages.length > 100) {
      inMemoryMessages.shift();
    }

    return res.json({
      allowed: true,
      message: newMsg,
    });
  });

  // Servir frontend según entorno
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor Golpea a Omar iniciado en http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Error al iniciar el servidor:', err);
  process.exit(1);
});
