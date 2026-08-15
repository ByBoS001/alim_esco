const { pgTable, serial, text } = require('drizzle-orm/pg-core');

const roles = pgTable('roles', {
    id_role: serial('id_role').primaryKey(),
    name: text('name').notNull().unique(),
    description: text('description')
});

module.exports = { roles };
