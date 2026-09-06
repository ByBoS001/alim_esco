const { pgTable, serial, text, integer } = require('drizzle-orm/pg-core');
const { roles } = require('./roles');
const { userCredentials } = require('./users_credentials');
const { schools } = require('./schools');

const userProfiles = pgTable('user_profiles', {
    id_profile: serial('id_profile').primaryKey(),
    cedula: text('cedula').unique().notNull(),
    name: text('name').notNull(),
    last_name: text('last_name').notNull(),
    phone: text('phone'),
    id_role: integer('id_role').references(() => roles.id_role).notNull(),
    id_credential: integer('id_credential').references(() => userCredentials.id_credential).unique().notNull(),
    id_school: integer('id_school').references(() => schools.id_school),
    // Para Admin Zonal: número de zona educativa (1-7 en Ecuador).
    // null = sin restricción de zona (Super Admin, Operador de escuela, etc.)
    id_zone: integer('id_zone')
});

module.exports = { userProfiles };
