const db = require('../db');
const { userCredentials, userProfiles, roles, schools } = require('../models/schema');
const { eq } = require('drizzle-orm');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { decrypt } = require('../utils/crypto');

const login = async (req, res) => {
    try {
        // Prevenir error si no envia Content-Type: application/json
        const body = req.body || {};
        const { email, password } = body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y password son requeridos' });
        }

        // Hacer JOIN userCredentials + userProfiles + roles + schools
        const result = await db.select({
            id_profile: userProfiles.id_profile,
            cedula: userProfiles.cedula,
            name: userProfiles.name,
            last_name: userProfiles.last_name,
            phone: userProfiles.phone,
            id_school: userProfiles.id_school,
            id_zone: userProfiles.id_zone,
            school_name: schools.name,
            email: userCredentials.email,
            password: userCredentials.password_hash,
            status: userCredentials.status,
            roleName: roles.name,
            id_role: roles.id_role
        }).from(userCredentials)
            .innerJoin(userProfiles, eq(userCredentials.id_credential, userProfiles.id_credential))
            .innerJoin(roles, eq(userProfiles.id_role, roles.id_role))
            .leftJoin(schools, eq(userProfiles.id_school, schools.id_school))
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

        // Verificar estado de la cuenta antes de emitir el token
        const accountStatus = user.status || 'active';
        if (accountStatus === 'suspended') {
            return res.status(403).json({ error: 'Cuenta suspendida. Contacte al administrador.' });
        }
        if (accountStatus === 'blocked') {
            return res.status(403).json({ error: 'Cuenta bloqueada. Contacte al administrador.' });
        }

        // Descifrar la cédula antes de incluirla en el token
        const cedulaDecrypted = decrypt(user.cedula);

        // JWT con id_profile, id_role y nombres extra
        const tokenPayload = {
            id_profile: user.id_profile,
            cedula: cedulaDecrypted,
            name: user.name,
            last_name: user.last_name,
            email: user.email,
            phone: user.phone,
            role: user.roleName,
            id_role: user.id_role,
            id_school: user.id_school,
            school_name: user.school_name,
            id_zone: user.id_zone   // zona del Admin Zonal (null si no aplica)
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
                id_role: user.id_role,
                id_school: user.id_school,
                school_name: user.school_name
            }
        });

    } catch (error) {
        console.error('Error en el endpoint de login:', error);
        res.status(500).json({ error: 'Error interno del servidor' });
    }
};

module.exports = { login };
