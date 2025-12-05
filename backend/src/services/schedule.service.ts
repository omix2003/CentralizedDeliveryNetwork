import { prisma } from '../lib/prisma';

/**
 * Set agent availability for a specific date
 */
export async function setAgentSchedule(
  agentId: string,
  date: Date,
  startTime?: string,
  endTime?: string,
  isAvailable: boolean = true,
  notes?: string
) {
  return await prisma.agentSchedule.upsert({
    where: {
      agentId_date: {
        agentId,
        date,
      },
    },
    update: {
      startTime,
      endTime,
      isAvailable,
      notes,
    },
    create: {
      agentId,
      date,
      startTime,
      endTime,
      isAvailable,
      notes,
    },
  });
}

/**
 * Get agent schedule for a date range
 */
export async function getAgentSchedule(
  agentId: string,
  startDate: Date,
  endDate: Date
) {
  return await prisma.agentSchedule.findMany({
    where: {
      agentId,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: {
      date: 'asc',
    },
  });
}

/**
 * Get agent availability for a specific date
 */
export async function getAgentAvailability(agentId: string, date: Date) {
  return await prisma.agentSchedule.findUnique({
    where: {
      agentId_date: {
        agentId,
        date,
      },
    },
  });
}

/**
 * Check if agent is available at a specific time
 */
export async function isAgentAvailable(
  agentId: string,
  date: Date,
  time?: string
): Promise<boolean> {
  const schedule = await getAgentAvailability(agentId, date);

  if (!schedule || !schedule.isAvailable) {
    return false;
  }

  // If no time specified, just check availability
  if (!time || !schedule.startTime || !schedule.endTime) {
    return schedule.isAvailable;
  }

  // Check if time is within schedule
  const [scheduleStartHour, scheduleStartMin] = schedule.startTime.split(':').map(Number);
  const [scheduleEndHour, scheduleEndMin] = schedule.endTime.split(':').map(Number);
  const [requestHour, requestMin] = time.split(':').map(Number);

  const scheduleStart = scheduleStartHour * 60 + scheduleStartMin;
  const scheduleEnd = scheduleEndHour * 60 + scheduleEndMin;
  const requestTime = requestHour * 60 + requestMin;

  return requestTime >= scheduleStart && requestTime <= scheduleEnd;
}

/**
 * Get agent calendar view (monthly/weekly)
 */
export async function getAgentCalendar(
  agentId: string,
  viewType: 'MONTHLY' | 'WEEKLY',
  startDate: Date
) {
  let endDate: Date;
  
  if (viewType === 'MONTHLY') {
    endDate = new Date(startDate);
    endDate.setMonth(endDate.getMonth() + 1);
  } else {
    endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);
  }

  const schedules = await getAgentSchedule(agentId, startDate, endDate);

  // Get delivery history for the period
  const deliveries = await prisma.order.findMany({
    where: {
      agentId,
      status: 'DELIVERED',
      deliveredAt: {
        gte: startDate,
        lte: endDate,
      },
    },
    select: {
      id: true,
      deliveredAt: true,
      payoutAmount: true,
      status: true,
    },
    orderBy: {
      deliveredAt: 'asc',
    },
  });

  return {
    schedules,
    deliveries,
    period: {
      start: startDate,
      end: endDate,
      type: viewType,
    },
  };
}

export const scheduleService = {
  setAgentSchedule,
  getAgentSchedule,
  getAgentAvailability,
  isAgentAvailable,
  getAgentCalendar,
};



