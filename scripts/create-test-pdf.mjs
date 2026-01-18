import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import * as fs from 'fs';

async function createTestPDF() {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([612, 792]);
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const content = [
    { text: 'Test Letter - Contract Termination Notice', size: 16, y: 700 },
    { text: '', size: 12, y: 680 },
    { text: 'Sender: Taro Yamada', size: 12, y: 650 },
    { text: 'Address: 1-2-3 Shibuya, Shibuya-ku, Tokyo 150-0002', size: 12, y: 630 },
    { text: 'Phone: 03-1234-5678', size: 12, y: 610 },
    { text: 'Email: yamada@example.com', size: 12, y: 590 },
    { text: '', size: 12, y: 570 },
    { text: 'Dear Customer,', size: 12, y: 540 },
    { text: '', size: 12, y: 520 },
    { text: 'This letter serves as formal notice of contract termination.', size: 12, y: 500 },
    { text: 'We hereby demand compensation for damages incurred.', size: 12, y: 480 },
    { text: 'Please respond to this notice within 7 days.', size: 12, y: 460 },
    { text: 'Failure to respond will result in legal action.', size: 12, y: 440 },
    { text: '', size: 12, y: 420 },
    { text: 'Sincerely,', size: 12, y: 390 },
    { text: 'Yamada Taro', size: 12, y: 370 },
    { text: 'January 18, 2026', size: 12, y: 350 },
  ];

  content.forEach(({ text, size, y }) => {
    page.drawText(text, {
      x: 50,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  });

  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync('./test-letter.pdf', pdfBytes);
  console.log('Test PDF created: test-letter.pdf');
}

createTestPDF().catch(console.error);
