import { Member } from '../types';

export interface ServiceRecord {
  id: string;
  branchId: string;
  name: string;
  serviceDate: string;
  serviceTime?: string | null;
  status: 'open' | 'closed';
  notes?: string | null;
  closedAt?: string | null;
}

export interface AttendanceLog {
  id: string;
  serviceId?: string | null;
  memberId?: string | null;
  name: string;
  method: string;
  isFirstTimer: boolean;
  visitorStatus: 'member' | 'first_timer' | 'visitor';
  createdAt: string;
}

export interface ServiceInsightReport {
  service: ServiceRecord;
  presentMembers: Member[];
  absentMembers: Member[];
  firstTimers: AttendanceLog[];
  visitors: AttendanceLog[];
  totalCheckIns: number;
  attendanceRate: number;
  narrative: string;
  consecutiveMissAlerts: {
    member: Member;
    missCount: number;
    recentServiceNames: string[];
  }[];
}

const isActiveMember = (m: Member) => (m.status || 'Active') === 'Active';

export const buildServiceNarrative = (report: Omit<ServiceInsightReport, 'narrative' | 'consecutiveMissAlerts'> & {
  consecutiveMissAlerts: ServiceInsightReport['consecutiveMissAlerts'];
}): string => {
  const parts: string[] = [];
  parts.push(
    `${report.service.name} on ${report.service.serviceDate}: ${report.totalCheckIns} check-ins (${report.presentMembers.length} members, ${report.firstTimers.length} first-timers).`
  );
  parts.push(
    `Member attendance rate: ${report.attendanceRate}%. ${report.absentMembers.length} active members were absent.`
  );
  if (report.consecutiveMissAlerts.length > 0) {
    parts.push(
      `Follow-up needed: ${report.consecutiveMissAlerts.length} member(s) missed ${report.consecutiveMissAlerts[0].missCount}+ consecutive services — notify pastoral care.`
    );
  } else {
    parts.push('No members hit the 3-service consecutive absence threshold after this service.');
  }
  if (report.firstTimers.length > 0) {
    parts.push(`Welcome opportunity: ${report.firstTimers.length} first-timer(s) can be discipled into membership.`);
  }
  return parts.join(' ');
};

/** Active members who checked in to this service */
export const presentMembersForService = (
  members: Member[],
  logs: AttendanceLog[]
): Member[] => {
  const presentIds = new Set(logs.filter((l) => l.memberId).map((l) => l.memberId as string));
  return members.filter((m) => isActiveMember(m) && presentIds.has(m.id));
};

export const absentMembersForService = (
  members: Member[],
  logs: AttendanceLog[]
): Member[] => {
  const presentIds = new Set(logs.filter((l) => l.memberId).map((l) => l.memberId as string));
  return members.filter((m) => isActiveMember(m) && !presentIds.has(m.id));
};

/**
 * For closed services newest-first, find members absent in the last `threshold` services.
 */
export const findConsecutiveAbsences = (
  members: Member[],
  closedServicesNewestFirst: ServiceRecord[],
  logsByServiceId: Record<string, AttendanceLog[]>,
  threshold = 3
): ServiceInsightReport['consecutiveMissAlerts'] => {
  const window = closedServicesNewestFirst.slice(0, threshold);
  if (window.length < threshold) return [];

  const alerts: ServiceInsightReport['consecutiveMissAlerts'] = [];

  for (const member of members.filter(isActiveMember)) {
    let misses = 0;
    for (const svc of window) {
      const logs = logsByServiceId[svc.id] || [];
      const present = logs.some((l) => l.memberId === member.id);
      if (present) break;
      misses += 1;
    }
    if (misses >= threshold) {
      alerts.push({
        member,
        missCount: misses,
        recentServiceNames: window.map((s) => `${s.name} (${s.serviceDate})`),
      });
    }
  }

  return alerts;
};

export const analyzeService = (
  service: ServiceRecord,
  members: Member[],
  serviceLogs: AttendanceLog[],
  closedServicesNewestFirst: ServiceRecord[],
  logsByServiceId: Record<string, AttendanceLog[]>,
  threshold = 3
): ServiceInsightReport => {
  const presentMembers = presentMembersForService(members, serviceLogs);
  const absentMembers = absentMembersForService(members, serviceLogs);
  const activeCount = members.filter(isActiveMember).length || 1;
  const firstTimers = serviceLogs.filter((l) => l.isFirstTimer || l.visitorStatus === 'first_timer');
  const visitors = serviceLogs.filter((l) => l.visitorStatus === 'visitor');
  const consecutiveMissAlerts = findConsecutiveAbsences(
    members,
    closedServicesNewestFirst,
    logsByServiceId,
    threshold
  );

  const base = {
    service,
    presentMembers,
    absentMembers,
    firstTimers,
    visitors,
    totalCheckIns: serviceLogs.length,
    attendanceRate: Math.round((presentMembers.length / activeCount) * 100),
    consecutiveMissAlerts,
  };

  return {
    ...base,
    narrative: buildServiceNarrative(base),
  };
};
