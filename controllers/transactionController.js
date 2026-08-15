const db = require('../db');
const { batchInventory, productCatalog, productCategories, dailyAttendance, dailyDeliveries, decrease } = require('../models/schema');
const { eq, sql } = require('drizzle-orm');

// GET /api/inventory
const getInventory = async (req, res) => {
    try {
        const result = await db.select({
            id_batch_inventory: batchInventory.id_batch_inventory,
            total_quantity: batchInventory.total_quantity,
            entry_date: batchInventory.entry_date,
            expiration_date: batchInventory.expiration_date,
            product_name: productCatalog.name,
            category_name: productCategories.name,
            id_product: productCatalog.id_product,
            id_category: productCategories.id_category
        })
            .from(batchInventory)
            .innerJoin(productCatalog, eq(batchInventory.id_product, productCatalog.id_product))
            .innerJoin(productCategories, eq(productCatalog.id_category, productCategories.id_category));

        res.status(200).json({ data: result });
    } catch (error) {
        console.error('Error fetching inventory:', error);
        res.status(500).json({ error: 'Internal server error while fetching inventory' });
    }
};

// POST /api/attendance
const registerAttendance = async (req, res) => {
    try {
        const { date, student_quantity } = req.body || {};

        if (!date || student_quantity === undefined) {
            return res.status(400).json({ error: 'Missing required data (date, student_quantity)' });
        }

        const [newAttendance] = await db.insert(dailyAttendance).values({
            date,
            student_quantity
        }).returning();

        res.status(201).json({ message: 'Attendance registered successfully', data: newAttendance });
    } catch (error) {
        console.error('Error registering attendance:', error);
        res.status(500).json({ error: 'Internal server error while registering attendance' });
    }
};

// POST /api/deliveries
const registerDelivery = async (req, res) => {
    try {
        const { date, id_batch_inventory, quantity_delivered } = req.body || {};

        if (!date || !id_batch_inventory || quantity_delivered === undefined) {
            return res.status(400).json({ error: 'Missing required data (date, id_batch_inventory, quantity_delivered)' });
        }

        const id_profile = req.user.id_profile;

        await db.transaction(async (tx) => {
            const [newDelivery] = await tx.insert(dailyDeliveries).values({
                date,
                id_batch_inventory,
                quantity_delivered,
                id_profile
            }).returning();

            await tx.update(batchInventory)
                .set({ total_quantity: sql`${batchInventory.total_quantity} - ${quantity_delivered}` })
                .where(eq(batchInventory.id_batch_inventory, id_batch_inventory));
        });

        res.status(201).json({ message: 'Delivery registered successfully and inventory updated.' });
    } catch (error) {
        console.error('Error registering delivery:', error);
        res.status(500).json({ error: 'Internal server error while registering delivery' });
    }
};

// POST /api/decreases
const registerDecrease = async (req, res) => {
    try {
        const { date, id_batch_inventory, quantity_leftover, reason } = req.body || {};

        if (!date || !id_batch_inventory || quantity_leftover === undefined) {
            return res.status(400).json({ error: 'Missing required data (date, id_batch_inventory, quantity_leftover)' });
        }

        const [newDecrease] = await db.insert(decrease).values({
            date,
            id_batch_inventory,
            quantity_leftover,
            reason
        }).returning();

        res.status(201).json({ message: 'Decrease registered successfully', data: newDecrease });
    } catch (error) {
        console.error('Error registering decrease:', error);
        res.status(500).json({ error: 'Internal server error while registering decrease' });
    }
};

module.exports = {
    getInventory,
    registerAttendance,
    registerDelivery,
    registerDecrease
};
