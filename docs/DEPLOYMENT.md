# CivicLens Deployment Guide

## Overview
Complete deployment guide for CivicLens anti-corruption platform including backend (Convex), web app (Next.js), and mobile app (React Native/Expo).

## Prerequisites

### System Requirements
- Node.js 18+ and npm 9+
- Git for version control
- Expo CLI for mobile development
- Convex account for backend

### Development Tools
```bash
# Install required tools
npm install -g @expo/cli
npm install -g convex
npm install -g vercel  # For web deployment
```

## Backend Deployment (Convex)

### 1. Setup Convex Project
```bash
cd packages/backend
npx convex dev  # Initialize development environment
```

### 2. Configure Environment
Create `.env.local`:
```env
CONVEX_DEPLOYMENT=your-deployment-url
NEXT_PUBLIC_CONVEX_URL=https://your-deployment.convex.cloud
```

### 3. Deploy Schema and Functions
```bash
# Deploy schema
npx convex deploy

# Seed initial data
npx convex run seed:seedAll

# Configure authentication
npx convex auth add --provider email
```

### 4. Production Deployment
```bash
# Create production deployment
npx convex deploy --prod

# Configure custom domain (optional)
npx convex configure --domain api.civiclens.gov.bd
```

## Web Application Deployment (Next.js)

### 1. Build Configuration
```bash
cd apps/web

# Install dependencies
npm install

# Configure environment variables
cp .env.example .env.local
```

Environment variables (`.env.local`):
```env
NEXT_PUBLIC_CONVEX_URL=https://your-prod-deployment.convex.cloud
NEXT_PUBLIC_APP_ENV=production
NEXT_PUBLIC_SENTRY_DSN=your-sentry-dsn
```

### 2. Build and Test
```bash
# Build application
npm run build

# Test production build
npm run start

# Run tests
npm run test
```

### 3. Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Set custom domain
vercel domains add civiclens.gov.bd
vercel domains add www.civiclens.gov.bd
```

### 4. Alternative: Docker Deployment
```dockerfile
# Dockerfile
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production
COPY . .
RUN npm run build
EXPOSE 3000
CMD ["npm", "start"]
```

Deploy with Docker:
```bash
# Build image
docker build -t civiclens-web .

# Run container
docker run -p 3000:3000 --env-file .env.local civiclens-web

# Deploy to cloud (AWS ECS, GCP Cloud Run, etc.)
```

## Mobile App Deployment (React Native/Expo)

### 1. Prepare for Production
```bash
cd apps/native

# Install dependencies
npm install

# Configure app.config.js
```

Update `app.config.js`:
```javascript
export default {
  expo: {
    name: "CivicLens",
    slug: "civiclens-bd",
    version: "1.0.0",
    platforms: ["ios", "android"],
    icon: "./assets/icon.png",
    splash: {
      image: "./assets/splash.png",
      resizeMode: "contain",
      backgroundColor: "#ffffff"
    },
    extra: {
      convexUrl: process.env.EXPO_PUBLIC_CONVEX_URL,
      eas: {
        projectId: "your-eas-project-id"
      }
    }
  }
};
```

### 2. Build and Submit

#### Android Deployment
```bash
# Configure EAS
eas build:configure

# Build APK for testing
eas build --platform android --profile preview

# Build for Google Play Store
eas build --platform android --profile production

# Submit to Play Store
eas submit --platform android
```

#### iOS Deployment  
```bash
# Build for TestFlight
eas build --platform ios --profile preview

# Build for App Store
eas build --platform ios --profile production

# Submit to App Store
eas submit --platform ios
```

### 3. OTA Updates
```bash
# Publish updates without app store review
eas update --channel production --message "Bug fixes and improvements"
```

## Database and Storage

### SQLite Setup (Mobile)
The mobile app uses SQLite for offline storage. No additional setup required - handled automatically by the app.

### File Storage (Optional)
For file uploads (photos, documents):

#### AWS S3 Setup
```bash
# Install AWS SDK
npm install aws-sdk

# Configure in Convex
# convex/files.ts
import { S3 } from "aws-sdk";

const s3 = new S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: "ap-southeast-1"
});
```

## Security Configuration

### 1. HTTPS Setup
```bash
# For web app (automatic with Vercel)
# For custom domains, configure SSL certificate

