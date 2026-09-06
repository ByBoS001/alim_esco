const { pgTable, serial, text } = require('drizzle-orm/pg-core');

const userCredentials = pgTable('user_credentials', {
    id_credential: serial('id_credential').primaryKey(),
    email: text('email').unique().notNull(),
    password_hash: text('password_hash').notNull(),
    // Estado de la cuenta: 'active' | 'suspended' | 'blocked'
    status: text('status').notNull().default('active')
});

module.exports = { userCredentials };
