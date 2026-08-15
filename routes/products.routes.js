const express = require('express');
const router = express.Router();
const { getProducts, createProduct, updateProduct, deleteProduct } = require('../controllers/products.controller');
const { verificarToken: verifyToken, verificarRolAdmin: verifyAdminRole } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, getProducts);
router.post('/', verifyToken, verifyAdminRole, createProduct);
router.put('/:id', verifyToken, verifyAdminRole, updateProduct);
router.delete('/:id', verifyToken, verifyAdminRole, deleteProduct);

module.exports = router;
