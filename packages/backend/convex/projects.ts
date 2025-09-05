import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

const ProjectStatus = v.union(
  v.literal("planned"),
  v.literal("in_progress"),
  v.literal("completed"),
  v.literal("delayed"),
  v.literal("cancelled")
);

const PhotoVerificationStatus = v.union(
  v.literal("pending"),
  v.literal("verified"),
  v.literal("disputed"),
  v.literal("rejected")
);

const GeoLocation = v.object({
  latitude: v.number(),
  longitude: v.number(),
  address: v.optional(v.string()),
  ward: v.optional(v.string()),
  district: v.optional(v.string())
});

// Create project
export const createProject = mutation({
  args: {
    ward: v.string(),
    wardLocal: v.optional(v.string()),
    name: v.string(),
    nameLocal: v.string(),
    category: v.string(),
    plannedBudget: v.number(),
    actualSpend: v.number(),
    currency: v.string(),
    unitCost: v.number(),
    unitType: v.string(),
    status: ProjectStatus,
    startDate: v.number(),
    plannedCompletionDate: v.number(),
    contractor: v.optional(v.string()),
    location: v.optional(GeoLocation),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const budgetVariance = ((args.actualSpend - args.plannedBudget) / args.plannedBudget) * 100;
    const timeVariance = ((now - args.plannedCompletionDate) / (args.plannedCompletionDate - args.startDate)) * 100;
    
    return await ctx.db.insert("projects", {
      ...args,
      budgetVariance,
      timeVariance,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get projects by ward
export const getProjectsByWard = query({
  args: {
    ward: v.string(),
    status: v.optional(ProjectStatus),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("projects")
      .withIndex("by_ward", (q) => q.eq("ward", args.ward));
    
    if (args.status) {
      query = query.filter((q) => q.eq(q.field("status"), args.status));
    }
    
    return await query.order("desc").take(args.limit || 50).collect();
  },
});

// Search projects
export const searchProjects = query({
  args: {
    searchTerm: v.string(),
    ward: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("projects")
      .withSearchIndex("search_projects", (q) => {
        let searchQuery = q.search("name", args.searchTerm);
        
        if (args.ward) {
          searchQuery = searchQuery.filter((q) => q.eq(q.field("ward"), args.ward));
        }
        
        if (args.category) {
          searchQuery = searchQuery.filter((q) => q.eq(q.field("category"), args.category));
        }
        
        return searchQuery;
      })
      .take(50);
    
    return results;
  },
});

// Add project photo
export const addProjectPhoto = mutation({
  args: {
    projectId: v.id("projects"),
    userId: v.string(),
    url: v.string(),
    location: GeoLocation,
    description: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("projectPhotos", {
      ...args,
      timestamp: Date.now(),
      verificationStatus: "pending",
      verificationCount: 0,
      createdAt: Date.now(),
    });
  },
});

// Verify project photo
export const verifyProjectPhoto = mutation({
  args: {
    id: v.id("projectPhotos"),
    userId: v.string(),
    isVerified: v.boolean(),
  },
  handler: async (ctx, args) => {
    const photo = await ctx.db.get(args.id);
    if (!photo) throw new Error("Photo not found");
    
    const verifiedBy = photo.verifiedBy || [];
    if (verifiedBy.includes(args.userId)) {
      throw new Error("User already verified this photo");
    }
    
    const newVerifiedBy = [...verifiedBy, args.userId];
    const verificationCount = newVerifiedBy.length;
    
    let status = photo.verificationStatus;
    if (verificationCount >= 3) {
      status = args.isVerified ? "verified" : "disputed";
    }
    
    await ctx.db.patch(args.id, {
      verificationStatus: status,
      verificationCount,
      verifiedBy: newVerifiedBy,
    });
    
    return args.id;
  },
});

// Get project photos
export const getProjectPhotos = query({
  args: {
    projectId: v.id("projects"),
    verificationStatus: v.optional(PhotoVerificationStatus),
  },
  handler: async (ctx, args) => {
    let query = ctx.db
      .query("projectPhotos")
      .withIndex("by_project", (q) => q.eq("projectId", args.projectId));
    
    if (args.verificationStatus) {
      query = query.filter((q) => q.eq(q.field("verificationStatus"), args.verificationStatus));
    }
    
    return await query.order("desc").collect();
  },
});

// Get budget analysis
export const getBudgetAnalysis = query({
  args: {
    ward: v.optional(v.string()),
    category: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("projects");
    
    if (args.ward) {
      query = query.filter((q) => q.eq(q.field("ward"), args.ward));
    }
    
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }
    
    const projects = await query.collect();
    
    const totalPlanned = projects.reduce((sum, p) => sum + p.plannedBudget, 0);
    const totalSpent = projects.reduce((sum, p) => sum + p.actualSpend, 0);
    const overBudgetProjects = projects.filter(p => p.budgetVariance > 0).length;
    
    const categoryStats = projects.reduce((acc, project) => {
      if (!acc[project.category]) {
        acc[project.category] = {
          count: 0,
          plannedBudget: 0,
          actualSpend: 0,
          averageVariance: 0,
        };
      }
      
      acc[project.category].count++;
      acc[project.category].plannedBudget += project.plannedBudget;
      acc[project.category].actualSpend += project.actualSpend;
      acc[project.category].averageVariance += project.budgetVariance;
      
      return acc;
    }, {} as Record<string, any>);
    
    Object.keys(categoryStats).forEach(category => {
      categoryStats[category].averageVariance /= categoryStats[category].count;
    });
    
    return {
      totalProjects: projects.length,
      totalPlanned,
      totalSpent,
      overBudgetProjects,
      overBudgetRate: (overBudgetProjects / projects.length) * 100,
      categoryStats,
    };
  },
});

// Get unit cost comparison
export const getUnitCostComparison = query({
  args: {
    category: v.string(),
    unitType: v.string(),
  },
  handler: async (ctx, args) => {
    const projects = await ctx.db
      .query("projects")
      .filter((q) => 
        q.and(
          q.eq(q.field("category"), args.category),
          q.eq(q.field("unitType"), args.unitType)
        )
      )
      .collect();
    
    if (projects.length === 0) return null;
    
    const unitCosts = projects.map(p => p.unitCost);
    const averageUnitCost = unitCosts.reduce((sum, cost) => sum + cost, 0) / unitCosts.length;
    const maxUnitCost = Math.max(...unitCosts);
    const minUnitCost = Math.min(...unitCosts);
    
    // Flag projects with costs >30% above average
    const suspiciousProjects = projects.filter(p => 
      p.unitCost > averageUnitCost * 1.3
    );
    
    return {
      totalProjects: projects.length,
      averageUnitCost,
      maxUnitCost,
      minUnitCost,
      suspiciousProjects: suspiciousProjects.length,
      projects: projects.map(p => ({
        ...p,
        isSuspicious: p.unitCost > averageUnitCost * 1.3,
        varianceFromAverage: ((p.unitCost - averageUnitCost) / averageUnitCost) * 100,
      })),
    };
  },
});