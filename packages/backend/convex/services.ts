import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

// GeoLocation validator
const GeoLocation = v.object({
  latitude: v.number(),
  longitude: v.number(),
  address: v.optional(v.string()),
  ward: v.optional(v.string()),
  district: v.optional(v.string())
});

// SERVICE CRUD OPERATIONS

// Create a new service
export const createService = mutation({
  args: {
    name: v.string(),
    nameLocal: v.string(),
    officeType: v.string(),
    department: v.string(),
    departmentLocal: v.optional(v.string()),
    officialFee: v.number(),
    officialTimeline: v.number(),
    legalReference: v.string(),
    category: v.union(
      v.literal("civil_documents"),
      v.literal("business_permits"),
      v.literal("land_services"),
      v.literal("tax_services"),
      v.literal("utility_services"),
      v.literal("education_services")
    ),
    description: v.optional(v.string()),
    descriptionLocal: v.optional(v.string()),
    requirements: v.array(v.string()),
    requirementsLocal: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    
    return await ctx.db.insert("services", {
      ...args,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });
  },
});

// Get all services with filtering
export const getServices = query({
  args: {
    category: v.optional(v.string()),
    officeType: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("services");
    
    if (args.category) {
      query = query.filter((q) => q.eq(q.field("category"), args.category));
    }
    
    if (args.officeType) {
      query = query.filter((q) => q.eq(q.field("officeType"), args.officeType));
    }
    
    if (args.isActive !== undefined) {
      query = query.filter((q) => q.eq(q.field("isActive"), args.isActive));
    }
    
    query = query.order("asc");
    
    if (args.offset) {
      query = query.skip(args.offset);
    }
    
    return await query.take(args.limit || 100).collect();
  },
});

// Search services
export const searchServices = query({
  args: {
    searchTerm: v.string(),
    category: v.optional(v.string()),
    officeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const results = await ctx.db
      .query("services")
      .withSearchIndex("search_services", (q) =>
        q.search("name", args.searchTerm)
          .filter((q) => {
            let filter = q.eq(q.field("isActive"), true);
            if (args.category) {
              filter = filter.eq(q.field("category"), args.category);
            }
            if (args.officeType) {
              filter = filter.eq(q.field("officeType"), args.officeType);
            }
            return filter;
          })
      )
      .take(50);
    
    return results;
  },
});

