import { sql } from 'drizzle-orm';
import {
  text,
  uuid,
  pgEnum,
  integer,
  pgTable,
  timestamp,
  uniqueIndex,
  numeric,
  index,
  char,
} from 'drizzle-orm/pg-core';

export const providerE         = pgEnum('provider_e', ['gmail', 'apple', 'wallet']); // prettier-ignore
export const cardStatusE       = pgEnum('card_status_e', ['active', 'inactive', 'deleted']); // prettier-ignore
export const paymentStatusE    = pgEnum('payment_status_e', ['started', 'completed', 'cancelled']); // prettier-ignore

export type User = typeof users.$inferSelect;
export type Card = typeof cards.$inferSelect;

// prettier-ignore
export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  address: text('address').notNull(),
  balance: numeric('balance', { precision: 20, scale: 2 }).notNull().default('0.00'), // total balance in usd
  provider: providerE('provider').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    uniqueIndex("u_user_address").on(t.address),
    index('i_user_name').on(t.name)
]);

// prettier-ignore
export const transfers = pgTable('transfers', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, {onDelete: "cascade"}),
  symbol: text('symbol').notNull(),
  amount: numeric('amount', { precision: 78, scale: 0 }).notNull(),
  decimals: integer('decimals').notNull(),
  sender: text('sender').notNull(),
  receiver: text('receiver').notNull(),
  txHash: text("tx_hash").notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    uniqueIndex("u_transfer_tx").on(t.txHash),
    index("i_transfer_user").on(t.userId),
]);

// prettier-ignore
export const cards = pgTable('cards', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  stripeCardId: text('stripe_card_id').notNull(),
  stripeCardHolderId: text('stripe_cardholder_id').notNull(),
  name: text('text').notNull(),
  brand: text('brand').notNull(),
  last4: char('last_4', {length: 4}).notNull(),
  status: cardStatusE('status').notNull(),
  spendingLimit: numeric('spending_limit', { precision: 20, scale: 2 }).notNull().default('0.00'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    uniqueIndex("u_card_user").on(t.userId),
    uniqueIndex('i_card_stripe_id').on(t.stripeCardId),
]);

// prettier-ignore
export const payments = pgTable('payments', {
  id: uuid('id').primaryKey().defaultRandom(),
  cardId: uuid('card_id').notNull().references(() => cards.id, { onDelete: 'cascade' }),
  paymentId: text('payment_id').notNull(),
  currency: text('currency').notNull(), // USD, ARS, MEX, EUR, etc
  amount: numeric('amount', { precision: 20, scale: 0 }).notNull(),
  merchant_name: text('merchant_name').notNull(), // commerce name
  merchant_currency: text('merchant_currency').notNull(), // USD, ARS, MEX, EUR, etc
  merchant_amount: numeric('merchant_amount', { precision: 20, scale: 0 }).notNull(),
  status: paymentStatusE('status').notNull().default('started'),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    index("i_payment_card").on(t.cardId),
    uniqueIndex('u_payment_id').on(t.paymentId),
])

// prettier-ignore
export const executions = pgTable('executions', {
  id: uuid('id').primaryKey().defaultRandom(),
  paymentId: uuid('payment_id').notNull().references(() => payments.id, { onDelete: 'cascade' }),
  symbol: text('symbol').notNull(),
  amount: numeric('amount', { precision: 78, scale: 0 }).notNull(),
  decimals: integer('decimals').notNull(),
  txHash: text("tx_hash").notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
    uniqueIndex("u_execution_payment").on(t.paymentId),
    uniqueIndex("u_execution_tx").on(t.txHash)
]);

// prettier-ignore
export const vaults = pgTable('vaults', {
  id: uuid('id').primaryKey().defaultRandom(),
  userId: uuid('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  collaborators: text('collaborators').array().notNull().default(sql`ARRAY[]::text[]`),
  address: text('address').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
}, (t) => [
  index("i_vault_user").on(t.userId)
]);
