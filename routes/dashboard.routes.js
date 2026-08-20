const express = require('express');
const router = express.Router();
const dashboardController = require('../controllers/dashboardController');
const { verificarToken, checkRole } = require('../middlewares/authMiddleware');

// Las variables y rutas solicitadas están estrictamente aplicadas como se pidió.
// GET /api/alerts/expiring (Solo Operador o Admin)
router.get('/alerts/expiring', verificarToken, checkRole('Operator'), dashboardController.getExpiringAlerts);

// GET /api/reports/daily (Director, Operator, Admin)
router.get('/reports/daily', verificarToken, checkRole('Director', 'Operator'), dashboardController.getDailyReport);

module.exports = router;
