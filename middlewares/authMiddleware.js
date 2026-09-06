const jwt = require('jsonwebtoken');
const db = require('../db');
const { roles, schools, userProfiles } = require('../models/schema');
const { eq, inArray } = require('drizzle-orm');

// ─────────────────────────────────────────────────────────────
// Constantes para identificar roles por nombre (en minúsculas)
// ─────────────────────────────────────────────────────────────
const SUPER_ADMIN_ROLES = ['admin', 'administrador', 'super admin', 'super administrador'];
const ZONAL_ADMIN_ROLES = ['admin zonal', 'administrador zonal'];

// ─────────────────────────────────────────────────────────────
// Middleware 1: Intercepta y valida el token JWT
// ─────────────────────────────────────────────────────────────
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
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ error: 'Token inválido o ha expirado' });
    }
};

// ─────────────────────────────────────────────────────────────
// Middleware 2: Verifica rol de Admin o Super Admin (legacy)
// ─────────────────────────────────────────────────────────────
const verificarRolAdmin = (req, res, next) => {
    if (!req.user) {
        return res.status(403).json({ error: 'Acceso denegado: Primero se debe verificar el token' });
    }

    const { role } = req.user;
    const lowerRole = role ? role.toLowerCase() : '';

    const puedeAcceder = [...SUPER_ADMIN_ROLES, ...ZONAL_ADMIN_ROLES].includes(lowerRole);
    if (!puedeAcceder) {
        return res.status(403).json({ error: 'Acceso denegado: Se requiere el rol de Administrador o Admin Zonal' });
    }

    next();
};

// ─────────────────────────────────────────────────────────────
// Middleware 3: checkRole paramétrico
// - Super Admin: acceso universal
// - Admin Zonal: acceso universal a nivel de rol (el filtro de zona lo maneja checkZona)
// - Otros roles: solo si están en allowedRoles
// ─────────────────────────────────────────────────────────────
const checkRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.id_role) {
                return res.status(403).json({ error: 'Acceso denegado: El token no contiene id_role' });
            }

            const userRoleQuery = await db.select()
                .from(roles)
                .where(eq(roles.id_role, req.user.id_role));

            if (userRoleQuery.length === 0) {
                return res.status(403).json({ error: 'El id_role referenciado no existe en la base de datos' });
            }

            const dbRoleName = userRoleQuery[0].name.toLowerCase();

            // Super Admin y Admin Zonal siempre pasan el checkRole (el filtro de zona es checkZona)
            if (SUPER_ADMIN_ROLES.includes(dbRoleName) || ZONAL_ADMIN_ROLES.includes(dbRoleName)) {
                req.user.resolvedRole = dbRoleName;
                return next();
            }

            const roleMappings = {
                'operator': 'operador',
                'director': 'director'
            };

            let isAllowed = false;
            for (const role of allowedRoles) {
                const allowed = role.toLowerCase();
                const translatedAllowed = roleMappings[allowed] || allowed;
                if (dbRoleName === allowed || dbRoleName === translatedAllowed) {
                    isAllowed = true;
                    break;
                }
            }

            if (isAllowed) {
                req.user.resolvedRole = dbRoleName;
                return next();
            }

            return res.status(403).json({ error: `Acceso restringido: Se requiere permisos de ${allowedRoles.join(' o ')}` });
        } catch (error) {
            console.error('Error validando permisos en checkRole:', error);
            res.status(500).json({ error: 'Error interno del servidor validando credenciales' });
        }
    };
};

// ─────────────────────────────────────────────────────────────
// Middleware 4 (NUEVO): checkZona
//
// Adjunta a req.zonaFilter el id_zone del Admin Zonal, o null si es Super Admin.
// Los controllers usan req.zonaFilter para saber si deben filtrar.
//
// - Super Admin → req.zonaFilter = null (sin restricción)
// - Admin Zonal → req.zonaFilter = id_zone del token
// - Otros roles → req.zonaFilter = null (sus propias restricciones son por id_school)
// ─────────────────────────────────────────────────────────────
const checkZona = async (req, res, next) => {
    try {
        if (!req.user) {
            return res.status(403).json({ error: 'Acceso denegado: debe verificar el token primero' });
        }

        const roleName = (req.user.role || '').toLowerCase();

        if (SUPER_ADMIN_ROLES.includes(roleName)) {
            // Super Admin: sin restricción de zona
            req.zonaFilter = null;
            return next();
        }

        if (ZONAL_ADMIN_ROLES.includes(roleName)) {
            const idZone = req.user.id_zone;
            if (!idZone) {
                return res.status(403).json({
                    error: 'Admin Zonal sin zona asignada. Contacte al Super Admin para asignar su zona.'
                });
            }
            req.zonaFilter = idZone;
            return next();
        }

        // Cualquier otro rol (operador, director, etc.) no tiene restricción adicional aquí
        req.zonaFilter = null;
        return next();

    } catch (error) {
        console.error('Error en checkZona:', error);
        res.status(500).json({ error: 'Error interno del servidor en checkZona' });
    }
};

module.exports = {
    verificarToken,
    verificarRolAdmin,
    checkRole,
    checkZona
};
