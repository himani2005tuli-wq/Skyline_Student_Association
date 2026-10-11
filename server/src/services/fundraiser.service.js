import { z } from 'zod';
import prisma from '../config/database.js';
import { NotFoundError } from '../utils/AppError.js';
import logger from '../utils/logger.js';
import socketService from './socket.service.js';

export const FundraiserSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  targetInPaise: z.number().int().min(100),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  clubSlug: z.string().default('campus-tech-society'),
});

class FundraiserService {
  async createFundraiser(data) {
    const parsed = FundraiserSchema.parse(data);
    const club = await prisma.club.findUnique({ where: { slug: parsed.clubSlug } });

    if (!club) throw new NotFoundError('Club not found');

    const fundraiser = await prisma.fundraiser.create({
      data: {
        clubId: club.id,
        title: parsed.title,
        description: parsed.description,
        targetInPaise: parsed.targetInPaise,
        startDate: new Date(parsed.startDate),
        endDate: new Date(parsed.endDate),
      },
    });

    logger.info({ fundraiserId: fundraiser.id }, 'Fundraiser created');
    return fundraiser;
  }

  async listActiveFundraisers(clubSlug = null) {
    const where = { isActive: true };
    if (clubSlug) {
      where.club = { slug: clubSlug };
    }

    return prisma.fundraiser.findMany({
      where,
      include: {
        club: {
          select: { id: true, name: true, slug: true },
        },
        tasks: {
          include: {
            assignments: {
              include: {
                user: { select: { id: true, firstName: true, lastName: true, email: true } },
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
      },
      orderBy: { startDate: 'asc' },
    });
  }

  async listVolunteerTasks(userId = null) {
    let where = {};
    if (userId) {
      where = {
        OR: [
          { assignments: { some: { userId } } },
          { assignments: { none: {} } },
        ],
      };
    }

    const tasks = await prisma.volunteerTask.findMany({
      where,
      include: {
        fundraiser: {
          include: {
            club: {
              select: { id: true, name: true, slug: true },
            },
          },
        },
        assignments: {
          include: {
            user: { select: { id: true, firstName: true, lastName: true, email: true } },
          },
        },
      },
      orderBy: [
        { deadline: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    return tasks.map((task) => {
      let priority = 'Medium';
      let cleanDescription = task.description || '';
      const match = cleanDescription.match(/^\[(High|Medium|Low)\]\s*(.*)/i);
      if (match) {
        priority = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
        cleanDescription = match[2];
      } else if (task.deadline) {
        const diffHours = (new Date(task.deadline).getTime() - Date.now()) / (1000 * 60 * 60);
        if (diffHours < 48) priority = 'High';
        else if (diffHours < 168) priority = 'Medium';
        else priority = 'Low';
      }

      const assignedToMe = userId
        ? task.assignments.some((a) => a.userId === userId)
        : false;

      return {
        id: task.id,
        title: task.title,
        description: cleanDescription,
        deadline: task.deadline,
        due: task.deadline,
        status: task.status,
        priority,
        fundraiserId: task.fundraiserId,
        event: task.fundraiser?.title || 'Campus Event',
        club: task.fundraiser?.club || null,
        clubName: task.fundraiser?.club?.name || 'Skyline Student Association',
        assignedToMe,
        assignments: task.assignments,
      };
    });
  }

  async createTask(fundraiserId, data) {
    let priorityPrefix = '';
    if (data.priority && ['High', 'Medium', 'Low'].includes(data.priority)) {
      priorityPrefix = `[${data.priority}] `;
    }
    const description = `${priorityPrefix}${data.description || ''}`.trim();

    const task = await prisma.volunteerTask.create({
      data: {
        fundraiserId,
        title: data.title,
        description: description || null,
        deadline: data.deadline ? new Date(data.deadline) : null,
        status: data.status || 'TODO',
      },
    });

    if (data.userId || data.assignedTo) {
      await this.assignTask(task.id, data.userId || data.assignedTo);
    }

    return task;
  }

  async assignTask(taskId, userId) {
    const assignment = await prisma.taskAssignment.upsert({
      where: {
        taskId_userId: { taskId, userId },
      },
      update: {},
      create: {
        taskId,
        userId,
      },
    });

    const task = await prisma.volunteerTask.findUnique({
      where: { id: taskId },
      include: { fundraiser: { include: { club: true } } },
    });

    if (task && userId) {
      await prisma.notification
        .create({
          data: {
            userId,
            title: `Task Assigned: ${task.title}`,
            message: `You were assigned to "${task.title}" for ${task.fundraiser?.title || 'Club Project'}.`,
            type: 'TASK',
            link: '/volunteer',
          },
        })
        .catch((e) => logger.warn({ err: e }, 'Failed to create task assignment notification'));

      // Real-time socket notification to the assigned user
      socketService.emitToUser(userId, 'notification:new', {
        title: `Task Assigned: ${task.title}`,
        message: `You were assigned to "${task.title}" for ${task.fundraiser?.title || 'Club Project'}.`,
        type: 'TASK',
        link: '/volunteer',
        createdAt: new Date().toISOString(),
      });
    }

    return assignment;
  }

  async listVolunteers() {
    const volunteers = await prisma.user.findMany({
      where: {
        isActive: true,
        role: { in: ['VOLUNTEER', 'MEMBER'] },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
        clubId: true,
        taskAssignments: {
          select: { id: true, status: true },
        },
      },
      orderBy: [{ role: 'asc' }, { firstName: 'asc' }],
    });

    return volunteers.map((v) => ({
      id: v.id,
      name: `${v.firstName} ${v.lastName}`.trim(),
      email: v.email,
      role: v.role,
      clubId: v.clubId,
      assignedCount: v.taskAssignments?.filter((a) => a.status !== 'COMPLETED').length || 0,
      completedCount: v.taskAssignments?.filter((a) => a.status === 'COMPLETED').length || 0,
    }));
  }

  async updateTaskStatus(taskId, userId, rawStatus) {
    let status = rawStatus;
    if (rawStatus === 'todo') status = 'TODO';
    if (rawStatus === 'doing') status = 'IN_PROGRESS';
    if (rawStatus === 'done') status = 'COMPLETED';

    const task = await prisma.volunteerTask.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundError('Volunteer task not found');
    }

    const updatedTask = await prisma.volunteerTask.update({
      where: { id: taskId },
      data: { status },
      include: {
        fundraiser: {
          include: { club: true },
        },
        assignments: true,
      },
    });

    if (userId) {
      await prisma.taskAssignment.upsert({
        where: {
          taskId_userId: { taskId, userId },
        },
        update: { status },
        create: { taskId, userId, status },
      });

      if (status === 'COMPLETED') {
        await prisma.notification
          .create({
            data: {
              userId,
              title: `Task Completed: ${task.title}`,
              message: `Congratulations! "${task.title}" has been marked complete.`,
              type: 'TASK',
              link: '/volunteer',
            },
          })
          .catch(() => {});
      }
    }

    return updatedTask;
  }
}

export const fundraiserService = new FundraiserService();
