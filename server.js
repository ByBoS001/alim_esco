const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();

// Definimos el puerto
const PORT = process.env.PORT || 3000;

// Configuración de Middlewares básicos
app.use(cors()); // Permite peticiones de otros dominios (Cross-Origin Resource Sharing)
app.use(express.json()); // Permite analizar los cuerpos de las solicitudes entrantes con formato JSON

// Montaje unificado de rutas con router index principal
const apiRoutes = require('./routes/index');
app.use('/api', apiRoutes);

// Ruta base de prueba
app.get('/', (req, res) => {
    res.json({
        status: 'success',
        message: '¡Servidor Node.js con Express funcionando correctamente!'
    });
});

// Iniciar el servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor ejecutándose en http://localhost:${PORT}`);
});
