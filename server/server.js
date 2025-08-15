import express from 'express';
import http from 'http';
import cors from 'cors';
import { WebSocketServer, WebSocket } from 'ws';
import chatsRouter, { setWebSocketServer } from './chats.js';
import usuariosRouter from './usuarios.js';
import autenticarToken from './autenticacion.js';
import dotenv from 'dotenv'
dotenv.config();

const PORT = process.env.PORT || 3000; 

const app = express();

app.use(cors({
    origin: process.env.URLFRONTEND,
    credentials: true
}));
app.use(express.json());


app.use('/api/usuarios', usuariosRouter);
app.use('/api/chat', autenticarToken, chatsRouter);


const server = http.createServer(app);


const wss = new WebSocketServer({ server });
setWebSocketServer(wss); 



server.listen(PORT, () => {
    console.log(`Servidor con Websockets corriendo en http://localhost:${PORT}`);
});