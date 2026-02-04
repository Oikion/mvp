import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';

// Use built-in fonts only
const colors = {
  primary: '#2563eb',
  secondary: '#64748b',
  accent: '#0ea5e9',
  success: '#10b981',
  warning: '#f59e0b',
  dark: '#1e293b',
  light: '#f1f5f9',
  white: '#ffffff',
  text: '#334155',
  textLight: '#64748b',
};

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontSize: 10,
    color: colors.text,
    lineHeight: 1.6,
  },
  coverPage: {
    padding: 60,
    flexDirection: 'column',
    justifyContent: 'center',
    backgroundColor: colors.primary,
  },
  coverTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.white,
    marginBottom: 20,
  },
  coverSubtitle: {
    fontSize: 18,
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
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.dark,
    marginTop: 24,
    marginBottom: 16,
    borderBottomWidth: 3,
    borderBottomColor: colors.primary,
    paddingBottom: 8,
  },
  header2: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.dark,
    marginTop: 20,
    marginBottom: 12,
  },
  header3: {
    fontSize: 12,
    fontWeight: 'bold',
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
    fontWeight: 'bold',
  },
  listItem: {
    marginBottom: 6,
    marginLeft: 20,
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
    fontWeight: 'bold',
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
    fontWeight: 'bold',
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
  codeBlock: {
    backgroundColor: colors.dark,
    color: colors.white,
    padding: 12,
    borderRadius: 4,
    marginVertical: 12,
  },
  codeLine: {
    fontSize: 9,
    color: colors.white,
    marginBottom: 3,
  },
});

const CoverPage = () => (
  <Page size="A4" style={styles.coverPage}>
    <Text style={styles.coverTitle}>ROI Analysis</Text>
    <Text style={styles.coverSubtitle}>
      Solo Development with Cursor AI{'\n'}vs. Hiring Full-Stack Developer
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
    
    <View style={styles.codeBlock}>
      <Text style={styles.codeLine}>Project Version:     0.1.4-alpha-pre-launch</Text>
      <Text style={styles.codeLine}>Total Source Files:  1,170 TypeScript/TSX files</Text>
      <Text style={styles.codeLine}>Database Models:     91 models (2,791 lines)</Text>
      <Text style={styles.codeLine}>Project Size:        ~6.2 GB (with dependencies)</Text>
      <Text style={styles.codeLine}>Recent Activity:     15 commits in last 3 months</Text>
      <Text style={styles.codeLine}>Current Branch:      Admin-Features</Text>
    </View>

    <Text style={styles.header2}>1.2 Technology Stack Complexity</Text>
    
    <Text style={styles.header3}>High Complexity Components:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Next.js 16 (App Router) + React 19 (latest)</Text>
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
      <Text style={{ flex: 1 }}>Dual API systems (internal + external)</Text>
    </View>

    <View style={styles.calloutWarning}>
      <Text style={styles.bold}>Risk Assessment: </Text>
      <Text>
        The stack is modern but stable. Using bleeding-edge React 19 introduces minor update risks.
      </Text>
    </View>

    <Text style={styles.header2}>1.3 Feature Completeness</Text>
    <Text style={styles.paragraph}>
      Based on codebase analysis: ~72% complete. Estimated 3-4 months to launch (solo with AI) or 2-3 months (with dedicated developer).
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
        <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Solo Annual</Text>
        <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Dev Low</Text>
        <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Dev High</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '30%' }]}>Cursor Pro</Text>
        <Text style={[styles.tableCell, { width: '20%' }]}>$240</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$240</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$240</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '30%' }]}>Salary</Text>
        <Text style={[styles.tableCell, { width: '20%' }]}>-</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$72,000</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$108,000</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '30%' }]}>Tools</Text>
        <Text style={[styles.tableCell, { width: '20%' }]}>$1,800</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$1,800</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$1,800</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '30%' }]}>Benefits</Text>
        <Text style={[styles.tableCell, { width: '20%' }]}>-</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$16,800</Text>
        <Text style={[styles.tableCell, { width: '25%' }]}>$25,800</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '30%', fontWeight: 'bold' }]}>Total</Text>
        <Text style={[styles.tableCell, { width: '20%', fontWeight: 'bold' }]}>$2,520</Text>
        <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>$90,840</Text>
        <Text style={[styles.tableCell, { width: '25%', fontWeight: 'bold' }]}>$135,840</Text>
      </View>
    </View>

    <View style={styles.calloutSuccess}>
      <Text style={styles.bold}>Capital Efficiency: </Text>
      <Text>
        Solo development provides 97-98% cost savings during the critical pre-revenue phase.
      </Text>
    </View>

    <Text style={styles.header2}>2.2 Break-even Analysis</Text>
    
    <Text style={[styles.paragraph, { fontWeight: 'bold' }]}>Solo + AI is optimal when:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Cash runway under $150k</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Revenue 6+ months away</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Product-market fit unproven</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Founder has technical skills</Text>
    </View>

    <Text style={[styles.paragraph, { fontWeight: 'bold', marginTop: 12 }]}>Developer + AI viable when:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Raised $500k+ seed funding</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Strong early traction (50+ users)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Speed critical for competition</Text>
    </View>

    <View style={styles.footer}>
      <Text>Oikion MVP - ROI Analysis</Text>
      <Text>Page 4</Text>
    </View>
  </Page>
);

