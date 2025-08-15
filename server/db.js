import mysql from 'mysql2/promise';
import dotenv from 'dotenv';
dotenv.config();

const db = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
 port: process.env.DB_PORT,
});

(async () => {
  try {
    const connection = await db.getConnection();
    console.log('✅ Conexión a la base de datos establecida correctamente');
    connection.release(); 
  } catch (err) {
    console.error('❌ Error al conectar con la base de datos:', err.message);
  }
})();

export default db;