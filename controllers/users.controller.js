const db = require('../db');
const { userCredentials, userProfiles, roles } = require('../models/schema');
const { eq } = require('drizzle-orm');
const bcrypt = require('bcrypt');

const getUsers = async (req, res) => {
    try {
        const result = await db.select({
            id_profile: userProfiles.id_profile,
            cedula: userProfiles.cedula,
            name: userProfiles.name,
            lastName: userProfiles.last_name,
            phone: userProfiles.phone,
            email: userCredentials.email,
            roleName: roles.name
        })
            .from(userProfiles)
            .innerJoin(userCredentials, eq(userProfiles.id_credential, userCredentials.id_credential))
            .innerJoin(roles, eq(userProfiles.id_role, roles.id_role));

        res.status(200).json({ data: result });
    } catch (error) {
        console.error('Error fetching users:', error);
        res.status(500).json({ error: 'Internal server error while fetching users' });
    }
};

const createUser = async (req, res) => {
    try {
        const { email, password, cedula, name, lastName, phone, idRole, idSchool } = req.body || {};

        if (!email || !password || !cedula || !name || !lastName || !idRole) {
            return res.status(400).json({ error: 'Missing required fields' });
        }

        const password_hash = await bcrypt.hash(password, 10);

        // La transacción asegura que ambas operaciones se completen, o se revierte todo en caso de error
        const newUserProfile = await db.transaction(async (tx) => {
            const [newCredential] = await tx.insert(userCredentials).values({
                email,
                password_hash
            }).returning();

            const [newProfile] = await tx.insert(userProfiles).values({
                cedula,
                name,
                last_name: lastName,
                phone,
                id_role: idRole,
                id_school: idSchool || null,
                id_credential: newCredential.id_credential
            }).returning();

            return newProfile;
        });

        res.status(201).json({ message: 'User created successfully', data: newUserProfile });
    } catch (error) {
        console.error('Error creating user:', error);
        // Capturar errores nativos de restricciones únicas (ej: correo ya registrado)
        if (error.code === '23505') {
            return res.status(409).json({ error: 'Email or cedula already exists' });
        }
        res.status(500).json({ error: 'Internal server error while creating user' });
    }
};

const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { cedula, name, lastName, phone, idRole, idSchool } = req.body || {};

        let updateData = {};
        if (cedula) updateData.cedula = cedula;
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

const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;

        await db.transaction(async (tx) => {
            // Buscamos las credenciales vinculadas a este perfil para poder eliminarlas también
            const profileResult = await tx.select().from(userProfiles).where(eq(userProfiles.id_profile, Number(id)));
            if (profileResult.length === 0) {
                throw new Error('NOT_FOUND');
            }

            const profile = profileResult[0];

            // 1. Eliminar el perfil primero para evitar violaciones de llave foránea (FK) hacia credenciales
            await tx.delete(userProfiles).where(eq(userProfiles.id_profile, Number(id)));

            // 2. Eliminar las credenciales de manera segura
            await tx.delete(userCredentials).where(eq(userCredentials.id_credential, profile.id_credential));
        });

        res.status(200).json({ message: 'User and credentials deleted successfully' });
    } catch (error) {
        if (error.message === 'NOT_FOUND') {
            return res.status(404).json({ error: 'User profile not found' });
        }
        console.error('Error deleting user:', error);

        // Error por restricción de Postgres (ej. si están asociados a un envío en daily_deliveries)
        if (error.code === '23503') {
            return res.status(409).json({ error: 'Cannot delete user because they have associated transactional records (e.g. deliveries).' });
        }
        res.status(500).json({ error: 'Internal server error while deleting user' });
    }
};

module.exports = { getUsers, createUser, updateUser, deleteUser };
