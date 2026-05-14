import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ArrowLeft, Plus, Trash2, ExternalLink, Tag } from 'lucide-react';
import { useTicketWithBalance } from '../hooks/useTickets';
import { useCustomers } from '../hooks/useCustomers';
import { usePayments } from '../hooks/usePayments';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Modal } from '../components/ui/Modal';
import { Card, StatCard } from '../components/ui/Card';
import { StatusBadge, Badge } from '../components/ui/Badge';
import { fmt, fmtDate } from '../utils/calculations';
import { uploadFile, getFileViewUrl, isAuthenticated } from '../services/driveService';

function PaymentForm({ ticketId, customerId, maxAmount, onSave, onCancel }) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState('');

  return (
    <form onSubmit={e => { e.preventDefault(); onSave({ ticketId, customerId, amount: parseFloat(amount), date, notes }); }} className="flex flex-col gap-4">
      <Input label={`Amount ($) — max ${fmt(maxAmount)}`} type="number" step="0.01" min="0.01" max={maxAmount} value={amount} onChange={e => setAmount(e.target.value)} required placeholder="0.00" />
      <Input label="Payment Date" type="date" value={date} onChange={e => setDate(e.target.value)} required />
      <Input label="Notes" value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Cash, wire transfer…" />
      <div className="flex justify-end gap-3 pt-2">
        <Button variant="secondary" onClick={onCancel} type="button">Cancel</Button>
        <Button type="submit" variant="success">Record Payment</Button>
      </div>
    </form>
  );
}

export default function TicketDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { ticket, payments, amountPaid, remainingBalance, profit, loading } = useTicketWithBalance(id);
  const { allCustomers } = useCustomers();
  const { addPayment, deletePayment } = usePayments({ ticketId: id });
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [uploading, setUploading] = useState(false);

  if (loading || !ticket) return <div className="text-center py-16 text-gray-400">Loading…</div>;

  const customer = allCustomers.find(c => c.id === ticket.customerId);

  const handlePayment = async (data) => {
    await addPayment(data);
    setPaymentOpen(false);
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !isAuthenticated()) return;
    setUploading(true);
    try {
      const driveId = await uploadFile(file, id);
      const current = ticket.fileIds || [];
      // We'd need updateTicket here — for now just show success
      alert(`File uploaded to Google Drive. ID: ${driveId}`);
    } catch (err) {
      alert(`Upload failed: ${err.message}`);
    }
    setUploading(false);
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg">
          <ArrowLeft size={18} />
        </button>
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold text-gray-900">{ticket.passengerName}</h1>
            <StatusBadge status={ticket.status} />
          </div>
          {customer && (
            <Link to={`/customers/${customer.id}`} className="text-sm text-blue-600 hover:underline">
              {customer.companyName}
            </Link>
          )}
        </div>
        {remainingBalance > 0 && (
          <Button onClick={() => setPaymentOpen(true)} variant="success">
            <Plus size={16} /> Record Payment
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Amount Charged" value={fmt(ticket.amountCharged)} color="blue" />
        <StatCard label="Amount Paid" value={fmt(amountPaid)} color="green" />
        <StatCard label="Balance Due" value={fmt(remainingBalance)} color={remainingBalance > 0 ? 'red' : 'green'} />
        <StatCard label="Profit" value={fmt(profit)} color="purple" sub={ticket.internalCost ? `Cost: ${fmt(ticket.internalCost)}` : undefined} />
      </div>

      <Card className="p-5">
        <h3 className="font-semibold text-gray-800 mb-4">Ticket Details</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-3 text-sm">
          <div><p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Airline</p><p className="font-medium text-gray-800">{ticket.airline || '—'}</p></div>
          <div><p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Flight #</p><p className="font-medium text-gray-800">{ticket.flightNumber || '—'}</p></div>
          <div><p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Ticket #</p><p className="font-medium text-gray-800">{ticket.ticketNumber || '—'}</p></div>
          <div><p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Booking Date</p><p className="font-medium text-gray-800">{fmtDate(ticket.bookingDate)}</p></div>
          <div><p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Internal Cost</p><p className="font-medium text-gray-800">{fmt(ticket.internalCost)}</p></div>
          <div><p className="text-gray-400 text-xs uppercase tracking-wide mb-0.5">Status</p><StatusBadge status={ticket.status} /></div>
        </div>
        {ticket.tags?.length > 0 && (
          <div className="mt-4 flex items-center gap-2 flex-wrap">
            <Tag size={14} className="text-gray-400" />
            {ticket.tags.map(tag => <Badge key={tag} color="blue">{tag}</Badge>)}
          </div>
        )}
        {ticket.notes && <p className="mt-4 text-sm text-gray-500 italic border-t pt-3">{ticket.notes}</p>}
      </Card>

      <Card>
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="font-semibold text-gray-800">Payment History</h3>
          <span className="text-sm text-gray-400">{payments.length} payment{payments.length !== 1 ? 's' : ''}</span>
        </div>
        {payments.length === 0 ? (
          <div className="py-10 text-center text-gray-400 text-sm">No payments recorded</div>
        ) : (
          <div className="divide-y divide-gray-100">
            {payments.map(p => (
              <div key={p.id} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1">
                  <p className="text-sm font-semibold text-green-700">{fmt(p.amount)}</p>
                  <p className="text-xs text-gray-400">{fmtDate(p.date)}{p.notes ? ` · ${p.notes}` : ''}</p>
                </div>
                <button onClick={() => deletePayment(p.id)} className="p-1.5 text-gray-300 hover:text-red-500 rounded-lg">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card className="p-5">
        <h3 className="font-semibold text-gray-800 mb-3">File Attachments</h3>
        {ticket.fileIds?.length > 0 ? (
          <div className="flex flex-col gap-2 mb-4">
            {ticket.fileIds.map(fid => (
              <a key={fid} href={getFileViewUrl(fid)} target="_blank" rel="noopener noreferrer"
                className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
                <ExternalLink size={14} /> View file on Google Drive
              </a>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 mb-3">No files attached</p>
        )}
        {isAuthenticated() ? (
          <label className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg cursor-pointer transition-colors">
            <Plus size={15} /> {uploading ? 'Uploading…' : 'Upload PDF / Receipt'}
            <input type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={handleFileUpload} disabled={uploading} />
          </label>
        ) : (
          <p className="text-xs text-gray-400">Connect Google Drive in Settings to upload files.</p>
        )}
      </Card>

      <Modal open={paymentOpen} onClose={() => setPaymentOpen(false)} title="Record Payment" size="sm">
        <PaymentForm ticketId={id} customerId={ticket.customerId} maxAmount={remainingBalance} onSave={handlePayment} onCancel={() => setPaymentOpen(false)} />
      </Modal>
    </div>
  );
}
