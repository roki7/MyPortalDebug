// src/logic.js
import { set, differenceInMinutes, isSameDay, isBefore, endOfMonth, getDaysInMonth, startOfMonth, format, getDay, eachDayOfInterval, startOfYear, endOfYear, isWithinInterval, startOfDay, isAfter, subMonths, addDays } from 'date-fns';
import JapaneseHolidays from 'japanese-holidays';

// ヘルパー: 締め日判定
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

// 1. シフト1件の給与計算
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

// 2. 月の給与合計 (★修正: 日数カウントを自分のみ＆重複なしに)
export const calculateMonthlyEarnings = (shifts, jobs, currentDate, calcMode) => {
  let fixed = 0, projected = 0;
  
  // ★修正: 重複しない日付を管理するセット
  const myWorkDaysSet = new Set();
  
  const now = new Date();
  const todayStart = startOfDay(now);

  // 月給
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

  // シフト
  Object.entries(shifts).forEach(([dateStr, dayShifts]) => {
    const shiftDate = new Date(dateStr);
    dayShifts.forEach(shift => {
      let job = jobs.find(j => j.id === shift.jobId);
      if (!job && shift.jobId === 'custom') job = { type: 'manual', cutoffDay: 31, memberId: 'me' }; // 単発は自分扱い
      if (!job) return;

      // 締め日チェック
      if (!isShiftInTargetMonth(shiftDate, currentDate, job.cutoffDay)) return;

      // ★修正: 出勤日数のカウント条件
      // 1. 欠勤ではない
      // 2. 自分の仕事である (memberId === 'me')
      // 3. まだカウントしていない日付である (Setで管理)
      if (shift.status !== 'absence' && job.memberId === 'me') {
          myWorkDaysSet.add(dateStr);
      }

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

  // Setのサイズを日数とする
  return { fixed: Math.floor(fixed), projected: Math.floor(projected), workDays: myWorkDaysSet.size };
};

// 3. 年収計算
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

// 4. 年間サマリー (★修正: 日数カウントを自分のみ＆重複なしに)
export const getAnnualSummary = (shifts, jobs, currentYearDate, calcMode) => {
  const start = startOfYear(currentYearDate);
  const summary = [];
  
  // 月ごとのデータを初期化（Setを追加）
  for (let i = 0; i < 12; i++) {
    const d = new Date(start.getFullYear(), i, 1);
    summary.push({ 
        month: format(d, 'M月'), 
        dateObj: d, 
        income: 0, 
        days: 0, 
        workedDates: new Set() // 日付重複防止用
    });
  }

  jobs.forEach(job => { if (job.type === 'monthly') summary.forEach(m => m.income += parseInt(job.value)); });
  
  Object.entries(shifts).forEach(([dateStr, dayShifts]) => {
    const shiftDate = new Date(dateStr);
    dayShifts.forEach(shift => {
        let job = jobs.find(j => j.id === shift.jobId);
        if (!job && shift.jobId === 'custom') job = { type: 'manual', cutoffDay: 31, memberId: 'me' };
        if (!job) return;
        
        summary.forEach((monthData) => {
            if (isShiftInTargetMonth(shiftDate, monthData.dateObj, job.cutoffDay)) {
                monthData.income += calculateShiftWage(shift, job);
                
                // 自分(me)の出勤日だけSetに追加
                if (shift.status !== 'absence' && job.memberId === 'me') {
                    monthData.workedDates.add(dateStr);
                }
            }
        });
    });
  });

  // 最後にSetのサイズをdaysに入れる
  summary.forEach(m => {
      m.days = m.workedDates.size;
      delete m.workedDates; // 掃除
  });

  return summary;
};

// 5. 期間生成
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

// 6. 期間削除
export const deleteShiftsRange = (currentShifts, startDate, endDate, targetJobId) => {
  const start = new Date(startDate); const end = new Date(endDate); const updatedShifts = { ...currentShifts }; const days = eachDayOfInterval({ start, end });
  days.forEach(d => { const dateStr = format(d, 'yyyy-MM-dd'); if (updatedShifts[dateStr]) { updatedShifts[dateStr] = updatedShifts[dateStr].filter(s => s.jobId !== targetJobId); if (updatedShifts[dateStr].length === 0) delete updatedShifts[dateStr]; } });
  return updatedShifts;
};

// 7. 年間生成
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