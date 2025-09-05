import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const PermitStatus = v.union(
  v.literal("applied"),
  v.literal("under_review"),
  v.literal("additional_docs"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("escalated")
);

// Create permit application
export const createPermitApplication = mutation({
  args: {
    userId: v.string(),
    serviceId: v.id("services"),
    office: v.string(),
    officeLocal: v.optional(v.string()),
    expectedDays: v.number(),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.insert("permitApplications", {
      ...args,
      appliedDate: now,
      currentStatus: "applied",
      isDelayed: false,
      escalationLetterGenerated: false,
      statusHistory: [{
        status: "applied",
        timestamp: now,
        note: "Application submitted",
      }],
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update permit status
export const updatePermitStatus = mutation({
  args: {
    id: v.id("permitApplications"),
    status: PermitStatus,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const permit = await ctx.db.get(args.id);
    if (!permit) throw new Error("Permit not found");
    
    const now = Date.now();
    const actualDays = Math.floor((now - permit.appliedDate) / (24 * 60 * 60 * 1000));
    const isDelayed = actualDays > permit.expectedDays;
    
    const newStatusEntry = {
      status: args.status,
      timestamp: now,
      note: args.note,
    };
    
    await ctx.db.patch(args.id, {
      currentStatus: args.status,
      actualDays: args.status === "approved" ? actualDays : undefined,
      completionDate: args.status === "approved" ? now : undefined,
      isDelayed,
      delayDays: isDelayed ? actualDays - permit.expectedDays : undefined,
      statusHistory: [...permit.statusHistory, newStatusEntry],
      updatedAt: now,
    });
    
    return args.id;
  },
});

// Get user permits
export const getUserPermits = query({
  args: {
    userId: v.string(),
    status: v.optional(PermitStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("permitApplications")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("currentStatus"), args.status));
    }
    
    return await query.order("desc").take(args.limit || 50).collect();
  },
});

// Get delayed permits
export const getDelayedPermits = query({
  args: {
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("permitApplications")
      .withIndex("by_is_delayed", (q) => q.eq("isDelayed", true));
    
    if (args.userId) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId));
    }
    
    return await query.order("desc").take(args.limit || 50).collect();
  },
});

// Generate escalation letter
export const generateEscalationLetter = mutation({
  args: {
    id: v.id("permitApplications"),
  },
  handler: async (ctx, args) => {
    const permit = await ctx.db.get(args.id);
    if (!permit) throw new Error("Permit not found");
    
    const service = await ctx.db.get(permit.serviceId);
    if (!service) throw new Error("Service not found");
    
    await ctx.db.patch(args.id, {
      escalationLetterGenerated: true,
      escalationDate: Date.now(),
      updatedAt: Date.now(),
    });
    
    // Return letter template data
    return {
      permitId: permit._id,
      serviceName: service.name,
      office: permit.office,
      appliedDate: permit.appliedDate,
      expectedDays: permit.expectedDays,
      actualDays: Math.floor((Date.now() - permit.appliedDate) / (24 * 60 * 60 * 1000)),
      delayDays: permit.delayDays,
    };
  },
});

// Get permit statistics
export const getPermitStats = query({
  args: {
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("permitApplications");
    
    if (args.userId) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId));
    }
    
    const permits = await query.collect();
    
    const totalPermits = permits.length;
    const delayedPermits = permits.filter(p => p.isDelayed).length;
    const approvedPermits = permits.filter(p => p.currentStatus === "approved").length;
    
    const statusCounts = permits.reduce((acc, permit) => {
      acc[permit.currentStatus] = (acc[permit.currentStatus] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const averageProcessingTime = approvedPermits > 0 
      ? permits.filter(p => p.actualDays).reduce((sum, p) => sum + (p.actualDays || 0), 0) / approvedPermits
      : 0;
    
    return {
      totalPermits,
      delayedPermits,
      delayRate: totalPermits > 0 ? (delayedPermits / totalPermits) * 100 : 0,
      approvedPermits,
      approvalRate: totalPermits > 0 ? (approvedPermits / totalPermits) * 100 : 0,
      statusCounts,
      averageProcessingTime,
    };
  },
});