const VelocityAnalysis = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.header}>3. Development Velocity</Text>
    
    <Text style={styles.header2}>3.1 Timeline to MVP Launch</Text>
    
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Phase</Text>
        <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Solo + AI</Text>
        <Text style={[styles.tableHeaderCell, { width: '22%' }]}>Developer</Text>
        <Text style={[styles.tableHeaderCell, { width: '21%' }]}>Delta</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '35%' }]}>Admin Features</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>3-4 weeks</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>2-3 weeks</Text>
        <Text style={[styles.tableCell, { width: '21%' }]}>-1 week</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '35%' }]}>CRM & MLS Polish</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>4-5 weeks</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>3-4 weeks</Text>
        <Text style={[styles.tableCell, { width: '21%' }]}>-1 week</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '35%' }]}>Messaging</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>3-4 weeks</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>2-3 weeks</Text>
        <Text style={[styles.tableCell, { width: '21%' }]}>-1 week</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '35%' }]}>Testing</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>3-4 weeks</Text>
        <Text style={[styles.tableCell, { width: '22%' }]}>2-3 weeks</Text>
        <Text style={[styles.tableCell, { width: '21%' }]}>-1 week</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '35%', fontWeight: 'bold' }]}>Total</Text>
        <Text style={[styles.tableCell, { width: '22%', fontWeight: 'bold' }]}>16-22 weeks</Text>
        <Text style={[styles.tableCell, { width: '22%', fontWeight: 'bold' }]}>14-18 weeks</Text>
        <Text style={[styles.tableCell, { width: '21%', fontWeight: 'bold' }]}>-2-4 weeks</Text>
      </View>
    </View>

    <View style={styles.callout}>
      <Text style={styles.bold}>Key Insight: </Text>
      <Text>
        Developer saves 2-4 weeks but needs 2-3 weeks onboarding, netting only 1-2 weeks actual savings.
      </Text>
    </View>

    <Text style={styles.header2}>3.2 Post-MVP Velocity</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Solo + AI: 8-12 features/month</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Developer + AI: 15-25 features/month (87-108% faster)</Text>
    </View>

    <Text style={styles.header3}>Solo Accelerators:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>No communication overhead</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>Deep product knowledge</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>Fast iteration</Text>
    </View>

    <Text style={styles.header3}>Solo Decelerators:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✗</Text>
      <Text style={{ flex: 1 }}>Context switching between roles</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✗</Text>
      <Text style={{ flex: 1 }}>No code review partner</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✗</Text>
      <Text style={{ flex: 1 }}>Burnout risk</Text>
    </View>

    <View style={styles.footer}>
      <Text>Oikion MVP - ROI Analysis</Text>
      <Text>Page 5</Text>
    </View>
  </Page>
);

