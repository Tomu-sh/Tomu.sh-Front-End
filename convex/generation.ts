import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

export const processGeneration = mutation({
  args: { 
    prompt: v.string(),
    estimatedCost: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("User not authenticated");
    }

    // Mock transaction hash generation
    const txHash = "0x" + Math.random().toString(16).substring(2, 66);

    // Deduct from wallet
    const wallet = await ctx.db
      .query("wallets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();

    if (!wallet || wallet.balance < args.estimatedCost) {
      throw new Error("Insufficient balance");
    }

    await ctx.db.patch(wallet._id, {
      balance: wallet.balance - args.estimatedCost,
    });

    // Log transaction
    const transactionId = await ctx.db.insert("transactions", {
      userId,
      txHash,
      amount: args.estimatedCost,
      prompt: args.prompt,
      status: "pending",
    });

    // Simulate generation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Mock generation result
    const result = `Generated result for: "${args.prompt}" - A beautiful AI-generated creation based on your prompt!`;

    // Update transaction with result
    await ctx.db.patch(transactionId, {
      result,
      status: "completed",
    });

    return {
      txHash,
      result,
      newBalance: wallet.balance - args.estimatedCost,
    };
  },
});

export const getTransactionHistory = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return [];
    }

    return await ctx.db
      .query("transactions")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(10);
  },
});
