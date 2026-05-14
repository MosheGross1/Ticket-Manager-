import { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { Card, StatCard } from '../components/ui/Card';
import { fmt, fmtDate, daysBetween } from '../utils/calculations';
import db from '../db/db';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

export default function Reports() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('overview');

  useEffect(() => {
    async function load() {
      const [customers, tickets, payments] = await Promise.all([
        db.customers.toArray(),
        db.tickets.toArray(),
        db.payments.toArray(),
      ]);

      const paymentsByTicket = {};
      for (const p of payments) {
        paymentsByTicket[p.ticketId] = (paymentsByTicket[p.ticketId] || 0) + (p.amount || 0);
      }

      // Customer balances
      const customerSummaries = customers.map(c => {
        const cTickets = tickets.filter(t => t.customerId === c.id && t.status !== 'Cancelled');
        const charged = cTickets.reduce((s, t) => s + (t.amountCharged || 0), 0);
        const paid = cTickets.reduce((s, t) => s + (paymentsByTicket[t.id] || 0), 0);
        return { ...c, charged, paid, owed: charged - paid, ticketCount: cTickets.length };
      }).filter(c => c.charged > 0).sort((a, b) => b.owed - a.owed);

      // Aging report
      const activeTickets = tickets.filter(t => t.status !== 'Cancelled' && t.status !== 'Paid');
      const aging = { current: [], d30: [], d60: [], d90: [] };
      for (const t of activeTickets) {
        const paid = paymentsByTicket[t.id] || 0;
        const bal = (t.amountCharged || 0) - paid;
        if (bal <= 0) continue;
        const days = daysBetween(t.bookingDate);
        const cust = customers.find(c => c.id === t.customerId);
        const entry = { ...t, balance: bal, days, customerName: cust?.companyName || '?' };
        if (days > 90) aging.d90.push(entry);
        else if (days > 60) aging.d60.push(entry);
        else if (days > 30) aging.d30.push(entry);
        else aging.current.push(entry);
      }

      // Monthly revenue (last 6 months)
      const monthly = {};
      for (const p of payments) {
        const month = p.date ? p.date.slice(0, 7) : null;
        if (!month) continue;
        monthly[month] = (monthly[month] || 0) + (p.amount || 0);
      }
      const months = Object.entries(monthly).sort().slice(-6).map(([m, v]) => ({
        month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        revenue: v,
      }));

      // Monthly sales (charged)
      const monthlySales = {};
      for (const t of tickets) {
        const month = t.bookingDate ? t.bookingDate.slice(0, 7) : null;
        if (!month) continue;
        monthlySales[month] = (monthlySales[month] || 0) + (t.amountCharged || 0);
      }
      const salesMonths = Object.entries(monthlySales).sort().slice(-6).map(([m, v]) => ({
        month: new Date(m + '-01').toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        sales: v,
      }));

      // Status breakdown
      const statusCounts = tickets.reduce((acc, t) => {
        acc[t.status] = (acc[t.status] || 0) + 1;
        return acc;
      }, {});
      const statusData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

      // Profit
      const profitTickets = tickets.filter(t => t.status !== 'Cancelled').map(t => ({
        ...t,
        profit: (t.amountCharged || 0) - (t.internalCost || 0),
        customerName: customers.find(c => c.id === t.customerId)?.companyName || '?',
      })).sort((a, b) => b.profit - a.profit);

      const totalRevenue = tickets.filter(t => t.status !== 'Cancelled').reduce((s, t) => s + (t.amountCharged || 0), 0);
      const totalCost = tickets.filter(t => t.status !== 'Cancelled').reduce((s, t) => s + (t.internalCost || 0), 0);
      const totalCollected = payments.reduce((s, p) => s + (p.amount || 0), 0);
      const totalOwed = totalRevenue - totalCollected;

      setData({ customerSummaries, aging, months, salesMonths, statusData, profitTickets, totalRevenue, totalCost, totalCollected, totalOwed });
      setLoading(false);
    }
    load();
  }, []);

  if (loading) return <div className="text-center py-16 text-gray-400">Loading reports…</div>;

  const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'customers', label: 'By Customer' },
    { id: 'aging', label: 'Aging' },
    { id: 'profit', label: 'Profit' },
  ];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-bold text-gray-900">Reports</h1>

      <div className="flex gap-2 border-b border-gray-200">
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${tab === t.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div className="flex flex-col gap-6">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <StatCard label="Total Revenue" value={fmt(data.totalRevenue)} color="blue" />
            <StatCard label="Collected" value={fmt(data.totalCollected)} color="green" />
            <StatCard label="Outstanding" value={fmt(data.totalOwed)} color="red" />
            <StatCard label="Total Profit" value={fmt(data.totalRevenue - data.totalCost)} color="purple" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Monthly Revenue Collected</h3>
              {data.months.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">No payment data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <BarChart data={data.months}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                    <Tooltip formatter={v => fmt(v)} />
                    <Bar dataKey="revenue" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-gray-800 mb-4">Ticket Status Breakdown</h3>
              {data.statusData.length === 0 ? (
                <p className="text-gray-400 text-sm py-8 text-center">No ticket data yet</p>
              ) : (
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={data.statusData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                      {data.statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </Card>
          </div>

          <Card className="p-5">
            <h3 className="font-semibold text-gray-800 mb-4">Monthly Sales (Booked)</h3>
            {data.salesMonths.length === 0 ? (
              <p className="text-gray-400 text-sm py-8 text-center">No booking data yet</p>
            ) : (
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={data.salesMonths}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => fmt(v)} />
                  <Bar dataKey="sales" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </Card>
        </div>
      )}

      {tab === 'customers' && (
        <Card>
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-800">Balance by Customer</h3>
          </div>
          {data.customerSummaries.length === 0 ? (
            <p className="text-center py-10 text-gray-400 text-sm">No data</p>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Tickets</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Charged</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Paid</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Owed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.customerSummaries.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{c.companyName}</td>
                    <td className="px-5 py-3 text-right text-gray-600">{c.ticketCount}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{fmt(c.charged)}</td>
                    <td className="px-5 py-3 text-right text-green-700">{fmt(c.paid)}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${c.owed > 0 ? 'text-red-600' : 'text-green-600'}`}>{fmt(c.owed)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      )}

      {tab === 'aging' && (
        <div className="flex flex-col gap-5">
          {[
            { key: 'd90', label: '90+ Days', color: 'text-red-600 bg-red-50' },
            { key: 'd60', label: '60–90 Days', color: 'text-orange-600 bg-orange-50' },
            { key: 'd30', label: '30–60 Days', color: 'text-yellow-600 bg-yellow-50' },
            { key: 'current', label: '0–30 Days', color: 'text-green-600 bg-green-50' },
          ].map(({ key, label, color }) => (
            data.aging[key].length > 0 && (
              <Card key={key}>
                <div className={`px-5 py-3 border-b border-gray-100 flex items-center justify-between`}>
                  <h3 className="font-semibold text-gray-800">{label}</h3>
                  <span className={`text-sm font-semibold px-3 py-1 rounded-full ${color}`}>
                    {fmt(data.aging[key].reduce((s, t) => s + t.balance, 0))}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 text-left">
                      <th className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase">Passenger</th>
                      <th className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                      <th className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase">Booked</th>
                      <th className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase">Days</th>
                      <th className="px-5 py-2 text-xs font-semibold text-gray-500 uppercase text-right">Balance</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {data.aging[key].map(t => (
                      <tr key={t.id} className="hover:bg-gray-50">
                        <td className="px-5 py-2 font-medium text-gray-900">{t.passengerName}</td>
                        <td className="px-5 py-2 text-gray-600">{t.customerName}</td>
                        <td className="px-5 py-2 text-gray-500">{fmtDate(t.bookingDate)}</td>
                        <td className="px-5 py-2 text-gray-500">{t.days}d</td>
                        <td className="px-5 py-2 text-right font-semibold text-red-600">{fmt(t.balance)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </Card>
            )
          ))}
          {Object.values(data.aging).every(a => a.length === 0) && (
            <Card className="py-16 text-center text-gray-400">No outstanding balances</Card>
          )}
        </div>
      )}

      {tab === 'profit' && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Total Revenue" value={fmt(data.totalRevenue)} color="blue" />
            <StatCard label="Total Cost" value={fmt(data.totalCost)} color="red" />
            <StatCard label="Net Profit" value={fmt(data.totalRevenue - data.totalCost)} color="green"
              sub={`${data.totalCost > 0 ? (((data.totalRevenue - data.totalCost) / data.totalRevenue) * 100).toFixed(1) : 0}% margin`} />
          </div>
          <Card>
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="font-semibold text-gray-800">Profit Per Ticket</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left">
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Passenger</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase">Customer</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Charged</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Cost</th>
                  <th className="px-5 py-3 text-xs font-semibold text-gray-500 uppercase text-right">Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.profitTickets.slice(0, 50).map(t => (
                  <tr key={t.id} className="hover:bg-gray-50">
                    <td className="px-5 py-3 font-medium text-gray-900">{t.passengerName}</td>
                    <td className="px-5 py-3 text-gray-600">{t.customerName}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{fmt(t.amountCharged)}</td>
                    <td className="px-5 py-3 text-right text-gray-500">{fmt(t.internalCost)}</td>
                    <td className={`px-5 py-3 text-right font-semibold ${t.profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmt(t.profit)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
        </div>
      )}
    </div>
  );
}
