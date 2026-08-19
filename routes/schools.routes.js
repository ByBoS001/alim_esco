const express = require('express');
const router = express.Router();
const { getSchools, getSchoolById, createSchool, updateSchool, deleteSchool } = require('../controllers/schools.controller');
const { verificarToken: verifyToken, verificarRolAdmin: verifyAdminRole } = require('../middlewares/authMiddleware');

// Super Admin / Role enforcement applied to write routes
router.get('/', verifyToken, getSchools);
router.get('/:id', verifyToken, getSchoolById);
router.post('/', verifyToken, verifyAdminRole, createSchool);
router.put('/:id', verifyToken, verifyAdminRole, updateSchool);
router.delete('/:id', verifyToken, verifyAdminRole, deleteSchool);

module.exports = router;
