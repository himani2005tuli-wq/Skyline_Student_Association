export { http, fetchCsrfToken, formatApiErrorDetail } from './client';
export { authApi } from './auth.api';
export { eventsApi } from './events.api';
export { ticketsApi } from './tickets.api';
export { checkinApi } from './checkin.api';
export { membershipsApi } from './memberships.api';
export { productsApi } from './products.api';
export { ordersApi } from './orders.api';
export { loyaltyApi } from './loyalty.api';
export { communicationApi } from './communication.api';
export { fundraisersApi, tasksApi } from './fundraisers.api';
export { expensesApi } from './expenses.api';
export { ledgerApi } from './ledger.api';
export { paymentsApi } from './payments.api';
export { healthApi } from './health.api';
export { quote, checkoutApi } from './checkout.api';
export { memberApi } from './member.api';
export { financeApi } from './finance.api';
export { adminApi } from './admin.api';
export { systemApi } from './system.api';
export { publicApi } from './public.api';
export { clubsApi } from './clubs.api';

import authApi from './auth.api';
import eventsApi from './events.api';
import ticketsApi from './tickets.api';
import checkinApi from './checkin.api';
import membershipsApi from './memberships.api';
import productsApi from './products.api';
import ordersApi from './orders.api';
import loyaltyApi from './loyalty.api';
import communicationApi from './communication.api';
import fundraisersApi, { tasksApi } from './fundraisers.api';
import expensesApi from './expenses.api';
import ledgerApi from './ledger.api';
import paymentsApi from './payments.api';
import healthApi from './health.api';
import checkoutApi, { quote } from './checkout.api';
import memberApi from './member.api';
import financeApi from './finance.api';
import adminApi from './admin.api';
import systemApi from './system.api';
import publicApi from './public.api';
import clubsApi from './clubs.api';

export default {
  auth: authApi,
  events: eventsApi,
  tickets: ticketsApi,
  checkin: checkinApi,
  memberships: membershipsApi,
  products: productsApi,
  orders: ordersApi,
  loyalty: loyaltyApi,
  communication: communicationApi,
  fundraisers: fundraisersApi,
  tasks: tasksApi,
  expenses: expensesApi,
  ledger: ledgerApi,
  payments: paymentsApi,
  health: healthApi,
  checkout: checkoutApi,
  quote,
  member: memberApi,
  finance: financeApi,
  admin: adminApi,
  system: systemApi,
  public: publicApi,
  clubs: clubsApi,
};

