const db = require('../db');
const { batchInventory } = require('../models/schema');
const { eq, gt, and, asc, sql } = require('drizzle-orm');

// POST /api/inventory/batch
const createBatch = async (req, res) => {
    try {
        const { id_product, total_quantity, entry_date, expiration_date } = req.body || {};

        if (!id_product || total_quantity === undefined || !entry_date || !expiration_date) {
            return res.status(400).json({ error: 'Faltan campos requeridos (id_product, total_quantity, entry_date, expiration_date)' });
        }

        const [newBatch] = await db.insert(batchInventory).values({
            id_product,
            total_quantity,
            entry_date,
            expiration_date
        }).returning();

        res.status(201).json({ message: 'Lote de inventario registrado correctamente', data: newBatch });
    } catch (error) {
        console.error('Error al registrar lote de inventario:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar el lote' });
    }
};

// GET /api/inventory/batches/:id_product
const getAvailableBatches = async (req, res) => {
    try {
        const idProduct = parseInt(req.params.id_product, 10);

        if (isNaN(idProduct)) {
            return res.status(400).json({ error: 'ID de producto inválido' });
        }

        // Obtener lotes disponibles ordenados por expiration_date ascendente (PEPS / FIFO)
        const available_batches = await db.select()
            .from(batchInventory)
            .where(
                and(
                    eq(batchInventory.id_product, idProduct),
                    gt(batchInventory.total_quantity, 0)
                )
            )
            .orderBy(asc(batchInventory.expiration_date));

        // Obtener la suma total del stock aprovechando la funciÃ³n SUM de SQL
        const [totalStockResult] = await db.select({
            total_stock: sql`sum(${batchInventory.total_quantity})`
        })
            .from(batchInventory)
            .where(
                and(
                    eq(batchInventory.id_product, idProduct),
                    gt(batchInventory.total_quantity, 0)
                )
            );

        const total_stock = totalStockResult && totalStockResult.total_stock
            ? Number(totalStockResult.total_stock)
            : 0;

        res.status(200).json({
            total_stock,
            available_batches
        });
    } catch (error) {
        console.error('Error al consultar lotes disponibles:', error);
        res.status(500).json({ error: 'Error interno del servidor al consultar el inventario' });
    }
};

module.exports = {
    createBatch,
    getAvailableBatches
};
