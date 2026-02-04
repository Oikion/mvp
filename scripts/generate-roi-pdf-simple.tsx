import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';

// Register fonts
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2', fontWeight: 700 },
  ]
});

const colors = {
  primary: '#2563eb',
  secondary: '#64748b',
  accent: '#0ea5e9',
  success: '#10b981',
  warning: '#f59e0b',
  danger: '#ef4444',
  dark: '#1e293b',
  light: '#f1f5f9',
  white: '#ffffff',
  text: '#334155',
  textLight: '#64748b',
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Inter',
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.6,
  },
  coverPage: {
    padding: 60,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 20,
    lineHeight: 1.2,
  },
  coverSubtitle: {
    fontSize: 20,
    color: colors.light,
    marginBottom: 60,
    lineHeight: 1.4,
  },
  coverProject: {
    fontSize: 16,
    color: colors.white,
    marginBottom: 10,
    marginTop: 100,
  },
  coverMeta: {
    fontSize: 12,
    color: colors.light,
    marginTop: 40,
  },
  header: {
    fontSize: 22,
    fontWeight: 700,
    color: colors.dark,
    marginTop: 24,
    marginBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
    paddingBottom: 8,
  },
  header2: {
    fontSize: 16,
    fontWeight: 600,
    color: colors.dark,
    marginTop: 20,
    marginBottom: 12,
  },
  header3: {
    fontSize: 13,
    fontWeight: 600,
    color: colors.dark,
    marginTop: 16,
    marginBottom: 10,
  },
  paragraph: {
    marginBottom: 10,
    textAlign: 'justify',
    lineHeight: 1.6,
  },
  bold: {
    fontWeight: 600,
  },
  listItem: {
    marginBottom: 6,
    marginLeft: 20,
    display: 'flex',
    flexDirection: 'row',
  },
  bullet: {
    width: 15,
    color: colors.primary,
  },
  table: {
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  tableHeader: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    padding: 8,
  },
  tableHeaderCell: {
    color: colors.white,
    fontWeight: 600,
    fontSize: 9,
    flex: 1,
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  tableCell: {
    fontSize: 9,
    flex: 1,
  },
  callout: {
    backgroundColor: '#dbeafe',
    padding: 14,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginVertical: 12,
    borderRadius: 4,
  },
  calloutSuccess: {
    backgroundColor: '#d1fae5',
    borderLeftColor: colors.success,
  },
  calloutWarning: {
    backgroundColor: '#fef3c7',
    borderLeftColor: colors.warning,
  },
  summary: {
    backgroundColor: colors.primary,
    color: colors.white,
    padding: 16,
    borderRadius: 6,
    marginVertical: 16,
  },
  summaryTitle: {
    fontSize: 13,
    fontWeight: 700,
    marginBottom: 10,
    color: colors.white,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: colors.textLight,
    borderTopWidth: 1,
    borderTopColor: colors.light,
    paddingTop: 8,
  },
});

const CoverPage = () => (
  <Page size="A4" style={styles.coverPage}>
    <Text style={styles.coverTitle}>ROI Analysis</Text>
    <Text style={styles.coverSubtitle}>
      Solo Development with Cursor AI vs. Hiring Full-Stack Developer
    </Text>
    <Text style={styles.coverProject}>Project: Oikion MVP</Text>
    <Text style={{ fontSize: 14, color: colors.light, marginBottom: 10 }}>
      Real Estate SaaS Platform for Greek Agencies
    </Text>
    <View style={styles.coverMeta}>
      <Text style={{ marginBottom: 6 }}>Document Version: 1.0</Text>
      <Text style={{ marginBottom: 6 }}>Date: January 31, 2026</Text>
      <Text>Analysis Period: 12-month development cycle</Text>
    </View>
  </Page>
);

