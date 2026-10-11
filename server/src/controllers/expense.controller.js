import { expenseService } from '../services/expense.service.js';

export async function submitExpense(req, res, next) {
  try {
    const expense = await expenseService.submitExpense(req.user.id, req.body);
    res.status(201).json({ success: true, data: { expense } });
  } catch (err) {
    next(err);
  }
}

export async function getMyExpenses(req, res, next) {
  try {
    const expenses = await expenseService.getMyExpenses(req.user.id);
    res.json({ success: true, data: { expenses } });
  } catch (err) {
    next(err);
  }
}

export async function listClubExpenses(req, res, next) {
  try {
    const { clubId, status } = req.query;
    const targetClubId =
      clubId === 'ALL'
        ? null
        : clubId || (req.user?.role === 'SUPER_ADMIN' ? null : req.user?.clubId);
    const expenses = await expenseService.listClubExpenses({ clubId: targetClubId, status });
    res.json({ success: true, data: { expenses } });
  } catch (err) {
    next(err);
  }
}

export async function reviewExpense(req, res, next) {
  try {
    const { id } = req.params;
    const { status, note, notes, rejectionReason } = req.body;
    const finalNote = note || notes || rejectionReason || '';
    const expense = await expenseService.reviewExpense(id, req.user.id, status, finalNote);
    res.json({ success: true, data: { expense } });
  } catch (err) {
    next(err);
  }
}

export async function markExpenseAsPaid(req, res, next) {
  try {
    const { id } = req.params;
    const result = await expenseService.markAsPaid(id, req.user.id);
    res.json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}
