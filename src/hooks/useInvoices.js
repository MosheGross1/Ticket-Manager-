import { useState, useEffect, useCallback } from 'react';
import { liveQuery } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/db';
import { generateInvoicePDF } from '../utils/invoicePDF';

export function useInvoices(customerId) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const obs = liveQuery(async () => {
      if (customerId) return db.invoices.where('customerId').equals(customerId).reverse().sortBy('generatedAt');
      return db.invoices.orderBy('generatedAt').reverse().toArray();
    });
    const sub = obs.subscribe({ next: rows => { setInvoices(rows); setLoading(false); }, error: () => setLoading(false) });
    return () => sub.unsubscribe();
  }, [customerId]);

  const createInvoice = useCallback(async ({ customerId, ticketIds, notes }) => {
    const id = uuidv4();
    const now = Date.now();

    const allInvoices = await db.invoices.toArray();
    const invoiceNumber = `INV-${String(allInvoices.length + 1).padStart(4, '0')}`;

    const invoice = { id, customerId, ticketIds, notes: notes || '', invoiceNumber, generatedAt: now, updatedAt: now };
    await db.invoices.add(invoice);

    // Generate PDF
    const customer = await db.customers.get(customerId);
    const tickets = await Promise.all(ticketIds.map(tid => db.tickets.get(tid)));
    const payments = await db.payments.where('customerId').equals(customerId).toArray();
    const relevantPayments = payments.filter(p => ticketIds.includes(p.ticketId));

    const doc = await generateInvoicePDF({ invoice, customer, tickets: tickets.filter(Boolean), payments: relevantPayments });
    doc.save(`${invoiceNumber}.pdf`);

    return id;
  }, []);

  const deleteInvoice = useCallback(async (id) => {
    await db.invoices.delete(id);
  }, []);

  return { invoices, loading, createInvoice, deleteInvoice };
}
