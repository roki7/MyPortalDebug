// src/logic.js
// ★修正: isBefore も date-fns からインポートするように追加しました
import { format, parse, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isBefore } from 'date-fns';

export const calculateMonthlyEarnings = (shifts, jobs, currentDate, mode = 'realtime') => {
  const currentMonthStr = format(currentDate, 'yyyy-MM');
  const daysInMonth = eachDayOfInterval({ start: startOfMonth(currentDate), end: endOfMonth(currentDate) });
  
  let fixed = 0;
  let projected = 0;
  let workDays = 0;

  daysInMonth.forEach(day => {
    const dateStr = format(day, 'yyyy-MM-dd');
    const dayShifts = shifts[dateStr] || [];
    
    dayShifts.forEach(shift => {
      const job = jobs.find(j => j.id === shift.jobId);
      if (!job) {
          if (shift.amount) {
              fixed += shift.amount;
              projected += shift.amount;
          }
          return;
      }

      // 固定給・歩合
      if (job.type === 'manual' || job.type === 'monthly') {
          if (job.type === 'manual') {
              fixed += shift.amount || 0;
              projected += shift.amount || 0;
          }
          return; 
      }

      // 時給計算
      if (shift.start && shift.end) {
        const start = parse(shift.start, 'HH:mm', day);
        const end = parse(shift.end, 'HH:mm', day);
        let durationMin = (end - start) / (1000 * 60);
        if (durationMin < 0) durationMin += 24 * 60; // 日跨ぎ対応
        const actualMin = Math.max(0, durationMin - (shift.breakTime || 0));
        const amount = Math.floor((actualMin / 60) * job.value);

        projected += amount;
        
        // 確定額の計算
        if (mode === 'realtime') {
            if (isBefore(day, new Date()) || (isSameDay(day, new Date()) && end < new Date())) {
                fixed += amount;
            }
        } else if (mode === 'completed') {
            if (isBefore(day, new Date())) {
                fixed += amount;
            }
        } else {
            // upfront
            fixed += amount;
        }
      }
      workDays++;
    });
  });
  
  return { fixed, projected, workDays };
};

export const calculateAnnualIncome = (shifts, jobs, currentDate) => {
    let total = 0;
    const year = currentDate.getFullYear();
    Object.keys(shifts).forEach(dateStr => {
        if (dateStr.startsWith(String(year))) {
            shifts[dateStr].forEach(s => {
                total += s.amount || 0;
            });
        }
    });
    return total;
};

// プレースホルダー（必要に応じて実装）
export const getAnnualSummary = () => []; 
export const generateShiftsForYear = () => ({});
export const generateShiftsRange = () => ({});
export const deleteShiftsRange = () => ({});

// 共有データのマージロジック
export const mergeSharedData = (personalData, sharedGroupDocs) => {
  if (!personalData) return { shifts: {} };
  const mergedShifts = { ...(personalData.shifts || {}) };
  
  sharedGroupDocs.forEach(doc => {
    if (doc.uid === personalData.uid) return; 

    if (doc.shifts) {
      Object.keys(doc.shifts).forEach(date => {
        const theirShifts = doc.shifts[date] || [];
        const processedShifts = theirShifts.map(s => ({
            ...s,
            isShared: true, 
            ownerName: doc.userName, 
            color: '#9e9e9e' 
        }));
        
        if (mergedShifts[date]) {
            mergedShifts[date] = [...mergedShifts[date], ...processedShifts];
        } else {
            mergedShifts[date] = processedShifts;
        }
      });
    }
  });

  return { ...personalData, shifts: mergedShifts };
};

// ★修正点: ここにあった isBefore, isSameDay の重複定義を削除しました