import jwt from 'jsonwebtoken';
import dotenv from 'dotenv'
dotenv.config();
const SECRET_KEY = process.env.SECRET_KEY 



function autenticarToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; 

  if (!token) return res.status(401).json({ error: 'Token requerido' });

  jwt.verify(token, SECRET_KEY, (err, user) => {
    if (err) return res.status(403).json({ error: 'Token inválido' });
    req.user = user;
    next();
  });
}

export default autenticarToken;