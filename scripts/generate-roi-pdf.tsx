import React from 'react';
import { Document, Page, Text, View, StyleSheet, pdf, Font } from '@react-pdf/renderer';
import fs from 'fs';
import path from 'path';

// Register fonts for better typography
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiA.woff2', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiA.woff2', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v12/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiA.woff2', fontWeight: 700 },
  ]
});

// Color palette
const colors = {
  primary: '#2563eb', // Blue
  secondary: '#64748b', // Slate
  accent: '#0ea5e9', // Sky blue
  success: '#10b981', // Green
  warning: '#f59e0b', // Amber
  danger: '#ef4444', // Red
  dark: '#1e293b',
  light: '#f1f5f9',
  white: '#ffffff',
  text: '#334155',
  textLight: '#64748b',
};

// Create styles
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
    fontSize: 32,
    fontWeight: 700,
    color: colors.white,
    marginBottom: 20,
    lineHeight: 1.2,
  },
  coverSubtitle: {
    fontSize: 18,
    color: colors.light,
    marginBottom: 40,
  },
  coverMeta: {
    fontSize: 12,
    color: colors.light,
    marginTop: 'auto',
  },
  coverMetaRow: {
    marginBottom: 8,
  },
  header: {
    fontSize: 24,
    fontWeight: 700,
    color: colors.dark,
    marginTop: 24,
    marginBottom: 16,
    borderBottom: `3pt solid ${colors.primary}`,
    paddingBottom: 8,
  },
  header2: {
    fontSize: 18,
    fontWeight: 600,
    color: colors.dark,
    marginTop: 20,
    marginBottom: 12,
  },
  header3: {
    fontSize: 14,
    fontWeight: 600,
    color: colors.dark,
    marginTop: 16,
    marginBottom: 10,
  },
  paragraph: {
    marginBottom: 12,
    textAlign: 'justify',
  },
  bold: {
    fontWeight: 600,
  },
  list: {
    marginBottom: 12,
    marginLeft: 20,
  },
  listItem: {
    marginBottom: 6,
    display: 'flex',
    flexDirection: 'row',
  },
  listBullet: {
    width: 20,
    color: colors.primary,
  },
  listContent: {
    flex: 1,
  },
  table: {
    marginTop: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: colors.secondary,
    borderRadius: 4,
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
  },
  tableRow: {
    flexDirection: 'row',
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: colors.light,
  },
  tableRowAlt: {
    backgroundColor: colors.light,
  },
  tableCell: {
    fontSize: 9,
  },
  callout: {
    backgroundColor: colors.light,
    padding: 12,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    marginVertical: 12,
  },
  calloutSuccess: {
    borderLeftColor: colors.success,
    backgroundColor: '#d1fae5',
  },
  calloutWarning: {
    borderLeftColor: colors.warning,
    backgroundColor: '#fef3c7',
  },
  calloutDanger: {
    borderLeftColor: colors.danger,
    backgroundColor: '#fee2e2',
  },
  codeBlock: {
    backgroundColor: colors.dark,
    color: colors.white,
    padding: 12,
    borderRadius: 4,
    fontFamily: 'Courier',
    fontSize: 8,
    marginVertical: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 30,
    left: 40,
    right: 40,
    display: 'flex',
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 8,
    color: colors.textLight,
    borderTop: `1pt solid ${colors.light}`,
    paddingTop: 8,
  },
  summary: {
    backgroundColor: colors.accent,
    color: colors.white,
    padding: 16,
    borderRadius: 8,
    marginVertical: 16,
  },
  summaryTitle: {
    fontSize: 14,
    fontWeight: 700,
    marginBottom: 10,
  },
  summaryText: {
    fontSize: 10,
    lineHeight: 1.5,
  },
});

// Summary table data
const executiveSummary = [
  ['Metric', 'Solo + AI', 'Developer + AI', 'Difference'],
  ['12-Month Cost', '$2,520', '$84,000 - $132,000', '97-98% savings'],
  ['Time to MVP Launch', '3-4 months', '2-3 months', '30-40% faster'],
  ['Feature Velocity (post-MVP)', '8-12 features/month', '15-25 features/month', '87-108% faster'],
  ['Code Quality Risk', 'Medium-High', 'Low-Medium', 'Higher oversight needed'],
  ['Technical Debt Risk', 'High', 'Medium', 'Requires discipline'],
  ['Bus Factor', 'Critical (1)', 'Low (1-2)', 'Similar vulnerability'],
];

