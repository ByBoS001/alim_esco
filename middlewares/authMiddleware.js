const jwt = require('jsonwebtoken');
const db = require('../db');
const { roles } = require('../models/schema');
const { eq } = require('drizzle-orm');

// Middleware 1: Intercepta y valida el token JWT
const verificarToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader) {
        return res.status(403).json({ error: 'No se comunicó un token de autorización' });
    }

    const token = authHeader.split(' ')[1];

    if (!token) {
        return res.status(403).json({ error: 'Formato de token malformado' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'mi_secreto_super_seguro_123');
        // Agregamos el contenido descifrado del token a req.user
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o ha expirado' });
    }
};

// Middleware 2: Verifica que el usuario validado tenga rol explícito superior
const verificarRolAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(403).json({ error: 'Acceso denegado: Primero se debe verificar el token' });
    }

    const { role } = req.user;
    const lowerRole = role ? role.toLowerCase() : '';

    if (!['admin', 'administrador', 'super admin', 'super administrador'].includes(lowerRole)) {
        return res.status(403).json({ error: 'Acceso denegado: Se requiere el rol de Administrador o Super Admin' });
    }

    next();
};

// Nuevo Middleware: checkRole paramétrico (El Administrador tiene acceso universal)
const checkRole = (allowedRole) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id_role) {
                return res.status(403).json({ error: 'Acceso denegado: El token no contiene id_role' });
            }

            // Consultar el nombre del rol usando el id_role
            const userRoleQuery = await db.select()
                .from(roles)
                .where(eq(roles.id_role, req.user.id_role));

            if (userRoleQuery.length === 0) {
                return res.status(403).json({ error: 'El id_role referenciado no existe en la base de datos' });
            }

            const dbRoleName = userRoleQuery[0].name.toLowerCase();
            const allowed = allowedRole.toLowerCase();

            // Mapeo de roles para evitar colisiones entre inglés y español
            const roleMappings = {
                'operator': 'operador',
                'director': 'director'
            };

            const translatedAllowed = roleMappings[allowed] || allowed;

            // El administrador siempre aprueba, sin importar qué rol se haya solicitado
            const superRoles = ['admin', 'administrador', 'super admin', 'super administrador'];
            if (superRoles.includes(dbRoleName) || dbRoleName === allowed || dbRoleName === translatedAllowed) {
                return next();
            }

            return res.status(403).json({ error: `Acceso restringido: Se requiere permisos de ${allowedRole}` });
        } catch (error) {
            console.error('Error validando permisos en checkRole:', error);
            res.status(500).json({ error: 'Error interno del servidor validando credenciales' });
        }
    };
};

module.exports = {
    verificarToken,
    verificarRolAdmin,
    checkRole
};
