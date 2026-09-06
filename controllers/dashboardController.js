const db = require('../db');
const { batchInventory, productCatalog, dailyAttendance, dailyDeliveries, decrease, schools } = require('../models/schema');
const { eq, gt, lte, and, inArray } = require('drizzle-orm');

// Helper: resuelve qué id_school(s) usar según la zona y el filtro de escuela opcional.
// Retorna:
//   null          → sin restricción (Super Admin sin id_school específico)
//   [id, ...]     → lista de escuelas permitidas
//   'FORBIDDEN'   → la escuela pedida no pertenece a la zona del Admin Zonal
const _resolveSchoolFilter = async (zonaFilter, idSchool) => {
    // Caso 1: Super Admin sin filtro de escuela → sin restricción
    if (zonaFilter === null || zonaFilter === undefined) {
        if (!idSchool) return null;
        // Super Admin puede pedir una escuela específica sin restricción de zona
        return [Number(idSchool)];
    }

    // Obtener todas las escuelas de la zona del Admin Zonal
    const result = await db.select({ id_school: schools.id_school })
        .from(schools)
        .where(eq(schools.zone, String(zonaFilter)));
    const zoneSchoolIds = result.map(r => r.id_school);

    if (zoneSchoolIds.length === 0) return []; // Zona sin escuelas

    // Caso 2: Admin Zonal sin filtro de escuela → todas las escuelas de su zona
    if (!idSchool) return zoneSchoolIds;

    // Caso 3: Admin Zonal con id_school específica → verificar que pertenezca a su zona
    if (!zoneSchoolIds.includes(Number(idSchool))) return 'FORBIDDEN';
    return [Number(idSchool)];
};

// GET /api/alerts/expiring
// Super Admin: alertas de todas las escuelas
// Admin Zonal: solo alertas de escuelas de su zona
const getExpiringAlerts = async (req, res) => {
    try {
        const today = new Date();
        const futureDate = new Date();
        futureDate.setDate(today.getDate() + 15);
        const dateThreshold = futureDate.toISOString().split('T')[0];

        const { id_school } = req.query;
        const schoolIds = await _resolveSchoolFilter(req.zonaFilter, id_school);

        if (schoolIds === 'FORBIDDEN') {
            return res.status(403).json({ error: 'La escuela indicada no pertenece a tu zona' });
        }

        let conditions = [
            gt(batchInventory.total_quantity, 0),
            lte(batchInventory.expiration_date, dateThreshold)
        ];

        if (schoolIds !== null) {
            if (schoolIds.length === 0) {
                return res.status(200).json({ alerts: [] });
            }
            conditions.push(inArray(batchInventory.id_school, schoolIds));
        }

        const expiringBatches = await db.select({
            id_batch_inventory: batchInventory.id_batch_inventory,
            total_quantity: batchInventory.total_quantity,
            expiration_date: batchInventory.expiration_date,
            entry_date: batchInventory.entry_date,
            id_school: batchInventory.id_school,
            product_name: productCatalog.name,
            id_product: productCatalog.id_product
        })
            .from(batchInventory)
            .innerJoin(productCatalog, eq(batchInventory.id_product, productCatalog.id_product))
            .where(and(...conditions));

        res.status(200).json({ alerts: expiringBatches });
    } catch (error) {
        console.error('Error fetching expiring batch alerts:', error);
        res.status(500).json({ error: 'Internal server error while fetching alerts' });
    }
};

// GET /api/reports/daily?date=YYYY-MM-DD
// Super Admin: reporte de todas las escuelas
// Admin Zonal: reporte solo de escuelas de su zona
const getDailyReport = async (req, res) => {
    try {
        const { date, id_school } = req.query;

        if (!date) {
            return res.status(400).json({ error: 'Missing query parameter: date (YYYY-MM-DD)' });
        }

        const schoolIds = await _resolveSchoolFilter(req.zonaFilter, id_school);

        if (schoolIds === 'FORBIDDEN') {
            return res.status(403).json({ error: 'La escuela indicada no pertenece a tu zona' });
        }

        if (schoolIds !== null && schoolIds.length === 0) {
            return res.status(200).json({
                date,
                zona: req.zonaFilter ?? 'todas',
                id_school: id_school ?? null,
                total_students: 0,
                total_deliveries: 0,
                total_decreases: 0,
                deliveries: [],
                decreases: []
            });
        }

        // 1. Asistencia filtrada por escuela si aplica
        let attendanceQuery = db.select().from(dailyAttendance).where(
            schoolIds !== null
                ? and(eq(dailyAttendance.date, date), inArray(dailyAttendance.id_school, schoolIds))
                : eq(dailyAttendance.date, date)
        );
        const attendanceData = await attendanceQuery;
        const total_students = attendanceData.reduce((acc, cur) => acc + cur.student_quantity, 0);

        // 2. Entregas filtradas por escuela si aplica
        let deliveriesConditions = [eq(dailyDeliveries.date, date)];
        if (schoolIds !== null) {
            deliveriesConditions.push(inArray(dailyDeliveries.id_school, schoolIds));
        }

        const deliveriesData = await db.select({
            id_daily_deliveries: dailyDeliveries.id_daily_deliveries,
            quantity_delivered: dailyDeliveries.quantity_delivered,
            id_school: dailyDeliveries.id_school,
            product_name: productCatalog.name,
            id_batch_inventory: batchInventory.id_batch_inventory
        })
            .from(dailyDeliveries)
            .innerJoin(batchInventory, eq(dailyDeliveries.id_batch_inventory, batchInventory.id_batch_inventory))
            .innerJoin(productCatalog, eq(batchInventory.id_product, productCatalog.id_product))
            .where(and(...deliveriesConditions));

        // 3. Mermas filtradas por escuela si aplica
        let decreaseConditions = [eq(decrease.date, date)];
        if (schoolIds !== null) {
            decreaseConditions.push(inArray(decrease.id_school, schoolIds));
        }

        const decreaseData = await db.select({
            id_decrease: decrease.id_decrease,
            quantity_leftover: decrease.quantity_leftover,
            reason: decrease.reason,
            id_school: decrease.id_school,
            product_name: productCatalog.name,
            id_batch_inventory: batchInventory.id_batch_inventory
        })
            .from(decrease)
            .innerJoin(batchInventory, eq(decrease.id_batch_inventory, batchInventory.id_batch_inventory))
            .innerJoin(productCatalog, eq(batchInventory.id_product, productCatalog.id_product))
            .where(and(...decreaseConditions));

        const total_deliveries = deliveriesData.reduce((acc, cur) => acc + cur.quantity_delivered, 0);
        const total_decreases = decreaseData.reduce((acc, cur) => acc + cur.quantity_leftover, 0);

        res.status(200).json({
            date,
            zona: req.zonaFilter ?? 'todas',
            id_school: id_school ? Number(id_school) : null,
            total_students,
            total_deliveries,
            total_decreases,
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
