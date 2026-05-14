import { useState, useEffect, useCallback } from 'react';
import { liveQuery } from 'dexie';
import { v4 as uuidv4 } from 'uuid';
import db from '../db/db';

export function useCustomers(searchQuery = '') {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const obs = liveQuery(() => db.customers.orderBy('companyName').toArray());
    const sub = obs.subscribe({ next: rows => { setCustomers(rows); setLoading(false); }, error: () => setLoading(false) });
    return () => sub.unsubscribe();
  }, []);

  const filtered = searchQuery.trim()
    ? customers.filter(c => {
        const q = searchQuery.toLowerCase();
        return (
          c.companyName?.toLowerCase().includes(q) ||
          c.contactName?.toLowerCase().includes(q) ||
          c.phone?.includes(q) ||
          c.email?.toLowerCase().includes(q)
        );
      })
    : customers;

  const addCustomer = useCallback(async (data) => {
    const id = uuidv4();
    const now = Date.now();
    await db.customers.add({ id, ...data, createdAt: now, updatedAt: now });
    return id;
  }, []);

  const updateCustomer = useCallback(async (id, data) => {
    await db.customers.update(id, { ...data, updatedAt: Date.now() });
  }, []);

  const deleteCustomer = useCallback(async (id) => {
    await db.transaction('rw', db.customers, db.tickets, db.payments, db.invoices, async () => {
      const tickets = await db.tickets.where('customerId').equals(id).toArray();
      for (const t of tickets) {
        await db.payments.where('ticketId').equals(t.id).delete();
      }
      await db.tickets.where('customerId').equals(id).delete();
      await db.invoices.where('customerId').equals(id).delete();
      await db.customers.delete(id);
    });
  }, []);

  const getCustomer = useCallback(async (id) => {
    return db.customers.get(id);
  }, []);

  return { customers: filtered, allCustomers: customers, loading, addCustomer, updateCustomer, deleteCustomer, getCustomer };
}
