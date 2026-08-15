const express = require('express');
const router = express.Router();

const rolesRoutes = require('./roles.routes');
const categoriesRoutes = require('./categories.routes');
const productsRoutes = require('./products.routes');
const usersRoutes = require('./users.routes');

const authRoutes = require('./auth');
const transactionRoutes = require('./transactionRoutes');

router.use('/roles', rolesRoutes);
router.use('/categories', categoriesRoutes);
router.use('/products', productsRoutes);
router.use('/users', usersRoutes);

router.use('/', authRoutes);
router.use('/', transactionRoutes);

module.exports = router;
