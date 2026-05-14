import Dexie from 'dexie';

const db = new Dexie('TicketManagerDB');

db.version(1).stores({
  customers: 'id, companyName, contactName, phone, email, updatedAt',
  tickets:   'id, customerId, ticketNumber, passengerName, status, bookingDate, updatedAt',
  payments:  'id, ticketId, customerId, date, createdAt',
  invoices:  'id, customerId, invoiceNumber, generatedAt',
});

db.version(2).stores({
  customers: 'id, companyName, contactName, phone, email, updatedAt',
  tickets:   'id, customerId, ticketNumber, passengerName, status, bookingDate, updatedAt',
  payments:  'id, ticketId, customerId, date, createdAt',
  invoices:  'id, customerId, invoiceNumber, generatedAt',
  settings:  'key',
});

export default db;
