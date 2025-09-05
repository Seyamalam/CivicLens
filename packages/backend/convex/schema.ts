import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

// Enums for type safety
const RiskFlag = v.union(
  v.literal("single_bidder"),
  v.literal("short_window"),
  v.literal("repeat_winner"),
  v.literal("high_margin"),
  v.literal("quick_award"),
  v.literal("weekend_award"),
  v.literal("no_competition")
);

const ServiceCategory = v.union(
  v.literal("civil_documents"),
  v.literal("business_permits"),
  v.literal("land_services"),
  v.literal("tax_services"),
  v.literal("utility_services"),
  v.literal("education_services")
);

const RTIStatus = v.union(
  v.literal("draft"),
  v.literal("submitted"),
  v.literal("under_review"),
  v.literal("responded"),
  v.literal("appealed"),
  v.literal("overdue"),
  v.literal("rejected")
);

const PermitStatus = v.union(
  v.literal("applied"),
  v.literal("under_review"),
  v.literal("additional_docs"),
  v.literal("approved"),
  v.literal("rejected"),
  v.literal("escalated")
);

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

// GeoLocation object for consistent location tracking
const GeoLocation = v.object({
  latitude: v.number(),
  longitude: v.number(),
  address: v.optional(v.string()),
  ward: v.optional(v.string()),
  district: v.optional(v.string())
});

