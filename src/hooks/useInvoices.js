import { useState, useEffect, useCallback } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, query, where, getDocs, orderBy,
} from 'firebase/firestore';
import { db } from '../firebase';
import { generateInvoicePDF } from '../utils/invoicePDF';

export function useInvoices(customerId) {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = customerId
      ? query(collection(db, 'invoices'), where('customerId', '==', customerId))
      : collection(db, 'invoices');

    const unsub = onSnapshot(q, snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.generatedAt || 0) - (a.generatedAt || 0));
      setInvoices(rows);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [customerId]);

  const createInvoice = useCallback(async ({ customerId, ticketIds, notes }) => {
    const allInvSnap = await getDocs(collection(db, 'invoices'));
    const invoiceNumber = `INV-${String(allInvSnap.size + 1).padStart(4, '0')}`;
    const now = Date.now();

    const { getDoc } = await import('firebase/firestore');
    const custSnap = await getDoc(doc(db, 'customers', customerId));
    const customer = custSnap.exists() ? { id: custSnap.id, ...custSnap.data() } : {};

    const tickets = (await Promise.all(ticketIds.map(async tid => {
      const s = await getDoc(doc(db, 'tickets', tid));
      return s.exists() ? { id: s.id, ...s.data() } : null;
    }))).filter(Boolean);

    const pmtsSnap = await getDocs(query(collection(db, 'payments'), where('customerId', '==', customerId)));
    const payments = pmtsSnap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(p => ticketIds.includes(p.ticketId));

    const invoice = { invoiceNumber, customerId, ticketIds, notes: notes || '', generatedAt: now };
    const ref = await addDoc(collection(db, 'invoices'), { ...invoice, updatedAt: now });

    const doc2 = await generateInvoicePDF({ invoice, customer, tickets, payments });
    doc2.save(`${invoiceNumber}.pdf`);

    return ref.id;
  }, []);

  const deleteInvoice = useCallback(async (id) => {
    await deleteDoc(doc(db, 'invoices', id));
  }, []);

  return { invoices, loading, createInvoice, deleteInvoice };
}
