const db = require('../db');
const { schools } = require('../models/schema');
const { eq } = require('drizzle-orm');

const getSchools = async (req, res) => {
    try {
        const result = await db.select().from(schools);
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
        res.status(200).json({ data: school });
    } catch (error) {
        console.error('Error fetching school by ID:', error);
        res.status(500).json({ error: 'Internal server error while fetching school' });
    }
}

const createSchool = async (req, res) => {
    try {
        const { name, address, zone } = req.body || {};
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const [newSchool] = await db.insert(schools).values({ name, address, zone }).returning();
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

        // Ensure at least one field is provided for update
        if (!name && !address && !zone) {
            return res.status(400).json({ error: 'No data provided to update' });
        }

        const [updatedSchool] = await db.update(schools)
            .set({ name, address, zone })
            .where(eq(schools.id_school, Number(id)))
            .returning();

        if (!updatedSchool) return res.status(404).json({ error: 'School not found' });
        res.status(200).json({ message: 'School updated successfully', data: updatedSchool });
    } catch (error) {
        console.error('Error updating school:', error);
        res.status(500).json({ error: 'Internal server error while updating school' });
    }
};

const deleteSchool = async (req, res) => {
    try {
        const { id } = req.params;
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
