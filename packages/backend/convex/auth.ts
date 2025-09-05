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

// Create or update user
export const createUser = mutation({
  args: {
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    name: v.optional(v.string()),
    nameLocal: v.optional(v.string()),
    location: v.optional(GeoLocation),
    preferredLanguage: v.string(),
    isAnonymous: v.boolean(),
    role: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Check if user already exists
    let existingUser = null;
    if (args.email) {
      existingUser = await ctx.db
        .query("users")
        .withIndex("by_email", (q) => q.eq("email", args.email))
        .first();
    } else if (args.phone) {
      existingUser = await ctx.db
        .query("users")
        .withIndex("by_phone", (q) => q.eq("phone", args.phone))
        .first();
    }
    
    if (existingUser) {
      // Update existing user
      await ctx.db.patch(existingUser._id, {
        ...args,
        lastActiveAt: now,
        updatedAt: now,
      });
      return existingUser._id;
    }
    
    // Create new user
    const anonymousId = args.isAnonymous ? generateAnonymousId() : undefined;
    
    return await ctx.db.insert("users", {
      ...args,
      anonymousId,
      verificationLevel: "unverified",
      reputationScore: 0,
      totalContributions: 0,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get user by ID
export const getUser = query({
  args: { id: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get user by email
export const getUserByEmail = query({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();
  },
});

// Get user by anonymous ID
export const getUserByAnonymousId = query({
  args: { anonymousId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("users")
      .withIndex("by_anonymous_id", (q) => q.eq("anonymousId", args.anonymousId))
      .first();
  },
});

// Update user profile
export const updateUserProfile = mutation({
  args: {
    id: v.id("users"),
    name: v.optional(v.string()),
    nameLocal: v.optional(v.string()),
    location: v.optional(GeoLocation),
    preferredLanguage: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    
    await ctx.db.patch(id, {
      ...updates,
      updatedAt: Date.now(),
    });
    
    return id;
  },
});

// Update user reputation score
export const updateUserReputation = mutation({
  args: {
    userId: v.id("users"),
    points: v.number(),
    action: v.string(), // "report_filed", "data_verified", "photo_contributed", etc.
  },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) throw new Error("User not found");
    
    const newReputationScore = Math.max(0, user.reputationScore + args.points);
    const newTotalContributions = user.totalContributions + 1;
    
    await ctx.db.patch(args.userId, {
      reputationScore: newReputationScore,
      totalContributions: newTotalContributions,
      lastActiveAt: Date.now(),
      updatedAt: Date.now(),
    });
    
    return {
      newReputationScore,
      newTotalContributions,
    };
  },
});

// Get user statistics
export const getUserStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    if (!user) return null;
    
    // Count user's contributions across modules
    const [
      rtiRequests,
      overchargeReports, 
      bribeLogs,
      permitApplications,
      projectPhotos
    ] = await Promise.all([
      ctx.db.query("rtiRequests").filter(q => q.eq(q.field("userId"), user._id.toString())).collect(),
      ctx.db.query("overchargeReports").filter(q => q.eq(q.field("userId"), user._id.toString())).collect(),
      ctx.db.query("bribeLogs").filter(q => q.eq(q.field("userId"), user._id.toString())).collect(),
      ctx.db.query("permitApplications").filter(q => q.eq(q.field("userId"), user._id.toString())).collect(),
      ctx.db.query("projectPhotos").filter(q => q.eq(q.field("userId"), user._id.toString())).collect(),
    ]);
    
    return {
      user: {
        name: user.name,
        reputationScore: user.reputationScore,
        totalContributions: user.totalContributions,
        verificationLevel: user.verificationLevel,
        role: user.role,
        createdAt: user.createdAt,
        lastActiveAt: user.lastActiveAt,
      },
      contributions: {
        rtiRequests: rtiRequests.length,
        overchargeReports: overchargeReports.length,
        bribeLogs: bribeLogs.length,
        permitApplications: permitApplications.length,
        projectPhotos: projectPhotos.length,
        total: rtiRequests.length + overchargeReports.length + bribeLogs.length + 
               permitApplications.length + projectPhotos.length,
      },
    };
  },
});

// Helper function to generate anonymous ID
function generateAnonymousId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `anon_${result}`;
}

// Anonymous user login/creation
export const createAnonymousUser = mutation({
  args: {
    preferredLanguage: v.string(),
    location: v.optional(GeoLocation),
  },
  handler: async (ctx, args) => {
    const anonymousId = generateAnonymousId();
    const now = Date.now();
    
    return await ctx.db.insert("users", {
      isAnonymous: true,
      anonymousId,
      preferredLanguage: args.preferredLanguage,
      location: args.location,
      role: "citizen",
      verificationLevel: "unverified",
      reputationScore: 0,
      totalContributions: 0,
      lastActiveAt: now,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Update last active timestamp
export const updateLastActive = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.userId, {
      lastActiveAt: Date.now(),
    });
    
    return args.userId;
  },
});