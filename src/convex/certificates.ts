import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Generate a random access code
function generateAccessCode() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

export const create = mutation({
  args: {
    candidateName: v.string(),
    role: v.string(),
    duration: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const accessCode = generateAccessCode();
    
    const id = await ctx.db.insert("certificates", {
      candidateName: args.candidateName,
      role: args.role,
      duration: args.duration,
      accessCode,
      issueDate: Date.now(),
      createdBy: userId,
    });

    return { id, accessCode };
  },
});

export const bulkCreate = mutation({
  args: {
    certificates: v.array(
      v.object({
        candidateName: v.string(),
        role: v.string(),
        duration: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    const results = [];
    for (const cert of args.certificates) {
      const accessCode = generateAccessCode();
      const id = await ctx.db.insert("certificates", {
        ...cert,
        accessCode,
        issueDate: Date.now(),
        createdBy: userId,
      });
      results.push({ id, accessCode, ...cert });
    }
    return results;
  },
});

export const update = mutation({
  args: {
    id: v.id("certificates"),
    candidateName: v.string(),
    role: v.string(),
    duration: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");

    await ctx.db.patch(args.id, {
      candidateName: args.candidateName,
      role: args.role,
      duration: args.duration,
    });
  },
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return []; // Or throw error if strict

    return await ctx.db.query("certificates").order("desc").collect();
  },
});

export const getByAccessCode = query({
  args: { accessCode: v.string() },
  handler: async (ctx, args) => {
    const cert = await ctx.db
      .query("certificates")
      .withIndex("by_accessCode", (q) => q.eq("accessCode", args.accessCode))
      .unique();
    return cert;
  },
});

export const deleteCertificate = mutation({
  args: { id: v.id("certificates") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Unauthorized");
    
    await ctx.db.delete(args.id);
  },
});