import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  wallets: defineTable({
    userId: v.id("users"),
    balance: v.number(), // balance in cents
  }).index("by_user", ["userId"]),
  
  transactions: defineTable({
    userId: v.id("users"),
    txHash: v.string(),
    amount: v.number(), // amount in cents
    prompt: v.string(),
    result: v.optional(v.string()),
    status: v.union(v.literal("pending"), v.literal("completed"), v.literal("failed")),
  }).index("by_user", ["userId"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
