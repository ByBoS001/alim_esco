const { pgTable, serial, text } = require('drizzle-orm/pg-core');

const schools = pgTable('schools', {
    id_school: serial('id_school').primaryKey(),
    name: text('name').notNull(),
    address: text('address'),
    zone: text('zone')
});

module.exports = { schools };
