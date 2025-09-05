import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Seed data for all CivicLens modules
export const seedDemoData = mutation({
  args: {},
  handler: async (ctx, args) => {
    const now = Date.now();
    const thirtyDaysAgo = now - (30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = now - (60 * 24 * 60 * 60 * 1000);
    
    console.log("Starting to seed demo data...");
    
    // 1. Seed Services (Bangladesh civic services)
    const services = [
      {
        name: "National ID (NID) Card",
        nameLocal: "জাতীয় পরিচয়পত্র",
        officeType: "upazila",
        department: "Election Commission",
        departmentLocal: "নির্বাচন কমিশন",
        officialFee: 230,
        officialTimeline: 15,
        legalReference: "Representation of the People Order, 1972",
        category: "civil_documents",
        description: "National identity card for citizens",
        descriptionLocal: "নাগরিকদের জন্য জাতীয় পরিচয়পত্র",
        requirements: ["Birth certificate", "Passport size photo", "Application form"],
        requirementsLocal: ["জন্ম সনদ", "পাসপোর্ট সাইজ ছবি", "আবেদন ফর্ম"],
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Birth Certificate",
        nameLocal: "জন্ম নিবন্ধন সনদ",
        officeType: "upazila",
        department: "Local Government",
        departmentLocal: "স্থানীয় সরকার",
        officialFee: 50,
        officialTimeline: 7,
        legalReference: "Birth and Death Registration Act, 2004",
        category: "civil_documents",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Trade License",
        nameLocal: "ব্যবসায়িক লাইসেন্স",
        officeType: "district",
        department: "City Corporation",
        departmentLocal: "সিটি কর্পোরেশন",
        officialFee: 2000,
        officialTimeline: 30,
        legalReference: "Local Government Act, 2009",
        category: "business_permits",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "Land Mutation",
        nameLocal: "জমির খতিয়ান স্থানান্তর",
        officeType: "upazila",
        department: "Land Office",
        departmentLocal: "ভূমি অফিস",
        officialFee: 1000,
        officialTimeline: 45,
        legalReference: "Land Registration Act, 1908",
        category: "land_services",
        isActive: true,
        createdAt: now,
        updatedAt: now,
      },
    ];
    
    const serviceIds = [];
    for (const service of services) {
      const id = await ctx.db.insert("services", service);
      serviceIds.push(id);
    }
    
    console.log("Seeded services");
    
    // 2. Seed Tenders (Bangladesh procurement data)
    const tenders = [
      {
        buyer: "Roads and Highways Department",
        buyerLocal: "সড়ক ও জনপথ অধিদপ্তর",
        sector: "infrastructure",
        sectorLocal: "অবকাঠামো",
        method: "open",
        title: "Construction of Dhaka-Chittagong Highway Bridge",
        titleLocal: "ঢাকা-চট্টগ্রাম মহাসড়ক সেতু নির্মাণ",
        description: "Bridge construction over Shitalakshya River",
        publishDate: sixtyDaysAgo,
        closeDate: sixtyDaysAgo + (10 * 24 * 60 * 60 * 1000), // 10 days
        awardDate: sixtyDaysAgo + (12 * 24 * 60 * 60 * 1000), // 2 days after close
        estimatedAmount: 50000000,
        awardAmount: 75000000,
        currency: "BDT",
        biddersCount: 1, // Red flag: single bidder
        winner: "Prime Construction Ltd",
        winnerLocal: "প্রাইম কনস্ট্রাকশন লিমিটেড",
        flags: ["single_bidder", "short_window", "high_margin", "quick_award"],
        riskScore: 90,
        sourceUrl: "https://cptu.gov.bd",
        createdAt: now,
        updatedAt: now,
      },
      {
        buyer: "Ministry of Education",
        buyerLocal: "শিক্ষা মন্ত্রণালয়",
        sector: "education",
        method: "open",
        title: "Supply of Educational Equipment",
        publishDate: thirtyDaysAgo,
        closeDate: thirtyDaysAgo + (21 * 24 * 60 * 60 * 1000),
        estimatedAmount: 5000000,
        awardAmount: 5200000,
        currency: "BDT",
        biddersCount: 8,
        winner: "EduTech Solutions",
        flags: [],
        riskScore: 15,
        createdAt: now,
        updatedAt: now,
      },
      {
        buyer: "Health Ministry",
        buyerLocal: "স্বাস্থ্য মন্ত্রণালয়",
        sector: "health",
        method: "limited",
        title: "Medical Equipment Procurement",
        publishDate: now - (45 * 24 * 60 * 60 * 1000),
        closeDate: now - (35 * 24 * 60 * 60 * 1000),
        awardDate: now - (33 * 24 * 60 * 60 * 1000),
        estimatedAmount: 12000000,
        awardAmount: 18000000,
        currency: "BDT",
        biddersCount: 2,
        winner: "MediCorp Bangladesh",
        flags: ["repeat_winner", "high_margin"],
        riskScore: 65,
        createdAt: now,
        updatedAt: now,
      },
    ];
    
    for (const tender of tenders) {
      await ctx.db.insert("tenders", tender);
    }
    
    console.log("Seeded tenders");
    
    // 3. Seed Suppliers
    const suppliers = [
      {
        name: "Prime Construction Ltd",
        nameLocal: "প্রাইম কনস্ট্রাকশন লিমিটেড",
        registrationNumber: "C-123456",
        totalAwards: 15,
        totalValue: 500000000,
        lastAwardDate: sixtyDaysAgo + (12 * 24 * 60 * 60 * 1000),
        winRate: 75.0, // Suspiciously high
        averageMargin: 35.0,
        sectors: ["infrastructure", "construction"],
        isBlacklisted: false,
        createdAt: now,
        updatedAt: now,
      },
      {
        name: "EduTech Solutions",
        totalAwards: 3,
        totalValue: 15000000,
        lastAwardDate: thirtyDaysAgo + (21 * 24 * 60 * 60 * 1000),
        winRate: 60.0,
        averageMargin: 8.0,
        sectors: ["education"],
        isBlacklisted: false,
        createdAt: now,
        updatedAt: now,
      },
    ];
    
    for (const supplier of suppliers) {
      await ctx.db.insert("suppliers", supplier);
    }
    
    console.log("Seeded suppliers");
    
    // 4. Seed Projects (Ward-level budget transparency)
    const projects = [
      {
        ward: "Ward 14",
        wardLocal: "১৪ নং ওয়ার্ড",
        name: "Road Improvement Project",
        nameLocal: "সড়ক উন্নয়ন প্রকল্প",
        category: "infrastructure",
        categoryLocal: "অবকাঠামো",
        plannedBudget: 2000000,
        actualSpend: 2800000, // 40% over budget
        currency: "BDT",
        unitCost: 15000, // per meter
        unitType: "per meter",
        unitTypeLocal: "প্রতি মিটার",
        status: "completed",
        startDate: now - (120 * 24 * 60 * 60 * 1000),
        plannedCompletionDate: now - (30 * 24 * 60 * 60 * 1000),
        actualCompletionDate: now - (10 * 24 * 60 * 60 * 1000),
        contractor: "Local Road Builders",
        contractorLocal: "স্থানীয় সড়ক নির্মাতা",
        location: {
          latitude: 23.7465,
          longitude: 90.3763,
          address: "Dhanmondi, Dhaka",
          ward: "Ward 14",
          district: "Dhaka"
        },
        description: "Improvement of main road in residential area",
        budgetVariance: 40.0,
        timeVariance: -66.7, // Completed early
        qualityScore: 3, // Poor quality rating
        createdAt: now,
        updatedAt: now,
      },
      {
        ward: "Ward 7",
        name: "Community Center Construction",
        nameLocal: "কমিউনিটি সেন্টার নির্মাণ",
        category: "social",
        plannedBudget: 5000000,
        actualSpend: 4800000,
        currency: "BDT",
        unitCost: 8000,
        unitType: "per sq ft",
        status: "in_progress",
        startDate: now - (60 * 24 * 60 * 60 * 1000),
        plannedCompletionDate: now + (30 * 24 * 60 * 60 * 1000),
        location: {
          latitude: 23.7620,
          longitude: 90.3645,
          ward: "Ward 7",
          district: "Dhaka"
        },
        budgetVariance: -4.0,
        timeVariance: 0,
        createdAt: now,
        updatedAt: now,
      },
    ];
    
    for (const project of projects) {
      await ctx.db.insert("projects", project);
    }
    
    console.log("Seeded projects");
    
    // 5. Create demo users
    const users = [
      {
        email: "activist@civiclens.bd",
        name: "Rashida Ahmed",
        nameLocal: "রশিদা আহমেদ",
        location: {
          latitude: 23.7465,
          longitude: 90.3763,
          ward: "Ward 14",
          district: "Dhaka"
        },
        preferredLanguage: "bn",
        isAnonymous: false,
        role: "activist",
        verificationLevel: "email",
        reputationScore: 85,
        totalContributions: 12,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      },
      {
        isAnonymous: true,
        anonymousId: "anon_demo123456",
        preferredLanguage: "en",
        role: "citizen",
        verificationLevel: "unverified",
        reputationScore: 15,
        totalContributions: 3,
        lastActiveAt: now,
        createdAt: now,
        updatedAt: now,
      },
    ];
    
    const userIds = [];
    for (const user of users) {
      const id = await ctx.db.insert("users", user);
      userIds.push(id);
    }
    
    console.log("Seeded users");
    
    // 6. Seed overcharge reports
    const overchargeReports = [
      {
        serviceId: serviceIds[0], // NID Card
        reportedFee: 500, // Official: 230, Reported: 500
        officialFee: 230,
        overchargeAmount: 270,
        overchargePercentage: 117.4,
        officeName: "Dhanmondi Upazila Office",
        location: {
          latitude: 23.7465,
          longitude: 90.3763,
          ward: "Ward 14",
          district: "Dhaka"
        },
        note: "Asked for extra money for 'faster processing'",
        isAnonymous: false,
        userId: userIds[0].toString(),
        timestamp: now - (5 * 24 * 60 * 60 * 1000),
        isVerified: true,
      },
      {
        serviceId: serviceIds[1], // Birth Certificate
        reportedFee: 200,
        officialFee: 50,
        overchargeAmount: 150,
        overchargePercentage: 300.0,
        officeName: "Gulshan Registration Office",
        isAnonymous: true,
        timestamp: now - (10 * 24 * 60 * 60 * 1000),
        isVerified: false,
      },
    ];
    
    for (const report of overchargeReports) {
      await ctx.db.insert("overchargeReports", report);
    }
    
    console.log("Seeded overcharge reports");
    
    // 7. Create demo RTI requests
    const rtiRequests = [
      {
        userId: userIds[0].toString(),
        agency: "Dhaka City Corporation",
        agencyLocal: "ঢাকা সিটি কর্পোরেশন",
        topic: "Garbage Collection Contract",
        topicLocal: "আবর্জনা সংগ্রহ চুক্তি",
        requestText: "Please provide details of garbage collection contracts awarded in the last 2 years including contractor names, contract values, and performance evaluations.",
        requestTextLocal: "গত ২ বছরে প্রদত্ত আবর্জনা সংগ্রহ চুক্তির বিস্তারিত তথ্য প্রদান করুন",
        status: "responded",
        submissionDate: now - (25 * 24 * 60 * 60 * 1000),
        deadline: now + (5 * 24 * 60 * 60 * 1000),
        responseDate: now - (5 * 24 * 60 * 60 * 1000),
        response: "Contract details provided as requested",
        outcome: "Information received",
        isPublished: true,
        publishedOutcome: "Learned that 3 contracts were awarded worth 50 crore taka total",
        templateUsed: "contract_inquiry",
        followUpCount: 1,
        createdAt: now - (25 * 24 * 60 * 60 * 1000),
        updatedAt: now - (5 * 24 * 60 * 60 * 1000),
      },
    ];
    
    for (const request of rtiRequests) {
      await ctx.db.insert("rtiRequests", request);
    }
    
    console.log("Seeded RTI requests");
    
    // 8. Create demo bribe logs
    const bribeLogs = [
      {
        userId: userIds[1].toString(), // Anonymous user
        office: "Gulshan Police Station",
        officeLocal: "গুলশান থানা",
        service: "Traffic Fine",
        serviceLocal: "ট্রাফিক জরিমানা",
        timestamp: now - (3 * 24 * 60 * 60 * 1000),
        amount: 1000,
        currency: "BDT",
        textNote: "Officer asked for money to avoid formal fine",
        location: {
          latitude: 23.7925,
          longitude: 90.4078,
          district: "Dhaka"
        },
        hash: "a1b2c3d4e5f6",
        isAnonymous: true,
        severity: "medium",
        reportedToAuthorities: false,
        createdAt: now - (3 * 24 * 60 * 60 * 1000),
      },
    ];
    
    for (const log of bribeLogs) {
      await ctx.db.insert("bribeLogs", log);
    }
    
    console.log("Seeded bribe logs");
    
    // 9. Create system configuration
    const systemConfigs = [
      {
        key: "app_version",
        value: "1.0.0",
        description: "Current app version",
        updatedAt: now,
        updatedBy: "system",
      },
      {
        key: "risk_score_thresholds",
        value: {
          low: 30,
          medium: 50,
          high: 70,
          critical: 85
        },
        description: "Risk score thresholds for categorization",
        updatedAt: now,
        updatedBy: "admin",
      },
    ];
    
    for (const config of systemConfigs) {
      await ctx.db.insert("systemConfig", config);
    }
    
    console.log("Seeded system config");
    
    console.log("Demo data seeding completed successfully!");
    
    return {
      success: true,
      message: "Demo data seeded successfully",
      counts: {
        services: services.length,
        tenders: tenders.length,
        suppliers: suppliers.length,
        projects: projects.length,
        users: users.length,
        overchargeReports: overchargeReports.length,
        rtiRequests: rtiRequests.length,
        bribeLogs: bribeLogs.length,
      }
    };
  },
});