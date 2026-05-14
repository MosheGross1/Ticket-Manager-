import { useState, useEffect, useCallback } from 'react';
import { liveQuery } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/db';

export function useTickets({ customerId, searchQuery } = {}) {
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const obs = liveQuery(async () => {
      let rows;
      if (customerId) {
        rows = await db.tickets.where('customerId').equals(customerId).reverse().sortBy('bookingDate');
      } else {
        rows = await db.tickets.orderBy('bookingDate').reverse().toArray();
      }
      return rows;
    });
    const sub = obs.subscribe({ next: rows => { setTickets(rows); setLoading(false); }, error: () => setLoading(false) });
    return () => sub.unsubscribe();
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
    const id = uuidv4();
    const now = Date.now();
    await db.tickets.add({ id, ...data, fileIds: data.fileIds || [], tags: data.tags || [], createdAt: now, updatedAt: now });
    return id;
  }, []);

  const updateTicket = useCallback(async (id, data) => {
    await db.tickets.update(id, { ...data, updatedAt: Date.now() });
  }, []);

  const deleteTicket = useCallback(async (id) => {
    await db.transaction('rw', db.tickets, db.payments, async () => {
      await db.payments.where('ticketId').equals(id).delete();
      await db.tickets.delete(id);
    });
  }, []);

  const getTicket = useCallback(async (id) => db.tickets.get(id), []);

  return { tickets: filtered, allTickets: tickets, loading, addTicket, updateTicket, deleteTicket, getTicket };
}

export function useTicketWithBalance(ticketId) {
  const [ticket, setTicket] = useState(null);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!ticketId) return;
    const obs = liveQuery(async () => {
      const t = await db.tickets.get(ticketId);
      const pmts = await db.payments.where('ticketId').equals(ticketId).toArray();
      return { ticket: t, payments: pmts };
    });
    const sub = obs.subscribe({ next: ({ ticket: t, payments: p }) => { setTicket(t); setPayments(p); setLoading(false); }, error: () => setLoading(false) });
    return () => sub.unsubscribe();
  }, [ticketId]);

  const amountPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);
  const remainingBalance = (ticket?.amountCharged || 0) - amountPaid;
  const profit = (ticket?.amountCharged || 0) - (ticket?.internalCost || 0);

  return { ticket, payments, amountPaid, remainingBalance, profit, loading };
}
