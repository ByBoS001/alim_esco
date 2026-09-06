const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verificarToken, checkRole, checkZona } = require('../middlewares/authMiddleware');

// GET /api/alerts/expiring — Operador/Admin, filtrado por zona automáticamente
router.get('/alerts/expiring', verificarToken, checkRole('Operator'), checkZona, dashboardController.getExpiringAlerts);

// GET /api/reports/daily — Director/Operador/Admin, filtrado por zona automáticamente
router.get('/reports/daily', verificarToken, checkRole('Director', 'Operator'), checkZona, dashboardController.getDailyReport);

module.exports = router;
