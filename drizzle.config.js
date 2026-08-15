const { defineConfig } = require('drizzle-kit');
require('dotenv').config();

module.exports = defineConfig({
    schema: './models/schema/*.js', // Ruta modular de esquemas (ahora en la carpeta models)
    out: './drizzle',         // Carpeta donde se guardarán las migraciones generadas
    dialect: 'postgresql',    // Dialecto de la base de datos
    dbCredentials: {
        url: process.env.DATABASE_URL,
    },
});
