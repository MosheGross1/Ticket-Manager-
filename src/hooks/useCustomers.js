import { useState, useEffect, useCallback } from 'react';
import {
  collection, onSnapshot, addDoc, updateDoc, deleteDoc,
  doc, query, orderBy, getDocs, where, writeBatch, serverTimestamp,
} from 'firebase/firestore';
import { db } from '../firebase';

export function useCustomers(searchQuery = '') {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'customers'), orderBy('companyName'));
    const unsub = onSnapshot(q, snap => {
      setCustomers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
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
    const ref = await addDoc(collection(db, 'customers'), {
      ...data, createdAt: Date.now(), updatedAt: Date.now(),
    });
    return ref.id;
  }, []);

  const updateCustomer = useCallback(async (id, data) => {
    await updateDoc(doc(db, 'customers', id), { ...data, updatedAt: Date.now() });
  }, []);

  const deleteCustomer = useCallback(async (id) => {
    const batch = writeBatch(db);
    const ticketsSnap = await getDocs(query(collection(db, 'tickets'), where('customerId', '==', id)));
    for (const t of ticketsSnap.docs) {
      const pmtsSnap = await getDocs(query(collection(db, 'payments'), where('ticketId', '==', t.id)));
      pmtsSnap.docs.forEach(p => batch.delete(p.ref));
      batch.delete(t.ref);
    }
    const invSnap = await getDocs(query(collection(db, 'invoices'), where('customerId', '==', id)));
    invSnap.docs.forEach(inv => batch.delete(inv.ref));
    batch.delete(doc(db, 'customers', id));
    await batch.commit();
  }, []);

  const getCustomer = useCallback(async (id) => {
    const { getDoc } = await import('firebase/firestore');
    const snap = await getDoc(doc(db, 'customers', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  }, []);

  return { customers: filtered, allCustomers: customers, loading, addCustomer, updateCustomer, deleteCustomer, getCustomer };
}
