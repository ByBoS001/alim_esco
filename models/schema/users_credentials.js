const { pgTable, serial, text } = require('drizzle-orm/pg-core');

const userCredentials = pgTable('user_credentials', {
    id_credential: serial('id_credential').primaryKey(),
    email: text('email').unique().notNull(),
    password_hash: text('password_hash').notNull()
});

module.exports = { userCredentials };
