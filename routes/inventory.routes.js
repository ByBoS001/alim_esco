const express = require('express');
const router = express.Router();
const inventoryController = require('../controllers/inventoryController');
const { verificarToken, checkRole } = require('../middlewares/authMiddleware');

// POST /api/inventory/batch
router.post('/batch', verificarToken, checkRole('Operator'), inventoryController.createBatch);

// GET /api/inventory/batches/:id_product
router.get('/batches/:id_product', verificarToken, inventoryController.getAvailableBatches);

module.exports = router;
