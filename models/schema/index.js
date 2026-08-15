const roles = require('./roles');
const categories = require('./categories');
const products = require('./products');
const users = require('./users');
const users_credentials = require('./users_credentials');
const inventory = require('./inventory');
const operations = require('./operations');

// Exportamos de forma unificada todos los esquemas para la conexión principal
module.exports = {
    ...roles,
    ...categories,
    ...products,
    ...users,
    ...users_credentials,
    ...inventory,
    ...operations
};
