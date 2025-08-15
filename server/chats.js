import express from 'express';
import pool from './db.js';
import WebSocket from 'ws';
const router = express.Router();

let wss;
export function setWebSocketServer(wsServer) {
  wss = wsServer;
}

const clients = new Map();

export function registerUserSocket(userId, socket) {
  if (!clients.has(userId)) {
    clients.set(userId, []);
  }
  clients.get(userId).push(socket);

  socket.on('close', () => {
    const sockets = clients.get(userId).filter(s => s !== socket);
    if (sockets.length > 0) clients.set(userId, sockets);
    else clients.delete(userId);
  });
}


router.post('/enviar', async (req, res) => {
   try {
 const { conversacion, texto } = req.body;
 const usuario = req.user.id; 

 if (!conversacion || !texto) {
 return res.status(400).json({ error: 'Faltan campos para enviar el mensaje.' });
 }

 const [conversacionExistente] = await pool.query(
 'SELECT usuario1_id, usuario2_id FROM conversaciones WHERE id = ?',
 [conversacion]
);

 if (conversacionExistente.length === 0) {
 return res.status(404).json({ error: 'Conversación no encontrada.' });
 }

 const { usuario1_id, usuario2_id } = conversacionExistente[0];
 if (usuario !== usuario1_id && usuario !== usuario2_id) {  return res.status(403).json({ error: 'No tienes permiso para enviar mensajes en esta conversación.' });
 }

 const [result] = await pool.query(
    `INSERT INTO mensajes (conversacion_id, usuario_id, texto)
      VALUES (?, ?, ?)`,
 [conversacion, usuario, texto]
 );

 const mensajeId = result.insertId;

 
 const [autor] = await pool.query('SELECT user FROM usuarios WHERE id = ?', [usuario]);
const autor_mensaje = autor.length > 0 ? autor[0].user : 'Desconocido';



 const nuevoMensaje = {
 id: mensajeId,
 conversacion_id: conversacion,
 usuario_id: usuario,
 texto,
 fecha_mensaje: new Date(), 
 autor_mensaje: autor_mensaje, 
 };


 const destinatarios = [usuario1_id, usuario2_id];

 destinatarios.forEach(userId => {
 const sockets = clients.get(userId);
 if (sockets) {
 sockets.forEach(socket => {
 if (socket.readyState === WebSocket.OPEN) {
 socket.send(JSON.stringify({ tipo: 'mensajeNuevo', data: nuevoMensaje }));
 }
 });
 }
});


  res.status(201).json(nuevoMensaje);
 } catch (err) {
 console.error('❌ Error al enviar mensaje:', err);
 res.status(500).json({ error: 'Error al enviar mensaje' });
 }
});

router.post('/crear-conversacion', async (req, res) => {
  try {
    const { usuario2_id } = req.body;
    const usuario1_id = req.user.id;

    if (usuario1_id === usuario2_id) {
        return res.status(400).json({ error: 'No puedes crear una conversación contigo mismo.' });
    }

    const [conversacionExistente] = await pool.query(
      `SELECT id FROM conversaciones 
       WHERE (usuario1_id = ? AND usuario2_id = ?) OR (usuario1_id = ? AND usuario2_id = ?)`,
      [usuario1_id, usuario2_id, usuario2_id, usuario1_id]
    );

    if (conversacionExistente.length > 0) {
      return res.status(409).json({ conversacion_id: conversacionExistente[0].id, mensaje: 'Ya existe una conversación con este usuario.' });
    }

    const [result] = await pool.query(
      'INSERT INTO conversaciones (usuario1_id, usuario2_id) VALUES (?, ?)',
      [usuario1_id, usuario2_id]
    );
    res.status(201).json({ conversacion_id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear conversación' });
  }
});



router.get('/mensajes', async (req, res) => {
  try {
    const [mensajes] = await pool.query(`
      SELECT 
        m.usuario_id,
        u.user AS autor_mensaje,
        m.conversacion_id,
        m.texto,
        m.fecha_mensaje
      FROM mensajes m
      JOIN usuarios u ON m.usuario_id = u.id
      ORDER BY m.fecha_mensaje DESC;
    `);

    res.status(200).json(mensajes);
  } catch (err) {
    console.error('❌ Error al obtener los mensajes:', err);
    res.status(500).json({ error: 'Error al obtener los mensajes' });
  }
});


router.get('/conversaciones', async (req, res) => {
  try {
    const userId = req.user.id;
    const [conversaciones] = await pool.query(
      `SELECT 
        id, 
        usuario1_id, 
        usuario2_id,
        (SELECT user FROM usuarios WHERE id = IF(usuario1_id = ?, usuario2_id, usuario1_id)) AS nombre_contacto
      FROM conversaciones WHERE usuario1_id = ? OR usuario2_id = ?`,
      [userId, userId, userId]
    );
    res.status(200).json(conversaciones);
  } catch (err) {
    console.error('❌ Error al obtener las conversaciones:', err);
    res.status(500).json({ error: 'Error al obtener las conversaciones' });
  }
});


router.get('/mensajes/:id', async (req, res) => {
 try {
const conversacionId = req.params.id;
 const userId = req.user.id;

 const { offset = 0 } = req.query; 
 const limit = 50; 

 const [conversacionExistente] = await pool.query(
 'SELECT id FROM conversaciones WHERE id = ? AND (usuario1_id = ? OR usuario2_id = ?)',
 [conversacionId, userId, userId]
 );

 if (conversacionExistente.length === 0) 
  { 
   return res.status(403).json({ error: 'No tienes acceso a esta conversación.' });
 }


 const [mensajes] = await pool.query(
   `SELECT m.*, u.user AS autor_mensaje
  FROM mensajes m
  JOIN usuarios u ON m.usuario_id = u.id
  WHERE m.conversacion_id = ?
  ORDER BY m.fecha_mensaje DESC
  LIMIT ? OFFSET ?`,
 [conversacionId, limit, parseInt(offset)]
 );

 res.status(200).json(mensajes);
  } catch (err) {
 console.error('❌ Error al obtener los mensajes de la conversación:', err);
 res.status(500).json({ error: 'Error al obtener los mensajes de la conversación' });
}
});

export default router;
