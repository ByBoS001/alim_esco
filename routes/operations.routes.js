const express = require('express');
const router = express.Router();
const operationsController = require('../controllers/operationsController');
const { verificarToken } = require('../middlewares/authMiddleware');

// POST /api/operations/delivery
router.post('/delivery', verificarToken, operationsController.createDelivery);

// POST /api/operations/attendance
router.post('/attendance', verificarToken, operationsController.registerAttendance);

module.exports = router;
