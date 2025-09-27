import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const getWalletBalance = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }

    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    return wallet?.balance ?? null;
  },
});

export const initializeWallet = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const existingWallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (existingWallet) {
      return existingWallet.balance;
    }

    // Create wallet with initial balance of $10.00 (1000 cents)
    await ctx.db.insert("wallets", {
      userId,
      balance: 1000,
    });
    
    return 1000;
  },
});

export const deductFromWallet = mutation({
  args: { cents: v.number() },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!wallet) {
      throw new Error("Wallet not found");
    }

    if (wallet.balance < args.cents) {
      throw new Error("Insufficient balance");
    }

    await ctx.db.patch(wallet._id, {
      balance: wallet.balance - args.cents,
    });

    return wallet.balance - args.cents;
  },
});

export const getCostEstimate = query({
  args: { prompt: v.string() },
  handler: async (ctx, args) => {
    // Mock cost calculation: base cost + per-character cost + gas overhead
    const basePrice = 5; // 5 cents base
    const perCharPrice = Math.ceil(args.prompt.length * 0.1); // 0.1 cents per character
    const gasOverhead = 2; // 2 cents gas overhead
    
    return basePrice + perCharPrice + gasOverhead;
  },
});
