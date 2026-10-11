import { checkInService } from '../services/checkin.service.js';

export async function scanTicket(req, res, next) {
  try {
    const code = req.body.code || req.body.qrPayload || req.body.ticketCode;
    const note = req.body.note || '';

    const result = await checkInService.scanTicket(code, req.user.id, note);

    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    next(err);
  }
}

export async function getAttendees(req, res, next) {
  try {
    const { eventId } = req.query;
    const attendees = await checkInService.getAttendees(eventId);
    res.json({
      success: true,
      data: { attendees },
    });
  } catch (err) {
    next(err);
  }
}