const costComparison = [
  ['Item', 'Solo + AI (Monthly)', 'Solo + AI (Annual)', 'Developer + AI (Monthly)', 'Developer + AI (Annual)'],
  ['Cursor Pro', '$20', '$240', '$20', '$240'],
  ['Developer Salary', '-', '-', '$6,000-$9,000', '$72,000-$108,000'],
  ['Tools & Hosting', '$150', '$1,800', '$150', '$1,800'],
  ['Benefits & Taxes', '-', '-', '$1,400', '$16,800-$25,800'],
  ['Total', '$170', '$2,040', '$7,570-$10,570', '$90,840-$136,640'],
];

const timelineComparison = [
  ['Phase', 'Solo + AI', 'Developer + AI', 'Delta'],
  ['Complete Admin Features', '3-4 weeks', '2-3 weeks', '-1 week'],
  ['Polish CRM & MLS', '4-5 weeks', '3-4 weeks', '-1 week'],
  ['Messaging Features', '3-4 weeks', '2-3 weeks', '-1 week'],
  ['Testing & Bug Fixes', '3-4 weeks', '2-3 weeks', '-1 week'],
  ['Beta Testing', '2-3 weeks', '2-3 weeks', '0'],
  ['Total to Launch', '16-22 weeks', '14-18 weeks', '-2-4 weeks'],
];

// Cover Page Component
const CoverPage: React.FC = () => (
  <Page size="A4" style={styles.coverPage}>
    <Text style={styles.coverTitle}>ROI Analysis</Text>
    <Text style={styles.coverSubtitle}>
      Solo Development with Cursor AI vs.{'\n'}
      Hiring Full-Stack Developer
    </Text>
    <View style={{ marginTop: 40, marginBottom: 40 }}>
      <Text style={{ fontSize: 16, color: colors.white, marginBottom: 10 }}>
        Project: Oikion MVP
      </Text>
      <Text style={{ fontSize: 14, color: colors.light }}>
        Real Estate SaaS Platform for Greek Agencies
      </Text>
    </View>
    <View style={styles.coverMeta}>
      <View style={styles.coverMetaRow}>
        <Text>Document Version: 1.0</Text>
      </View>
      <View style={styles.coverMetaRow}>
        <Text>Date: January 31, 2026</Text>
      </View>
      <View style={styles.coverMetaRow}>
        <Text>Analysis Period: 12-month development cycle</Text>
      </View>
    </View>
  </Page>
);

// Table Component
const Table: React.FC<{ data: string[][]; widths?: string[] }> = ({ data, widths }) => {
  const [header, ...rows] = data;
  const columnWidths = widths || header.map(() => `${100 / header.length}%`);

  return (
    <View style={styles.table}>
      <View style={styles.tableHeader}>
        {header.map((cell, i) => (
          <Text key={i} style={[styles.tableHeaderCell, { width: columnWidths[i] }]}>
            {cell}
          </Text>
        ))}
      </View>
      {rows.map((row, rowIndex) => (
        <View
          key={rowIndex}
          style={[styles.tableRow, rowIndex % 2 === 1 && styles.tableRowAlt]}
        >
          {row.map((cell, cellIndex) => (
            <Text key={cellIndex} style={[styles.tableCell, { width: columnWidths[cellIndex] }]}>
              {cell}
            </Text>
          ))}
        </View>
      ))}
    </View>
  );
};

// Footer Component
const PageFooter: React.FC<{ pageNumber: number }> = ({ pageNumber }) => (
  <View style={styles.footer}>
    <Text>Oikion MVP - ROI Analysis</Text>
    <Text>Page {pageNumber}</Text>
  </View>
);

// Section Component
const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View>
    <Text style={styles.header}>{title}</Text>
    {children}
  </View>
);

const Section2: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <View>
    <Text style={styles.header2}>{title}</Text>
    {children}
  </View>
);

// List Component
const BulletList: React.FC<{ items: string[] }> = ({ items }) => (
  <View style={styles.list}>
    {items.map((item, index) => (
      <View key={index} style={styles.listItem}>
        <Text style={styles.listBullet}>•</Text>
        <Text style={styles.listContent}>{item}</Text>
      </View>
    ))}
  </View>
);

// Callout Component
const Callout: React.FC<{ type?: 'info' | 'success' | 'warning' | 'danger'; children: React.ReactNode }> = ({
  type = 'info',
  children,
}) => {
  const calloutStyle = [
    styles.callout,
    type === 'success' && styles.calloutSuccess,
    type === 'warning' && styles.calloutWarning,
    type === 'danger' && styles.calloutDanger,
  ];
  return <View style={calloutStyle}>{children}</View>;
};

