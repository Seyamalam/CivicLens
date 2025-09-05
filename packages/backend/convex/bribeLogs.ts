import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// GeoLocation validator
const GeoLocation = v.object({
  latitude: v.number(),
  longitude: v.number(),
  address: v.optional(v.string()),
  ward: v.optional(v.string()),
  district: v.optional(v.string())
});

// Simple hash function for demo
function generateLogHash(logData: any, previousHash?: string): string {
  const data = `${logData.timestamp}|${logData.office}|${logData.service}|${logData.amount || 0}|${previousHash || ''}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

// Create a new bribe log
export const createBribeLog = mutation({
  args: {
    userId: v.string(),
    office: v.string(),
    officeLocal: v.optional(v.string()),
    service: v.string(),
    serviceLocal: v.optional(v.string()),
    amount: v.optional(v.number()),
    currency: v.string(),
    audioUrl: v.optional(v.string()),
    textNote: v.optional(v.string()),
    location: v.optional(GeoLocation),
    isAnonymous: v.boolean(),
    severity: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Get latest log for hash chain
    const latestLog = await ctx.db
      .query("bribeLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .first();
    
    const previousHash = latestLog?.hash;
    const logData = { ...args, timestamp: now };
    const hash = generateLogHash(logData, previousHash);
    
    return await ctx.db.insert("bribeLogs", {
      ...args,
      timestamp: now,
      hash,
      previousHash,
      reportedToAuthorities: false,
      createdAt: now,
    });
  },
});

// Get user's bribe logs
export const getUserBribeLogs = query({
  args: {
    userId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bribeLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(args.limit || 50)
      .collect();
  },
});

// Get anonymized bribe logs for analytics
export const getBribeLogs = query({
  args: {
    office: v.optional(v.string()),
    severity: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("bribeLogs");
    
    if (args.office) {
      query = query.filter((q) => q.eq(q.field("office"), args.office));
    }
    
    if (args.severity) {
      query = query.filter((q) => q.eq(q.field("severity"), args.severity));
    }
    
    const logs = await query.order("desc").take(args.limit || 50).collect();
    
    // Return anonymized data
    return logs.map(log => ({
      _id: log._id,
      office: log.office,
      service: log.service,
      timestamp: log.timestamp,
      amount: log.amount,
      severity: log.severity,
      location: log.location,
      hash: log.hash,
    }));
  },
});

// Get bribe statistics
export const getBribeStats = query({
  args: {
    timeRange: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let startDate = 0;
    const now = Date.now();
    
    if (args.timeRange === "last_30_days") {
      startDate = now - (30 * 24 * 60 * 60 * 1000);
    }
    
    let query = ctx.db.query("bribeLogs");
    if (startDate > 0) {
      query = query.filter((q) => q.gte(q.field("timestamp"), startDate));
    }
    
    const logs = await query.collect();
    
    const totalLogs = logs.length;
    const totalAmount = logs.reduce((sum, log) => sum + (log.amount || 0), 0);
    
    const severityStats = logs.reduce((acc, log) => {
      acc[log.severity] = (acc[log.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const officeStats = logs.reduce((acc, log) => {
      acc[log.office] = (acc[log.office] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalLogs,
      totalAmount,
      severityStats,
      officeStats,
    };
  },
});

// Verify hash chain integrity
export const verifyHashChain = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const logs = await ctx.db
      .query("bribeLogs")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("asc")
      .collect();
    
    let previousHash: string | undefined;
    let isValid = true;
    
    for (const log of logs) {
      const expectedHash = generateLogHash({
        timestamp: log.timestamp,
        office: log.office,
        service: log.service,
        amount: log.amount,
      }, previousHash);
      
      if (expectedHash !== log.hash || log.previousHash !== previousHash) {
        isValid = false;
        break;
      }
      
      previousHash = log.hash;
    }
    
    return {
      isChainValid: isValid,
      totalLogs: logs.length,
    };
  },
});