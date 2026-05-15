import { useState, useEffect, useCallback } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, where, getDocs, writeBatch, increment,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useTickets({ customerId, searchQuery } = {}) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q;
    if (customerId) {
      q = query(collection(db, 'tickets'), where('customerId', '==', customerId));
    } else {
      q = query(collection(db, 'tickets'), orderBy('bookingDate', 'desc'));
    }
    const unsub = onSnapshot(q, snap => {
      let rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (customerId) rows = rows.sort((a, b) => (b.bookingDate || '').localeCompare(a.bookingDate || ''));
      setTickets(rows);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [customerId]);

  const filtered = searchQuery?.trim()
    ? tickets.filter(t => {
        const q = searchQuery.toLowerCase();
        return (
          t.passengerName?.toLowerCase().includes(q) ||
          t.ticketNumber?.toLowerCase().includes(q) ||
          t.airline?.toLowerCase().includes(q) ||
          t.flightNumber?.toLowerCase().includes(q)
        );
      })
    : tickets;

  const addTicket = useCallback(async (data) => {
    const ref = await addDoc(collection(db, 'tickets'), {
      ...data,
      fileIds: data.fileIds || [],
      tags: data.tags || [],
      amountPaid: 0,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
    return ref.id;
  }, []);

  const updateTicket = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'tickets', id), { ...data, updatedAt: Date.now() });
  }, []);

  const deleteTicket = useCallback(async (id) => {
    const batch = writeBatch(db);
    const pmtsSnap = await getDocs(query(collection(db, 'payments'), where('ticketId', '==', id)));
    pmtsSnap.docs.forEach(p => batch.delete(p.ref));
    batch.delete(doc(db, 'tickets', id));
    await batch.commit();
  }, []);

  const getTicket = useCallback(async (id) => {
    const { getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'tickets', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }, []);

  return { tickets: filtered, allTickets: tickets, loading, addTicket, updateTicket, deleteTicket, getTicket };
}

export function useTicketWithBalance(ticketId) {
  const [ticket, setTicket] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) return;
    const unsubTicket = onSnapshot(doc(db, 'tickets', ticketId), snap => {
      setTicket(snap.exists() ? { id: snap.id, ...snap.data() } : null);
      setLoading(false);
    });
    const unsubPayments = onSnapshot(
      query(collection(db, 'payments'), where('ticketId', '==', ticketId)),
      snap => setPayments(snap.docs.map(d => ({ id: d.id, ...d.data() })).sort((a, b) => (b.date || '').localeCompare(a.date || '')))
    );
    return () => { unsubTicket(); unsubPayments(); };
  }, [ticketId]);

  const amountPaid = ticket?.amountPaid || 0;
  const remainingBalance = (ticket?.amountCharged || 0) - amountPaid;
  const profit = (ticket?.amountCharged || 0) - (ticket?.internalCost || 0);

  return { ticket, payments, amountPaid, remainingBalance, profit, loading };
}