# For API (Convex handles SSL automatically)
```

### 2. Environment Security
```bash
# Secure environment variables
# Never commit .env files
# Use Vercel/EAS environment variables for secrets

# Example secure configuration
CONVEX_DEPLOY_KEY=secret-key-here
SENTRY_DSN=https://...
ANALYTICS_KEY=secret-key
```

### 3. Content Security Policy
Add to `next.config.js`:
```javascript
const nextConfig = {
  headers: async () => [
    {
      source: '/(.*)',
      headers: [
        {
          key: 'Content-Security-Policy',
          value: "default-src 'self'; script-src 'self' 'unsafe-eval'; style-src 'self' 'unsafe-inline';"
        }
      ]
    }
  ]
};
```

## Monitoring and Analytics

### 1. Error Tracking (Sentry)
```bash
# Install Sentry
npm install @sentry/nextjs @sentry/react-native

# Configure
# sentry.client.config.js
import * as Sentry from "@sentry/nextjs";

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,
});
```

### 2. Performance Monitoring
```javascript
// Add to app
import { performanceOptimizer } from './lib/performance-optimizer';

// Track key metrics
performanceOptimizer.trackScreenLoad('TenderList');
performanceOptimizer.trackApiCall('/api/tenders');
```

### 3. Analytics Setup
```javascript
// Google Analytics 4
import { gtag } from 'ga-gtag';

gtag('config', 'GA_MEASUREMENT_ID', {
  page_title: 'CivicLens',
  page_location: window.location.href
});
```

## Maintenance and Updates

### 1. Regular Maintenance Tasks
```bash
# Weekly tasks
npm audit  # Security vulnerabilities
npm update  # Dependency updates
eas build --platform all --profile preview  # Test builds

# Monthly tasks
# Performance review
# Security audit
# User feedback analysis
```

### 2. Backup Strategy
```bash
# Convex data backup (automatic)
# Additional backup script
npx convex export --output ./backups/$(date +%Y%m%d).json

# Database backup for file storage
aws s3 sync s3://civiclens-files ./backups/files/
```

### 3. Rollback Procedures
```bash
# Web app rollback
vercel rollback [deployment-url]

# Mobile app rollback
eas update --channel production --group rollback

# Backend rollback
npx convex rollback [function-name]
```

## Production Checklist

### Pre-Launch
- [ ] All environment variables configured
- [ ] SSL certificates installed
- [ ] Database seeded with initial data
- [ ] Analytics and monitoring configured
- [ ] Error tracking operational
- [ ] Security headers configured
- [ ] Performance testing completed
- [ ] Mobile app store listings prepared

### Launch Day
- [ ] Deploy backend (Convex)
- [ ] Deploy web application
- [ ] Submit mobile apps to stores
- [ ] Configure DNS records
- [ ] Enable monitoring alerts
- [ ] Announce launch to stakeholders

### Post-Launch
- [ ] Monitor error rates and performance
- [ ] Track user adoption metrics
- [ ] Collect user feedback
- [ ] Plan first update cycle
- [ ] Document lessons learned

## Scaling Considerations

### Traffic Growth
- Convex scales automatically
- Consider CDN for static assets
- Implement caching strategies
- Monitor database performance

### Geographic Distribution
- Use Vercel's global edge network
- Consider regional CDN nodes
- Implement localized content delivery

### Load Testing
```bash
# Install k6 for load testing
npm install -g k6

# Create test script
# load-test.js
import http from 'k6/http';
import { check } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 },
    { duration: '5m', target: 500 },
    { duration: '2m', target: 0 },
  ],
};

export default function() {
  let response = http.get('https://api.civiclens.gov.bd/health');
  check(response, { 'status is 200': (r) => r.status === 200 });
}

# Run load test
k6 run load-test.js
```

## Support and Maintenance

### Documentation
- API documentation: `/docs/API.md`
- User guides: `/docs/user-guides/`
- Admin documentation: `/docs/admin/`
- Troubleshooting: `/docs/troubleshooting.md`

### Contact Information
- Technical Support: tech@civiclens.gov.bd
- Security Issues: security@civiclens.gov.bd
- General Inquiries: info@civiclens.gov.bd

### Emergency Contacts
- Primary Developer: +880-XXX-XXXXXX
- System Administrator: +880-XXX-XXXXXX
- Project Manager: +880-XXX-XXXXXX