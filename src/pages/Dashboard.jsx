import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { DollarSign, AlertCircle, TrendingUp, Clock, Search } from 'lucide-react';
import { StatCard, Card } from '../components/ui/Card';
import { StatusBadge } from '../components/ui/Badge';
import { fmt, fmtDate } from '../utils/calculations';
import db from '../db/db';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [tickets, payments, customers] = await Promise.all([
        db.tickets.toArray(),
        db.payments.toArray(),
        db.customers.toArray(),
      ]);

      const paymentsByTicket = {};
      for (const p of payments) {
        paymentsByTicket[p.ticketId] = (paymentsByTicket[p.ticketId] || 0) + (p.amount || 0);
      }

      const now = new Date();
      const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();

      const activeTickets = tickets.filter(t => t.status !== 'Cancelled');
      let totalOutstanding = 0, totalRevenue = 0;
      const overdueTickets = [];

      for (const t of activeTickets) {
        const paid = paymentsByTicket[t.id] || 0;
        const balance = (t.amountCharged || 0) - paid;
        totalRevenue += t.amountCharged || 0;
        if (balance > 0) {
          totalOutstanding += balance;
          const days = t.bookingDate ? Math.floor((Date.now() - new Date(t.bookingDate).getTime()) / 86400000) : 0;
          if (days > 30) {
            const cust = customers.find(c => c.id === t.customerId);
            overdueTickets.push({ ...t, balance, days, customerName: cust?.companyName || '?' });
          }
        }
      }

      const paidThisMonth = payments
        .filter(p => new Date(p.date).getTime() >= thisMonthStart)
        .reduce((s, p) => s + (p.amount || 0), 0);

      const recentTickets = [...tickets].sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0)).slice(0, 8).map(t => ({
        ...t,
        customerName: customers.find(c => c.id === t.customerId)?.companyName || '?',
        balance: (t.amountCharged || 0) - (paymentsByTicket[t.id] || 0),
      }));

      setStats({ totalOutstanding, paidThisMonth, totalRevenue, overdueCount: overdueTickets.length, overdueTickets, recentTickets, customerCount: customers.length, ticketCount: tickets.length });
      setLoading(false);
    }
    load();
  }, []);

  useEffect(() => {
    if (!search.trim()) { setSearchResults(null); return; }
    const q = search.toLowerCase();
    async function doSearch() {
      const [customers, tickets] = await Promise.all([db.customers.toArray(), db.tickets.toArray()]);
      const matchCust = customers.filter(c =>
        c.companyName?.toLowerCase().includes(q) || c.contactName?.toLowerCase().includes(q) ||
        c.phone?.includes(q) || c.email?.toLowerCase().includes(q)
      );
      const matchTickets = tickets.filter(t =>
        t.passengerName?.toLowerCase().includes(q) || t.ticketNumber?.toLowerCase().includes(q) ||
        t.airline?.toLowerCase().includes(q)
      );
      setSearchResults({ customers: matchCust.slice(0, 5), tickets: matchTickets.slice(0, 5) });
    }
    const timer = setTimeout(doSearch, 200);
    return () => clearTimeout(timer);
  }, [search]);

  if (loading) return <div className="text-center py-16 text-gray-400">Loading…</div>;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-sm text-gray-500 mt-0.5">{stats.customerCount} customers · {stats.ticketCount} tickets</p>
      </div>

      {/* Global search */}
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search customers, passengers, ticket numbers…"
          className="w-full pl-9 pr-4 py-3 border border-gray-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white shadow-sm"
        />
        {searchResults && search && (
          <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-lg z-10 divide-y divide-gray-100 overflow-hidden">
            {searchResults.customers.map(c => (
              <Link key={c.id} to={`/customers/${c.id}`} onClick={() => setSearch('')}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm">
                <span className="text-gray-400 text-xs uppercase">Customer</span>
                <span className="font-medium text-gray-900">{c.companyName}</span>
                {c.contactName && <span className="text-gray-400">{c.contactName}</span>}
              </Link>
            ))}
            {searchResults.tickets.map(t => (
              <Link key={t.id} to={`/tickets/${t.id}`} onClick={() => setSearch('')}
                className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-sm">
                <span className="text-gray-400 text-xs uppercase">Ticket</span>
                <span className="font-medium text-gray-900">{t.passengerName}</span>
                <span className="text-gray-400">#{t.ticketNumber}</span>
              </Link>
            ))}
            {!searchResults.customers.length && !searchResults.tickets.length && (
              <div className="px-4 py-3 text-sm text-gray-400">No results found</div>
            )}
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatCard label="Outstanding" value={fmt(stats.totalOutstanding)} icon={DollarSign} color="red" />
        <StatCard label="Paid This Month" value={fmt(stats.paidThisMonth)} icon={TrendingUp} color="green" />
        <StatCard label="Total Revenue" value={fmt(stats.totalRevenue)} icon={DollarSign} color="blue" />
        <StatCard label="Overdue (30d+)" value={stats.overdueCount} icon={AlertCircle} color="yellow" sub="tickets past 30 days" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent tickets */}
        <div className="lg:col-span-2">
          <Card>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h2 className="font-semibold text-gray-800">Recent Tickets</h2>
              <Link to="/tickets" className="text-sm text-blue-600 hover:underline">View all</Link>
            </div>
            {stats.recentTickets.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">No tickets yet</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats.recentTickets.map(t => (
                  <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center gap-3 px-5 py-3.5 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-gray-900 truncate">{t.passengerName}</p>
                        <StatusBadge status={t.status} />
                      </div>
                      <p className="text-xs text-gray-400 truncate">{t.customerName} · {fmtDate(t.bookingDate)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-gray-900">{fmt(t.amountCharged)}</p>
                      {t.balance > 0 && <p className="text-xs text-red-500">Owes {fmt(t.balance)}</p>}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Overdue */}
        <div>
          <Card>
            <div className="px-5 py-4 border-b border-gray-100 flex items-center gap-2">
              <AlertCircle size={16} className="text-orange-500" />
              <h2 className="font-semibold text-gray-800">Overdue (30d+)</h2>
            </div>
            {stats.overdueTickets.length === 0 ? (
              <div className="py-10 text-center text-gray-400 text-sm">All caught up!</div>
            ) : (
              <div className="divide-y divide-gray-100">
                {stats.overdueTickets.slice(0, 6).map(t => (
                  <Link key={t.id} to={`/tickets/${t.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-gray-50">
                    <Clock size={14} className="text-orange-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{t.passengerName}</p>
                      <p className="text-xs text-gray-400">{t.customerName} · {t.days}d ago</p>
                    </div>
                    <p className="text-sm font-semibold text-red-600 shrink-0">{fmt(t.balance)}</p>
                  </Link>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
