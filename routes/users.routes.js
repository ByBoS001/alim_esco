const express = require('express');
const router = express.Router();
const { getUsers, createUser, updateUser, deleteUser, updateAccountStatus } = require('../controllers/users.controller');
const { verificarToken, verificarRolAdmin, checkZona } = require('../middlewares/authMiddleware');

// Todas las operaciones de usuarios son administrativas
// checkZona filtra/valida automáticamente la zona del Admin Zonal
router.get('/', verificarToken, verificarRolAdmin, checkZona, getUsers);
router.post('/', verificarToken, verificarRolAdmin, checkZona, createUser);
router.put('/:id', verificarToken, verificarRolAdmin, checkZona, updateUser);
router.delete('/:id', verificarToken, verificarRolAdmin, checkZona, deleteUser);

// Gestión de estado de cuenta: active | suspended | blocked
router.patch('/:id/status', verificarToken, verificarRolAdmin, checkZona, updateAccountStatus);

module.exports = router;