export default defineSchema({
  // Module 1: ProcureLens - Procurement Risk Detection
  tenders: defineTable({
    buyer: v.string(),
    buyerLocal: v.optional(v.string()), // Bangla name
    sector: v.string(),
    sectorLocal: v.optional(v.string()),
    method: v.string(), // "open", "limited", "direct", "framework"
    title: v.string(),
    titleLocal: v.optional(v.string()),
    description: v.optional(v.string()),
    publishDate: v.number(), // timestamp
    closeDate: v.number(),
    awardDate: v.optional(v.number()),
    estimatedAmount: v.number(),
    awardAmount: v.optional(v.number()),
    currency: v.string(), // "BDT", "USD"
    biddersCount: v.number(),
    winner: v.optional(v.string()),
    winnerLocal: v.optional(v.string()),
    flags: v.array(RiskFlag),
    riskScore: v.number(), // 0-100
    sourceUrl: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_sector", ["sector"])
    .index("by_risk_score", ["riskScore"])
    .index("by_publish_date", ["publishDate"])
    .searchIndex("search_title", {
      searchField: "title",
      filterFields: ["sector", "riskScore"]
    }),

  suppliers: defineTable({
    name: v.string(),
    nameLocal: v.optional(v.string()),
    registrationNumber: v.optional(v.string()),
    totalAwards: v.number(),
    totalValue: v.number(),
    lastAwardDate: v.optional(v.number()),
    winRate: v.number(), // percentage
    averageMargin: v.number(), // percentage above estimate
    sectors: v.array(v.string()),
    isBlacklisted: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_name", ["name"])
    .index("by_total_awards", ["totalAwards"])
    .searchIndex("search_suppliers", {
      searchField: "name",
      filterFields: ["isBlacklisted"]
    }),

  // Module 2: FeeCheck - Service Overcharge Detection
  services: defineTable({
    name: v.string(),
    nameLocal: v.string(), // Bangla name is required
    officeType: v.string(), // "upazila", "district", "division", "national"
    department: v.string(),
    departmentLocal: v.optional(v.string()),
    officialFee: v.number(),
    officialTimeline: v.number(), // days
    legalReference: v.string(),
    category: ServiceCategory,
    description: v.optional(v.string()),
    descriptionLocal: v.optional(v.string()),
    requirements: v.array(v.string()),
    requirementsLocal: v.optional(v.array(v.string())),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_category", ["category"])
    .index("by_office_type", ["officeType"])
    .searchIndex("search_services", {
      searchField: "name",
      filterFields: ["category", "officeType", "isActive"]
    }),

  overchargeReports: defineTable({
    serviceId: v.id("services"),
    reportedFee: v.number(),
    officialFee: v.number(), // cached for quick comparison
    overchargeAmount: v.number(),
    overchargePercentage: v.number(),
    officeName: v.optional(v.string()),
    location: v.optional(GeoLocation),
    note: v.optional(v.string()),
    isAnonymous: v.boolean(),
    userId: v.optional(v.string()), // null if anonymous
    timestamp: v.number(),
    isVerified: v.boolean()
  })
    .index("by_service", ["serviceId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_overcharge_percentage", ["overchargePercentage"]),

  // Module 3: RTI Copilot - Right-to-Information Assistant
  rtiRequests: defineTable({
    userId: v.string(),
    agency: v.string(),
    agencyLocal: v.optional(v.string()),
    topic: v.string(),
    topicLocal: v.optional(v.string()),
    requestText: v.string(),
    requestTextLocal: v.optional(v.string()),
    status: RTIStatus,
    submissionDate: v.number(),
    deadline: v.number(),
    responseDate: v.optional(v.number()),
    response: v.optional(v.string()),
    outcome: v.optional(v.string()),
    outcomeLocal: v.optional(v.string()),
    isPublished: v.boolean(),
    publishedOutcome: v.optional(v.string()),
    templateUsed: v.optional(v.string()),
    followUpCount: v.number(),
    appealDate: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_status", ["status"])
    .index("by_deadline", ["deadline"])
    .index("by_agency", ["agency"])
    .searchIndex("search_rti", {
      searchField: "topic",
      filterFields: ["status", "agency", "isPublished"]
    }),

  // Module 4: FairLine - Bribe Solicitation Logger
  bribeLogs: defineTable({
    userId: v.string(),
    office: v.string(),
    officeLocal: v.optional(v.string()),
    service: v.string(),
    serviceLocal: v.optional(v.string()),
    timestamp: v.number(),
    amount: v.optional(v.number()),
    currency: v.string(),
    audioUrl: v.optional(v.string()),
    audioTranscript: v.optional(v.string()),
    textNote: v.optional(v.string()),
    location: v.optional(GeoLocation),
    hash: v.string(), // SHA-256 hash for tamper evidence
    previousHash: v.optional(v.string()), // blockchain-style chaining
    isAnonymous: v.boolean(),
    severity: v.string(), // "low", "medium", "high", "critical"
    reportedToAuthorities: v.boolean(),
    followUpActions: v.optional(v.array(v.string())),
    createdAt: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_office", ["office"])
    .index("by_timestamp", ["timestamp"])
    .index("by_hash", ["hash"])
    .index("by_severity", ["severity"]),

  // Module 5: PermitPath - Delay Detection System
  permitApplications: defineTable({
    userId: v.string(),
    serviceId: v.id("services"),
    office: v.string(),
    officeLocal: v.optional(v.string()),
    appliedDate: v.number(),
    expectedDays: v.number(),
    currentStatus: PermitStatus,
    actualDays: v.optional(v.number()),
    completionDate: v.optional(v.number()),
    isDelayed: v.boolean(),
    delayDays: v.optional(v.number()),
    escalationLetterGenerated: v.boolean(),
    escalationDate: v.optional(v.number()),
    notes: v.optional(v.string()),
    documents: v.optional(v.array(v.string())), // file URLs
    statusHistory: v.array(v.object({
      status: PermitStatus,
      timestamp: v.number(),
      note: v.optional(v.string())
    })),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_user", ["userId"])
    .index("by_service", ["serviceId"])
    .index("by_status", ["currentStatus"])
    .index("by_is_delayed", ["isDelayed"])
    .index("by_applied_date", ["appliedDate"]),

  // Module 6: WardWallet - Budget Transparency
  projects: defineTable({
    ward: v.string(),
    wardLocal: v.optional(v.string()),
    name: v.string(),
    nameLocal: v.string(),
    category: v.string(), // "infrastructure", "education", "health", "social"
    categoryLocal: v.optional(v.string()),
    plannedBudget: v.number(),
    actualSpend: v.number(),
    currency: v.string(),
    unitCost: v.number(),
    unitType: v.string(), // "per km", "per sq ft", "per unit"
    unitTypeLocal: v.optional(v.string()),
    status: ProjectStatus,
    startDate: v.number(),
    plannedCompletionDate: v.number(),
    actualCompletionDate: v.optional(v.number()),
    contractor: v.optional(v.string()),
    contractorLocal: v.optional(v.string()),
    location: v.optional(GeoLocation),
    description: v.optional(v.string()),
    descriptionLocal: v.optional(v.string()),
    budgetVariance: v.number(), // percentage
    timeVariance: v.number(), // percentage
    qualityScore: v.optional(v.number()), // 1-5 based on citizen feedback
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_ward", ["ward"])
    .index("by_status", ["status"])
    .index("by_category", ["category"])
    .index("by_budget_variance", ["budgetVariance"])
    .searchIndex("search_projects", {
      searchField: "name",
      filterFields: ["ward", "status", "category"]
    }),

  projectPhotos: defineTable({
    projectId: v.id("projects"),
    userId: v.string(),
    url: v.string(),
    thumbnailUrl: v.optional(v.string()),
    location: GeoLocation,
    timestamp: v.number(),
    description: v.optional(v.string()),
    verificationStatus: PhotoVerificationStatus,
    verificationCount: v.number(),
    verifiedBy: v.optional(v.array(v.string())), // user IDs
    tags: v.optional(v.array(v.string())),
    qualityRating: v.optional(v.number()), // 1-5
    createdAt: v.number()
  })
    .index("by_project", ["projectId"])
    .index("by_user", ["userId"])
    .index("by_verification_status", ["verificationStatus"])
    .index("by_timestamp", ["timestamp"]),

  // User Management and Authentication
  users: defineTable({
    email: v.optional(v.string()),
    phone: v.optional(v.string()),
    name: v.optional(v.string()),
    nameLocal: v.optional(v.string()),
    location: v.optional(GeoLocation),
    preferredLanguage: v.string(), // "en" or "bn"
    isAnonymous: v.boolean(),
    anonymousId: v.optional(v.string()),
    role: v.string(), // "citizen", "activist", "journalist", "admin"
    verificationLevel: v.string(), // "unverified", "phone", "email", "identity"
    reputationScore: v.number(), // 0-100 based on contributions
    totalContributions: v.number(),
    lastActiveAt: v.number(),
    createdAt: v.number(),
    updatedAt: v.number()
  })
    .index("by_email", ["email"])
    .index("by_phone", ["phone"])
    .index("by_anonymous_id", ["anonymousId"])
    .index("by_role", ["role"]),

  // System Configuration and Metadata
  systemConfig: defineTable({
    key: v.string(),
    value: v.any(),
    description: v.optional(v.string()),
    updatedAt: v.number(),
    updatedBy: v.string()
  }).index("by_key", ["key"]),

  // Analytics and Aggregated Data
  analytics: defineTable({
    type: v.string(), // "daily", "weekly", "monthly"
    date: v.string(), // YYYY-MM-DD format
    metric: v.string(), // "tender_count", "overcharge_reports", etc.
    value: v.number(),
    metadata: v.optional(v.any()),
    createdAt: v.number()
  })
    .index("by_type_date", ["type", "date"])
    .index("by_metric", ["metric"]),

  // Notifications and Alerts
  notifications: defineTable({
    userId: v.string(),
    type: v.string(), // "rti_deadline", "permit_delay", "system_alert"
    title: v.string(),
    titleLocal: v.optional(v.string()),
    message: v.string(),
    messageLocal: v.optional(v.string()),
    isRead: v.boolean(),
    priority: v.string(), // "low", "medium", "high", "urgent"
    actionUrl: v.optional(v.string()),
    metadata: v.optional(v.any()),
    createdAt: v.number(),
    readAt: v.optional(v.number())
  })
    .index("by_user", ["userId"])
    .index("by_type", ["type"])
    .index("by_is_read", ["isRead"])
    .index("by_priority", ["priority"]),

  // Keep original todos for backward compatibility during development
  todos: defineTable({
    text: v.string(),
    completed: v.boolean(),
  }),
});
