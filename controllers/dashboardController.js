const db = require('../db');
const { batchInventory, productCatalog, dailyAttendance, dailyDeliveries, decrease } = require('../models/schema');
const { eq, gt, lte, and } = require('drizzle-orm');

// GET /api/alerts/expiring (Operator / Admin)
const getExpiringAlerts = async (req, res) => {
    try {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 15);

        // Convertir la fecha a formato string YYYY-MM-DD para la comparación segura en Drizzle
        const dateThreshold = futureDate.toISOString().split('T')[0];

        const expiringBatches = await db.select({
            id_batch_inventory: batchInventory.id_batch_inventory,
            total_quantity: batchInventory.total_quantity,
            expiration_date: batchInventory.expiration_date,
            entry_date: batchInventory.entry_date,
            product_name: productCatalog.name,
            id_product: productCatalog.id_product
        })
            .from(batchInventory)
            .innerJoin(productCatalog, eq(batchInventory.id_product, productCatalog.id_product))
            .where(
                and(
                    gt(batchInventory.total_quantity, 0),
                    lte(batchInventory.expiration_date, dateThreshold)
                )
            );

        res.status(200).json({ alerts: expiringBatches });
    } catch (error) {
        console.error('Error fetching expiring batch alerts:', error);
        res.status(500).json({ error: 'Internal server error while fetching alerts' });
    }
};

// GET /api/reports/daily (Director / Admin)
const getDailyReport = async (req, res) => {
    try {
        const { date } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Missing query parameter: date (YYYY-MM-DD)' });
        }

        // 1. Obtener registro de Asistencia (Attendance)
        const attendanceData = await db.select()
            .from(dailyAttendance)
            .where(eq(dailyAttendance.date, date));

        const total_students = attendanceData.reduce((acc, current) => acc + current.student_quantity, 0);

        // 2. Obtener registro de Entregas (Deliveries con JOIN para traer el nombre del producto)
        const deliveriesData = await db.select({
            id_daily_deliveries: dailyDeliveries.id_daily_deliveries,
            quantity_delivered: dailyDeliveries.quantity_delivered,
            product_name: productCatalog.name,
            id_batch_inventory: batchInventory.id_batch_inventory
        })
            .from(dailyDeliveries)
            .innerJoin(batchInventory, eq(dailyDeliveries.id_batch_inventory, batchInventory.id_batch_inventory))
            .innerJoin(productCatalog, eq(batchInventory.id_product, productCatalog.id_product))
            .where(eq(dailyDeliveries.date, date));

        // 3. Obtener registro de Mermas (Decreases con JOIN)
        const decreaseData = await db.select({
            id_decrease: decrease.id_decrease,
            quantity_leftover: decrease.quantity_leftover,
            reason: decrease.reason,
            product_name: productCatalog.name,
            id_batch_inventory: batchInventory.id_batch_inventory
        })
            .from(decrease)
            .innerJoin(batchInventory, eq(decrease.id_batch_inventory, batchInventory.id_batch_inventory))
            .innerJoin(productCatalog, eq(batchInventory.id_product, productCatalog.id_product))
            .where(eq(decrease.date, date));

        // Estructura final del JSON unificado
        res.status(200).json({
            date,
            total_students,
            deliveries: deliveriesData,
            decreases: decreaseData
        });
    } catch (error) {
        console.error('Error fetching daily report:', error);
        res.status(500).json({ error: 'Internal server error while compiling daily report' });
    }
};

module.exports = {
    getExpiringAlerts,
    getDailyReport
};