const ExecutiveSummary = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.header}>Executive Summary</Text>
    
    <Text style={styles.paragraph}>
      This document analyzes two development trajectories for Oikion, a multi-tenant SaaS platform for Greek real estate agencies, 
      comparing solo founder development with Cursor IDE + Claude Opus 4.5 versus hiring a full-stack developer equipped with the same AI tools.
    </Text>

    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>Key Recommendation</Text>
      <Text style={{ fontSize: 10, color: colors.white, lineHeight: 1.5 }}>
        Continue solo development with AI through MVP launch, then reassess based on traction metrics and revenue.
      </Text>
    </View>

    <Text style={styles.header2}>Key Findings Summary</Text>
    
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Metric</Text>
        <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Solo + AI</Text>
        <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Developer + AI</Text>
        <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Difference</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '25%' }]}>12-Month Cost</Text>
        <Text style={[styles.tableCell, { width: '20%' }]}>$2,520</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$84k - $132k</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>97-98% savings</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '25%' }]}>Time to MVP</Text>
        <Text style={[styles.tableCell, { width: '20%' }]}>3-4 months</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>2-3 months</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>30-40% faster</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '25%' }]}>Feature Velocity</Text>
        <Text style={[styles.tableCell, { width: '20%' }]}>8-12/month</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>15-25/month</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>87-108% faster</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '25%' }]}>Code Quality Risk</Text>
        <Text style={[styles.tableCell, { width: '20%' }]}>Medium-High</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>Low-Medium</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>Higher oversight</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '25%' }]}>Bus Factor</Text>
        <Text style={[styles.tableCell, { width: '20%' }]}>Critical (1)</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>Low (1-2)</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>Similar risk</Text>
      </View>
    </View>

    <Text style={[styles.paragraph, { marginTop: 16 }]}>
      The analysis recommends continuing solo development through MVP launch (estimated 3-4 months) to preserve capital 
      during the highest-risk pre-revenue phase. Revisit the hiring decision when MRR exceeds $10k, customer count reaches 
      15+, or feature backlog exceeds 3 months of solo capacity.
    </Text>

    <View style={styles.footer}>
      <Text>Oikion MVP - ROI Analysis</Text>
      <Text>Page 2</Text>
    </View>
  </Page>
);

const ProjectAssessment = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.header}>1. Current Project Assessment</Text>
    
    <Text style={styles.header2}>1.1 Codebase Metrics (as of Jan 31, 2026)</Text>
    
    <View style={{ backgroundColor: colors.dark, padding: 12, borderRadius: 4, marginBottom: 12 }}>
      <Text style={{ color: colors.white, fontSize: 9, fontFamily: 'Courier', marginBottom: 3 }}>
        Project Version:     0.1.4-alpha-pre-launch
      </Text>
      <Text style={{ color: colors.white, fontSize: 9, fontFamily: 'Courier', marginBottom: 3 }}>
        Total Source Files:  1,170 TypeScript/TSX files
      </Text>
      <Text style={{ color: colors.white, fontSize: 9, fontFamily: 'Courier', marginBottom: 3 }}>
        Database Models:     91 models (2,791 lines)
      </Text>
      <Text style={{ color: colors.white, fontSize: 9, fontFamily: 'Courier', marginBottom: 3 }}>
        Project Size:        ~6.2 GB (with dependencies)
      </Text>
      <Text style={{ color: colors.white, fontSize: 9, fontFamily: 'Courier', marginBottom: 3 }}>
        Recent Activity:     15 commits in last 3 months
      </Text>
      <Text style={{ color: colors.white, fontSize: 9, fontFamily: 'Courier' }}>
        Current Branch:      Admin-Features
      </Text>
    </View>

    <Text style={styles.header2}>1.2 Technology Stack Complexity</Text>
    
    <Text style={styles.header3}>High Complexity Components:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Next.js 16 (App Router) + React 19 (latest, bleeding edge)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Multi-tenant architecture with organization isolation</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Clerk authentication with custom role system</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Prisma ORM with 91 interconnected models</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Real-time messaging with Ably WebSockets</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Dual API systems (internal + external with scopes)</Text>
    </View>

    <View style={styles.calloutWarning}>
      <Text style={styles.bold}>Risk Assessment: </Text>
      <Text>
        The stack is modern but stable. Using bleeding-edge React 19 introduces minor update risks that require 
        careful dependency management.
      </Text>
    </View>

    <Text style={styles.header2}>1.3 Feature Completeness</Text>
    <Text style={styles.paragraph}>
      Based on the codebase structure and recent commits, estimated overall MVP completion: ~72%
    </Text>
    <Text style={styles.paragraph}>
      Estimated time to launch-ready state: 3-4 months (solo with AI) or 2-3 months (with dedicated developer)
    </Text>

    <View style={styles.footer}>
      <Text>Oikion MVP - ROI Analysis</Text>
      <Text>Page 3</Text>
    </View>
  </Page>
);

