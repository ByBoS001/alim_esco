const express = require('express');
const router = express.Router();
const { getCategories, createCategory, updateCategory, deleteCategory } = require('../controllers/categories.controller');
const { verificarToken: verifyToken, verificarRolAdmin: verifyAdminRole } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, getCategories);
router.post('/', verifyToken, verifyAdminRole, createCategory);
router.put('/:id', verifyToken, verifyAdminRole, updateCategory);
router.delete('/:id', verifyToken, verifyAdminRole, deleteCategory);

module.exports = router;
