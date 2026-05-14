import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FileText, Trash2, Plus, Download } from 'lucide-react';
import { useInvoices } from '../hooks/useInvoices';
import { useCustomers } from '../hooks/useCustomers';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { fmtDate } from '../utils/calculations';

export default function Invoices() {
  const { invoices, loading, deleteInvoice } = useInvoices();
  const { allCustomers } = useCustomers();
  const [deleteId, setDeleteId] = useState(null);

  const customerMap = Object.fromEntries(allCustomers.map(c => [c.id, c]));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
          <p className="text-sm text-gray-500 mt-0.5">{invoices.length} invoices generated</p>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 text-sm text-blue-700">
        <strong>Tip:</strong> To generate a new invoice, go to a customer's detail page and click <strong>Generate Invoice</strong>. The PDF downloads automatically.
      </div>

      {loading ? (
        <div className="text-center py-16 text-gray-400">Loading…</div>
      ) : invoices.length === 0 ? (
        <Card className="flex flex-col items-center py-16 gap-3 text-center">
          <FileText size={40} className="text-gray-300" />
          <p className="text-gray-500">No invoices yet</p>
          <p className="text-sm text-gray-400">Go to a customer profile to generate your first invoice.</p>
        </Card>
      ) : (
        <Card>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 text-left">
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Invoice #</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Tickets</th>
                <th className="px-5 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {invoices.map(inv => {
                const customer = customerMap[inv.customerId];
                return (
                  <tr key={inv.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-semibold text-gray-900">{inv.invoiceNumber}</td>
                    <td className="px-5 py-3">
                      {customer ? (
                        <Link to={`/customers/${customer.id}`} className="text-blue-600 hover:underline">{customer.companyName}</Link>
                      ) : <span className="text-gray-400">—</span>}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{fmtDate(inv.generatedAt)}</td>
                    <td className="px-5 py-3 text-gray-600">{inv.ticketIds?.length || 0} ticket{inv.ticketIds?.length !== 1 ? 's' : ''}</td>
                    <td className="px-5 py-3">
                      <button onClick={() => setDeleteId(inv.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg">
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

      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Invoice Record" size="sm">
        <p className="text-gray-600 mb-6">Remove this invoice record from history? (The downloaded PDF file is not affected.)</p>
        <div className="flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setDeleteId(null)}>Cancel</Button>
          <Button variant="danger" onClick={async () => { await deleteInvoice(deleteId); setDeleteId(null); }}>Delete</Button>
        </div>
      </Modal>
    </div>
  );
}
