const db = require('../db');
const { decrease, batchInventory } = require('../models/schema');
const { eq, sql } = require('drizzle-orm');

const createDecrease = async (req, res) => {
    try {
        const { date, id_batch_inventory, quantity, reason } = req.body || {};
        const id_profile = req.user.id_profile;
        const id_school = req.user?.id_school || req.body.id_school;

        // Validar que los datos mínimos estén presentes
        if (!date || !id_batch_inventory || quantity === undefined || !reason || !id_school || !id_profile) {
            return res.status(400).json({ error: 'Faltan datos obligatorios (date, id_batch_inventory, quantity, reason, id_school, id_profile)' });
        }

        // Iniciar transacción atómica (rollback automático si falla la inserción o la resta)
        await db.transaction(async (tx) => {

            // 1. Consultar el lote de inventario para saber su stock actual
            const batchResult = await tx.select().from(batchInventory).where(eq(batchInventory.id_batch_inventory, id_batch_inventory));

            if (batchResult.length === 0) {
                // Forzar rollback disparando un error si no se encuentra el lote
                throw new Error('NOT_FOUND');
            }

            const currentBatch = batchResult[0];

            // 2. Lógica de negocio: Validar que la merma/pérdida no supere el stock real que existe
            if (currentBatch.total_quantity < quantity) {
                throw new Error('INSUFFICIENT_STOCK');
            }

            // 3. Insertar el registro de merma/pérdida en la tabla decrease junto con escuela y perfil
            await tx.insert(decrease).values({
                date,
                id_batch_inventory,
                // Mapeamos la variable 'quantity' que viene del cliente con 'quantity_leftover' requerida por la base de datos
                quantity_leftover: quantity,
                reason,
                id_school,
                id_profile
            });

            // 4. Descontar la pérdida del lote de inventario de forma segura
            await tx.update(batchInventory)
                .set({ total_quantity: sql`${batchInventory.total_quantity} - ${quantity}` })
                .where(eq(batchInventory.id_batch_inventory, id_batch_inventory));
        });

        // Respuesta HTTP 201 pura si la transacción logra cerrarse sin que nada explote
        res.status(201).json({ message: 'Merma registrada exitosamente y el inventario ha sido deducido.' });

    } catch (error) {
        // Manejo custom de nuestros errores de lógica
        if (error.message === 'NOT_FOUND') {
            return res.status(404).json({ error: 'El lote de inventario especificado no existe' });
        }
        if (error.message === 'INSUFFICIENT_STOCK') {
            return res.status(400).json({ error: 'Stock insuficiente para procesar esta merma (la pérdida reportada supera los remanentes del lote)' });
        }

        // Log al desarrollador ante errores no contemplados (ej: caída de BD)
        console.error('Error registrando la merma:', error);
        res.status(500).json({ error: 'Error interno del servidor al registrar la merma' });
    }
};

module.exports = { createDecrease };
