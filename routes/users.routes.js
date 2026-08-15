const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser } = require('../controllers/users.controller');
const { verificarToken: verifyToken, verificarRolAdmin: verifyAdminRole } = require('../middlewares/authMiddleware');

// Las operaciones de usuarios son netamente administrativas (todas las rutas exigen admin)
router.get('/', verifyToken, verifyAdminRole, getUsers);
router.post('/', verifyToken, verifyAdminRole, createUser);
router.put('/:id', verifyToken, verifyAdminRole, updateUser);
router.delete('/:id', verifyToken, verifyAdminRole, deleteUser);

module.exports = router;
