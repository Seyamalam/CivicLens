import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// Risk scoring algorithm implementation
export const calculateRiskScore = (tender: any): number => {
  let score = 0;
  
  // Single bidder: +40 points
  if (tender.biddersCount <= 1) {
    score += 40;
  }
  
  // Short bidding window: +25 points (less than 14 days)
  const biddingDays = (tender.closeDate - tender.publishDate) / (24 * 60 * 60 * 1000);
  if (biddingDays < 14) {
    score += 25;
  }
  
  // Quick award: +20 points (within 48 hours of closing)
  if (tender.awardDate) {
    const awardDelayHours = (tender.awardDate - tender.closeDate) / (60 * 60 * 1000);
    if (awardDelayHours < 48) {
      score += 20;
    }
  }
  
  // High margin: +35 points (>20% above estimate)
  if (tender.awardAmount && tender.estimatedAmount) {
    const margin = ((tender.awardAmount - tender.estimatedAmount) / tender.estimatedAmount) * 100;
    if (margin > 20) {
      score += 35;
    }
  }
  
  // Weekend award: +15 points
  if (tender.awardDate) {
    const awardDay = new Date(tender.awardDate).getDay();
    if (awardDay === 0 || awardDay === 6) {
      score += 15;
    }
  }
  
  return Math.min(score, 100); // Cap at 100
};

// Generate risk flags based on tender data
export const generateRiskFlags = (tender: any): string[] => {
  const flags: string[] = [];
  
  if (tender.biddersCount <= 1) {
    flags.push("single_bidder");
  }
  
  const biddingDays = (tender.closeDate - tender.publishDate) / (24 * 60 * 60 * 1000);
  if (biddingDays < 14) {
    flags.push("short_window");
  }
  
  if (tender.awardDate) {
    const awardDelayHours = (tender.awardDate - tender.closeDate) / (60 * 60 * 1000);
    if (awardDelayHours < 48) {
      flags.push("quick_award");
    }
  }
  
  if (tender.awardAmount && tender.estimatedAmount) {
    const margin = ((tender.awardAmount - tender.estimatedAmount) / tender.estimatedAmount) * 100;
    if (margin > 20) {
      flags.push("high_margin");
    }
  }
  
  if (tender.biddersCount === 0) {
    flags.push("no_competition");
  }
  
  return flags;
};

// TENDER CRUD OPERATIONS

// Create a new tender
export const createTender = mutation({
  args: {
    buyer: v.string(),
    buyerLocal: v.optional(v.string()),
    sector: v.string(),
    sectorLocal: v.optional(v.string()),
    method: v.string(),
    title: v.string(),
    titleLocal: v.optional(v.string()),
    description: v.optional(v.string()),
    publishDate: v.number(),
    closeDate: v.number(),
    awardDate: v.optional(v.number()),
    estimatedAmount: v.number(),
    awardAmount: v.optional(v.number()),
    currency: v.string(),
    biddersCount: v.number(),
    winner: v.optional(v.string()),
    winnerLocal: v.optional(v.string()),
    sourceUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    // Generate risk flags and score
    const flags = generateRiskFlags(args);
    const riskScore = calculateRiskScore(args);
    
    const tenderId = await ctx.db.insert("tenders", {
      ...args,
      flags,
      riskScore,
      createdAt: now,
      updatedAt: now,
    });
    
    // Update supplier statistics if winner is known
    if (args.winner && args.awardAmount) {
      await updateSupplierStats(ctx, args.winner, args.awardAmount, args.sector);
    }
    
    return tenderId;
  },
});

// Get all tenders with optional filtering
export const getTenders = query({
  args: {
    sector: v.optional(v.string()),
    minRiskScore: v.optional(v.number()),
    maxRiskScore: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("tenders");
    
    if (args.sector) {
      query = query.filter((q) => q.eq(q.field("sector"), args.sector));
    }
    
    if (args.minRiskScore !== undefined) {
      query = query.filter((q) => q.gte(q.field("riskScore"), args.minRiskScore));
    }
    
    if (args.maxRiskScore !== undefined) {
      query = query.filter((q) => q.lte(q.field("riskScore"), args.maxRiskScore));
    }
    
    query = query.order("desc");
    
    if (args.offset) {
      query = query.skip(args.offset);
    }
    
    if (args.limit) {
      query = query.take(args.limit);
    } else {
      query = query.take(50); // Default limit
    }
    
    return await query.collect();
  },
});