const CostAnalysis = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.header}>2. Cost Analysis: 12-Month Comparison</Text>
    
    <Text style={styles.header2}>2.1 Direct Costs Comparison</Text>
    
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Item</Text>
        <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Solo (Annual)</Text>
        <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Dev (Annual Low)</Text>
        <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Dev (Annual High)</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '30%' }]}>Cursor Pro</Text>
        <Text style={[styles.tableCell, { width: '20%' }]}>$240</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$240</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$240</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '30%' }]}>Developer Salary</Text>
        <Text style={[styles.tableCell, { width: '20%' }]}>-</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$72,000</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$108,000</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '30%' }]}>Tools & Hosting</Text>
        <Text style={[styles.tableCell, { width: '20%' }]}>$1,800</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$1,800</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$1,800</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '30%' }]}>Benefits & Taxes</Text>
        <Text style={[styles.tableCell, { width: '20%' }]}>-</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$16,800</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$25,800</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '30%', fontWeight: 600 }]}>Total</Text>
        <Text style={[styles.tableCell, { width: '20%', fontWeight: 600 }]}>$2,520</Text>
        <Text style={[styles.tableCell, { width: '25%', fontWeight: 600 }]}>$90,840</Text>
        <Text style={[styles.tableCell, { width: '25%', fontWeight: 600 }]}>$135,840</Text>
      </View>
    </View>

    <View style={styles.calloutSuccess}>
      <Text style={styles.bold}>Capital Efficiency: </Text>
      <Text>
        Solo development with AI provides 97-98% cost savings in direct expenses during the critical pre-revenue phase.
      </Text>
    </View>

    <Text style={styles.header2}>2.2 Break-even Analysis</Text>
    
    <Text style={styles.paragraph}>
      Solo development becomes cost-effective when:
    </Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Cash runway is limited (less than $150k available)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Revenue is 6+ months away (no immediate monetization)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Product-market fit is still being validated</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Founder has sufficient technical skills</Text>
    </View>

    <Text style={[styles.paragraph, { marginTop: 12 }]}>
      Developer + AI becomes viable when:
    </Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Raised seed funding ($500k+) with 12+ month runway</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Strong early traction (50+ engaged beta users)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Speed to market is critical competitive factor</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Feature backlog exceeds 3+ months of solo capacity</Text>
    </View>

    <View style={styles.footer}>
      <Text>Oikion MVP - ROI Analysis</Text>
      <Text>Page 4</Text>
    </View>
  </Page>
);

const VelocityAnalysis = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.header}>3. Development Velocity & Timeline</Text>
    
    <Text style={styles.header2}>3.1 Timeline to MVP Launch Comparison</Text>
    
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Phase</Text>
        <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Solo + AI</Text>
        <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Developer + AI</Text>
        <Text style={[styles.tableHeaderCell, { width: '21%' }]}>Delta</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '35%' }]}>Complete Admin Features</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>3-4 weeks</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>2-3 weeks</Text>
        <Text style={[styles.tableCell, { width: '21%' }]}>-1 week</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '35%' }]}>Polish CRM & MLS</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>4-5 weeks</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>3-4 weeks</Text>
        <Text style={[styles.tableCell, { width: '21%' }]}>-1 week</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '35%' }]}>Messaging Features</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>3-4 weeks</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>2-3 weeks</Text>
        <Text style={[styles.tableCell, { width: '21%' }]}>-1 week</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '35%' }]}>Testing & Bug Fixes</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>3-4 weeks</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>2-3 weeks</Text>
        <Text style={[styles.tableCell, { width: '21%' }]}>-1 week</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '35%', fontWeight: 600 }]}>Total to Launch</Text>
        <Text style={[styles.tableCell, { width: '22%', fontWeight: 600 }]}>16-22 weeks</Text>
        <Text style={[styles.tableCell, { width: '22%', fontWeight: 600 }]}>14-18 weeks</Text>
        <Text style={[styles.tableCell, { width: '21%', fontWeight: 600 }]}>-2-4 weeks</Text>
      </View>
    </View>

    <View style={styles.callout}>
      <Text style={styles.bold}>Key Insight: </Text>
      <Text>
        Hiring a developer now would save approximately 2-4 weeks (20-30% faster), but requires 2-3 weeks of 
        onboarding time, netting only 1-2 weeks of actual time savings to MVP launch.
      </Text>
    </View>

    <Text style={styles.header2}>3.2 Post-MVP Feature Velocity</Text>
    
    <Text style={styles.paragraph}>
      After MVP launch, the velocity difference becomes more pronounced:
    </Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Solo + AI: 8-12 features per month with ongoing maintenance</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Developer + AI: 15-25 features per month (87-108% faster)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Developer allows founder to focus on sales, marketing, and customer development</Text>
    </View>

    <Text style={styles.header2}>3.3 Velocity Factors</Text>
    
    <Text style={styles.header3}>Solo + AI Accelerators:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>No communication overhead or coordination needed</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>Deep product knowledge and direct customer feedback</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>Fast iteration without consensus building</Text>
    </View>

    <Text style={styles.header3}>Solo + AI Decelerators:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✗</Text>
      <Text style={{ flex: 1 }}>Context switching between multiple roles</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✗</Text>
      <Text style={{ flex: 1 }}>No human code review partner</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✗</Text>
      <Text style={{ flex: 1 }}>Burnout risk with sustained 50-60 hour weeks</Text>
    </View>

    <View style={styles.footer}>
      <Text>Oikion MVP - ROI Analysis</Text>
      <Text>Page 5</Text>
    </View>
  </Page>
);

