const jwt = require('jsonwebtoken');

// Middleware 1: Intercepta y valida el token JWT
const verificarToken = (req, res, next) => {
    // Busca en los headers el token
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(403).json({ error: 'No se comunicó un token de autorización' });
    }

    // Extrae desde "Bearer <token>"
    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ error: 'Formato de token malformado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_secreto_super_seguro_123');
        // Agregamos el contenido descifrado del token a req.user (contiene id_user y role)
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o ha expirado' });
    }
};

// Middleware 2: Verifica que el usuario validado tenga rol explícito de 'Administrador'
const verificarRolAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(403).json({ error: 'Acceso denegado: Primero se debe verificar el token' });
    }

    if (req.user.role !== 'Administrador') {
        return res.status(403).json({ error: 'Acceso denegado: Se requiere el rol de Administrador' });
    }

    next();
};

module.exports = {
    verificarToken,
    verificarRolAdmin
};
