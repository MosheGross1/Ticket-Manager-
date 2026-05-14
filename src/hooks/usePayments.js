import { useState, useEffect, useCallback } from 'react';
import { liveQuery } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/db';

export function usePayments({ ticketId, customerId } = {}) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const obs = liveQuery(async () => {
      if (ticketId) return db.payments.where('ticketId').equals(ticketId).reverse().sortBy('date');
      if (customerId) return db.payments.where('customerId').equals(customerId).reverse().sortBy('date');
      return db.payments.orderBy('date').reverse().toArray();
    });
    const sub = obs.subscribe({ next: rows => { setPayments(rows); setLoading(false); }, error: () => setLoading(false) });
    return () => sub.unsubscribe();
  }, [ticketId, customerId]);

  const addPayment = useCallback(async (data) => {
    const id = uuidv4();
    const now = Date.now();
    await db.payments.add({ id, ...data, createdAt: now, updatedAt: now });
    return id;
  }, []);

  const deletePayment = useCallback(async (id) => {
    await db.payments.delete(id);
  }, []);

  return { payments, loading, addPayment, deletePayment };
}