const Recommendations = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.header}>4. Recommendations & Decision Framework</Text>
    
    <Text style={styles.header2}>4.1 Recommended Path: Phased Approach</Text>
    
    <Text style={styles.header3}>Phase 1: Solo Development to MVP (Months 1-4)</Text>
    
    <View style={styles.calloutSuccess}>
      <Text style={styles.bold}>Rationale: </Text>
      <Text>
        Preserve cash during highest-risk period, maintain product vision control, enable fast iteration, 
        and prove product-market fit before major hiring commitment.
      </Text>
    </View>

    <Text style={[styles.paragraph, { fontWeight: 600, marginTop: 12 }]}>Goals:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Complete MVP to beta-launch quality</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Onboard 10-20 pilot agencies in Greece</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Validate pricing and product-market fit</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Establish revenue baseline ($3k-$10k MRR)</Text>
    </View>

    <Text style={styles.header3}>Phase 2: Evaluation & Transition (Months 5-6)</Text>
    
    <Text style={[styles.paragraph, { fontWeight: 600 }]}>Hire Developer if 3+ of these are true:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>MRR exceeds $10,000</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>15+ paying customers with under 10% monthly churn</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>Feature backlog exceeds 2 months of solo work</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>Customer support requires more than 15 hours/week</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>Clear path to $30k+ MRR within 6 months</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>Have 9+ months runway at projected burn rate</Text>
    </View>

    <Text style={[styles.paragraph, { fontWeight: 600, marginTop: 12 }]}>Continue Solo if:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>MRR is less than $5,000</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Unclear product-market fit or high churn (over 15% monthly)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Runway is less than 6 months after hiring costs</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Pivoting or major product changes are likely</Text>
    </View>

    <View style={styles.footer}>
      <Text>Oikion MVP - ROI Analysis</Text>
      <Text>Page 6</Text>
    </View>
  </Page>
);

const FinancialThresholds = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.header}>5. Financial Thresholds</Text>
    
    <Text style={styles.header2}>5.1 When Does Hiring Make Financial Sense?</Text>
    
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Stage</Text>
        <Text style={[styles.tableHeaderCell, { width: '15%' }]}>MRR</Text>
        <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Recommendation</Text>
        <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Reasoning</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '20%' }]}>Pre-launch</Text>
        <Text style={[styles.tableCell, { width: '15%' }]}>$0</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>Solo + AI</Text>
        <Text style={[styles.tableCell, { width: '35%' }]}>Preserve cash, prove concept</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '20%' }]}>Beta Launch</Text>
        <Text style={[styles.tableCell, { width: '15%' }]}>$0-$5k</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>Solo + AI</Text>
        <Text style={[styles.tableCell, { width: '35%' }]}>Not yet sustainable</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '20%' }]}>Early Traction</Text>
        <Text style={[styles.tableCell, { width: '15%' }]}>$5k-$15k</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>Consider hiring</Text>
        <Text style={[styles.tableCell, { width: '35%' }]}>Salary = 40-75% of revenue</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '20%' }]}>Scaling</Text>
        <Text style={[styles.tableCell, { width: '15%' }]}>$15k-$30k</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>Hire developer</Text>
        <Text style={[styles.tableCell, { width: '35%' }]}>Salary = 25-50% of revenue</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '20%' }]}>Growth</Text>
        <Text style={[styles.tableCell, { width: '15%' }]}>$30k+</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>Hire + expand team</Text>
        <Text style={[styles.tableCell, { width: '35%' }]}>Salary under 25% of revenue</Text>
      </View>
    </View>

    <View style={styles.calloutWarning}>
      <Text style={styles.bold}>Rule of Thumb: </Text>
      <Text>
        Hire when developer salary represents under 50% of MRR and you have 6+ months of runway at projected 
        burn rate including the new hire.
      </Text>
    </View>

    <Text style={styles.header2}>5.2 Greek Market Context</Text>
    
    <Text style={styles.paragraph}>
      Greek developer market rates (2026):
    </Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Junior (1-2 years): €30k-€42k annually</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Mid-level (3-5 years): €45k-€65k annually</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Senior (5+ years): €65k-€90k annually</Text>
    </View>

    <View style={styles.calloutSuccess}>
      <Text style={styles.bold}>Oikion Advantage: </Text>
      <Text>
        Hiring in Greece offers 40-50% cost savings compared to Western Europe or US markets, while maintaining 
        access to quality talent.
      </Text>
    </View>

    <Text style={styles.header2}>5.3 Market Opportunity</Text>
    
    <Text style={styles.paragraph}>
      Greek real estate market overview:
    </Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Approximately 25,000 real estate agencies in Greece</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Current digitalization rate: approximately 30% (growing)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Gap: Integrated MLS + CRM + team collaboration (Oikion position)</Text>
    </View>

    <View style={styles.footer}>
      <Text>Oikion MVP - ROI Analysis</Text>
      <Text>Page 7</Text>
    </View>
  </Page>
);

