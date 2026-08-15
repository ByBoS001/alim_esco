const { pgTable, serial, text } = require('drizzle-orm/pg-core');

const productCategories = pgTable('product_categories', {
    id_category: serial('id_category').primaryKey(),
    name: text('name').notNull()
});

module.exports = { productCategories };
