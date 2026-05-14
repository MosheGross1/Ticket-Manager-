import jsPDF from 'jspdf';

export async function generateInvoicePDF({ invoice, customer, tickets, payments }) {
  const doc = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = doc.internal.pageSize.getWidth();

  const blue = [37, 99, 235];
  const dark = [17, 24, 39];
  const gray = [107, 114, 128];
  const light = [243, 244, 246];

  // Header bar
  doc.setFillColor(...blue);
  doc.rect(0, 0, W, 80, 'F');

  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text('INVOICE', 40, 38);

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Customer Ticket & Expense Manager', 40, 58);

  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.text(`#${invoice.invoiceNumber}`, W - 40, 32, { align: 'right' });
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`Date: ${new Date(invoice.generatedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, W - 40, 50, { align: 'right' });

  // Bill To
  doc.setTextColor(...dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('BILL TO', 40, 110);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(customer.companyName || '', 40, 126);
  doc.setTextColor(...gray);
  if (customer.contactName) doc.text(customer.contactName, 40, 140);
  if (customer.phone) doc.text(customer.phone, 40, 154);
  if (customer.email) doc.text(customer.email, 40, 168);
  if (customer.address) doc.text(customer.address, 40, 182);

  // Table header
  let y = 210;
  doc.setFillColor(...light);
  doc.rect(40, y - 14, W - 80, 20, 'F');
  doc.setTextColor(...dark);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  const cols = { passenger: 40, ticket: 200, airline: 310, date: 390, amount: W - 40 };
  doc.text('Passenger', cols.passenger, y);
  doc.text('Ticket #', cols.ticket, y);
  doc.text('Airline', cols.airline, y);
  doc.text('Date', cols.date, y);
  doc.text('Amount', cols.amount, y, { align: 'right' });

  // Table rows
  y += 16;
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);

  let subtotal = 0;
  for (const t of tickets) {
    doc.setTextColor(...dark);
    doc.text(t.passengerName || '', cols.passenger, y, { maxWidth: 155 });
    doc.text(t.ticketNumber || '', cols.ticket, y);
    doc.text(t.airline || '', cols.airline, y, { maxWidth: 75 });
    doc.text(t.bookingDate ? new Date(t.bookingDate).toLocaleDateString() : '', cols.date, y);
    const amt = t.amountCharged || 0;
    subtotal += amt;
    doc.text(`$${amt.toFixed(2)}`, cols.amount, y, { align: 'right' });

    y += 18;
    doc.setDrawColor(229, 231, 235);
    doc.line(40, y - 4, W - 40, y - 4);

    if (y > 650) {
      doc.addPage();
      y = 60;
    }
  }

  // Payments applied
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const balance = subtotal - totalPaid;

  y += 10;
  const totX = W - 200;
  doc.setDrawColor(...blue);
  doc.setLineWidth(1);
  doc.line(totX, y, W - 40, y);

  y += 18;
  doc.setTextColor(...gray);
  doc.setFontSize(9);
  doc.text('Subtotal:', totX, y);
  doc.setTextColor(...dark);
  doc.text(`$${subtotal.toFixed(2)}`, W - 40, y, { align: 'right' });

  y += 16;
  doc.setTextColor(...gray);
  doc.text('Payments Received:', totX, y);
  doc.setTextColor(22, 163, 74);
  doc.text(`-$${totalPaid.toFixed(2)}`, W - 40, y, { align: 'right' });

  y += 8;
  doc.setFillColor(...blue);
  doc.rect(totX - 5, y, W - 40 - totX + 5, 28, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('BALANCE DUE', totX + 4, y + 18);
  doc.text(`$${balance.toFixed(2)}`, W - 44, y + 18, { align: 'right' });

  // Notes
  if (invoice.notes) {
    y += 50;
    doc.setTextColor(...gray);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('NOTES', 40, y);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.notes, 40, y + 14, { maxWidth: W - 80 });
  }

  // Footer
  doc.setFillColor(...light);
  doc.rect(0, doc.internal.pageSize.getHeight() - 36, W, 36, 'F');
  doc.setTextColor(...gray);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('Thank you for your business.', W / 2, doc.internal.pageSize.getHeight() - 16, { align: 'center' });

  return doc;
}
