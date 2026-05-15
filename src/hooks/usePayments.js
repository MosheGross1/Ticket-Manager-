import { useState, useEffect, useCallback } from 'react';
import {
  collection, onSnapshot, addDoc, deleteDoc,
  doc, query, where, writeBatch, increment,
} from 'firebase/firestore';
import { db } from '../firebase';

export function usePayments({ ticketId, customerId } = {}) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let q;
    if (ticketId) q = query(collection(db, 'payments'), where('ticketId', '==', ticketId));
    else if (customerId) q = query(collection(db, 'payments'), where('customerId', '==', customerId));
    else q = collection(db, 'payments');

    const unsub = onSnapshot(q, snap => {
      const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      setPayments(rows);
      setLoading(false);
    }, () => setLoading(false));
    return unsub;
  }, [ticketId, customerId]);

  const addPayment = useCallback(async (data) => {
    const batch = writeBatch(db);
    const payRef = doc(collection(db, 'payments'));
    batch.set(payRef, { ...data, createdAt: Date.now() });
    // Keep ticket.amountPaid in sync
    batch.update(doc(db, 'tickets', data.ticketId), {
      amountPaid: increment(data.amount),
      updatedAt: Date.now(),
    });
    await batch.commit();
    return payRef.id;
  }, []);

  const deletePayment = useCallback(async (id, ticketId, amount) => {
    const batch = writeBatch(db);
    batch.delete(doc(db, 'payments', id));
    if (ticketId && amount) {
      batch.update(doc(db, 'tickets', ticketId), {
        amountPaid: increment(-amount),
        updatedAt: Date.now(),
      });
    }
    await batch.commit();
  }, []);

  return { payments, loading, addPayment, deletePayment };
}
