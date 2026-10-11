import prisma from '../../server/src/config/database.js';

export async function cleanDatabase() {
  await prisma.reimbursement.deleteMany();
  await prisma.expense.deleteMany();
  await prisma.financialTransaction.deleteMany();
  await prisma.paymentWebhookEvent.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.ticket.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.taskAssignment.deleteMany();
  await prisma.volunteerTask.deleteMany();
  await prisma.fundraiser.deleteMany();
  await prisma.notificationDelivery.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.loyaltyTransaction.deleteMany();
  await prisma.loyaltyAccount.deleteMany();
  await prisma.mailingListSubscription.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.membershipPlan.deleteMany();
  await prisma.ticketType.deleteMany();
  await prisma.event.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.discountRule.deleteMany();
  await prisma.club.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
}
