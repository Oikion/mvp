/**
 * PDF Export Generator
 * 
 * Generates PDF exports for CRM, MLS, Calendar, and Reports modules
 * using @react-pdf/renderer.
 */

import React from "react";
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Font,
  pdf,
} from "@react-pdf/renderer";
import { format as formatDate, startOfMonth, endOfMonth, eachDayOfInterval, getDay, isSameDay } from "date-fns";
import { el, enUS } from "date-fns/locale";
import {
  type ColumnDefinition,
  type FormatterOptions,
  formatCellValue,
  getColumnHeaders,
  CRM_COLUMNS,
  MLS_COLUMNS,
  CALENDAR_COLUMNS,
  REPORTS_COLUMNS,
} from "./data-formatter";
import {
  type ExportModule,
  sanitizeForExport,
  generateExportFilename,
} from "./security";

// ============================================
// FONT REGISTRATION
// ============================================

// Register Roboto font that supports Greek characters
Font.register({
  family: "Roboto",
  fonts: [
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf",
      fontWeight: "normal",
    },
    {
      src: "https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf",
      fontWeight: "bold",
    },
  ],
});

// ============================================
// STYLES
// ============================================

const styles = StyleSheet.create({
  page: {
    fontFamily: "Roboto",
    fontSize: 9,
    padding: 30,
    lineHeight: 1.4,
  },
  header: {
    marginBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 10,
  },
  title: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 3,
  },
  subtitle: {
    fontSize: 10,
    color: "#666",
  },
  exportInfo: {
    fontSize: 8,
    color: "#999",
    marginTop: 5,
  },
  table: {
    width: "100%",
  },
  tableRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
    minHeight: 22,
    alignItems: "center",
  },
  tableHeaderRow: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
    backgroundColor: "#f5f5f5",
    minHeight: 24,
    alignItems: "center",
  },
  tableCell: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  tableCellHeader: {
    paddingVertical: 5,
    paddingHorizontal: 4,
    fontWeight: "bold",
    fontSize: 8,
  },
  footer: {
    position: "absolute",
    bottom: 20,
    left: 30,
    right: 30,
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    color: "#999",
  },
  pageNumber: {
    fontSize: 8,
    color: "#999",
  },
  // Calendar Grid Styles
  calendarContainer: {
    width: "100%",
  },
  calendarHeader: {
    flexDirection: "row",
    backgroundColor: "#f5f5f5",
    borderBottomWidth: 1,
    borderBottomColor: "#333",
  },
  calendarDayHeader: {
    flex: 1,
    textAlign: "center",
    padding: 6,
    fontWeight: "bold",
    fontSize: 9,
  },
  calendarWeek: {
    flexDirection: "row",
    minHeight: 70,
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
  },
  calendarDay: {
    flex: 1,
    borderRightWidth: 0.5,
    borderRightColor: "#e0e0e0",
    padding: 3,
  },
  calendarDayNumber: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
  },
  calendarDayNumberOutside: {
    fontSize: 10,
    color: "#ccc",
    marginBottom: 2,
  },
  calendarEvent: {
    fontSize: 7,
    backgroundColor: "#e3f2fd",
    padding: 2,
    marginBottom: 2,
    borderRadius: 2,
  },
  calendarEventTime: {
    fontSize: 6,
    color: "#666",
  },
  // Report Styles
  reportSection: {
    marginBottom: 15,
  },
  reportSectionTitle: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 8,
    backgroundColor: "#f5f5f5",
    padding: 5,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "30%",
    padding: 10,
    backgroundColor: "#f9f9f9",
    borderRadius: 4,
    marginBottom: 10,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 3,
  },
  statLabel: {
    fontSize: 9,
    color: "#666",
  },
  // List view styles for calendar
  eventListItem: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#e0e0e0",
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  eventTime: {
    width: 80,
    fontSize: 9,
    color: "#333",
  },
  eventDetails: {
    flex: 1,
  },
  eventTitle: {
    fontSize: 10,
    fontWeight: "bold",
    marginBottom: 2,
  },
  eventLocation: {
    fontSize: 8,
    color: "#666",
  },
  eventType: {
    fontSize: 8,
    color: "#0066cc",
    marginTop: 2,
  },
  dateGroupHeader: {
    backgroundColor: "#f5f5f5",
    padding: 6,
    marginTop: 10,
    marginBottom: 4,
  },
  dateGroupTitle: {
    fontSize: 11,
    fontWeight: "bold",
  },
});

