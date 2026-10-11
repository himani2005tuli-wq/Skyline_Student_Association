import { fundraiserService } from '../services/fundraiser.service.js';

export async function listFundraisers(req, res, next) {
  try {
    const fundraisers = await fundraiserService.listActiveFundraisers();
    res.json({ success: true, data: { fundraisers } });
  } catch (err) {
    next(err);
  }
}

export async function listVolunteerTasks(req, res, next) {
  try {
    const tasks = await fundraiserService.listVolunteerTasks(req.user?.id);
    res.json({ success: true, data: { tasks } });
  } catch (err) {
    next(err);
  }
}

export async function createFundraiser(req, res, next) {
  try {
    const fundraiser = await fundraiserService.createFundraiser(req.body);
    res.status(201).json({ success: true, data: { fundraiser } });
  } catch (err) {
    next(err);
  }
}

export async function createVolunteerTask(req, res, next) {
  try {
    const { fundraiserId } = req.params;
    const task = await fundraiserService.createTask(fundraiserId, req.body);
    res.status(201).json({ success: true, data: { task } });
  } catch (err) {
    next(err);
  }
}

export async function assignTask(req, res, next) {
  try {
    const { taskId } = req.params;
    const targetUserId = req.body.userId || req.user.id;
    const assignment = await fundraiserService.assignTask(taskId, targetUserId);
    res.status(201).json({ success: true, data: { assignment } });
  } catch (err) {
    next(err);
  }
}

export async function listVolunteers(req, res, next) {
  try {
    const volunteers = await fundraiserService.listVolunteers();
    res.json({ success: true, data: { volunteers } });
  } catch (err) {
    next(err);
  }
}

export async function updateTaskStatus(req, res, next) {
  try {
    const { taskId } = req.params;
    const { status } = req.body;
    const assignment = await fundraiserService.updateTaskStatus(taskId, req.user.id, status);
    res.json({ success: true, data: { assignment } });
  } catch (err) {
    next(err);
  }
}
