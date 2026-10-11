import { http } from './client';

export const fundraisersApi = {
  async list() {
    const res = await http.get('/fundraisers');
    return res.data?.data?.fundraisers || [];
  },

  async create(payload) {
    const res = await http.post('/fundraisers', payload);
    return res.data?.data?.fundraiser;
  },

  async createTask(fundraiserId, payload) {
    const res = await http.post(`/fundraisers/${fundraiserId}/tasks`, payload);
    return res.data?.data?.task;
  },

  async assignTask(taskId, userId) {
    const res = await http.post(`/fundraisers/tasks/${taskId}/assign`, { userId });
    return res.data?.data?.assignment;
  },

  async listVolunteers() {
    const res = await http.get('/fundraisers/volunteers');
    return res.data?.data?.volunteers || [];
  },

  async updateTaskStatus(taskId, status) {
    const res = await http.patch(`/fundraisers/tasks/${taskId}/status`, { status });
    return res.data?.data?.task;
  },
};

export const tasksApi = {
  async list() {
    try {
      const res = await http.get('/fundraisers/tasks');
      const tasks = res.data?.data?.tasks;
      if (Array.isArray(tasks) && tasks.length > 0) {
        return tasks.map((t) => {
          const assignee = t.assignments?.[0]?.user;
          const assigneeName = assignee ? `${assignee.firstName || ''} ${assignee.lastName || ''}`.trim() || assignee.email : null;

          return {
            id: t.id,
            title: t.title,
            description: t.description || '',
            clubName: t.clubName || t.club?.name || 'Student Association',
            event: t.event || 'Campus Operations',
            fundraiserId: t.fundraiserId,
            due: t.due || t.deadline || new Date(Date.now() + 86400000).toISOString(),
            deadline: t.deadline || t.due,
            priority: t.priority || 'Medium',
            rawStatus: t.status,
            status:
              t.status === 'COMPLETED'
                ? 'done'
                : t.status === 'IN_PROGRESS'
                  ? 'doing'
                  : 'todo',
            assignedToMe: t.assignedToMe,
            assigneeName,
            assigneeEmail: assignee?.email || null,
            assignments: t.assignments || [],
          };
        });
      }
    } catch {
      // Fallback below
    }

    const fundraisers = await fundraisersApi.list();
    return fundraisers.flatMap((f) =>
      (f.tasks || []).map((t) => {
        let priority = 'Medium';
        let desc = t.description || '';
        const match = desc.match(/^\[(High|Medium|Low)\]\s*(.*)/i);
        if (match) {
          priority = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
          desc = match[2];
        }
        return {
          id: t.id,
          title: t.title,
          description: desc,
          clubName: f.club?.name || 'Student Association',
          event: f.title,
          due: t.deadline || new Date(Date.now() + 86400000).toISOString(),
          deadline: t.deadline,
          priority,
          rawStatus: t.status,
          status:
            t.status === 'COMPLETED' ? 'done' : t.status === 'IN_PROGRESS' ? 'doing' : 'todo',
        };
      }),
    );
  },

  async updateStatus(id, status) {
    let raw = status;
    if (status === 'todo') raw = 'TODO';
    if (status === 'doing') raw = 'IN_PROGRESS';
    if (status === 'done') raw = 'COMPLETED';
    const res = await fundraisersApi.updateTaskStatus(id, raw);
    return res;
  },

  async start(id) {
    return this.updateStatus(id, 'IN_PROGRESS');
  },

  async complete(id) {
    return this.updateStatus(id, 'COMPLETED');
  },

  async reopen(id) {
    return this.updateStatus(id, 'IN_PROGRESS');
  },

  async submitExpense({ taskId, amount, note, receiptUrl }) {
    const res = await http.post('/expenses', {
      amountInPaise: Math.round(Number(amount) * 100),
      description: note || `Expense reimbursement for task ${taskId}`,
      receiptUrl: receiptUrl || 'receipt.pdf',
    });
    return res.data?.data?.expense;
  },

  async createTask(fundraiserId, payload) {
    return fundraisersApi.createTask(fundraiserId, payload);
  },

  async assign(taskId, userId) {
    return fundraisersApi.assignTask(taskId, userId);
  },

  async listVolunteers() {
    return fundraisersApi.listVolunteers();
  },

  async getMyExpenses() {
    const res = await http.get('/expenses/me');
    return res.data?.data?.expenses || [];
  },
};

export default fundraisersApi;
