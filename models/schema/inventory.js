const { pgTable, serial, integer, date } = require('drizzle-orm/pg-core');
const { productCatalog } = require('./products');
const { schools } = require('./schools');

const batchInventory = pgTable('batch_inventory', {
    id_batch_inventory: serial('id_batch_inventory').primaryKey(),
    id_product: integer('id_product').references(() => productCatalog.id_product).notNull(),
    id_school: integer('id_school').references(() => schools.id_school).notNull(),
    total_quantity: integer('total_quantity').notNull(),
    entry_date: date('entry_date').notNull(),
    expiration_date: date('expiration_date').notNull(),
});

module.exports = { batchInventory };
