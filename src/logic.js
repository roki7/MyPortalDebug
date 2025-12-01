// src/logic.js
import { set, differenceInMinutes, isSameDay, isBefore, endOfMonth, getDaysInMonth, startOfMonth, format, getDay, eachDayOfInterval, startOfYear, endOfYear, isWithinInterval, startOfDay, isAfter, subMonths, addDays } from 'date-fns';
import JapaneseHolidays from 'japanese-holidays';

// 締め日判定ヘルパー
const isShiftInTargetMonth = (shiftDate, targetDate, cutoffDay) => {
  if (!cutoffDay || cutoffDay >= 31) {
    return shiftDate.getMonth() === targetDate.getMonth() && shiftDate.getFullYear() === targetDate.getFullYear();
  }
  const currentMonthEndpoint = set(targetDate, { date: cutoffDay });
  const prevMonthEndpoint = set(subMonths(targetDate, 1), { date: cutoffDay });
  const startDate = addDays(prevMonthEndpoint, 1);
  const endDate = currentMonthEndpoint;
  return isWithinInterval(shiftDate, { start: startDate, end: endDate });
};

export const calculateShiftWage = (shift, job) => {
  if (!job) {
     if (shift.jobId === 'custom') return shift.amount || 0;
     return 0;
  }
  if (shift.status === 'absence') return 0; 

  if (job.type === 'hourly') {
    const start = set(new Date(), { hours: parseInt(shift.start.split(':')[0]), minutes: parseInt(shift.start.split(':')[1]) });
    const end = set(new Date(), { hours: parseInt(shift.end.split(':')[0]), minutes: parseInt(shift.end.split(':')[1]) });
    let minutes = differenceInMinutes(end, start);

    let breakTime = 0;
    if (shift.breakTime !== undefined && shift.breakTime !== '') {
        breakTime = parseInt(shift.breakTime);
    } else if (job.defaultBreakTime !== undefined && job.defaultBreakTime !== '') {
        breakTime = parseInt(job.defaultBreakTime);
    } else {
        breakTime = minutes > 360 ? 60 : 0;
    }
    
    minutes = Math.max(0, minutes - breakTime);
    return Math.floor((minutes / 60) * job.value);
  } 
  
  if (job.type === 'daily') return job.value;
  if (job.type === 'manual') return shift.amount || 0;
  return 0;
};

export const calculateMonthlyEarnings = (shifts, jobs, currentDate, calcMode) => {
  let fixed = 0, projected = 0, workDays = 0;
  const now = new Date();
  const todayStart = startOfDay(now);

  jobs.forEach(job => {
    if (job.type === 'monthly') {
      const monthlyWage = parseInt(job.value);
      projected += monthlyWage;
      if (calcMode === 'upfront') {
         fixed += monthlyWage;
      } else {
         if (isBefore(endOfMonth(currentDate), now)) {
             fixed += monthlyWage;
         } else if (isSameDay(startOfMonth(currentDate), startOfMonth(now))) {
             const daysInMonth = getDaysInMonth(currentDate);
             const dayOfContent = now.getDate();
             fixed += Math.floor(monthlyWage * (dayOfContent / daysInMonth));
         }
      }
    }
  });

  Object.entries(shifts).forEach(([dateStr, dayShifts]) => {
    const shiftDate = new Date(dateStr);
    dayShifts.forEach(shift => {
      let job = jobs.find(j => j.id === shift.jobId);
      if (!job && shift.jobId === 'custom') job = { type: 'manual', cutoffDay: 31 };
      if (!job) return;

      // ★ここが重要：締め日を考慮して集計
      if (!isShiftInTargetMonth(shiftDate, currentDate, job.cutoffDay)) return;

      if (shift.status !== 'absence') workDays++;

      const fullWage = calculateShiftWage(shift, job);
      projected += fullWage; 

      if (shift.status === 'absence') return;
      if (shift.status === 'paid_leave') { fixed += fullWage; return; }
      if (isBefore(shiftDate, todayStart)) { fixed += fullWage; return; }

      if (isSameDay(shiftDate, now)) {
        if (calcMode === 'upfront') {
            fixed += fullWage;
        } else if (calcMode === 'completed') {
            const end = set(shiftDate, { hours: parseInt(shift.end?.split(':')[0]||'0'), minutes: parseInt(shift.end?.split(':')[1]||'0') });
            if (isBefore(end, now)) fixed += fullWage;
        } else {
            if (job.type === 'hourly') {
                const start = set(shiftDate, { hours: parseInt(shift.start.split(':')[0]), minutes: parseInt(shift.start.split(':')[1]) });
                const end = set(shiftDate, { hours: parseInt(shift.end.split(':')[0]), minutes: parseInt(shift.end.split(':')[1]) });
                if (isBefore(now, start)) { } 
                else if (isAfter(now, end)) { fixed += fullWage; } 
                else {
                    let minutesWorked = differenceInMinutes(now, start);
                    let totalMinutes = differenceInMinutes(end, start);
                    let progress = totalMinutes > 0 ? minutesWorked / totalMinutes : 0;
                    fixed += Math.floor(fullWage * progress);
                }
            } else {
                 const end = set(shiftDate, { hours: parseInt(shift.end?.split(':')[0]||'17'), minutes: parseInt(shift.end?.split(':')[1]||'0') });
                 if (isBefore(end, now)) fixed += fullWage;
            }
        }
      }
    });
  });
  return { fixed: Math.floor(fixed), projected: Math.floor(projected), workDays };
};

