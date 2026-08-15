const express = require('express');
const router = express.Router();
const transactionController = require('../controllers/transactionController');
const deliveriesController = require('../controllers/deliveries.controller');
const decreasesController = require('../controllers/decreases.controller');
const { verificarToken } = require('../middlewares/authMiddleware');

// GET /api/inventory
router.get('/inventory', verificarToken, transactionController.getInventory);

// POST /api/attendance
router.post('/attendance', verificarToken, transactionController.registerAttendance);

// POST /api/deliveries
router.post('/deliveries', verificarToken, deliveriesController.createDelivery);

// POST /api/decreases
router.post('/decreases', verificarToken, decreasesController.createDecrease);

module.exports = router;
