const express = require('express');
const router = express.Router();
const catalogController = require('../controllers/catalogController');

// Usando desestructuración con alias para mapear las funciones a la nomenclatura "verifyToken"
const { verificarToken: verifyToken, verificarRolAdmin: verifyAdminRole } = require('../middlewares/authMiddleware');

// === ROLES ===
router.get('/roles', verifyToken, catalogController.getRoles); // Solo lectura para cualquier logueado
router.post('/roles', verifyToken, verifyAdminRole, catalogController.createRole); // Creación solo para Admin

// === CATEGORIES ===
router.get('/categories', verifyToken, catalogController.getCategories);
router.post('/categories', verifyToken, verifyAdminRole, catalogController.createCategory);
router.put('/categories/:id', verifyToken, verifyAdminRole, catalogController.updateCategory);
router.delete('/categories/:id', verifyToken, verifyAdminRole, catalogController.deleteCategory);

// === PRODUCTS ===
router.get('/products', verifyToken, catalogController.getProducts);
router.post('/products', verifyToken, verifyAdminRole, catalogController.createProduct);
router.put('/products/:id', verifyToken, verifyAdminRole, catalogController.updateProduct);
router.delete('/products/:id', verifyToken, verifyAdminRole, catalogController.deleteProduct);

module.exports = router;
