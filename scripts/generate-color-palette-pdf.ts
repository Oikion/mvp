/**
 * Generate Color Palette PDF
 * 
 * This script generates a PDF document showcasing the primary colors
 * from the Oikion design system, including color swatches, hex codes,
 * and color names for all three themes (Light, Pearl Sand, Twilight Lavender).
 */

import { jsPDF } from 'jspdf';

// HSL to RGB conversion helper
function hslToRgb(h: number, s: number, l: number): [number, number, number] {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) =>
    l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [
    Math.round(255 * f(0)),
    Math.round(255 * f(8)),
    Math.round(255 * f(4))
  ];
}

// RGB to Hex conversion helper
function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16);
    return hex.length === 1 ? '0' + hex : hex;
  }).join('');
}

// HSL string to Hex conversion
function hslStringToHex(hslString: string): string {
  const match = hslString.match(/(\d+\.?\d*)\s+(\d+\.?\d*)%\s+(\d+\.?\d*)%/);
  if (!match) return '#000000';
  
  const [, h, s, l] = match.map(Number);
  const [r, g, b] = hslToRgb(h, s, l);
  return rgbToHex(r, g, b);
}

// Color definitions from globals.css
interface ColorDefinition {
  name: string;
  hsl: string;
  description: string;
}

interface ThemeColors {
  themeName: string;
  colors: ColorDefinition[];
}

const themes: ThemeColors[] = [
  {
    themeName: 'Light Theme (Default)',
    colors: [
      { name: 'Background', hsl: '0 0% 100%', description: 'Main background color' },
      { name: 'Foreground', hsl: '240 10% 3.9%', description: 'Primary text color' },
      { name: 'Primary', hsl: '240 5.9% 10%', description: 'Primary brand color' },
      { name: 'Primary Foreground', hsl: '0 0% 98%', description: 'Text on primary' },
      { name: 'Secondary', hsl: '240 4.8% 95.9%', description: 'Secondary background' },
      { name: 'Secondary Foreground', hsl: '240 5.9% 10%', description: 'Text on secondary' },
      { name: 'Muted', hsl: '240 4.8% 95.9%', description: 'Muted background' },
      { name: 'Muted Foreground', hsl: '240 3.8% 46.1%', description: 'Muted text' },
      { name: 'Accent', hsl: '240 4.8% 95.9%', description: 'Accent color' },
      { name: 'Accent Foreground', hsl: '240 5.9% 10%', description: 'Text on accent' },
      { name: 'Destructive', hsl: '0 84.2% 60.2%', description: 'Error/destructive actions' },
      { name: 'Success', hsl: '142 76% 36%', description: 'Success states' },
      { name: 'Warning', hsl: '38 92% 50%', description: 'Warning states' },
      { name: 'Info', hsl: '217 91% 60%', description: 'Informational states' },
      { name: 'Border', hsl: '240 5.9% 90%', description: 'Border color' },
      { name: 'Card', hsl: '0 0% 100%', description: 'Card background' },
    ]
  },
  {
    themeName: 'Pearl Sand Theme',
    colors: [
      { name: 'Background', hsl: '35 15% 95%', description: 'Dusty beige background' },
      { name: 'Foreground', hsl: '30 10% 20%', description: 'Primary text color' },
      { name: 'Primary', hsl: '35 15% 30%', description: 'Earthy primary color' },
      { name: 'Primary Foreground', hsl: '35 20% 97%', description: 'Text on primary' },
      { name: 'Secondary', hsl: '35 10% 90%', description: 'Secondary background' },
      { name: 'Secondary Foreground', hsl: '35 15% 30%', description: 'Text on secondary' },
      { name: 'Muted', hsl: '35 10% 92%', description: 'Muted background' },
      { name: 'Muted Foreground', hsl: '30 10% 45%', description: 'Muted text' },
      { name: 'Accent', hsl: '35 15% 92%', description: 'Accent color' },
      { name: 'Accent Foreground', hsl: '35 15% 30%', description: 'Text on accent' },
      { name: 'Destructive', hsl: '0 70% 55%', description: 'Error/destructive actions' },
      { name: 'Border', hsl: '35 15% 86%', description: 'Border color' },
      { name: 'Card', hsl: '35 15% 97%', description: 'Card background' },
    ]
  },
  {
    themeName: 'Twilight Lavender Theme',
    colors: [
      { name: 'Background', hsl: '265 20% 10%', description: 'Dark purple background' },
      { name: 'Foreground', hsl: '260 20% 98%', description: 'Primary text color' },
      { name: 'Primary', hsl: '265 70% 70%', description: 'Vibrant lavender primary' },
      { name: 'Primary Foreground', hsl: '265 20% 10%', description: 'Text on primary' },
      { name: 'Secondary', hsl: '265 20% 20%', description: 'Secondary background' },
      { name: 'Secondary Foreground', hsl: '260 20% 98%', description: 'Text on secondary' },
      { name: 'Muted', hsl: '265 20% 20%', description: 'Muted background' },
      { name: 'Muted Foreground', hsl: '265 20% 70%', description: 'Muted text' },
      { name: 'Accent', hsl: '265 20% 20%', description: 'Accent color' },
      { name: 'Accent Foreground', hsl: '260 20% 98%', description: 'Text on accent' },
      { name: 'Destructive', hsl: '0 72% 65%', description: 'Error/destructive actions' },
      { name: 'Border', hsl: '265 20% 20%', description: 'Border color' },
      { name: 'Card', hsl: '265 20% 12%', description: 'Card background' },
    ]
  }
];

