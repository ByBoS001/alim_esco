const db = require('../db');
const VALID_STATUSES = ['active', 'suspended', 'blocked'];
const { userCredentials, userProfiles, roles, schools } = require('../models/schema');
const { eq, inArray } = require('drizzle-orm');
const bcrypt = require('bcrypt');
const { encryptWithIV, decrypt } = require('../utils/crypto');

// Descifra la cédula de un perfil (si viene cifrada)
const decryptProfile = (profile) => ({
    ...profile,
    cedula: profile.cedula ? decrypt(profile.cedula) : profile.cedula
});

// Helper: obtiene los id_school que pertenecen a una zona concreta
const _getSchoolIdsByZone = async (idZone) => {
    const result = await db.select({ id_school: schools.id_school })
        .from(schools)
        .where(eq(schools.zone, String(idZone)));
    return result.map(r => r.id_school);
};

// GET /api/users
// Super Admin: todos los usuarios
// Admin Zonal: solo usuarios cuya escuela pertenece a su zona
const getUsers = async (req, res) => {
    try {
        let query = db.select({
            id_profile: userProfiles.id_profile,
            cedula: userProfiles.cedula,
            name: userProfiles.name,
            lastName: userProfiles.last_name,
            phone: userProfiles.phone,
            email: userCredentials.email,
            roleName: roles.name,
            id_school: userProfiles.id_school,
            id_zone: userProfiles.id_zone
        })
            .from(userProfiles)
            .innerJoin(userCredentials, eq(userProfiles.id_credential, userCredentials.id_credential))
            .innerJoin(roles, eq(userProfiles.id_role, roles.id_role));

        if (req.zonaFilter !== null && req.zonaFilter !== undefined) {
            // Obtener los id_school de la zona del Admin Zonal
            const schoolIds = await _getSchoolIdsByZone(req.zonaFilter);
            if (schoolIds.length === 0) {
                // No hay escuelas en su zona: devolver lista vacía
                return res.status(200).json({ data: [] });
            }
            query = query.where(inArray(userProfiles.id_school, schoolIds));
        }

        const result = await query;
        res.status(200).json({ data: result.map(decryptProfile) });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error while fetching users' });
    }
};

// POST /api/users
// Admin Zonal solo puede crear usuarios en escuelas de su zona
const createUser = async (req, res) => {
    try {
        const { email, password, cedula, name, lastName, phone, idRole, idSchool } = req.body || {};

        if (!email || !password || !cedula || !name || !lastName || !idRole) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        // Validar zona: el Admin Zonal no puede asignar al usuario una escuela fuera de su zona
        if (req.zonaFilter !== null && req.zonaFilter !== undefined && idSchool) {
            const [targetSchool] = await db.select().from(schools).where(eq(schools.id_school, Number(idSchool)));
            if (!targetSchool) {
                return res.status(404).json({ error: 'La escuela indicada no existe' });
            }
            if (String(targetSchool.zone) !== String(req.zonaFilter)) {
                return res.status(403).json({ error: 'No puedes asignar usuarios a escuelas de otra zona' });
            }
        }

        const password_hash = await bcrypt.hash(password, 10);
        const encryptedCedula = encryptWithIV(cedula);

        const newUserProfile = await db.transaction(async (tx) => {
            const [newCredential] = await tx.insert(userCredentials).values({
                email,
                password_hash
            }).returning();

            const [newProfile] = await tx.insert(userProfiles).values({
                cedula: encryptedCedula,
                name,
                last_name: lastName,
                phone,
                id_role: idRole,
                id_school: idSchool || null,
                id_zone: null,   // id_zone solo aplica para Admin Zonal, no para usuarios normales
                id_credential: newCredential.id_credential
            }).returning();

            return newProfile;
        });

        res.status(201).json({ message: 'User created successfully', data: newUserProfile });
    } catch (error) {
        console.error('Error creating user:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Email or cedula already exists' });
        }
        res.status(500).json({ error: 'Internal server error while creating user' });
    }
};