// Get service by ID
export const getService = query({
  args: { id: v.id("services") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update service
export const updateService = mutation({
  args: {
    id: v.id("services"),
    officialFee: v.optional(v.number()),
    officialTimeline: v.optional(v.number()),
    legalReference: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    description: v.optional(v.string()),
    descriptionLocal: v.optional(v.string()),
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

// OVERCHARGE REPORT CRUD OPERATIONS

// Create overcharge report
export const reportOvercharge = mutation({
  args: {
    serviceId: v.id("services"),
    reportedFee: v.number(),
    officeName: v.optional(v.string()),
    location: v.optional(GeoLocation),
    note: v.optional(v.string()),
    isAnonymous: v.boolean(),
    userId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get service to calculate overcharge
    const service = await ctx.db.get(args.serviceId);
    if (!service) {
      throw new Error("Service not found");
    }
    
    const overchargeAmount = args.reportedFee - service.officialFee;
    const overchargePercentage = (overchargeAmount / service.officialFee) * 100;
    
    return await ctx.db.insert("overchargeReports", {
      serviceId: args.serviceId,
      reportedFee: args.reportedFee,
      officialFee: service.officialFee,
      overchargeAmount,
      overchargePercentage,
      officeName: args.officeName,
      location: args.location,
      note: args.note,
      isAnonymous: args.isAnonymous,
      userId: args.userId,
      timestamp: Date.now(),
      isVerified: false,
    });
  },
});

// Get overcharge reports for a service
export const getServiceOverchargeReports = query({
  args: {
    serviceId: v.id("services"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("overchargeReports")
      .withIndex("by_service", (q) => q.eq("serviceId", args.serviceId))
      .order("desc")
      .take(args.limit || 50)
      .collect();
  },
});

// Get all overcharge reports with filtering
export const getOverchargeReports = query({
  args: {
    minOverchargePercentage: v.optional(v.number()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let query = ctx.db.query("overchargeReports");
    
    if (args.minOverchargePercentage !== undefined) {
      query = query.filter((q) => 
        q.gte(q.field("overchargePercentage"), args.minOverchargePercentage)
      );
    }
    
    if (args.startDate !== undefined) {
      query = query.filter((q) => q.gte(q.field("timestamp"), args.startDate));
    }
    
    if (args.endDate !== undefined) {
      query = query.filter((q) => q.lte(q.field("timestamp"), args.endDate));
    }
    
    query = query.order("desc");
    
    if (args.offset) {
      query = query.skip(args.offset);
    }
    
    return await query.take(args.limit || 50).collect();
  },
});

// Get overcharge statistics
export const getOverchargeStats = query({
  args: {
    timeRange: v.optional(v.string()), // "last_30_days", "last_90_days", "last_year"
    location: v.optional(GeoLocation),
  },
  handler: async (ctx, args) => {
    let startDate = 0;
    const now = Date.now();
    
    // Calculate start date based on time range
    if (args.timeRange === "last_30_days") {
      startDate = now - (30 * 24 * 60 * 60 * 1000);
    } else if (args.timeRange === "last_90_days") {
      startDate = now - (90 * 24 * 60 * 60 * 1000);
    } else if (args.timeRange === "last_year") {
      startDate = now - (365 * 24 * 60 * 60 * 1000);
    }
    
    // Get filtered reports
    let reports = await ctx.db
      .query("overchargeReports")
      .filter((q) => q.gte(q.field("timestamp"), startDate))
      .collect();
    
    // Filter by location if provided (simplified - in real app, use geospatial queries)
    if (args.location && args.location.ward) {
      reports = reports.filter(report => 
        report.location?.ward === args.location?.ward
      );
    }
    
    // Calculate statistics
    const totalReports = reports.length;
    const totalOverchargeAmount = reports.reduce((sum, report) => 
      sum + report.overchargeAmount, 0
    );
    const averageOverchargePercentage = reports.length > 0 
      ? reports.reduce((sum, report) => sum + report.overchargePercentage, 0) / reports.length
      : 0;
    
    // Get service-wise stats
    const serviceStats = reports.reduce((acc, report) => {
      const serviceId = report.serviceId;
      if (!acc[serviceId]) {
        acc[serviceId] = {
          reportCount: 0,
          totalOvercharge: 0,
          averageOvercharge: 0,
        };
      }
      acc[serviceId].reportCount++;
      acc[serviceId].totalOvercharge += report.overchargeAmount;
      return acc;
    }, {} as Record<string, any>);
    
    // Calculate averages for service stats
    Object.keys(serviceStats).forEach(serviceId => {
      serviceStats[serviceId].averageOvercharge = 
        serviceStats[serviceId].totalOvercharge / serviceStats[serviceId].reportCount;
    });
    
    // Get most overcharged services
    const serviceOverchargeRanking = Object.entries(serviceStats)
      .sort(([,a], [,b]) => b.reportCount - a.reportCount)
      .slice(0, 10);
    
    return {
      totalReports,
      totalOverchargeAmount,
      averageOverchargePercentage,
      serviceStats,
      serviceOverchargeRanking,
      timeRange: args.timeRange || "all_time",
    };
  },
});

// Get overcharge heatmap data
export const getOverchargeHeatmapData = query({
  args: {
    timeRange: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let startDate = 0;
    const now = Date.now();
    
    if (args.timeRange === "last_30_days") {
      startDate = now - (30 * 24 * 60 * 60 * 1000);
    } else if (args.timeRange === "last_90_days") {
      startDate = now - (90 * 24 * 60 * 60 * 1000);
    }
    
    const reports = await ctx.db
      .query("overchargeReports")
      .filter((q) => q.gte(q.field("timestamp"), startDate))
      .collect();
    
    // Group by location (ward/district)
    const locationStats = reports.reduce((acc, report) => {
      if (!report.location) return acc;
      
      const key = report.location.ward || report.location.district || "unknown";
      if (!acc[key]) {
        acc[key] = {
          location: report.location,
          reportCount: 0,
          totalOvercharge: 0,
          averageOvercharge: 0,
        };
      }
      
      acc[key].reportCount++;
      acc[key].totalOvercharge += report.overchargeAmount;
      return acc;
    }, {} as Record<string, any>);
    
    // Calculate averages
    Object.keys(locationStats).forEach(key => {
      locationStats[key].averageOvercharge = 
        locationStats[key].totalOvercharge / locationStats[key].reportCount;
    });
    
    return Object.values(locationStats);
  },
});

// Get popular services (most commonly used)
export const getPopularServices = query({
  args: {
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const services = await ctx.db.query("services")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();
    
    // Get report counts for each service
    const serviceReportCounts = await Promise.all(
      services.map(async (service) => {
        const reportCount = (await ctx.db
          .query("overchargeReports")
          .withIndex("by_service", (q) => q.eq("serviceId", service._id))
          .collect()).length;
        
        return {
          ...service,
          reportCount,
        };
      })
    );
    
    // Sort by report count (popularity) and return
    return serviceReportCounts
      .sort((a, b) => b.reportCount - a.reportCount)
      .slice(0, args.limit || 20);
  },
});

// Verify an overcharge report (admin function)
export const verifyOverchargeReport = mutation({
  args: {
    id: v.id("overchargeReports"),
    isVerified: v.boolean(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.id, {
      isVerified: args.isVerified,
    });
    
    return args.id;
  },
});