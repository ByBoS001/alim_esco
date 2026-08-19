const db = require('../db');
const { batchInventory, dailyDeliveries, dailyAttendance, schools } = require('../models/schema');
const { eq, gt, lt, and, sql } = require('drizzle-orm');

// POST /api/operations/delivery
const createDelivery = async (req, res) => {
    try {
        const { id_product, id_batch_inventory, quantity_delivered, id_profile, date } = req.body || {};

        if (!id_product || !id_batch_inventory || !quantity_delivered || !id_profile || !date) {
            return res.status(400).json({ error: 'Faltan campos requeridos (id_product, id_batch_inventory, quantity_delivered, id_profile, date)' });
        }

        // Obtener el lote que se intenta despachar para conocer su fecha de expiración
        const targetBatchQuery = await db.select()
            .from(batchInventory)
            .where(eq(batchInventory.id_batch_inventory, id_batch_inventory));

        if (targetBatchQuery.length === 0) {
            return res.status(404).json({ error: 'El lote de inventario especificado no existe' });
        }

        const targetBatch = targetBatchQuery[0];

        // Validar cantidad disponible
        if (targetBatch.total_quantity < quantity_delivered) {
            return res.status(400).json({ error: 'El lote no tiene suficiente cantidad para despachar' });
        }

        // Regla de Negocio PEPS CRÍTICA: Buscar lotes más antiguos del mismo producto
        const olderBatches = await db.select()
            .from(batchInventory)
            .where(
                and(
                    eq(batchInventory.id_product, id_product),
                    gt(batchInventory.total_quantity, 0),
                    lt(batchInventory.expiration_date, targetBatch.expiration_date)
                )
            )
            .limit(1);

        // Si existe algún lote con inventario y más viejo, abortar operación
        if (olderBatches.length > 0) {
            return res.status(400).json({
                error: '¡Alto! Existe un lote más antiguo. Aplica la regla PEPS y consume ese primero.'
            });
        }

        // Si se cumple PEPS, realizamos la transacción (Atomicidad)
        await db.transaction(async (tx) => {
            // 1. Insertar el registro de la entrega
            await tx.insert(dailyDeliveries).values({
                date,
                id_batch_inventory,
                quantity_delivered,
                id_profile
            });

            // 2. Restar la cantidad entregada del lote en batch_inventory
            await tx.update(batchInventory)
                .set({
                    total_quantity: sql`${batchInventory.total_quantity} - ${quantity_delivered}`
                })
                .where(eq(batchInventory.id_batch_inventory, id_batch_inventory));
        });

        res.status(201).json({ message: 'Entrega registrada exitosamente y stock descontado' });
    } catch (error) {
        console.error('Error al registrar la entrega diaria:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar la entrega' });
    }
};

// GET /api/operations/attendance
const getAttendance = async (req, res) => {
    try {
        const result = await db.select({
            date: dailyAttendance.date,
            id_school: dailyAttendance.id_school,
            school_name: schools.name,
            total_students: sql`sum(${dailyAttendance.student_quantity})`.mapWith(Number)
        })
            .from(dailyAttendance)
            .leftJoin(schools, eq(dailyAttendance.id_school, schools.id_school))
            .groupBy(dailyAttendance.date, dailyAttendance.id_school, schools.name)
            .orderBy(dailyAttendance.date);

        res.status(200).json({ data: result });
    } catch (error) {
        console.error('Error al obtener la asistencia consolidada:', error);
        res.status(500).json({ error: 'Error interno del servidor al consultar la asistencia' });
    }
};

// GET /api/operations/attendance/logs
const getAttendanceLogs = async (req, res) => {
    try {
        const result = await db.select().from(dailyAttendance).orderBy(dailyAttendance.date);
        res.status(200).json({ data: result });
    } catch (error) {
        console.error('Error al obtener la bitácora de asistencia:', error);
        res.status(500).json({ error: 'Error interno del servidor al consultar la bitácora libre de asistencia' });
    }
};

// POST /api/operations/attendance
const registerAttendance = async (req, res) => {
    try {
        const { date, student_quantity } = req.body || {};
        const id_school = req.user.id_school || req.body.id_school;

        if (!date || student_quantity === undefined || !id_school) {
            return res.status(400).json({ error: 'Faltan campos requeridos. Si tu perfil no tiene una escuela asignada, debes enviar id_school en la petición.' });
        }

        const [newAttendance] = await db.insert(dailyAttendance).values({
            date,
            student_quantity,
            id_school
        }).returning();

        res.status(201).json({ message: 'Asistencia registrada correctamente', data: newAttendance });
    } catch (error) {
        console.error('Error al registrar asistencia:', error);
        res.status(500).json({ error: 'Error interno del servidor al procesar la asistencia' });
    }
};

module.exports = {
    createDelivery,
    getAttendance,
    getAttendanceLogs,
    registerAttendance
};