// PUT /api/users/:id
// Admin Zonal: no puede mover un usuario a una escuela de otra zona
const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { cedula, name, lastName, phone, idRole, idSchool } = req.body || {};

        // Validar zona si Admin Zonal está intentando cambiar la escuela del usuario
        if (req.zonaFilter !== null && req.zonaFilter !== undefined && idSchool !== undefined) {
            const [targetSchool] = await db.select().from(schools).where(eq(schools.id_school, Number(idSchool)));
            if (!targetSchool) {
                return res.status(404).json({ error: 'La escuela indicada no existe' });
            }
            if (String(targetSchool.zone) !== String(req.zonaFilter)) {
                return res.status(403).json({ error: 'No puedes mover usuarios a escuelas de otra zona' });
            }
        }

        let updateData = {};
        if (cedula) updateData.cedula = encryptWithIV(cedula);
        if (name) updateData.name = name;
        if (lastName) updateData.last_name = lastName;
        if (phone) updateData.phone = phone;
        if (idRole) updateData.id_role = idRole;
        if (idSchool !== undefined) updateData.id_school = idSchool;

        if (Object.keys(updateData).length === 0) {
            return res.status(400).json({ error: 'Nothing to update' });
        }

        const [updatedProfile] = await db.update(userProfiles)
            .set(updateData)
            .where(eq(userProfiles.id_profile, Number(id)))
            .returning();

        if (!updatedProfile) return res.status(404).json({ error: 'User profile not found' });
        res.status(200).json({ message: 'User updated successfully', data: updatedProfile });
    } catch (error) {
        console.error('Error updating user:', error);
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Cedula already exists on another user' });
        }
        res.status(500).json({ error: 'Internal server error while updating user' });
    }
};

// DELETE /api/users/:id
const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        await db.transaction(async (tx) => {
            const profileResult = await tx.select().from(userProfiles).where(eq(userProfiles.id_profile, Number(id)));
            if (profileResult.length === 0) {
                throw new Error('NOT_FOUND');
            }

            const profile = profileResult[0];

            // Admin Zonal: verificar que el usuario pertenece a una escuela de su zona
            if (req.zonaFilter !== null && req.zonaFilter !== undefined && profile.id_school) {
                const [targetSchool] = await tx.select().from(schools).where(eq(schools.id_school, profile.id_school));
                if (targetSchool && String(targetSchool.zone) !== String(req.zonaFilter)) {
                    throw new Error('FORBIDDEN_ZONE');
                }
            }

            await tx.delete(userProfiles).where(eq(userProfiles.id_profile, Number(id)));
            await tx.delete(userCredentials).where(eq(userCredentials.id_credential, profile.id_credential));
        });

        res.status(200).json({ message: 'User and credentials deleted successfully' });
    } catch (error) {
        if (error.message === 'NOT_FOUND') {
            return res.status(404).json({ error: 'User profile not found' });
        }
        if (error.message === 'FORBIDDEN_ZONE') {
            return res.status(403).json({ error: 'No tienes permiso para eliminar usuarios de otra zona' });
        }
        console.error('Error deleting user:', error);
        if (error.code === '23503') {
            return res.status(409).json({ error: 'Cannot delete user because they have associated transactional records' });
        }
        res.status(500).json({ error: 'Internal server error while deleting user' });
    }
};

// PATCH /api/users/:id/status
// Permite a un admin cambiar el estado de una cuenta (active | suspended | blocked)
const updateAccountStatus = async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body || {};

        if (!status || !VALID_STATUSES.includes(status)) {
            return res.status(400).json({
                error: `Estado inválido. Los valores permitidos son: ${VALID_STATUSES.join(', ')}`
            });
        }

        // Buscar el perfil para obtener id_school y el id_credential asociado
        const [profile] = await db.select().from(userProfiles)
            .where(eq(userProfiles.id_profile, Number(id)));

        if (!profile) return res.status(404).json({ error: 'Usuario no encontrado' });

        // Admin Zonal: verificar que el usuario pertenece a una escuela de su zona
        if (req.zonaFilter !== null && req.zonaFilter !== undefined && profile.id_school) {
            const [targetSchool] = await db.select().from(schools)
                .where(eq(schools.id_school, profile.id_school));
            if (targetSchool && String(targetSchool.zone) !== String(req.zonaFilter)) {
                return res.status(403).json({ error: 'No tienes permiso para gestionar cuentas de otra zona' });
            }
        }

        // Actualizar el status en user_credentials
        const [updated] = await db.update(userCredentials)
            .set({ status })
            .where(eq(userCredentials.id_credential, profile.id_credential))
            .returning();

        const statusMsg = { active: 'activada', suspended: 'suspendida', blocked: 'bloqueada' };
        res.status(200).json({
            message: `Cuenta ${statusMsg[status]} exitosamente`,
            data: { id_profile: Number(id), status: updated.status }
        });
    } catch (error) {
        console.error('Error al actualizar estado de cuenta:', error);
        res.status(500).json({ error: 'Error interno del servidor al actualizar estado' });
    }
};

module.exports = { getUsers, createUser, updateUser, deleteUser, updateAccountStatus };