// Main Document
const ROIDocument: React.FC = () => (
  <Document>
    <CoverPage />

    {/* Executive Summary */}
    <Page size="A4" style={styles.page}>
      <Section title="Executive Summary">
        <Text style={styles.paragraph}>
          This document analyzes two development trajectories for Oikion, a multi-tenant SaaS platform for Greek real
          estate agencies, comparing solo founder development with Cursor IDE + Claude Opus 4.5 versus hiring a
          full-stack developer equipped with the same AI tools.
        </Text>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Key Recommendation</Text>
          <Text style={styles.summaryText}>
            Continue solo development with AI through MVP launch, then reassess based on traction metrics and revenue.
          </Text>
        </View>

        <Text style={styles.header2}>Key Findings Summary</Text>
        <Table data={executiveSummary} />

        <Text style={[styles.paragraph, { marginTop: 16 }]}>
          <Text style={styles.bold}>Recommendation: </Text>
          Continue solo development with AI through MVP launch (3-4 months), then reassess based on traction metrics
          (MRR &gt; $10k, 15+ customers) and available runway.
        </Text>
      </Section>
      <PageFooter pageNumber={2} />
    </Page>

    {/* Current Project Assessment */}
    <Page size="A4" style={styles.page}>
      <Section title="1. Current Project Assessment">
        <Section2 title="1.1 Codebase Metrics (as of Jan 31, 2026)">
          <View style={styles.codeBlock}>
            <Text>Project Version:     0.1.4-alpha-pre-launch</Text>
            <Text>Total Source Files:  1,170 TypeScript/TSX files</Text>
            <Text>Database Models:     91 models (2,791 lines)</Text>
            <Text>Project Size:        ~6.2 GB (with dependencies)</Text>
            <Text>Recent Activity:     15 commits in last 3 months</Text>
            <Text>Current Branch:      Admin-Features</Text>
          </View>
        </Section2>

        <Section2 title="1.2 Technology Stack Complexity">
          <Text style={styles.header3}>High Complexity Components:</Text>
          <BulletList
            items={[
              'Next.js 16 (App Router) + React 19 (latest, bleeding edge)',
              'Multi-tenant architecture with organization isolation',
              'Clerk authentication with custom role system',
              'Prisma ORM with 91 interconnected models',
              'Real-time messaging with Ably WebSockets',
              'Dual API systems (internal + external with scopes)',
              'i18n with Greek as default (next-intl)',
              'Rich document editing (TipTap)',
              'Complex CRM + MLS workflows',
            ]}
          />

          <Callout type="warning">
            <Text style={styles.bold}>Risk Assessment: </Text>
            <Text>
              The stack is modern but stable. Using bleeding-edge React 19 introduces minor update risks that require
              careful dependency management.
            </Text>
          </Callout>
        </Section2>

        <Section2 title="1.3 Feature Completeness">
          <Text style={styles.paragraph}>
            Based on the codebase structure and recent commits, estimated overall MVP completion: <Text style={styles.bold}>~72%</Text>
          </Text>
          <Text style={styles.paragraph}>
            Estimated time to launch-ready state: <Text style={styles.bold}>3-4 months</Text> (solo with AI)
          </Text>
        </Section2>
      </Section>
      <PageFooter pageNumber={3} />
    </Page>

    {/* Cost Analysis */}
    <Page size="A4" style={styles.page}>
      <Section title="2. Cost Analysis: 12-Month Comparison">
        <Section2 title="2.1 Direct Costs Comparison">
          <Table
            data={costComparison}
            widths={['30%', '15%', '15%', '20%', '20%']}
          />

          <Callout type="success">
            <Text style={styles.bold}>Capital Efficiency: </Text>
            <Text>Solo development with AI provides 97-98% cost savings in direct expenses during the critical pre-revenue phase.</Text>
          </Callout>
        </Section2>

        <Section2 title="2.2 Opportunity Cost Analysis">
          <Text style={styles.paragraph}>
            While solo development has minimal direct costs, it requires significant founder time investment (40-60 hours/week).
            The opportunity cost depends on the founder's time valuation:
          </Text>
          <BulletList
            items={[
              'At $50/hour: Solo development clearly wins on total cost',
              'At $50-$100/hour: Depends on revenue urgency and competitive pressure',
              'Over $100/hour: Hiring may be justified if revenue is imminent',
            ]}
          />
        </Section2>

        <Section2 title="2.3 Break-even Analysis">
          <Text style={styles.paragraph}>
            Solo development becomes cost-effective when:
          </Text>
          <BulletList
            items={[
              'Cash runway is limited (&lt; $150k available)',
              'Revenue is 6+ months away (no immediate monetization)',
              'Product-market fit is still being validated',
              'Founder has sufficient technical skills to maintain velocity',
            ]}
          />

          <Text style={[styles.paragraph, { marginTop: 12 }]}>
            Developer + AI becomes viable when:
          </Text>
          <BulletList
            items={[
              'Raised seed funding ($500k+) with 12+ month runway',
              'Strong early traction (50+ engaged beta users)',
              'Clear product-market fit signals emerging',
              'Speed to market is critical competitive factor',
              'Feature backlog exceeds 3+ months of solo capacity',
            ]}
          />
        </Section2>
      </Section>
      <PageFooter pageNumber={4} />
    </Page>

    {/* Development Velocity */}
    <Page size="A4" style={styles.page}>
      <Section title="3. Development Velocity & Timeline Analysis">
        <Section2 title="3.1 Timeline to MVP Launch Comparison">
          <Table data={timelineComparison} />

          <Text style={[styles.paragraph, { marginTop: 16 }]}>
            <Text style={styles.bold}>Key Insight: </Text>
            Hiring a developer now would save approximately 2-4 weeks (20-30% faster), but requires 2-3 weeks of
            onboarding time, netting only 1-2 weeks of actual time savings to MVP launch.
          </Text>
        </Section2>

        <Section2 title="3.2 Post-MVP Feature Velocity">
          <Text style={styles.paragraph}>
            After MVP launch, the velocity difference becomes more pronounced:
          </Text>
          <BulletList
            items={[
              'Solo + AI: 8-12 features per month with ongoing maintenance',
              'Developer + AI: 15-25 features per month (87-108% faster)',
              'Developer allows founder to focus on sales, marketing, and customer development',
            ]}
          />

          <Callout type="info">
            <Text style={styles.bold}>Strategic Consideration: </Text>
            <Text>
              The post-MVP velocity advantage of a dedicated developer becomes increasingly valuable as customer
              demands grow and the feature backlog expands.
            </Text>
          </Callout>
        </Section2>

        <Section2 title="3.3 Factors Affecting Velocity">
          <Text style={styles.header3}>Solo + AI Accelerators:</Text>
          <BulletList
            items={[
              'No communication overhead or coordination needed',
              'Deep product knowledge and direct customer feedback loop',
              'Fast iteration on ideas without consensus building',
              'AI excels at boilerplate and repetitive tasks',
            ]}
          />

          <Text style={styles.header3}>Solo + AI Decelerators:</Text>
          <BulletList
            items={[
              'Context switching between roles (PM, designer, developer, support)',
              'Solo debugging can be time-consuming without a partner',
              'No human code review (relying only on AI validation)',
              'Burnout risk with 50-60 hour weeks sustained over time',
              'AI "hallucinations" require careful validation time',
            ]}
          />
        </Section2>
      </Section>
      <PageFooter pageNumber={5} />
    </Page>

    {/* Risk Analysis */}
    <Page size="A4" style={styles.page}>
      <Section title="4. Risk Analysis">
        <Section2 title="4.1 Solo Development Critical Risks">
          <Text style={styles.header3}>1. Burnout & Unsustainable Pace</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Probability: </Text>60-70% | <Text style={styles.bold}>Impact: </Text>High
          </Text>
          <Text style={styles.paragraph}>
            Sustained 50-60 hour work weeks lead to declining productivity, health issues, and potential project
            abandonment. Mitigation requires strict work-hour limits and regular rest periods.
          </Text>

          <Text style={styles.header3}>2. Technical Debt Accumulation</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Probability: </Text>70-80% | <Text style={styles.bold}>Impact: </Text>High
          </Text>
          <Text style={styles.paragraph}>
            Under time pressure, quick solutions replace proper architecture, creating maintenance burden and future
            velocity loss. Requires dedicated refactoring time (10% of total effort).
          </Text>

          <Text style={styles.header3}>3. Bus Factor of 1</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Probability: </Text>100% | <Text style={styles.bold}>Impact: </Text>Critical
          </Text>
          <Text style={styles.paragraph}>
            If founder is unavailable (illness, emergency), business continuity is at risk. Comprehensive documentation
            and code comments are essential mitigation.
          </Text>

          <Text style={styles.header3}>4. AI Dependency & Hallucination Risks</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Probability: </Text>40-50% | <Text style={styles.bold}>Impact: </Text>Medium
          </Text>
          <Text style={styles.paragraph}>
            AI-generated code may contain subtle bugs or security issues. Always review AI code, implement comprehensive
            testing, and conduct security audits before launch.
          </Text>
        </Section2>

        <Section2 title="4.2 Full-Stack Developer Critical Risks">
          <Text style={styles.header3}>1. Hiring the Wrong Person</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Probability: </Text>40-50% | <Text style={styles.bold}>Impact: </Text>Critical
          </Text>
          <Text style={styles.paragraph}>
            Bad hire wastes time and money, produces poor code, and delays launch. Mitigation: thorough technical
            assessment, paid trial project (1-2 weeks), reference checks, and probation period.
          </Text>

          <Text style={styles.header3}>2. Onboarding Time & Productivity Lag</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Probability: </Text>80-90% | <Text style={styles.bold}>Impact: </Text>Medium
          </Text>
          <Text style={styles.paragraph}>
            Expect 2-3 weeks at 30-50% productivity while learning codebase and domain. This reduces the time-to-launch
            advantage significantly.
          </Text>
        </Section2>
      </Section>
      <PageFooter pageNumber={6} />
    </Page>

    {/* Recommendations */}
    <Page size="A4" style={styles.page}>
      <Section title="5. Recommendations & Decision Framework">
        <Section2 title="5.1 Recommended Path: Phased Approach">
          <Text style={styles.header3}>Phase 1: Solo Development to MVP Launch (Months 1-4)</Text>
          <Callout type="success">
            <Text style={styles.bold}>Rationale: </Text>
            <Text>
              Preserve cash during highest-risk period, maintain product vision control, enable fast iteration, and
              prove product-market fit before major hiring commitment.
            </Text>
          </Callout>

          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Goals:</Text>
          </Text>
          <BulletList
            items={[
              'Complete MVP to beta-launch quality',
              'Onboard 10-20 pilot agencies in Greece',
              'Validate pricing and product-market fit',
              'Establish revenue baseline ($3k-$10k MRR)',
            ]}
          />

          <Text style={styles.header3}>Phase 2: Evaluation & Transition (Months 5-6)</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Hire Developer if 3+ of these are true:</Text>
          </Text>
          <BulletList
            items={[
              'MRR exceeds $10,000',
              '15+ paying customers with &lt; 10% monthly churn',
              'Feature backlog exceeds 2 months of solo work',
              'Customer support requires &gt; 15 hours/week',
              'Technical debt is accumulating rapidly',
              'Clear path to $30k+ MRR within 6 months',
              'Have 9+ months runway at projected burn rate',
            ]}
          />

          <Text style={[styles.paragraph, { marginTop: 12 }]}>
            <Text style={styles.bold}>Continue Solo if:</Text>
          </Text>
          <BulletList
            items={[
              'MRR &lt; $5,000',
              'Unclear product-market fit or high churn (&gt; 15% monthly)',
              'Runway &lt; 6 months after hiring costs',
              'Pivoting or major product changes likely',
            ]}
          />
        </Section2>

        <Section2 title="5.2 Hybrid Approach: Part-Time Contractor">
          <Text style={styles.paragraph}>
            Consider a middle-ground option: Part-time senior developer (20 hrs/week) + Cursor AI
          </Text>
          <BulletList
            items={[
              'Cost: $3,000-$5,000/month (~$36k-$60k annually)',
              'Time to Launch: 3-4 months (similar to solo)',
              'Benefits: Code review, architectural guidance, shared load',
              'Lower commitment and risk than full-time hiring',
              'Scalable to full-time if traction validates need',
            ]}
          />

          <Callout type="info">
            <Text style={styles.bold}>Ideal for: </Text>
            <Text>
              Pre-revenue startups with some funding ($100k-$300k), where founder can still code but wants support
              and quality assurance without full commitment.
            </Text>
          </Callout>
        </Section2>
      </Section>
      <PageFooter pageNumber={7} />
    </Page>

    {/* Financial Thresholds */}
    <Page size="A4" style={styles.page}>
      <Section title="6. Financial Thresholds & Break-Even">
        <Section2 title="6.1 When Does Hiring Make Financial Sense?">
          <Text style={styles.paragraph}>
            Based on typical SaaS metrics and Greek market conditions:
          </Text>

          <View style={[styles.table, { marginTop: 16 }]}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>Stage</Text>
              <Text style={[styles.tableHeaderCell, { width: '20%' }]}>MRR</Text>
              <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Recommendation</Text>
              <Text style={[styles.tableHeaderCell, { width: '30%' }]}>Reasoning</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '20%' }]}>Pre-launch</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>$0</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>Solo + AI</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>Preserve cash, prove concept</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowAlt]}>
              <Text style={[styles.tableCell, { width: '20%' }]}>Beta Launch</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>$0-$5k</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>Solo + AI</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>Not yet sustainable</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '20%' }]}>Early Traction</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>$5k-$15k</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>Consider hiring</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>Salary = 40-75% of revenue</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowAlt]}>
              <Text style={[styles.tableCell, { width: '20%' }]}>Scaling</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>$15k-$30k</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>Hire developer</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>Salary = 25-50% of revenue</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '20%' }]}>Growth</Text>
              <Text style={[styles.tableCell, { width: '20%' }]}>$30k+</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>Hire + expand team</Text>
              <Text style={[styles.tableCell, { width: '30%' }]}>Salary &lt; 25% of revenue</Text>
            </View>
          </View>

          <Callout type="warning">
            <Text style={styles.bold}>Rule of Thumb: </Text>
            <Text>
              Hire when developer salary represents &lt; 50% of MRR and you have 6+ months of runway at projected burn
              rate including the new hire.
            </Text>
          </Callout>
        </Section2>

        <Section2 title="6.2 ROI Scenarios">
          <Text style={styles.header3}>Scenario A: Developer Accelerates Revenue by 3 Months</Text>
          <View style={styles.codeBlock}>
            <Text>Solo Path:</Text>
            <Text>  - Launch: Month 4</Text>
            <Text>  - $10k MRR: Month 10</Text>
            <Text>  - Total cost (10 months): $2,100</Text>
            <Text> </Text>
            <Text>Developer Path:</Text>
            <Text>  - Launch: Month 3</Text>
            <Text>  - $10k MRR: Month 7</Text>
            <Text>  - Total cost (7 months): $56,000</Text>
            <Text>  - Revenue advantage: $30k (3 months earlier)</Text>
            <Text>  - Net: -$26,000 (negative ROI in this scenario)</Text>
          </View>

          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Conclusion: </Text>
            Developer path requires &gt; 5 months revenue acceleration to break even financially, which is unlikely
            given only 2-4 week time-to-launch advantage.
          </Text>
        </Section2>
      </Section>
      <PageFooter pageNumber={8} />
    </Page>

    {/* Conclusion */}
    <Page size="A4" style={styles.page}>
      <Section title="7. Conclusion & Final Recommendation">
        <Text style={styles.paragraph}>
          Both development paths are viable, but the optimal choice depends on your specific situation, stage, and
          available resources.
        </Text>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>Primary Recommendation for Oikion (January 2026)</Text>
          <Text style={styles.summaryText}>
            Continue solo development with Cursor + Claude Opus 4.5 through MVP launch (estimated 3-4 months). Your
            codebase is already 72% complete with only 3-4 months to launch. Hiring now would save perhaps 4-6 weeks
            but cost $28k-$44k during the highest-risk pre-revenue phase.
          </Text>
        </View>

        <Section2 title="7.1 Decision Criteria Summary">
          <Text style={styles.header3}>Choose Solo + AI if:</Text>
          <BulletList
            items={[
              'Cash runway &lt; $150k',
              'Current MRR $0-$5k (pre-revenue or early)',
              'Time to market pressure is low-medium',
              'Founder has strong technical skills',
              'Founder can commit 40+ hours/week',
              'Product-market fit is unproven',
              'Competitive pressure is manageable',
            ]}
          />

          <Text style={styles.header3}>Choose Developer + AI if:</Text>
          <BulletList
            items={[
              'Cash runway &gt; $300k (raised funding)',
              'Current MRR $10k+ (proven traction)',
              'Time to market pressure is critical',
              'Founder time availability &lt; 30 hrs/week',
              'Product-market fit is validated',
              'Competitive pressure is high',
              'Feature backlog exceeds 3+ months capacity',
            ]}
          />
        </Section2>

        <Section2 title="7.2 Revisit Hiring Decision When:">
          <BulletList
            items={[
              'MRR crosses $10,000 threshold',
              'You have 15+ paying customers with &lt; 10% churn',
              'Feature backlog exceeds 3 months of solo capacity',
              'Customer support demands exceed 15-20 hours/week',
              'Burnout risk becomes acute (declining health/productivity)',
              'Have 9+ months runway at projected burn rate',
            ]}
          />
        </Section2>

        <Section2 title="7.3 Key Success Factors">
          <Text style={styles.header3}>For Solo + AI to Succeed:</Text>
          <BulletList
            items={[
              'Ruthless prioritization - MVP features only, defer everything else',
              'Master Cursor AI workflows to achieve 2-3x productivity',
              'Maintain health and avoid burnout (strict work limits)',
              'Build with future team scalability in mind (clean code, documentation)',
              'Automate everything possible (testing, deployment, monitoring)',
            ]}
          />

          <Text style={styles.header3}>For Developer + AI to Succeed:</Text>
          <BulletList
            items={[
              'Hire the right person (take time, thorough assessment)',
              'Invest heavily in onboarding and knowledge transfer',
              'Establish clear communication and expectations',
              'Give autonomy with accountability (OKRs, metrics)',
              'Plan for 2-3 month ramp-up period before full productivity',
            ]}
          />
        </Section2>
      </Section>
      <PageFooter pageNumber={9} />
    </Page>

    {/* Greek Market Context */}
    <Page size="A4" style={styles.page}>
      <Section title="8. Greek Market Context">
        <Section2 title="8.1 Developer Salary Market Rates (Greece, 2026)">
          <View style={styles.table}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Level</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Athens</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>Remote (EU)</Text>
              <Text style={[styles.tableHeaderCell, { width: '25%' }]}>vs. US</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '25%' }]}>Junior</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>€30k-€42k</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>€35k-€45k</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>40-50% lower</Text>
            </View>
            <View style={[styles.tableRow, styles.tableRowAlt]}>
              <Text style={[styles.tableCell, { width: '25%' }]}>Mid-level</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>€45k-€65k</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>€50k-€70k</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>40-50% lower</Text>
            </View>
            <View style={styles.tableRow}>
              <Text style={[styles.tableCell, { width: '25%' }]}>Senior</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>€65k-€90k</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>€70k-€100k</Text>
              <Text style={[styles.tableCell, { width: '25%' }]}>35-45% lower</Text>
            </View>
          </View>

          <Callout type="success">
            <Text style={styles.bold}>Oikion Advantage: </Text>
            <Text>
              Hiring in Greece offers 40-50% cost savings compared to Western Europe or US markets, while maintaining
              access to quality talent.
            </Text>
          </Callout>
        </Section2>

        <Section2 title="8.2 Real Estate SaaS Market (Greece)">
          <Text style={styles.header3}>Market Overview</Text>
          <BulletList
            items={[
              '~25,000 real estate agencies in Greece',
              'Current digitalization rate: ~30% (growing)',
              'Average agency size: 3-8 agents',
              'Fragmented market with no dominant SaaS player',
            ]}
          />

          <Text style={styles.header3}>Competitive Landscape</Text>
          <BulletList
            items={[
              'Traditional: Spitogatos, XE.gr (listings only, no CRM)',
              'CRM tools: Generic (Salesforce, HubSpot) or outdated Greek solutions',
              'Gap: Integrated MLS + CRM + team collaboration (Oikion\'s position)',
            ]}
          />

          <Text style={styles.header3}>Pricing Potential</Text>
          <BulletList
            items={[
              'Entry tier: €50-€100/month per agency',
              'Professional: €150-€300/month',
              'Enterprise: €500+/month for large agencies',
            ]}
          />

          <Text style={styles.header3}>Revenue Potential Scenarios</Text>
          <View style={styles.codeBlock}>
            <Text>Conservative (100 agencies × €150/month):</Text>
            <Text>  €15,000 MRR → €180,000 ARR</Text>
            <Text> </Text>
            <Text>Ambitious (500 agencies × €200/month):</Text>
            <Text>  €100,000 MRR → €1,200,000 ARR</Text>
          </View>

          <Text style={[styles.paragraph, { marginTop: 12 }]}>
            <Text style={styles.bold}>Time to 100 Customers: </Text>
            12-18 months with aggressive sales efforts, 24-36 months with organic growth strategy.
          </Text>
        </Section2>
      </Section>
      <PageFooter pageNumber={10} />
    </Page>

    {/* Final Summary */}
    <Page size="A4" style={styles.page}>
      <Section title="9. Strategic Implementation Roadmap">
        <Section2 title="Recommended Phased Approach">
          <Text style={styles.header3}>Months 1-4: Solo Development → MVP Launch</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Status: </Text>Current phase (72% complete)
          </Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Goals:</Text>
          </Text>
          <BulletList
            items={[
              'Complete remaining 28% of MVP features',
              'Comprehensive testing and bug fixing',
              'Beta launch with 10-20 pilot agencies',
              'Establish initial pricing and packages',
              'Gather product feedback and iterate',
            ]}
          />
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Key Actions:</Text>
          </Text>
          <BulletList
            items={[
              'Maximize Cursor + Claude Opus 4.5 productivity',
              'Focus on 80/20 features (core value only)',
              'Implement monitoring and error tracking',
              'Build comprehensive documentation',
              'Prepare onboarding flows and help content',
            ]}
          />

          <Text style={styles.header3}>Months 5-6: Evaluation & Decision Point</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Key Metrics to Evaluate:</Text>
          </Text>
          <BulletList
            items={[
              'MRR achieved ($0, $5k, $10k+?)',
              'Number of paying customers',
              'Monthly churn rate (&lt; 10% is healthy)',
              'Feature backlog size vs. capacity',
              'Customer support time requirements',
              'Founder burnout level (honest assessment)',
              'Cash runway remaining',
            ]}
          />

          <View style={styles.summary}>
            <Text style={styles.summaryTitle}>Decision Framework</Text>
            <Text style={styles.summaryText}>
              IF (MRR &gt; $10k AND customers &gt; 15 AND backlog &gt; 2 months AND runway &gt; 9 months)
              {'\n'}THEN: Begin hiring process
              {'\n'}ELSE: Continue solo development for another quarter
            </Text>
          </View>

          <Text style={styles.header3}>Months 7-12: Scale (If Hiring Decision Made)</Text>
          <Text style={styles.paragraph}>
            <Text style={styles.bold}>Month 7: </Text>Recruitment (4-6 weeks)
          </Text>
          <BulletList
            items={[
              'Define role: Mid-to-senior full-stack (Next.js, React, TypeScript)',
              'Post on Greek tech platforms and remote job boards',
              'Technical assessment + paid trial project',
              'Reference checks and cultural fit evaluation',
            ]}
          />

          <Text style={[styles.paragraph, { marginTop: 8 }]}>
            <Text style={styles.bold}>Month 8: </Text>Onboarding
          </Text>
          <BulletList
            items={[
              'Comprehensive codebase walkthrough (1 week)',
              'Pair programming on first features',
              'Establish communication rhythms (daily standups, weekly 1-on-1s)',
              'Set clear expectations and first-quarter OKRs',
            ]}
          />

          <Text style={[styles.paragraph, { marginTop: 8 }]}>
            <Text style={styles.bold}>Months 9-12: </Text>Accelerated Development
          </Text>
          <BulletList
            items={[
              'Founder focuses on sales, marketing, customer success',
              'Developer handles feature development + maintenance',
              'Aim for 2-3x velocity increase vs. solo',
              'Target: $30k+ MRR by end of Month 12',
              'Plan for additional hires based on growth trajectory',
            ]}
          />
        </Section2>
      </Section>
      <PageFooter pageNumber={11} />
    </Page>

    {/* Closing Page */}
    <Page size="A4" style={styles.page}>
      <Section title="10. Final Thoughts">
        <Text style={styles.paragraph}>
          The decision between solo development with AI and hiring a full-stack developer is not binary—it's a timing
          question. For Oikion in its current state (72% complete, pre-revenue), the solo path with Cursor + Claude
          Opus 4.5 offers the best risk-adjusted return.
        </Text>

        <View style={styles.summary}>
          <Text style={styles.summaryTitle}>The AI Development Revolution</Text>
          <Text style={styles.summaryText}>
            Tools like Cursor and Claude Opus 4.5 have fundamentally changed the economics of software development.
            Solo founders can now achieve velocity and quality that previously required small teams, dramatically
            extending runway and increasing capital efficiency during the critical product-market fit phase.
          </Text>
        </View>

        <Text style={styles.paragraph}>
          However, AI augmentation doesn't eliminate the need for human developers—it shifts the timing. As your
          product scales and customer demands grow, the 87-108% velocity advantage of a dedicated developer becomes
          increasingly valuable. The key is recognizing when that inflection point arrives.
        </Text>

        <Section2 title="10.1 Success Indicators">
          <Text style={styles.paragraph}>
            You'll know it's time to hire when:
          </Text>
          <BulletList
            items={[
              'Customer acquisition outpaces your development capacity',
              'Churn is happening due to missing features or slow fixes',
              'You're turning down sales opportunities due to feature gaps',
              'Support demands are consuming development time',
              'You're dreading opening your IDE due to burnout',
            ]}
          />
        </Section2>

        <Section2 title="10.2 Flexibility is Key">
          <Text style={styles.paragraph}>
            This analysis provides a framework, but stay flexible. If you raise funding, adjust the plan. If a perfect
            developer candidate appears, consider it. If customers are demanding features faster than you can deliver,
            accelerate hiring. If traction is slower than expected, extend the solo phase.
          </Text>

          <Callout type="info">
            <Text style={styles.bold}>Remember: </Text>
            <Text>
              The goal is building a sustainable, successful business—not proving you can do it alone. Use solo
              development as a strategic advantage during the high-risk phase, then scale the team when metrics justify
              the investment.
            </Text>
          </Callout>
        </Section2>

        <Text style={[styles.paragraph, { marginTop: 24, textAlign: 'center', fontWeight: 600, fontSize: 12 }]}>
          Good luck with Oikion! 🚀
        </Text>

        <View style={{ marginTop: 40, padding: 16, borderTop: `1pt solid ${colors.light}` }}>
          <Text style={{ fontSize: 8, color: colors.textLight, textAlign: 'center', marginBottom: 4 }}>
            This analysis is based on current market conditions (January 2026), Oikion codebase assessment,
          </Text>
          <Text style={{ fontSize: 8, color: colors.textLight, textAlign: 'center' }}>
            and industry benchmarks. Actual results may vary. Review quarterly and adjust based on real-world
            performance.
          </Text>
        </View>
      </Section>
      <PageFooter pageNumber={12} />
    </Page>
  </Document>
);

// Generate and save PDF
async function generatePDF() {
  try {
    console.log('🎨 Generating beautiful PDF document...');
    
    const pdfBlob = await pdf(<ROIDocument />).toBlob();
    const buffer = Buffer.from(await pdfBlob.arrayBuffer());
    
    const outputPath = path.join(process.cwd(), 'docs', 'roi-analysis-cursor-ai-vs-fullstack-developer.pdf');
    
    // Ensure docs directory exists
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

// Run if executed directly
if (require.main === module) {
  generatePDF().catch(console.error);
}

export { generatePDF, ROIDocument };
