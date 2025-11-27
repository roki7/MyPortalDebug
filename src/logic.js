// src/logic.js
import { set, differenceInMinutes, isSameDay, isBefore, endOfMonth, getDaysInMonth, startOfMonth, format, getDay, eachDayOfInterval, startOfYear, endOfYear, isWithinInterval } from 'date-fns';
import JapaneseHolidays from 'japanese-holidays';

// 1. シフト1件の給与計算 (休憩対応・有給対応)
export const calculateShiftWage = (shift, job) => {
  if (!job) return 0;
  if (shift.status === 'absence') return 0; // 欠勤は0円

  // 時給制 (通常 または 有給)
  if (job.type === 'hourly') {
    const start = set(new Date(), { hours: parseInt(shift.start.split(':')[0]), minutes: parseInt(shift.start.split(':')[1]) });
    const end = set(new Date(), { hours: parseInt(shift.end.split(':')[0]), minutes: parseInt(shift.end.split(':')[1]) });
    
    let minutes = differenceInMinutes(end, start);

    // 休憩時間を引く (シフト個別設定 > 仕事のデフォルト設定 > 自動(6時間超で60分))
    let breakTime = 0;
    if (shift.breakTime !== undefined && shift.breakTime !== '') {
        breakTime = parseInt(shift.breakTime);
    } else if (job.defaultBreakTime !== undefined && job.defaultBreakTime !== '') {
        breakTime = parseInt(job.defaultBreakTime);
    } else {
        breakTime = minutes > 360 ? 60 : 0;
    }
    
    minutes -= breakTime;

    return Math.floor(Math.max(0, (minutes / 60) * job.value));
  } 
  
  if (job.type === 'daily') return job.value;
  if (job.type === 'manual') return shift.amount || 0;
  return 0;
};

// 2. 月の給与合計
export const calculateMonthlyEarnings = (shifts, jobs, currentDate, calcMode) => {
  let fixed = 0, projected = 0, workDays = 0;
  const now = new Date();

  // 月給
  jobs.forEach(job => {
    if (job.type === 'monthly') {
      projected += parseInt(job.value);
      if (calcMode === 'upfront') fixed += parseInt(job.value);
      else {
         const daysInMonth = getDaysInMonth(currentDate);
         const dayOfContent = isSameDay(now, endOfMonth(now)) ? daysInMonth : now.getDate();
         if (now.getMonth() > currentDate.getMonth()) fixed += 0; 
         else if (now.getMonth() < currentDate.getMonth()) fixed += parseInt(job.value);
         else fixed += Math.floor(parseInt(job.value) * (dayOfContent / daysInMonth));
      }
    }
  });

  // シフト
  Object.entries(shifts).forEach(([dateStr, dayShifts]) => {
    const shiftDate = new Date(dateStr);
    if (shiftDate.getMonth() !== currentDate.getMonth()) return;

    const hasActiveShift = dayShifts.some(s => s.status !== 'absence');
    if (hasActiveShift) workDays++;

    dayShifts.forEach(shift => {
      const job = jobs.find(j => j.id === shift.jobId);
      if (!job) return;
      
      const wage = calculateShiftWage(shift, job);
      projected += wage; // 有給もここに含まれる

      // 確定額の計算
      if (isBefore(shiftDate, startOfMonth(now))) {
        fixed += wage; 
      } else if (isSameDay(shiftDate, now)) {
        if (shift.status === 'absence') return;
        
        // 有給なら全額確定
        if (shift.status === 'paid_leave') {
            fixed += wage;
            return;
        }

        if (job.type === 'hourly' && calcMode === 'realtime') {
           const start = set(shiftDate, { hours: parseInt(shift.start.split(':')[0]), minutes: parseInt(shift.start.split(':')[1]) });
           const end = set(shiftDate, { hours: parseInt(shift.end.split(':')[0]), minutes: parseInt(shift.end.split(':')[1]) });
           
           if (!isBefore(now, start)) {
             const currentWorkEnd = isBefore(now, end) ? now : end;
             let minutes = differenceInMinutes(currentWorkEnd, start);
             // 簡易的に休憩を按分は難しいので、リアルタイムでは引かないか、一定引くかだが、今回は単純計算
             fixed += Math.floor((minutes / 60) * job.value);
           }
        } else if (calcMode === 'completed') {
          const end = set(shiftDate, { hours: parseInt(shift.end?.split(':')[0] || '0'), minutes: 0 });
          if (isBefore(end, now)) fixed += wage;
        } else {
          fixed += wage; // upfront
        }
      }
    });
  });
  return { fixed: Math.floor(fixed), projected: Math.floor(projected), workDays };
};

