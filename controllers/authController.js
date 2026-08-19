const db = require('../db');
const { userCredentials, userProfiles, roles } = require('../models/schema');
const { eq } = require('drizzle-orm');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const login = async (req, res) => {
    try {
        // Prevenir error si no envia Content-Type: application/json
        const body = req.body || {};
        const { email, password } = body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y password son requeridos' });
        }

        // Hacer JOIN userCredentials + userProfiles + roles
        const result = await db.select({
            id_profile: userProfiles.id_profile,
            cedula: userProfiles.cedula,
            name: userProfiles.name,
            last_name: userProfiles.last_name,
            phone: userProfiles.phone,
            id_school: userProfiles.id_school,
            email: userCredentials.email,
            password: userCredentials.password_hash,
            roleName: roles.name
        }).from(userCredentials)
            .innerJoin(userProfiles, eq(userCredentials.id_credential, userProfiles.id_credential))
            .innerJoin(roles, eq(userProfiles.id_role, roles.id_role))
            .where(eq(userCredentials.email, email));

        if (result.length === 0) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        const user = result[0];

        // Validar contraseña cifrada
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
            return res.status(401).json({ error: 'Credenciales inválidas' });
        }

        // JWT con id_profile
        const tokenPayload = {
            id_profile: user.id_profile,
            cedula: user.cedula,
            email: user.email,
            phone: user.phone,
            role: user.roleName,
            id_school: user.id_school
        };

        const token = jwt.sign(
            tokenPayload,
            process.env.JWT_SECRET,
            { expiresIn: '8h' }
        );

        res.status(200).json({
            message: 'Autenticación exitosa',
            token,
            user: {
                id_profile: user.id_profile,
                name: user.name,
                last_name: user.last_name,
                role: user.roleName,
                id_school: user.id_school
            }
        });

    } catch (error) {
        console.error('Error en el endpoint de login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { login };