export const calculateAnnualIncome = (shifts, jobs, currentYearDate) => {
  let total = 0;
  const start = startOfYear(currentYearDate);
  const end = endOfYear(currentYearDate);
  jobs.forEach(job => { if (job.type === 'monthly') total += (parseInt(job.value) * 12); });
  Object.entries(shifts).forEach(([dateStr, dayShifts]) => {
    const date = new Date(dateStr);
    if (isWithinInterval(date, { start, end })) {
      dayShifts.forEach(shift => {
        let job = jobs.find(j => j.id === shift.jobId);
        if (!job && shift.jobId === 'custom') job = { type: 'manual' };
        if (job) total += calculateShiftWage(shift, job);
      });
    }
  });
  return total;
};

export const getAnnualSummary = (shifts, jobs, currentYearDate, calcMode) => {
  const start = startOfYear(currentYearDate);
  const summary = [];
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), i, 1);
    summary.push({ month: format(d, 'M月'), dateObj: d, income: 0, days: 0 });
  }
  jobs.forEach(job => { if (job.type === 'monthly') summary.forEach(m => m.income += parseInt(job.value)); });
  
  Object.entries(shifts).forEach(([dateStr, dayShifts]) => {
    const shiftDate = new Date(dateStr);
    dayShifts.forEach(shift => {
        let job = jobs.find(j => j.id === shift.jobId);
        if (!job && shift.jobId === 'custom') job = { type: 'manual', cutoffDay: 31 };
        if (!job) return;
        
        summary.forEach((monthData) => {
            if (isShiftInTargetMonth(shiftDate, monthData.dateObj, job.cutoffDay)) {
                monthData.income += calculateShiftWage(shift, job);
                if (shift.status !== 'absence') monthData.days += 1;
            }
        });
    });
  });
  return summary;
};

export const generateShiftsRange = (startDate, endDate, targetJob, skipHolidays) => {
  const start = new Date(startDate); const end = new Date(endDate); const newShifts = {}; const days = eachDayOfInterval({ start, end });
  days.forEach(d => {
    const dateStr = format(d, 'yyyy-MM-dd'); const dayOfWeek = getDay(d); const isHoliday = JapaneseHolidays.isHoliday(d);
    if (isHoliday && skipHolidays) return;
    if (targetJob.days && targetJob.days.includes(dayOfWeek)) {
      if (!newShifts[dateStr]) newShifts[dateStr] = [];
      newShifts[dateStr].push({ id: Date.now() + Math.random(), jobId: targetJob.id, status: 'normal', amount: 0, start: targetJob.defaultStart || '09:00', end: targetJob.defaultEnd || '17:00', breakTime: targetJob.defaultBreakTime || 60 });
    }
  }); return newShifts;
};

export const deleteShiftsRange = (currentShifts, startDate, endDate, targetJobId) => {
  const start = new Date(startDate); const end = new Date(endDate); const updatedShifts = { ...currentShifts }; const days = eachDayOfInterval({ start, end });
  days.forEach(d => { const dateStr = format(d, 'yyyy-MM-dd'); if (updatedShifts[dateStr]) { updatedShifts[dateStr] = updatedShifts[dateStr].filter(s => s.jobId !== targetJobId); if (updatedShifts[dateStr].length === 0) delete updatedShifts[dateStr]; } });
  return updatedShifts;
};

export const generateShiftsForYear = (targetYear, jobs) => {
  const start = new Date(targetYear, 0, 1); const end = new Date(targetYear, 11, 31); const newShifts = {}; const days = eachDayOfInterval({ start, end });
  days.forEach(d => {
    const dateStr = format(d, 'yyyy-MM-dd'); const dayOfWeek = getDay(d); const isHoliday = JapaneseHolidays.isHoliday(d);
    jobs.forEach(job => {
      if (isHoliday && job.skipHolidays) return;
      if (job.days && job.days.includes(dayOfWeek)) {
        if (!newShifts[dateStr]) newShifts[dateStr] = [];
        newShifts[dateStr].push({ id: Date.now() + Math.random(), jobId: job.id, status: 'normal', amount: 0, start: job.defaultStart || '09:00', end: job.defaultEnd || '17:00', breakTime: job.defaultBreakTime || 60 });
      }
    });
  }); return newShifts;
};