const Conclusion = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.header}>6. Conclusion</Text>
    
    <Text style={styles.paragraph}>
      Both development paths are viable, but the optimal choice depends on your specific situation, stage, and 
      available resources.
    </Text>

    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>Primary Recommendation for Oikion (January 2026)</Text>
      <Text style={{ fontSize: 10, color: colors.white, lineHeight: 1.5 }}>
        Continue solo development with Cursor + Claude Opus 4.5 through MVP launch (estimated 3-4 months). 
        Your codebase is already 72% complete. Hiring now would save perhaps 4-6 weeks but cost $28k-$44k 
        during the highest-risk pre-revenue phase.
      </Text>
    </View>

    <Text style={styles.header2}>6.1 Decision Criteria Summary</Text>
    
    <Text style={styles.header3}>Choose Solo + AI if:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Cash runway is less than $150k</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Current MRR is $0-$5k (pre-revenue or early stage)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Founder has strong technical skills and can commit 40+ hours/week</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Product-market fit is unproven</Text>
    </View>

    <Text style={styles.header3}>Choose Developer + AI if:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Cash runway exceeds $300k (raised funding)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Current MRR is $10k+ (proven traction)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Time to market pressure is critical</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Feature backlog exceeds 3+ months capacity</Text>
    </View>

    <Text style={styles.header2}>6.2 Key Success Factors</Text>
    
    <Text style={styles.header3}>For Solo + AI to Succeed:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>1.</Text>
      <Text style={{ flex: 1 }}>Ruthless prioritization - MVP features only</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>2.</Text>
      <Text style={{ flex: 1 }}>Master Cursor AI workflows to achieve 2-3x productivity</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>3.</Text>
      <Text style={{ flex: 1 }}>Maintain health and avoid burnout (strict work limits)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>4.</Text>
      <Text style={{ flex: 1 }}>Build with future team scalability in mind</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>5.</Text>
      <Text style={{ flex: 1 }}>Automate everything possible (testing, deployment, monitoring)</Text>
    </View>

    <Text style={{ marginTop: 24, fontSize: 12, fontWeight: 600, textAlign: 'center' }}>
      Good luck with Oikion!
    </Text>

    <View style={{ marginTop: 40, padding: 12, borderTopWidth: 1, borderTopColor: colors.light }}>
      <Text style={{ fontSize: 8, color: colors.textLight, textAlign: 'center', marginBottom: 3 }}>
        This analysis is based on current market conditions (January 2026), Oikion codebase assessment,
      </Text>
      <Text style={{ fontSize: 8, color: colors.textLight, textAlign: 'center' }}>
        and industry benchmarks. Review quarterly and adjust based on real-world performance.
      </Text>
    </View>

    <View style={styles.footer}>
      <Text>Oikion MVP - ROI Analysis</Text>
      <Text>Page 8</Text>
    </View>
  </Page>
);

const ROIDocument = () => (
  <Document>
    <CoverPage />
    <ExecutiveSummary />
    <ProjectAssessment />
    <CostAnalysis />
    <VelocityAnalysis />
    <Recommendations />
    <FinancialThresholds />
    <Conclusion />
  </Document>
);

async function generatePDF() {
  try {
    console.log('🎨 Generating beautiful PDF document...');
    
    const pdfBlob = await pdf(<ROIDocument />).toBlob();
    const buffer = Buffer.from(await pdfBlob.arrayBuffer());
    
    const outputPath = path.join(process.cwd(), 'docs', 'roi-analysis-cursor-ai-vs-fullstack-developer.pdf');
    
    const docsDir = path.join(process.cwd(), 'docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    
    fs.writeFileSync(outputPath, buffer);
    
    console.log('✅ PDF generated successfully!');
    console.log(`📄 Location: ${outputPath}`);
    console.log(`📊 File size: ${(buffer.length / 1024).toFixed(2)} KB`);
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
}

generatePDF().catch(console.error);
