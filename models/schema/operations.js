const { pgTable, serial, integer, date, text } = require('drizzle-orm/pg-core');
const { batchInventory } = require('./inventory');
const { userProfiles } = require('./users');

const dailyAttendance = pgTable('daily_attendance', {
    id_daily_attendance: serial('id_daily_attendance').primaryKey(),
    date: date('date').notNull(),
    student_quantity: integer('student_quantity').notNull(),
});

const dailyDeliveries = pgTable('daily_deliveries', {
    id_daily_deliveries: serial('id_daily_deliveries').primaryKey(),
    date: date('date').notNull(),
    id_batch_inventory: integer('id_batch_inventory').references(() => batchInventory.id_batch_inventory).notNull(),
    quantity_delivered: integer('quantity_delivered').notNull(),
    id_profile: integer('id_profile').references(() => userProfiles.id_profile).notNull(),
});

const decrease = pgTable('decrease', {
    id_decrease: serial('id_decrease').primaryKey(),
    date: date('date').notNull(),
    id_batch_inventory: integer('id_batch_inventory').references(() => batchInventory.id_batch_inventory).notNull(),
    quantity_leftover: integer('quantity_leftover').notNull(),
    reason: text('reason'),
});

module.exports = { dailyAttendance, dailyDeliveries, decrease };