// ============================================
// TYPES
// ============================================

export interface PDFExportOptions {
  locale?: "en" | "el";
  title?: string;
  subtitle?: string;
  columns?: ColumnDefinition[];
  orientation?: "portrait" | "landscape";
}

export interface CalendarPDFOptions extends PDFExportOptions {
  viewType: "list" | "grid";
  month?: Date;
  dateRange?: { start: Date; end: Date };
}

interface GeneratedPDF {
  blob: Blob;
  filename: string;
  contentType: string;
}

// ============================================
// TABLE PDF COMPONENT
// ============================================

interface TablePDFProps {
  data: Record<string, unknown>[];
  columns: ColumnDefinition[];
  title: string;
  subtitle?: string;
  locale: "en" | "el";
}

function calculateColumnWidths(columns: ColumnDefinition[]): string[] {
  const totalWidth = columns.reduce((sum, col) => sum + (col.width || 15), 0);
  return columns.map(col => `${((col.width || 15) / totalWidth) * 100}%`);
}

function TablePDF({ data, columns, title, subtitle, locale }: TablePDFProps) {
  const headers = getColumnHeaders(columns, locale);
  const widths = calculateColumnWidths(columns);
  const formatterOptions: FormatterOptions = { locale, sanitize: true };
  const exportDate = formatDate(new Date(), "PPP p", { locale: locale === "el" ? el : enUS });

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <Text style={styles.exportInfo}>
            {locale === "el" ? "Εξαγωγή:" : "Exported:"} {exportDate} | {data.length} {locale === "el" ? "εγγραφές" : "records"}
          </Text>
        </View>

        <View style={styles.table}>
          {/* Header Row */}
          <View style={styles.tableHeaderRow}>
            {headers.map((header, index) => (
              <View key={index} style={[styles.tableCellHeader, { width: widths[index] }]}>
                <Text>{header}</Text>
              </View>
            ))}
          </View>

          {/* Data Rows */}
          {data.map((row, rowIndex) => (
            <View key={rowIndex} style={styles.tableRow}>
              {columns.map((col, colIndex) => (
                <View key={colIndex} style={[styles.tableCell, { width: widths[colIndex] }]}>
                  <Text>{formatCellValue(row[col.key], col, formatterOptions)}</Text>
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>Oikion Export</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ============================================
// CALENDAR LIST PDF COMPONENT
// ============================================

interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string | Date;
  endTime: string | Date;
  location?: string;
  eventType?: string;
  status?: string;
}

interface CalendarListPDFProps {
  events: CalendarEvent[];
  title: string;
  locale: "en" | "el";
  dateRange?: { start: Date; end: Date };
}

function CalendarListPDF({ events, title, locale, dateRange }: CalendarListPDFProps) {
  const dateLocale = locale === "el" ? el : enUS;
  const exportDate = formatDate(new Date(), "PPP p", { locale: dateLocale });
  
  // Sort events by start time
  const sortedEvents = [...events].sort((a, b) => 
    new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
  );

  // Group events by date
  const groupedEvents = sortedEvents.reduce((groups, event) => {
    const dateKey = formatDate(new Date(event.startTime), "yyyy-MM-dd");
    if (!groups[dateKey]) {
      groups[dateKey] = [];
    }
    groups[dateKey].push(event);
    return groups;
  }, {} as Record<string, CalendarEvent[]>);

  const eventTypeLabels: Record<string, string> = {
    PROPERTY_VIEWING: locale === "el" ? "Επίσκεψη Ακινήτου" : "Property Viewing",
    CLIENT_CONSULTATION: locale === "el" ? "Συνάντηση Πελάτη" : "Client Consultation",
    MEETING: locale === "el" ? "Συνάντηση" : "Meeting",
    REMINDER: locale === "el" ? "Υπενθύμιση" : "Reminder",
    TASK_DEADLINE: locale === "el" ? "Προθεσμία" : "Task Deadline",
    OTHER: locale === "el" ? "Άλλο" : "Other",
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          {dateRange && (
            <Text style={styles.subtitle}>
              {formatDate(dateRange.start, "PPP", { locale: dateLocale })} - {formatDate(dateRange.end, "PPP", { locale: dateLocale })}
            </Text>
          )}
          <Text style={styles.exportInfo}>
            {locale === "el" ? "Εξαγωγή:" : "Exported:"} {exportDate} | {events.length} {locale === "el" ? "εκδηλώσεις" : "events"}
          </Text>
        </View>

        {Object.entries(groupedEvents).map(([dateKey, dateEvents]) => (
          <View key={dateKey}>
            <View style={styles.dateGroupHeader}>
              <Text style={styles.dateGroupTitle}>
                {formatDate(new Date(dateKey), "EEEE, d MMMM yyyy", { locale: dateLocale })}
              </Text>
            </View>
            
            {dateEvents.map((event) => (
              <View key={event.id} style={styles.eventListItem}>
                <View style={styles.eventTime}>
                  <Text>
                    {formatDate(new Date(event.startTime), "HH:mm", { locale: dateLocale })} - {formatDate(new Date(event.endTime), "HH:mm", { locale: dateLocale })}
                  </Text>
                </View>
                <View style={styles.eventDetails}>
                  <Text style={styles.eventTitle}>{sanitizeForExport(event.title)}</Text>
                  {event.location && (
                    <Text style={styles.eventLocation}>📍 {sanitizeForExport(event.location)}</Text>
                  )}
                  {event.eventType && (
                    <Text style={styles.eventType}>{eventTypeLabels[event.eventType] || event.eventType}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}

        <View style={styles.footer} fixed>
          <Text>Oikion Calendar Export</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ============================================
// CALENDAR GRID PDF COMPONENT
// ============================================

interface CalendarGridPDFProps {
  events: CalendarEvent[];
  title: string;
  locale: "en" | "el";
  month: Date;
}

function CalendarGridPDF({ events, title, locale, month }: CalendarGridPDFProps) {
  const dateLocale = locale === "el" ? el : enUS;
  const exportDate = formatDate(new Date(), "PPP p", { locale: dateLocale });
  
  const monthStart = startOfMonth(month);
  const monthEnd = endOfMonth(month);
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  
  // Get the day of week for the first day (0 = Sunday, 1 = Monday, etc.)
  const startDayOfWeek = getDay(monthStart);
  // Adjust for Monday start (European standard)
  const adjustedStartDay = startDayOfWeek === 0 ? 6 : startDayOfWeek - 1;
  
  // Create array of weeks
  const weeks: (Date | null)[][] = [];
  let currentWeek: (Date | null)[] = new Array(adjustedStartDay).fill(null);
  
  for (const day of daysInMonth) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  
  // Fill remaining days of last week
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }
  
  // Day headers
  const dayHeaders = locale === "el" 
    ? ["Δευ", "Τρί", "Τετ", "Πέμ", "Παρ", "Σάβ", "Κυρ"]
    : ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  
  // Get events for a specific day
  const getEventsForDay = (day: Date) => {
    return events.filter(event => isSameDay(new Date(event.startTime), day));
  };

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.subtitle}>
            {formatDate(month, "MMMM yyyy", { locale: dateLocale })}
          </Text>
          <Text style={styles.exportInfo}>
            {locale === "el" ? "Εξαγωγή:" : "Exported:"} {exportDate}
          </Text>
        </View>

        <View style={styles.calendarContainer}>
          {/* Day Headers */}
          <View style={styles.calendarHeader}>
            {dayHeaders.map((day, index) => (
              <Text key={index} style={styles.calendarDayHeader}>{day}</Text>
            ))}
          </View>

          {/* Calendar Weeks */}
          {weeks.map((week, weekIndex) => (
            <View key={weekIndex} style={styles.calendarWeek}>
              {week.map((day, dayIndex) => (
                <View key={dayIndex} style={styles.calendarDay}>
                  {day ? (
                    <>
                      <Text style={styles.calendarDayNumber}>
                        {formatDate(day, "d")}
                      </Text>
                      {getEventsForDay(day).slice(0, 3).map((event, eventIndex) => (
                        <View key={eventIndex} style={styles.calendarEvent}>
                          <Text style={styles.calendarEventTime}>
                            {formatDate(new Date(event.startTime), "HH:mm")}
                          </Text>
                          <Text>
                            {sanitizeForExport(event.title).substring(0, 20)}
                          </Text>
                        </View>
                      ))}
                      {getEventsForDay(day).length > 3 && (
                        <Text style={{ fontSize: 7, color: "#666" }}>
                          +{getEventsForDay(day).length - 3} {locale === "el" ? "ακόμα" : "more"}
                        </Text>
                      )}
                    </>
                  ) : (
                    <Text style={styles.calendarDayNumberOutside}></Text>
                  )}
                </View>
              ))}
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text>Oikion Calendar Export</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ============================================
// REPORTS PDF COMPONENT
// ============================================

interface ReportStats {
  clientsCount: number;
  propertiesCount: number;
  activeClients: number;
  activeProperties: number;
  clientsByStatus: { name: string; Number: number }[];
  propertiesByStatus: { name: string; Number: number }[];
}

interface ReportsPDFProps {
  stats: ReportStats;
  title: string;
  locale: "en" | "el";
}

function ReportsPDF({ stats, title, locale }: ReportsPDFProps) {
  const dateLocale = locale === "el" ? el : enUS;
  const exportDate = formatDate(new Date(), "PPP p", { locale: dateLocale });

  const labels = {
    totalClients: locale === "el" ? "Σύνολο Πελατών" : "Total Clients",
    totalProperties: locale === "el" ? "Σύνολο Ακινήτων" : "Total Properties",
    activeClients: locale === "el" ? "Ενεργοί Πελάτες" : "Active Clients",
    activeProperties: locale === "el" ? "Ενεργά Ακίνητα" : "Active Properties",
    clientsByStatus: locale === "el" ? "Πελάτες ανά Κατάσταση" : "Clients by Status",
    propertiesByStatus: locale === "el" ? "Ακίνητα ανά Κατάσταση" : "Properties by Status",
    status: locale === "el" ? "Κατάσταση" : "Status",
    count: locale === "el" ? "Αριθμός" : "Count",
    percentage: locale === "el" ? "Ποσοστό" : "Percentage",
  };

  const calculatePercentage = (value: number, total: number) => {
    if (total === 0) return "0%";
    return `${((value / total) * 100).toFixed(1)}%`;
  };

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.exportInfo}>
            {locale === "el" ? "Εξαγωγή:" : "Exported:"} {exportDate}
          </Text>
        </View>

        {/* Summary Stats */}
        <View style={styles.reportSection}>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.clientsCount}</Text>
              <Text style={styles.statLabel}>{labels.totalClients}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.propertiesCount}</Text>
              <Text style={styles.statLabel}>{labels.totalProperties}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.activeClients}</Text>
              <Text style={styles.statLabel}>{labels.activeClients}</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.activeProperties}</Text>
              <Text style={styles.statLabel}>{labels.activeProperties}</Text>
            </View>
          </View>
        </View>

        {/* Clients by Status */}
        <View style={styles.reportSection}>
          <Text style={styles.reportSectionTitle}>{labels.clientsByStatus}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <View style={[styles.tableCellHeader, { width: "50%" }]}>
                <Text>{labels.status}</Text>
              </View>
              <View style={[styles.tableCellHeader, { width: "25%" }]}>
                <Text>{labels.count}</Text>
              </View>
              <View style={[styles.tableCellHeader, { width: "25%" }]}>
                <Text>{labels.percentage}</Text>
              </View>
            </View>
            {stats.clientsByStatus.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.tableCell, { width: "50%" }]}>
                  <Text>{item.name}</Text>
                </View>
                <View style={[styles.tableCell, { width: "25%" }]}>
                  <Text>{item.Number}</Text>
                </View>
                <View style={[styles.tableCell, { width: "25%" }]}>
                  <Text>{calculatePercentage(item.Number, stats.clientsCount)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        {/* Properties by Status */}
        <View style={styles.reportSection}>
          <Text style={styles.reportSectionTitle}>{labels.propertiesByStatus}</Text>
          <View style={styles.table}>
            <View style={styles.tableHeaderRow}>
              <View style={[styles.tableCellHeader, { width: "50%" }]}>
                <Text>{labels.status}</Text>
              </View>
              <View style={[styles.tableCellHeader, { width: "25%" }]}>
                <Text>{labels.count}</Text>
              </View>
              <View style={[styles.tableCellHeader, { width: "25%" }]}>
                <Text>{labels.percentage}</Text>
              </View>
            </View>
            {stats.propertiesByStatus.map((item, index) => (
              <View key={index} style={styles.tableRow}>
                <View style={[styles.tableCell, { width: "50%" }]}>
                  <Text>{item.name}</Text>
                </View>
                <View style={[styles.tableCell, { width: "25%" }]}>
                  <Text>{item.Number}</Text>
                </View>
                <View style={[styles.tableCell, { width: "25%" }]}>
                  <Text>{calculatePercentage(item.Number, stats.propertiesCount)}</Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.footer} fixed>
          <Text>Oikion Reports Export</Text>
          <Text render={({ pageNumber, totalPages }) => `${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  );
}

// ============================================
// MAIN EXPORT FUNCTIONS
// ============================================

/**
 * Generate CRM PDF export
 */
export async function generateCRMPDF(
  data: Record<string, unknown>[],
  options: PDFExportOptions = {}
): Promise<GeneratedPDF> {
  const locale = options.locale || "en";
  const title = options.title || (locale === "el" ? "Πελάτες" : "Clients");
  const columns = options.columns || CRM_COLUMNS;

  const doc = (
    <TablePDF
      data={data}
      columns={columns}
      title={title}
      subtitle={options.subtitle}
      locale={locale}
    />
  );

  const blob = await pdf(doc as React.ReactElement<React.ComponentProps<typeof Document>>).toBlob();
  const filename = generateExportFilename("crm", "pdf");

  return { blob, filename, contentType: "application/pdf" };
}

/**
 * Generate MLS PDF export
 */
export async function generateMLSPDF(
  data: Record<string, unknown>[],
  options: PDFExportOptions = {}
): Promise<GeneratedPDF> {
  const locale = options.locale || "en";
  const title = options.title || (locale === "el" ? "Ακίνητα" : "Properties");
  const columns = options.columns || MLS_COLUMNS;

  const doc = (
    <TablePDF
      data={data}
      columns={columns}
      title={title}
      subtitle={options.subtitle}
      locale={locale}
    />
  );

  const blob = await pdf(doc as React.ReactElement<React.ComponentProps<typeof Document>>).toBlob();
  const filename = generateExportFilename("mls", "pdf");

  return { blob, filename, contentType: "application/pdf" };
}

/**
 * Generate Calendar PDF export
 */
export async function generateCalendarPDF(
  events: CalendarEvent[],
  options: CalendarPDFOptions
): Promise<GeneratedPDF> {
  const locale = options.locale || "en";
  const title = options.title || (locale === "el" ? "Ημερολόγιο" : "Calendar");

  let doc: React.ReactElement;

  if (options.viewType === "grid") {
    const month = options.month || new Date();
    doc = (
      <CalendarGridPDF
        events={events}
        title={title}
        locale={locale}
        month={month}
      />
    );
  } else {
    doc = (
      <CalendarListPDF
        events={events}
        title={title}
        locale={locale}
        dateRange={options.dateRange}
      />
    );
  }

  const blob = await pdf(doc as React.ReactElement<React.ComponentProps<typeof Document>>).toBlob();
  const filename = generateExportFilename("calendar", "pdf");

  return { blob, filename, contentType: "application/pdf" };
}

/**
 * Generate Reports PDF export
 */
export async function generateReportsPDF(
  stats: ReportStats,
  options: PDFExportOptions = {}
): Promise<GeneratedPDF> {
  const locale = options.locale || "en";
  const title = options.title || (locale === "el" ? "Αναφορές" : "Reports");

  const doc = (
    <ReportsPDF
      stats={stats}
      title={title}
      locale={locale}
    />
  );

  const blob = await pdf(doc as React.ReactElement<React.ComponentProps<typeof Document>>).toBlob();
  const filename = generateExportFilename("reports", "pdf");

  return { blob, filename, contentType: "application/pdf" };
}

// ============================================
// GENERIC TABLE PDF EXPORT
// ============================================

/**
 * Generate a generic table PDF for any module
 */
export async function generateTablePDF(
  module: ExportModule,
  data: Record<string, unknown>[],
  options: PDFExportOptions = {}
): Promise<GeneratedPDF> {
  switch (module) {
    case "crm":
      return generateCRMPDF(data, options);
    case "mls":
      return generateMLSPDF(data, options);
    default:
      // Fallback to generic table
      const locale = options.locale || "en";
      const columns = options.columns || [];
      const title = options.title || module.toUpperCase();

      const doc = (
        <TablePDF
          data={data}
          columns={columns}
          title={title}
          subtitle={options.subtitle}
          locale={locale}
        />
      );

      const blob = await pdf(doc as React.ReactElement<React.ComponentProps<typeof Document>>).toBlob();
      const filename = generateExportFilename(module, "pdf");

      return { blob, filename, contentType: "application/pdf" };
  }
}
