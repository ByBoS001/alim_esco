const db = require('../db');
const { roles } = require('../models/schema');

// GET /api/roles
const getRoles = async (req, res) => {
    try {
        const result = await db.select().from(roles);
        res.status(200).json({ data: result });
    } catch (error) {
        console.error('Error fetching roles:', error);
        res.status(500).json({ error: 'Internal server error while fetching roles' });
    }
};

// POST /api/roles
const createRole = async (req, res) => {
    try {
        const { name, description } = req.body || {};
        if (!name) return res.status(400).json({ error: 'Name is required' });

        const [newRole] = await db.insert(roles).values({ name, description }).returning();
        res.status(201).json({ message: 'Role created successfully', data: newRole });
    } catch (error) {
        console.error('Error creating role:', error);
        res.status(500).json({ error: 'Internal server error while creating role' });
    }
};

module.exports = { getRoles, createRole };
