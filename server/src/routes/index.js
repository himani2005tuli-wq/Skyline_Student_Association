import { Router } from 'express';
import healthRoutes from './health.routes.js';
import authRoutes from './auth.routes.js';
import membershipRoutes from './membership.routes.js';
import loyaltyRoutes from './loyalty.routes.js';
import eventRoutes from './event.routes.js';
import ticketRoutes from './ticket.routes.js';
import checkInRoutes from './checkin.routes.js';
import communicationRoutes from './communication.routes.js';
import productRoutes from './product.routes.js';
import orderRoutes from './order.routes.js';
import fundraiserRoutes from './fundraiser.routes.js';
import expenseRoutes from './expense.routes.js';
import paymentRoutes from './payment.routes.js';
import ledgerRoutes from './ledger.routes.js';
import userRoutes from './user.routes.js';
import systemRoutes from './system.routes.js';
import clubRoutes from './club.routes.js';

const router = Router();

// Mount route modules
router.use('/health', healthRoutes);
router.use('/auth', authRoutes);
router.use('/system', systemRoutes);
router.use('/clubs', clubRoutes);
router.use('/users', userRoutes);
router.use('/memberships', membershipRoutes);
router.use('/loyalty', loyaltyRoutes);
router.use('/events', eventRoutes);
router.use('/tickets', ticketRoutes);
router.use('/check-ins', checkInRoutes);
router.use('/communication', communicationRoutes);
router.use('/products', productRoutes);
router.use('/orders', orderRoutes);
router.use('/fundraisers', fundraiserRoutes);
router.use('/expenses', expenseRoutes);
router.use('/payments', paymentRoutes);
router.use('/ledger', ledgerRoutes);

// Future route mounts:
// router.use('/users', userRoutes);
// router.use('/membership-plans', membershipPlanRoutes);
// router.use('/tasks', taskRoutes);
// router.use('/reimbursements', reimbursementRoutes);

export default router;
