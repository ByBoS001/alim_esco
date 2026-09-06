const db = require('../db');
const { schools } = require('../models/schema');
const { eq } = require('drizzle-orm');

// Helper: obtiene las escuelas de una zona específica o todas si no hay filtro
const _getSchoolsQuery = (zonaFilter) => {
    const query = db.select().from(schools);
    if (zonaFilter !== null && zonaFilter !== undefined) {
        return query.where(eq(schools.zone, String(zonaFilter)));
    }
    return query;
};

// GET /api/schools — Super Admin ve todas, Admin Zonal solo ve las de su zona
const getSchools = async (req, res) => {
    try {
        const result = await _getSchoolsQuery(req.zonaFilter);
        res.status(200).json({ data: result });
    } catch (error) {
        console.error('Error fetching schools:', error);
        res.status(500).json({ error: 'Internal server error while fetching schools' });
    }
};

const getSchoolById = async (req, res) => {
    try {
        const { id } = req.params;
        const [school] = await db.select().from(schools).where(eq(schools.id_school, Number(id)));

        if (!school) return res.status(404).json({ error: 'School not found' });

        // Admin Zonal: verificar que la escuela pertenece a su zona
        if (req.zonaFilter !== null && req.zonaFilter !== undefined) {
            if (String(school.zone) !== String(req.zonaFilter)) {
                return res.status(403).json({ error: 'No tienes permiso para acceder a escuelas de otra zona' });
            }
        }

        res.status(200).json({ data: school });
    } catch (error) {
        console.error('Error fetching school by ID:', error);
        res.status(500).json({ error: 'Internal server error while fetching school' });
    }
};

const createSchool = async (req, res) => {
    try {
        const { name, address, zone } = req.body || {};
        if (!name) return res.status(400).json({ error: 'Name is required' });

        // Admin Zonal solo puede crear escuelas en su zona
        const effectiveZone = (req.zonaFilter !== null && req.zonaFilter !== undefined)
            ? String(req.zonaFilter)
            : zone;

        if (!effectiveZone) return res.status(400).json({ error: 'Se requiere el campo zone' });

        const [newSchool] = await db.insert(schools).values({ name, address, zone: effectiveZone }).returning();
        res.status(201).json({ message: 'School created successfully', data: newSchool });
    } catch (error) {
        console.error('Error creating school:', error);
        res.status(500).json({ error: 'Internal server error while creating school' });
    }
};

const updateSchool = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, address, zone } = req.body || {};

        // Verificar que la escuela existe
        const [existing] = await db.select().from(schools).where(eq(schools.id_school, Number(id)));
        if (!existing) return res.status(404).json({ error: 'School not found' });

        // Admin Zonal: solo puede modificar escuelas de su zona
        if (req.zonaFilter !== null && req.zonaFilter !== undefined) {
            if (String(existing.zone) !== String(req.zonaFilter)) {
                return res.status(403).json({ error: 'No tienes permiso para modificar escuelas de otra zona' });
            }
        }

        if (!name && !address && !zone) {
            return res.status(400).json({ error: 'No data provided to update' });
        }

        // Admin Zonal no puede cambiar una escuela a otra zona
        const effectiveZone = (req.zonaFilter !== null && req.zonaFilter !== undefined)
            ? existing.zone
            : (zone || existing.zone);

        const [updatedSchool] = await db.update(schools)
            .set({ name, address, zone: effectiveZone })
            .where(eq(schools.id_school, Number(id)))
            .returning();

        res.status(200).json({ message: 'School updated successfully', data: updatedSchool });
    } catch (error) {
        console.error('Error updating school:', error);
        res.status(500).json({ error: 'Internal server error while updating school' });
    }
};

const deleteSchool = async (req, res) => {
    try {
        const { id } = req.params;

        // Admin Zonal: verificar que la escuela pertenece a su zona antes de borrar
        if (req.zonaFilter !== null && req.zonaFilter !== undefined) {
            const [existing] = await db.select().from(schools).where(eq(schools.id_school, Number(id)));
            if (!existing) return res.status(404).json({ error: 'School not found' });
            if (String(existing.zone) !== String(req.zonaFilter)) {
                return res.status(403).json({ error: 'No tienes permiso para eliminar escuelas de otra zona' });
            }
        }

        const [deletedSchool] = await db.delete(schools)
            .where(eq(schools.id_school, Number(id)))
            .returning();

        if (!deletedSchool) return res.status(404).json({ error: 'School not found' });
        res.status(200).json({ message: 'School deleted successfully' });
    } catch (error) {
        console.error('Error deleting school:', error);
        res.status(500).json({ error: 'Internal server error while deleting school' });
    }
};

module.exports = { getSchools, getSchoolById, createSchool, updateSchool, deleteSchool };
