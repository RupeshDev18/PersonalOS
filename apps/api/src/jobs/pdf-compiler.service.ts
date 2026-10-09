import { Injectable, Logger } from '@nestjs/common';
import * as PDFDocumentImport from 'pdfkit';

// Handle CommonJS / ESModule interop for PDFDocument constructor
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const PDFDocument: typeof PDFDocumentImport =
  (PDFDocumentImport as any).default || PDFDocumentImport;

export interface ResumePdfOptions {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  targetRole: string;
  summary?: string;
  skills: string[];
  markdownContent: string;
  companyTargeted?: string;
}

export interface CoverLetterPdfOptions {
  fullName: string;
  email: string;
  phone?: string;
  location?: string;
  company: string;
  role: string;
  dateStr?: string;
  letterBody: string;
}

@Injectable()
export class PdfCompilerService {
  private readonly logger = new Logger(PdfCompilerService.name);

  /**
   * Compiles an ATS-friendly, single-column recruiter-compliant resume PDF.
   */
  public async compileResumePdf(options: ResumePdfOptions): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 40, bottom: 40, left: 45, right: 45 },
          info: {
            Title: `${options.fullName} - ${options.targetRole} Resume`,
            Author: options.fullName,
            Subject: `Application for ${options.targetRole}${options.companyTargeted ? ` at ${options.companyTargeted}` : ''}`,
            Keywords: options.skills.join(', '),
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        // 1. Header: Full Name
        doc
          .font('Helvetica-Bold')
          .fontSize(20)
          .fillColor('#111827')
          .text(options.fullName.toUpperCase(), { align: 'center', characterSpacing: 0.5 });

        // 2. Target Role Subtitle
        doc
          .font('Helvetica')
          .fontSize(11)
          .fillColor('#374151')
          .moveDown(0.25)
          .text(options.targetRole, { align: 'center' });

        // 3. Contact Line
        const contactParts = [
          options.email,
          options.phone,
          options.location,
          options.github ? `github.com/${options.github.replace(/^https?:\/\/github\.com\//, '')}` : null,
          options.linkedin ? `linkedin.com/in/${options.linkedin.replace(/^https?:\/\/.*linkedin\.com\/in\//, '')}` : null,
        ].filter(Boolean);

        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#4B5563')
          .moveDown(0.3)
          .text(contactParts.join('  •  '), { align: 'center' });

        // Horizontal divider
        doc.moveDown(0.5);
        const yLine = doc.y;
        doc
          .strokeColor('#D1D5DB')
          .lineWidth(0.8)
          .moveTo(45, yLine)
          .lineTo(doc.page.width - 45, yLine)
          .stroke();

        doc.moveDown(0.6);

        // 4. Target Summary / Objective
        if (options.summary) {
          this.renderSectionHeader(doc, 'EXECUTIVE SUMMARY');
          doc
            .font('Helvetica')
            .fontSize(9.5)
            .fillColor('#1F2937')
            .lineGap(2)
            .text(options.summary, { align: 'left' });
          doc.moveDown(0.6);
        }

        // 5. Core Skills & Technologies (Categorized or comma-separated ATS string)
        if (options.skills.length > 0) {
          this.renderSectionHeader(doc, 'TECHNICAL COMPETENCIES & STACK');
          doc
            .font('Helvetica-Bold')
            .fontSize(9)
            .fillColor('#111827')
            .text('Core Technologies: ', { continued: true })
            .font('Helvetica')
            .fillColor('#374151')
            .text(options.skills.join(', '));
          doc.moveDown(0.6);
        }

        // 6. Parse and render Markdown Content (Work Experience, Projects, Education)
        this.renderMarkdownSections(doc, options.markdownContent);

        doc.end();
      } catch (err) {
        this.logger.error(`Error generating resume PDF: ${err}`);
        reject(err);
      }
    });
  }

  /**
   * Compiles a high-converting, professional Cover Letter PDF.
   */
  public async compileCoverLetterPdf(options: CoverLetterPdfOptions): Promise<Buffer> {
    return new Promise<Buffer>((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 45, bottom: 45, left: 50, right: 50 },
          info: {
            Title: `${options.fullName} - Cover Letter for ${options.company}`,
            Author: options.fullName,
            Subject: `Cover Letter for ${options.role} at ${options.company}`,
          },
        });

        const buffers: Buffer[] = [];
        doc.on('data', (chunk) => buffers.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(buffers)));
        doc.on('error', (err) => reject(err));

        // 1. Candidate Header
        doc
          .font('Helvetica-Bold')
          .fontSize(16)
          .fillColor('#111827')
          .text(options.fullName);

        const contactLine = [options.email, options.phone, options.location].filter(Boolean).join('  |  ');
        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor('#4B5563')
          .moveDown(0.2)
          .text(contactLine);

        // Divider
        doc.moveDown(0.4);
        const yDivider = doc.y;
        doc
          .strokeColor('#CBD5E1')
          .lineWidth(0.8)
          .moveTo(50, yDivider)
          .lineTo(doc.page.width - 50, yDivider)
          .stroke();

        doc.moveDown(0.8);

        // 2. Date
        const today = options.dateStr || new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });

        doc
          .font('Helvetica')
          .fontSize(9.5)
          .fillColor('#4B5563')
          .text(today);

        doc.moveDown(0.8);

        // 3. Recipient Info
        doc
          .font('Helvetica-Bold')
          .fontSize(10)
          .fillColor('#111827')
          .text(`Hiring Team / Engineering Leadership`)
          .font('Helvetica')
          .fillColor('#374151')
          .text(options.company)
          .moveDown(0.4)
          .font('Helvetica-Bold')
          .text(`RE: Application for ${options.role}`);

        doc.moveDown(0.9);

        // 4. Letter Body
        // Split paragraphs cleanly
        const paragraphs = options.letterBody
          .replace(/^#+.*$/gm, '') // strip any markdown headings
          .replace(/\*\*(.*?)\*\*/g, '$1') // clean bolding
          .split(/\n\s*\n/)
          .map((p) => p.trim())
          .filter((p) => p.length > 0);

        for (const p of paragraphs) {
          doc
            .font('Helvetica')
            .fontSize(10)
            .fillColor('#1F2937')
            .lineGap(3)
            .text(p, { align: 'justify' })
            .moveDown(0.6);
        }

        // 5. Sign-off
        doc.moveDown(0.6);
        doc
          .font('Helvetica')
          .fontSize(10)
          .fillColor('#1F2937')
          .text('Sincerely,')
          .moveDown(0.8)
          .font('Helvetica-Bold')
          .fontSize(11)
          .fillColor('#111827')
          .text(options.fullName);

        doc.end();
      } catch (err) {
        this.logger.error(`Error generating cover letter PDF: ${err}`);
        reject(err);
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Helper Renderers
  // ---------------------------------------------------------------------------

  private renderSectionHeader(doc: PDFKit.PDFDocument, title: string): void {
    doc.moveDown(0.3);
    doc
      .font('Helvetica-Bold')
      .fontSize(10)
      .fillColor('#111827')
      .text(title.toUpperCase(), { characterSpacing: 0.6 });

    const y = doc.y + 1;
    doc
      .strokeColor('#E5E7EB')
      .lineWidth(0.6)
      .moveTo(45, y)
      .lineTo(doc.page.width - 45, y)
      .stroke();

    doc.moveDown(0.4);
  }

  private renderMarkdownSections(doc: PDFKit.PDFDocument, markdown: string): void {
    if (!markdown) return;

    const lines = markdown.split('\n');
    let inSection = false;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) {
        continue;
      }

      // H1 or H2 markdown header
      if (line.startsWith('# ') || line.startsWith('## ')) {
        const title = line.replace(/^#+\s*/, '').replace(/[\*\_]/g, '');
        // Skip duplicate title or target role headers
        if (title.toLowerCase().includes('resume') || title.toLowerCase().includes('tailored for')) {
          continue;
        }
        this.renderSectionHeader(doc, title);
        inSection = true;
        continue;
      }

      // H3 markdown header (e.g. Job title at Company)
      if (line.startsWith('### ')) {
        const sub = line.replace(/^###\s*/, '').replace(/[\*\_]/g, '');
        doc
          .font('Helvetica-Bold')
          .fontSize(9.5)
          .fillColor('#111827')
          .moveDown(0.25)
          .text(sub);
        continue;
      }

      // Blockquotes or Callouts
      if (line.startsWith('>')) {
        const quote = line.replace(/^>\s*/, '').replace(/[\*\_]/g, '');
        doc
          .font('Helvetica-Oblique')
          .fontSize(8.5)
          .fillColor('#4B5563')
          .text(quote)
          .moveDown(0.2);
        continue;
      }

      // Bullet points
      if (line.startsWith('- ') || line.startsWith('* ')) {
        const bulletText = line.replace(/^[-*]\s*/, '').replace(/\*\*(.*?)\*\*/g, '$1');
        doc
          .font('Helvetica')
          .fontSize(9)
          .fillColor('#374151')
          .lineGap(1.5)
          .text(`  •  ${bulletText}`, { align: 'left', indent: 5 });
        continue;
      }

      // Plain body line
      const cleanLine = line.replace(/\*\*(.*?)\*\*/g, '$1');
      doc
        .font('Helvetica')
        .fontSize(9)
        .fillColor('#374151')
        .lineGap(1.5)
        .text(cleanLine);
    }
  }
}
