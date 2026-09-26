import { logger } from '../config/logger';
import { Operation, OPEN_STATUSES } from '../models/Operation';
import { User } from '../models/User';
import { notify } from './notification.service';
import { ROUTE_SEGMENT, startOfToday } from './operation.service';

const HOUR = 60 * 60_000;

/**
 * Creates a "late" notification for each open operation scheduled before today.
 * Notifies the responsible user plus managers/admins; de-duplicated per operation (24 h).
 */
export async function checkLateOperations(): Promise<number> {
  const late = await Operation.find({ status: { $in: OPEN_STATUSES }, scheduleDate: { $lt: startOfToday() } })
    .select('reference type scheduleDate responsible')
    .lean();
  if (!late.length) return 0;

  const supervisors = (await User.find({ isActive: true, role: { $in: ['manager', 'admin'] } }).select('_id').lean()).map((u) => String(u._id));
  let created = 0;
  for (const op of late) {
    const days = Math.max(1, Math.round((startOfToday().getTime() - new Date(op.scheduleDate).setHours(0, 0, 0, 0)) / 86_400_000));
    created += await notify({
      type: 'late',
      title: `${op.reference} is late`,
      body: `Scheduled ${days} day${days === 1 ? '' : 's'} ago and not yet done.`,
      link: `/operations/${ROUTE_SEGMENT[op.type]}/${String(op._id)}`,
      dedupeKey: `late:${String(op._id)}`,
      userIds: [...new Set([String(op.responsible), ...supervisors])],
    });
  }
  return created;
}

let timer: NodeJS.Timeout | null = null;

export function startJobs() {
  const run = () => checkLateOperations().catch((err) => logger.error({ err }, 'late-operations job failed'));
  setTimeout(run, 15_000).unref();
  timer = setInterval(run, HOUR);
  timer.unref();
}

export function stopJobs() {
  if (timer) clearInterval(timer);
  timer = null;
}
