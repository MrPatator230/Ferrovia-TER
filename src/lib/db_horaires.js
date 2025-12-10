import mysql from 'mysql2/promise';

// Pool dédié pour la base contenant les horaires
const pool = mysql.createPool({
  host: process.env.DB_HORAIRES_HOST || process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_HORAIRES_PORT || process.env.DB_PORT || '3306'),
  user: process.env.DB_HORAIRES_USER || process.env.DB_USER || 'root',
  password: process.env.DB_HORAIRES_PASSWORD || process.env.DB_PASSWORD || '',
  database: process.env.DB_HORAIRES_NAME || 'horaires',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
  charset: 'utf8mb4'
});

export default pool;

