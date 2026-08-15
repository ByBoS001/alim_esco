const express = require('express');
const router = express.Router();
const { getRoles, createRole } = require('../controllers/roles.controller');
const { verificarToken: verifyToken, verificarRolAdmin: verifyAdminRole } = require('../middlewares/authMiddleware');

router.get('/', verifyToken, getRoles);
router.post('/', verifyToken, verifyAdminRole, createRole);
module.exports = router;