// 3. 年収計算
export const calculateAnnualIncome = (shifts, jobs, currentYearDate) => {
  let total = 0;
  const start = startOfYear(currentYearDate);
  const end = endOfYear(currentYearDate);

  jobs.forEach(job => {
    if (job.type === 'monthly') total += (parseInt(job.value) * 12);
  });

  Object.entries(shifts).forEach(([dateStr, dayShifts]) => {
    const date = new Date(dateStr);
    if (isWithinInterval(date, { start, end })) {
      dayShifts.forEach(shift => {
        const job = jobs.find(j => j.id === shift.jobId);
        if (job) total += calculateShiftWage(shift, job);
      });
    }
  });
  return total;
};

// 4. 年間サマリー
export const getAnnualSummary = (shifts, jobs, currentYearDate, calcMode) => {
  const start = startOfYear(currentYearDate);
  const end = endOfYear(currentYearDate);
  const summary = [];

  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), i, 1);
    summary.push({ month: format(d, 'M月'), dateObj: d, income: 0, days: 0 });
  }

  jobs.forEach(job => {
    if (job.type === 'monthly') {
      summary.forEach(m => m.income += parseInt(job.value));
    }
  });

  Object.entries(shifts).forEach(([dateStr, dayShifts]) => {
    const date = new Date(dateStr);
    if (isWithinInterval(date, { start, end })) {
      const monthIndex = date.getMonth();
      if (dayShifts.some(s => s.status !== 'absence')) summary[monthIndex].days += 1;
      dayShifts.forEach(shift => {
        const job = jobs.find(j => j.id === shift.jobId);
        if (job) summary[monthIndex].income += calculateShiftWage(shift, job);
      });
    }
  });
  return summary;
};

// 5. 期間生成
export const generateShiftsRange = (startDate, endDate, targetJob, skipHolidays) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const newShifts = {};
  const days = eachDayOfInterval({ start, end });

  days.forEach(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayOfWeek = getDay(d);
    const isHoliday = JapaneseHolidays.isHoliday(d);

    if (isHoliday && skipHolidays) return;

    if (targetJob.days && targetJob.days.includes(dayOfWeek)) {
      if (!newShifts[dateStr]) newShifts[dateStr] = [];
      newShifts[dateStr].push({
        id: Date.now() + Math.random(),
        jobId: targetJob.id,
        status: 'normal',
        amount: 0,
        start: targetJob.defaultStart || '09:00', 
        end: targetJob.defaultEnd || '17:00',
        breakTime: targetJob.defaultBreakTime || 60 // 休憩もセット
      });
    }
  });
  return newShifts;
};

// 6. 期間削除
export const deleteShiftsRange = (currentShifts, startDate, endDate, targetJobId) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const updatedShifts = { ...currentShifts };
  const days = eachDayOfInterval({ start, end });

  days.forEach(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    if (updatedShifts[dateStr]) {
      // 対象ジョブIDのシフトを除外
      updatedShifts[dateStr] = updatedShifts[dateStr].filter(s => s.jobId !== targetJobId);
      if (updatedShifts[dateStr].length === 0) delete updatedShifts[dateStr];
    }
  });
  return updatedShifts;
};

// 7. 年間生成
export const generateShiftsForYear = (targetYear, jobs) => {
  const start = new Date(targetYear, 0, 1);
  const end = new Date(targetYear, 11, 31);
  const newShifts = {};
  const days = eachDayOfInterval({ start, end });

  days.forEach(d => {
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayOfWeek = getDay(d);
    const isHoliday = JapaneseHolidays.isHoliday(d);

    jobs.forEach(job => {
      if (isHoliday && job.skipHolidays) return;

      if (job.days && job.days.includes(dayOfWeek)) {
        if (!newShifts[dateStr]) newShifts[dateStr] = [];
        newShifts[dateStr].push({
          id: Date.now() + Math.random(),
          jobId: job.id,
          status: 'normal',
          amount: 0,
          start: job.defaultStart || '09:00', 
          end: job.defaultEnd || '17:00',
          breakTime: job.defaultBreakTime || 60
        });
      }
    });
  });
  return newShifts;
};