const Recommendations = () => (
  <Page size="A4" style={styles.page}>
    <Text style={styles.header}>4. Recommendations</Text>
    
    <Text style={styles.header2}>4.1 Phased Approach</Text>
    
    <Text style={styles.header3}>Phase 1: Solo to MVP (Months 1-4)</Text>
    
    <View style={styles.calloutSuccess}>
      <Text style={styles.bold}>Rationale: </Text>
      <Text>
        Preserve cash during highest-risk period, maintain vision control, prove product-market fit first.
      </Text>
    </View>

    <Text style={[styles.paragraph, { fontWeight: 'bold' }]}>Goals:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Complete MVP to beta quality</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Onboard 10-20 pilot agencies</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Validate pricing</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Establish $3k-$10k MRR baseline</Text>
    </View>

    <Text style={styles.header3}>Phase 2: Evaluation (Months 5-6)</Text>
    
    <Text style={[styles.paragraph, { fontWeight: 'bold' }]}>Hire if 3+ are true:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>MRR over $10,000</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>15+ customers, under 10% churn</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>Backlog over 2 months</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>Support over 15 hrs/week</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>Path to $30k+ MRR in 6 months</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>✓</Text>
      <Text style={{ flex: 1 }}>9+ months runway</Text>
    </View>

    <Text style={[styles.paragraph, { fontWeight: 'bold', marginTop: 12 }]}>Continue solo if:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>MRR under $5,000</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Unclear product-market fit</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Runway under 6 months after hiring</Text>
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
    
    <Text style={styles.header2}>5.1 When to Hire</Text>
    
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Stage</Text>
        <Text style={[styles.tableHeaderCell, { width: '15%' }]}>MRR</Text>
        <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Action</Text>
        <Text style={[styles.tableHeaderCell, { width: '35%' }]}>Reasoning</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '20%' }]}>Pre-launch</Text>
        <Text style={[styles.tableCell, { width: '15%' }]}>$0</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>Solo + AI</Text>
        <Text style={[styles.tableCell, { width: '35%' }]}>Preserve cash</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '20%' }]}>Beta</Text>
        <Text style={[styles.tableCell, { width: '15%' }]}>$0-$5k</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>Solo + AI</Text>
        <Text style={[styles.tableCell, { width: '35%' }]}>Not sustainable yet</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '20%' }]}>Early</Text>
        <Text style={[styles.tableCell, { width: '15%' }]}>$5k-$15k</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>Consider</Text>
        <Text style={[styles.tableCell, { width: '35%' }]}>Salary 40-75% revenue</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '20%' }]}>Scaling</Text>
        <Text style={[styles.tableCell, { width: '15%' }]}>$15k-$30k</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>Hire</Text>
        <Text style={[styles.tableCell, { width: '35%' }]}>Salary 25-50% revenue</Text>
      </View>
      <View style={styles.tableRow}>
        <Text style={[styles.tableCell, { width: '20%' }]}>Growth</Text>
        <Text style={[styles.tableCell, { width: '15%' }]}>$30k+</Text>
        <Text style={[styles.tableCell, { width: '30%' }]}>Expand team</Text>
        <Text style={[styles.tableCell, { width: '35%' }]}>Salary under 25% revenue</Text>
      </View>
    </View>

    <View style={styles.calloutWarning}>
      <Text style={styles.bold}>Rule: </Text>
      <Text>
        Hire when salary is under 50% of MRR with 6+ months runway.
      </Text>
    </View>

    <Text style={styles.header2}>5.2 Greek Market</Text>
    
    <Text style={styles.paragraph}>
      Developer rates (2026):
    </Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Junior: 30-42k EUR/year</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Mid-level: 45-65k EUR/year</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Senior: 65-90k EUR/year</Text>
    </View>

    <View style={styles.calloutSuccess}>
      <Text style={styles.bold}>Advantage: </Text>
      <Text>
        40-50% savings vs. Western Europe/US markets.
      </Text>
    </View>

    <Text style={styles.header3}>Market Opportunity</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>25,000 real estate agencies in Greece</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>30% digitalization rate (growing)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Gap: Integrated MLS + CRM solution</Text>
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
    
    <View style={styles.summary}>
      <Text style={styles.summaryTitle}>Primary Recommendation (Jan 2026)</Text>
      <Text style={{ fontSize: 10, color: colors.white, lineHeight: 1.5 }}>
        Continue solo with Cursor + Claude through MVP (3-4 months). Your codebase is 72% complete. 
        Hiring saves 4-6 weeks but costs $28k-$44k during highest-risk pre-revenue phase.
      </Text>
    </View>

    <Text style={styles.header2}>Decision Criteria</Text>
    
    <Text style={styles.header3}>Choose Solo + AI if:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Cash under $150k</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>MRR $0-$5k</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Strong technical skills</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Can commit 40+ hrs/week</Text>
    </View>

    <Text style={styles.header3}>Choose Developer + AI if:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Cash over $300k</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>MRR $10k+</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Critical time pressure</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>•</Text>
      <Text style={{ flex: 1 }}>Backlog over 3 months</Text>
    </View>

    <Text style={styles.header2}>Success Factors</Text>
    
    <Text style={styles.header3}>For Solo + AI:</Text>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>1.</Text>
      <Text style={{ flex: 1 }}>Ruthless prioritization</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>2.</Text>
      <Text style={{ flex: 1 }}>Master Cursor workflows (2-3x productivity)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>3.</Text>
      <Text style={{ flex: 1 }}>Avoid burnout (strict limits)</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>4.</Text>
      <Text style={{ flex: 1 }}>Build for scalability</Text>
    </View>
    <View style={styles.listItem}>
      <Text style={styles.bullet}>5.</Text>
      <Text style={{ flex: 1 }}>Automate everything</Text>
    </View>

    <Text style={{ marginTop: 32, fontSize: 12, fontWeight: 'bold', textAlign: 'center' }}>
      Good luck with Oikion!
    </Text>

    <View style={{ marginTop: 40, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.light }}>
      <Text style={{ fontSize: 8, color: colors.textLight, textAlign: 'center' }}>
        Based on Jan 2026 market conditions and Oikion codebase assessment.
      </Text>
      <Text style={{ fontSize: 8, color: colors.textLight, textAlign: 'center', marginTop: 3 }}>
        Review quarterly and adjust based on real-world performance.
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
    console.log('🎨 Generating professional PDF document...');
    
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
    console.log(`📑 Pages: 8`);
  } catch (error) {
    console.error('❌ Error generating PDF:', error);
    throw error;
  }
}

generatePDF().catch(console.error);
