const { drizzle } = require('drizzle-orm/node-postgres');
const { Pool } = require('pg');
require('dotenv').config();

// Creamos un Pool de conexiones con pg
const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});

// Importamos nuestros esquemas desde models
const schema = require('../models/schema');

// Inicializamos la instancia de Drizzle ORM
const db = drizzle(pool, { schema });

module.exports = db;
