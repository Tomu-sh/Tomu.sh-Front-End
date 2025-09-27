import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'
import { authTables } from '@convex-dev/auth/server'

const applicationTables = {
  wallets: defineTable({
    userId: v.id('users'),
    balance: v.number(), // balance in cents
  }).index('by_user', ['userId']),

  transactions: defineTable({
    userId: v.id('users'),
    txHash: v.string(),
    amount: v.number(), // amount in cents
    prompt: v.string(),
    result: v.optional(v.string()),
    status: v.union(
      v.literal('pending'),
      v.literal('completed'),
      v.literal('failed')
    ),
    generationType: v.optional(v.union(v.literal('text'), v.literal('image'))),
    options: v.optional(
      v.object({
        model: v.optional(v.string()),
        size: v.optional(v.string()),
        quality: v.optional(v.string()),
        style: v.optional(v.string()),
      })
    ),
  }).index('by_user', ['userId']),
}

export default defineSchema({
  ...authTables,
  ...applicationTables,
})