// Palette colors (shared across themes with variations)
const paletteColors: ColorDefinition[] = [
  { name: 'Gray', hsl: '240 5% 46%', description: 'Neutral content, disabled states' },
  { name: 'Brown', hsl: '30 40% 30%', description: 'Archival, earth tones, tags' },
  { name: 'Red', hsl: '0 72% 42%', description: 'Error, destructive, critical' },
  { name: 'Orange', hsl: '25 95% 40%', description: 'Warning, pending, attention' },
  { name: 'Amber', hsl: '38 92% 40%', description: 'Caution, highlight, gold' },
  { name: 'Yellow', hsl: '48 96% 35%', description: 'Notice, bright highlight' },
  { name: 'Lime', hsl: '84 80% 32%', description: 'Fresh, growth, new' },
  { name: 'Green', hsl: '142 71% 32%', description: 'Success, active, confirmed' },
  { name: 'Teal', hsl: '172 66% 30%', description: 'Info-alt, ocean, secondary' },
  { name: 'Cyan', hsl: '192 91% 32%', description: 'Tech, modern, links' },
  { name: 'Blue', hsl: '217 91% 45%', description: 'Primary, info, actions' },
  { name: 'Indigo', hsl: '239 84% 50%', description: 'Deep, professional' },
  { name: 'Violet', hsl: '263 70% 45%', description: 'Premium, special, featured' },
  { name: 'Fuchsia', hsl: '292 84% 42%', description: 'Vibrant, creative' },
  { name: 'Pink', hsl: '330 81% 45%', description: 'Soft, decorative' },
  { name: 'Rose', hsl: '347 77% 45%', description: 'Warm accent, love' },
];

function generatePDF() {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4'
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 20;
  const contentWidth = pageWidth - (margin * 2);
  
  let yPosition = margin;

  // Title
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text('Oikion Color Palette', margin, yPosition);
  yPosition += 10;

  // Subtitle
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Design System Primary Colors', margin, yPosition);
  yPosition += 15;

  // Function to draw a color swatch
  function drawColorSwatch(
    name: string,
    hsl: string,
    description: string,
    x: number,
    y: number,
    width: number
  ): number {
    const hex = hslStringToHex(hsl);
    const [r, g, b] = hslToRgb(...hsl.match(/(\d+\.?\d*)/g)!.map(Number) as [number, number, number]);
    
    // Draw color swatch
    doc.setFillColor(r, g, b);
    doc.rect(x, y, 30, 15, 'F');
    
    // Draw border around swatch
    doc.setDrawColor(200, 200, 200);
    doc.setLineWidth(0.2);
    doc.rect(x, y, 30, 15, 'S');
    
    // Color name
    doc.setFontSize(11);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(name, x + 35, y + 5);
    
    // Hex code
    doc.setFontSize(10);
    doc.setFont('courier', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text(hex.toUpperCase(), x + 35, y + 10);
    
    // Description
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(120, 120, 120);
    doc.text(description, x + 35, y + 14);
    
    return 18; // Height used
  }

  // Draw each theme
  for (let themeIndex = 0; themeIndex < themes.length; themeIndex++) {
    const theme = themes[themeIndex];
    
    // Check if we need a new page
    if (yPosition > pageHeight - 40) {
      doc.addPage();
      yPosition = margin;
    }
    
    // Theme title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(theme.themeName, margin, yPosition);
    yPosition += 8;
    
    // Draw theme colors
    for (const color of theme.colors) {
      if (yPosition > pageHeight - 25) {
        doc.addPage();
        yPosition = margin;
      }
      
      const height = drawColorSwatch(
        color.name,
        color.hsl,
        color.description,
        margin,
        yPosition,
        contentWidth
      );
      yPosition += height;
    }
    
    yPosition += 5; // Space between themes
  }

  // Palette Colors Section
  if (yPosition > pageHeight - 40) {
    doc.addPage();
    yPosition = margin;
  }
  
  yPosition += 5;
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(0, 0, 0);
  doc.text('Palette Colors (Light Theme)', margin, yPosition);
  yPosition += 6;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text('Unified color system for tags, badges, and semantic colors', margin, yPosition);
  yPosition += 8;

  // Draw palette colors
  for (const color of paletteColors) {
    if (yPosition > pageHeight - 25) {
      doc.addPage();
      yPosition = margin;
    }
    
    const height = drawColorSwatch(
      color.name,
      color.hsl,
      color.description,
      margin,
      yPosition,
      contentWidth
    );
    yPosition += height;
  }

  // Footer
  const footerY = pageHeight - 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(150, 150, 150);
  doc.text('Generated by Oikion Design System', margin, footerY);
  doc.text(`Generated on ${new Date().toLocaleDateString()}`, pageWidth - margin - 40, footerY);

  // Save the PDF
  const fileName = `oikion-color-palette-${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
  
  console.log(`✅ PDF generated successfully: ${fileName}`);
}

// Run the generator
generatePDF();
