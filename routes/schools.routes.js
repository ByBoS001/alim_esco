const express = require('express');
const router = express.Router();
const { getSchools, getSchoolById, createSchool, updateSchool, deleteSchool } = require('../controllers/schools.controller');
const { verificarToken, verificarRolAdmin, checkZona } = require('../middlewares/authMiddleware');

// GET: cualquier admin (Super o Zonal) puede listar — checkZona filtra automáticamente
router.get('/', verificarToken, verificarRolAdmin, checkZona, getSchools);
router.get('/:id', verificarToken, verificarRolAdmin, checkZona, getSchoolById);

// Escritura: también pasa por checkZona — el controller valida que sea de su zona
router.post('/', verificarToken, verificarRolAdmin, checkZona, createSchool);
router.put('/:id', verificarToken, verificarRolAdmin, checkZona, updateSchool);
router.delete('/:id', verificarToken, verificarRolAdmin, checkZona, deleteSchool);

module.exports = router;
