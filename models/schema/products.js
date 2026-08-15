const { pgTable, serial, text, integer } = require('drizzle-orm/pg-core');
const { productCategories } = require('./categories');

const productCatalog = pgTable('product_catalog', {
    id_product: serial('id_product').primaryKey(),
    name: text('name').notNull(),
    id_category: integer('id_category').references(() => productCategories.id_category).notNull()
});

module.exports = { productCatalog };
