const express = require('express');
const router = express.Router();
const operationsController = require('../controllers/operationsController');
const { verificarToken } = require('../middlewares/authMiddleware');

// POST /api/operations/delivery
router.post('/delivery', verificarToken, operationsController.createDelivery);

// GET /api/operations/attendance (Reporte sumado)
router.get('/attendance', verificarToken, operationsController.getAttendance);

// GET /api/operations/attendance/logs (Bitácora cruda)
router.get('/attendance/logs', verificarToken, operationsController.getAttendanceLogs);

// POST /api/operations/attendance
router.post('/attendance', verificarToken, operationsController.registerAttendance);

module.exports = router;
