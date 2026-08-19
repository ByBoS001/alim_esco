const express = require('express');
const router = express.Router();

const rolesRoutes = require('./roles.routes');
const categoriesRoutes = require('./categories.routes');
const productsRoutes = require('./products.routes');
const usersRoutes = require('./users.routes');
const inventoryRoutes = require('./inventory.routes');
const operationsRoutes = require('./operations.routes');
const dashboardRoutes = require('./dashboard.routes');
const authRoutes = require('./auth');
const transactionRoutes = require('./transactionRoutes');
const schoolsRoutes = require('./schools.routes');

router.use('/roles', rolesRoutes);
router.use('/categories', categoriesRoutes);
router.use('/products', productsRoutes);
router.use('/users', usersRoutes);
router.use('/inventory', inventoryRoutes);
router.use('/operations', operationsRoutes);
router.use('/', dashboardRoutes);
router.use('/', authRoutes);
router.use('/', transactionRoutes);
router.use('/schools', schoolsRoutes);

module.exports = router;
