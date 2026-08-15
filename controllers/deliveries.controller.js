const db = require('../db');
const { dailyDeliveries, batchInventory } = require('../models/schema');
const { eq, sql } = require('drizzle-orm');

const createDelivery = async (req, res) => {
    try {
        const { date, id_batch_inventory, total_quantity } = req.body || {};

        // Validar que los datos mínimos de control hayan sido enviados en el Payload JSON
        if (!date || !id_batch_inventory || total_quantity === undefined) {
            return res.status(400).json({ error: 'Faltan datos obligatorios (date, id_batch_inventory, total_quantity)' });
        }

        // Obtener inteligentemente el ID del perfil responsable de la entrega desde el middleware de seguridad
        const id_profile = req.user.id_profile;

        // Iniciar transacción atómica (asegura que si falla la resta, la entrega tampoco se guarde en la BD, evitando discrepancias)
        await db.transaction(async (tx) => {

            // 1. Verificar si el lote específico existe consultando su estado actual
            const batchResult = await tx.select().from(batchInventory).where(eq(batchInventory.id_batch_inventory, id_batch_inventory));

            if (batchResult.length === 0) {
                // Al arrojar un error manualmente aquí, la transacción aborta (Rollback) y atrapamos el error en el catch externo
                throw new Error('NOT_FOUND');
            }

            const currentBatch = batchResult[0];

            // 2. Lógica de Negocio Crucial: Verificar que exista stock suficiente (Stock Actual >= Cantidad solicitada en la Entrega)
            if (currentBatch.total_quantity < total_quantity) {
                throw new Error('INSUFFICIENT_STOCK');
            }

            // 3. Insertar el historial del despacho vinculando al usuario logueado
            await tx.insert(dailyDeliveries).values({
                date,
                id_batch_inventory,
                // Insertamos la cantidad enviada en el body apuntando a la columna correcta según la base de datos (quantity_delivered)
                quantity_delivered: total_quantity,
                id_profile
            });

            // 4. Actualizar dinámicamente el lote restando el monto validado previamente (current_quantity - total_quantity enviada en la request)
            await tx.update(batchInventory)
                .set({ total_quantity: sql`${batchInventory.total_quantity} - ${total_quantity}` })
                .where(eq(batchInventory.id_batch_inventory, id_batch_inventory));
        });

        // Solo retorna código HTTP 201 (Created) si todas las etapas en la transacción terminan sin excepciones
        res.status(201).json({ message: 'Entrega registrada exitosamente y el stock ha sido deducido de manera atómica.' });

    } catch (error) {
        // Manejo controlado de los errores de negocio generados dentro del bloque transaccional
        if (error.message === 'NOT_FOUND') {
            return res.status(404).json({ error: 'El lote de inventario especificado no existe' });
        }
        if (error.message === 'INSUFFICIENT_STOCK') {
            return res.status(400).json({ error: 'Stock insuficiente para procesar la entrega de este lote' });
        }

        // Log para el desarrollador y caída limpia por error inesperado 500
        console.error('Error registrando la entrega temporal:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar la entrega' });
    }
};

module.exports = { createDelivery };
