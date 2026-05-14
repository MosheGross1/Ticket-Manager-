import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { CreditCard, Trash2 } from 'lucide-react';
import { usePayments } from '../hooks/usePayments';
import { useCustomers } from '../hooks/useCustomers';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { fmt, fmtDate } from '../utils/calculations';
import db from '../db/db';

export default function Payments() {
  const { payments, loading, deletePayment } = usePayments();
  const { allCustomers } = useCustomers();
  const [ticketMap, setTicketMap] = useState({});
  const [deleteId, setDeleteId] = useState(null);

  useEffect(() => {
    db.tickets.toArray().then(tickets => {
      setTicketMap(Object.fromEntries(tickets.map(t => [t.id, t])));
    });
  }, [payments]);

  const customerMap = Object.fromEntries(allCustomers.map(c => [c.id, c]));
  const totalPaid = payments.reduce((s, p) => s + (p.amount || 0), 0);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Payments</h1>
          <p className="text-sm text-gray-500 mt-0.5">{payments.length} payments · {fmt(totalPaid)} total received</p>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : payments.length === 0 ? (
        <Card className="flex flex-col items-center py-16 gap-3 text-center">
          <CreditCard size={40} className="text-gray-300" />
          <p className="text-gray-500">No payments recorded yet.</p>
          <p className="text-sm text-gray-400">Payments are added from ticket detail pages.</p>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Ticket</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Notes</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-right">Amount</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {payments.map(p => {
                const ticket = ticketMap[p.ticketId];
                const customer = customerMap[p.customerId] || (ticket ? customerMap[ticket.customerId] : null);
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 text-gray-700 whitespace-nowrap">{fmtDate(p.date)}</td>
                    <td className="px-5 py-3">
                      {customer ? (
                        <Link to={`/customers/${customer.id}`} className="text-blue-600 hover:underline">{customer.companyName}</Link>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      {ticket ? (
                        <Link to={`/tickets/${ticket.id}`} className="text-blue-600 hover:underline">{ticket.passengerName}</Link>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-500">{p.notes || '—'}</td>
                    <td className="px-5 py-3 text-right font-semibold text-green-700">{fmt(p.amount)}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => setDeleteId(p.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Payment" size="sm">
        <p className="text-gray-600 mb-6">Delete this payment record? This will increase the ticket's balance. Cannot be undone.</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={async () => { await deletePayment(deleteId); setDeleteId(null); }}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