// Search tenders by title
export const searchTenders = query({
  args: {
    searchTerm: v.string(),
    sector: v.optional(v.string()),
    minRiskScore: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("tenders")
      .withSearchIndex("search_title", (q) =>
        q.search("title", args.searchTerm)
          .filter((q) => 
            args.sector ? q.eq(q.field("sector"), args.sector) : q.gt(q.field("riskScore"), -1)
          )
      )
      .take(50);
    
    if (args.minRiskScore !== undefined) {
      return results.filter(tender => tender.riskScore >= args.minRiskScore);
    }
    
    return results;
  },
});

// Get tender by ID
export const getTender = query({
  args: { id: v.id("tenders") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update tender
export const updateTender = mutation({
  args: {
    id: v.id("tenders"),
    awardDate: v.optional(v.number()),
    awardAmount: v.optional(v.number()),
    winner: v.optional(v.string()),
    winnerLocal: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    const tender = await ctx.db.get(id);
    
    if (!tender) {
      throw new Error("Tender not found");
    }
    
    // Recalculate risk score and flags if award info is updated
    const updatedTender = { ...tender, ...updates };
    const flags = generateRiskFlags(updatedTender);
    const riskScore = calculateRiskScore(updatedTender);
    
    await ctx.db.patch(id, {
      ...updates,
      flags,
      riskScore,
      updatedAt: Date.now(),
    });
    
    // Update supplier statistics if winner is updated
    if (updates.winner && updates.awardAmount) {
      await updateSupplierStats(ctx, updates.winner, updates.awardAmount, tender.sector);
    }
    
    return id;
  },
});

// SUPPLIER CRUD OPERATIONS

// Helper function to update supplier statistics
async function updateSupplierStats(ctx: any, supplierName: string, awardAmount: number, sector: string) {
  const existingSupplier = await ctx.db
    .query("suppliers")
    .withIndex("by_name", (q) => q.eq("name", supplierName))
    .first();
  
  if (existingSupplier) {
    // Update existing supplier
    const newTotalAwards = existingSupplier.totalAwards + 1;
    const newTotalValue = existingSupplier.totalValue + awardAmount;
    
    await ctx.db.patch(existingSupplier._id, {
      totalAwards: newTotalAwards,
      totalValue: newTotalValue,
      lastAwardDate: Date.now(),
      sectors: existingSupplier.sectors.includes(sector) 
        ? existingSupplier.sectors 
        : [...existingSupplier.sectors, sector],
      updatedAt: Date.now(),
    });
  } else {
    // Create new supplier
    await ctx.db.insert("suppliers", {
      name: supplierName,
      registrationNumber: undefined,
      totalAwards: 1,
      totalValue: awardAmount,
      lastAwardDate: Date.now(),
      winRate: 0, // Will be calculated later with more data
      averageMargin: 0, // Will be calculated later
      sectors: [sector],
      isBlacklisted: false,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  }
}

// Get all suppliers
export const getSuppliers = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("suppliers")
      .order("desc")
      .skip(args.offset || 0)
      .take(args.limit || 50)
      .collect();
  },
});

// Search suppliers
export const searchSuppliers = query({
  args: {
    searchTerm: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("suppliers")
      .withSearchIndex("search_suppliers", (q) =>
        q.search("name", args.searchTerm)
      )
      .take(50);
  },
});

// Get supplier by ID
export const getSupplier = query({
  args: { id: v.id("suppliers") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get supplier tenders (tenders won by this supplier)
export const getSupplierTenders = query({
  args: {
    supplierName: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tenders")
      .filter((q) => q.eq(q.field("winner"), args.supplierName))
      .order("desc")
      .take(args.limit || 20)
      .collect();
  },
});

// Get high-risk tenders (risk score >= 50)
export const getHighRiskTenders = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tenders")
      .withIndex("by_risk_score", (q) => q.gte("riskScore", 50))
      .order("desc")
      .take(args.limit || 20)
      .collect();
  },
});

// Get procurement statistics
export const getProcurementStats = query({
  args: {},
  handler: async (ctx, args) => {
    const allTenders = await ctx.db.query("tenders").collect();
    const allSuppliers = await ctx.db.query("suppliers").collect();
    
    const totalTenders = allTenders.length;
    const totalValue = allTenders.reduce((sum, tender) => 
      sum + (tender.awardAmount || tender.estimatedAmount), 0
    );
    const highRiskTenders = allTenders.filter(tender => tender.riskScore >= 50).length;
    const averageRiskScore = allTenders.reduce((sum, tender) => 
      sum + tender.riskScore, 0
    ) / totalTenders;
    
    const sectorStats = allTenders.reduce((acc, tender) => {
      acc[tender.sector] = (acc[tender.sector] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return {
      totalTenders,
      totalSuppliers: allSuppliers.length,
      totalValue,
      highRiskTenders,
      highRiskPercentage: (highRiskTenders / totalTenders) * 100,
      averageRiskScore,
      sectorStats,
    };
  },
});