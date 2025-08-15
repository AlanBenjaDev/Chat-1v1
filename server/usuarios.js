import express from 'express';
import bcrypt from 'bcrypt';
import db from './db.js';
import rateLimit from 'express-rate-limit';
import { body, validationResult } from 'express-validator';
import jwt from 'jsonwebtoken';
import autenticarToken from './autenticacion.js';
import dotenv from 'dotenv';


const SECRET_KEY = process.env.SECRET_KEY 

const router = express.Router();
const saltRounds = 10;


const formLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: { error: 'Demasiados intentos, intenta más tarde' }
});


router.post(
  '/register',
  formLimiter,
  [
    body('user').isLength({ min: 3 }).withMessage('Usuario es obligatorio'),
    body('email').isEmail().withMessage('El Email debe ser válido'),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener mínimo 8 caracteres')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }

    try {
      const { user, email, password } = req.body;
      const hash = await bcrypt.hash(password, saltRounds);

      await db.query(
        'INSERT INTO usuarios (user, email, password) VALUES (?, ?, ?)',
        [user, email, hash]
      );

      res.status(201).json({ message: 'Usuario registrado con éxito' });
    } catch (err) {
      console.error('❌ Error en registro:', err);
      if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({ error: 'El usuario o email ya existe' });
      }
      res.status(500).json({ error: 'Error del servidor' });
    }
  }
);


router.post(
  '/login',
  formLimiter,
  [
    body('user').isLength({ min: 3 }).withMessage('Usuario es obligatorio'),
    body('password').isLength({ min: 8 }).withMessage('La contraseña debe tener mínimo 8 caracteres')
  ],
  async (req, res) => {
    const errors = validationResult(req); 
    if (!errors.isEmpty()) {
      return res.status(400).json({ error: errors.array() });
    }

    try {
      const { user, password } = req.body;
      const [results] = await db.query(
        'SELECT id, user, email, password FROM usuarios WHERE user = ? LIMIT 1',
        [user]
      );

      if (!results || results.length === 0) {
        return res.status(401).json({ error: 'Usuario no encontrado' });
      }

      const userData = results[0];
      const isMatch = await bcrypt.compare(password, userData.password);

      if (!isMatch) {
        return res.status(401).json({ error: 'Contraseña incorrecta' });
      }

      const payload = { id: userData.id, username: userData.user };
      const token = jwt.sign(payload, SECRET_KEY, {
        expiresIn: '1h',
        issuer: 'mi-app'
      });

      const { password: _, ...userSinPass } = userData;
      res.status(200).json({
        message: 'Login exitoso',
        user: { id: userData.id, username: userData.user },
        token
      });
    } catch (err) {
      console.error('❌ Error en login:', err);
      res.status(500).json({ error: 'Error del servidor' });
    }
  }
);

router.get('/perfil', autenticarToken, async (req, res) => {
  try {
const [result] = await db.query(
  'SELECT id, user FROM usuarios WHERE id = ?',
  [req.user.id]
);
res.json({ usuario: result[0] });
} catch (err) {
res.status(500).json({ error: 'Error al obtener perfil' });
}
});

export default router;