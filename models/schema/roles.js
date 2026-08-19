/**
 * Conceptual Role Hierarchy Support:
 * - 'Super Admin' (Zonal): Highest level, operates across multiple or all schools.
 * - 'Soporte Local' (Escuela): Local IT/system support dedicated to a specific school.
 * - 'Director' (Escuela): Administrative head of a specific school.
 * - 'Operador' (Escuela): Inventory handler or daily operations worker at a specific school.
 * 
 * Due to the flexible nature of this table, these roles can be seeded as specific rows
 * and differentiated in the application logic.
 */
const { pgTable, serial, text } = require('drizzle-orm/pg-core');


const roles = pgTable('roles', {
    id_role: serial('id_role').primaryKey(),
    name: text('name').notNull().unique(),
    description: text('description')
});

module.exports = { roles };
