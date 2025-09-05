import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// RTI STATUS ENUM
const RTIStatus = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("under_review"),
  v.literal("responded"),
  v.literal("appealed"),
  v.literal("overdue"),
  v.literal("rejected")
);

// RTI REQUEST CRUD OPERATIONS

// Create a new RTI request
export const createRTIRequest = mutation({
  args: {
    userId: v.string(),
    agency: v.string(),
    agencyLocal: v.optional(v.string()),
    topic: v.string(),
    topicLocal: v.optional(v.string()),
    requestText: v.string(),
    requestTextLocal: v.optional(v.string()),
    templateUsed: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const deadline = now + (30 * 24 * 60 * 60 * 1000); // 30 days from now
    
    return await ctx.db.insert("rtiRequests", {
      ...args,
      status: "draft",
      submissionDate: now,
      deadline,
      isPublished: false,
      followUpCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Submit RTI request (change status from draft to submitted)
export const submitRTIRequest = mutation({
  args: {
    id: v.id("rtiRequests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error("RTI request not found");
    }
    
    if (request.status !== "draft") {
      throw new Error("Only draft requests can be submitted");
    }
    
    const now = Date.now();
    const deadline = now + (30 * 24 * 60 * 60 * 1000); // 30 days from submission
    
    await ctx.db.patch(args.id, {
      status: "submitted",
      submissionDate: now,
      deadline,
      updatedAt: now,
    });
    
    // TODO: Create notification for deadline reminder
    
    return args.id;
  },
});

// Update RTI request status
export const updateRTIStatus = mutation({
  args: {
    id: v.id("rtiRequests"),
    status: RTIStatus,
    response: v.optional(v.string()),
    outcome: v.optional(v.string()),
    outcomeLocal: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const now = Date.now();
    
    const updateData: any = {
      ...updates,
      updatedAt: now,
    };
    
    // Set response date if status is responded
    if (updates.status === "responded") {
      updateData.responseDate = now;
    }
    
    // Set appeal date if status is appealed
    if (updates.status === "appealed") {
      updateData.appealDate = now;
    }
    
    await ctx.db.patch(id, updateData);
    
    return id;
  },
});

// Get user's RTI requests
export const getUserRTIRequests = query({
  args: {
    userId: v.string(),
    status: v.optional(RTIStatus),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("rtiRequests")
      .withIndex("by_user", (q) => q.eq("userId", args.userId));
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    query = query.order("desc");
    
    if (args.offset) {
      query = query.skip(args.offset);
    }
    
    return await query.take(args.limit || 50).collect();
  },
});

// Get all RTI requests with filtering
export const getRTIRequests = query({
  args: {
    status: v.optional(RTIStatus),
    agency: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("rtiRequests");
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    if (args.agency) {
      query = query.filter((q) => q.eq(q.field("agency"), args.agency));
    }
    
    if (args.isPublished !== undefined) {
      query = query.filter((q) => q.eq(q.field("isPublished"), args.isPublished));
    }
    
    query = query.order("desc");
    
    if (args.offset) {
      query = query.skip(args.offset);
    }
    
    return await query.take(args.limit || 50).collect();
  },
});

// Search RTI requests
export const searchRTIRequests = query({
  args: {
    searchTerm: v.string(),
    status: v.optional(RTIStatus),
    agency: v.optional(v.string()),
    isPublished: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("rtiRequests")
      .withSearchIndex("search_rti", (q) => {
        let searchQuery = q.search("topic", args.searchTerm);
        
        if (args.status) {
          searchQuery = searchQuery.filter((q) => q.eq(q.field("status"), args.status));
        }
        
        if (args.agency) {
          searchQuery = searchQuery.filter((q) => q.eq(q.field("agency"), args.agency));
        }
        
        if (args.isPublished !== undefined) {
          searchQuery = searchQuery.filter((q) => q.eq(q.field("isPublished"), args.isPublished));
        }
        
        return searchQuery;
      })
      .take(50);
    
    return results;
  },
});

// Get RTI request by ID
export const getRTIRequest = query({
  args: { id: v.id("rtiRequests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Publish RTI outcome (make it public)
export const publishRTIOutcome = mutation({
  args: {
    id: v.id("rtiRequests"),
    publishedOutcome: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error("RTI request not found");
    }
    
    if (request.status !== "responded") {
      throw new Error("Only responded requests can be published");
    }
    
    await ctx.db.patch(args.id, {
      isPublished: true,
      publishedOutcome: args.publishedOutcome,
      updatedAt: Date.now(),
    });
    
    return args.id;
  },
});

// Get overdue RTI requests
export const getOverdueRTIRequests = query({
  args: {
    userId: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    let query = ctx.db
      .query("rtiRequests")
      .filter((q) => 
        q.and(
          q.lt(q.field("deadline"), now),
          q.neq(q.field("status"), "responded"),
          q.neq(q.field("status"), "rejected")
        )
      );
    
    if (args.userId) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId));
    }
    
    return await query
      .order("asc") // Oldest first
      .take(args.limit || 50)
      .collect();
  },
});

// Mark RTI requests as overdue (system function)
export const markOverdueRequests = mutation({
  args: {},
  handler: async (ctx, args) => {
    const now = Date.now();
    
    const overdueRequests = await ctx.db
      .query("rtiRequests")
      .filter((q) => 
        q.and(
          q.lt(q.field("deadline"), now),
          q.eq(q.field("status"), "submitted")
        )
      )
      .collect();
    
    const updates = overdueRequests.map(request => 
      ctx.db.patch(request._id, {
        status: "overdue",
        updatedAt: now,
      })
    );
    
    await Promise.all(updates);
    
    return overdueRequests.length;
  },
});

// Follow up on RTI request
export const followUpRTIRequest = mutation({
  args: {
    id: v.id("rtiRequests"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) {
      throw new Error("RTI request not found");
    }
    
    await ctx.db.patch(args.id, {
      followUpCount: request.followUpCount + 1,
      updatedAt: Date.now(),
    });
    
    return args.id;
  },
});

// Get RTI statistics
export const getRTIStats = query({
  args: {
    userId: v.optional(v.string()),
    timeRange: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let startDate = 0;
    const now = Date.now();
    
    if (args.timeRange === "last_30_days") {
      startDate = now - (30 * 24 * 60 * 60 * 1000);
    } else if (args.timeRange === "last_90_days") {
      startDate = now - (90 * 24 * 60 * 60 * 1000);
    } else if (args.timeRange === "last_year") {
      startDate = now - (365 * 24 * 60 * 60 * 1000);
    }
    
    let query = ctx.db.query("rtiRequests");
    
    if (args.userId) {
      query = query.filter((q) => q.eq(q.field("userId"), args.userId));
    }
    
    if (startDate > 0) {
      query = query.filter((q) => q.gte(q.field("createdAt"), startDate));
    }
    
    const requests = await query.collect();
    
    const totalRequests = requests.length;
    const statusCounts = requests.reduce((acc, request) => {
      acc[request.status] = (acc[request.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    const respondedRequests = requests.filter(r => r.status === "responded");
    const averageResponseTime = respondedRequests.length > 0 
      ? respondedRequests.reduce((sum, r) => {
          return sum + ((r.responseDate || 0) - r.submissionDate);
        }, 0) / respondedRequests.length
      : 0;
    
    const publishedOutcomes = requests.filter(r => r.isPublished).length;
    
    // Agency performance
    const agencyStats = requests.reduce((acc, request) => {
      const agency = request.agency;
      if (!acc[agency]) {
        acc[agency] = {
          total: 0,
          responded: 0,
          overdue: 0,
          averageResponseTime: 0,
        };
      }
      
      acc[agency].total++;
      if (request.status === "responded") {
        acc[agency].responded++;
        if (request.responseDate) {
          acc[agency].averageResponseTime += 
            (request.responseDate - request.submissionDate);
        }
      }
      if (request.status === "overdue") {
        acc[agency].overdue++;
      }
      
      return acc;
    }, {} as Record<string, any>);
    
    // Calculate averages for agency stats
    Object.keys(agencyStats).forEach(agency => {
      if (agencyStats[agency].responded > 0) {
        agencyStats[agency].averageResponseTime = 
          agencyStats[agency].averageResponseTime / agencyStats[agency].responded;
      }
      agencyStats[agency].responseRate = 
        (agencyStats[agency].responded / agencyStats[agency].total) * 100;
    });
    
    return {
      totalRequests,
      statusCounts,
      averageResponseTime: averageResponseTime / (24 * 60 * 60 * 1000), // Convert to days
      publishedOutcomes,
      publishRate: totalRequests > 0 ? (publishedOutcomes / totalRequests) * 100 : 0,
      responseRate: totalRequests > 0 ? (statusCounts.responded || 0) / totalRequests * 100 : 0,
      agencyStats,
      timeRange: args.timeRange || "all_time",
    };
  },
});

// Get published RTI outcomes (public repository)
export const getPublishedRTIOutcomes = query({
  args: {
    agency: v.optional(v.string()),
    topic: v.optional(v.string()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("rtiRequests")
      .filter((q) => q.eq(q.field("isPublished"), true));
    
    if (args.agency) {
      query = query.filter((q) => q.eq(q.field("agency"), args.agency));
    }
    
    query = query.order("desc");
    
    if (args.offset) {
      query = query.skip(args.offset);
    }
    
    const results = await query.take(args.limit || 50).collect();
    
    // Remove sensitive user information for public view
    return results.map(request => ({
      _id: request._id,
      agency: request.agency,
      agencyLocal: request.agencyLocal,
      topic: request.topic,
      topicLocal: request.topicLocal,
      requestText: request.requestText,
      requestTextLocal: request.requestTextLocal,
      status: request.status,
      submissionDate: request.submissionDate,
      responseDate: request.responseDate,
      publishedOutcome: request.publishedOutcome,
      outcome: request.outcome,
      outcomeLocal: request.outcomeLocal,
      createdAt: request.createdAt,
    }));
  },
});

// Get agencies list (for dropdown/selection)
export const getAgencies = query({
  args: {},
  handler: async (ctx, args) => {
    const requests = await ctx.db.query("rtiRequests").collect();
    
    const agencies = [...new Set(requests.map(r => r.agency))];
    
    return agencies.map(agency => {
      const agencyRequests = requests.filter(r => r.agency === agency);
      const totalRequests = agencyRequests.length;
      const respondedRequests = agencyRequests.filter(r => r.status === "responded").length;
      const responseRate = totalRequests > 0 ? (respondedRequests / totalRequests) * 100 : 0;
      
      return {
        name: agency,
        totalRequests,
        responseRate,
      };
    });
  },
});