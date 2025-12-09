// src/logic.js
import { format, eachDayOfInterval, startOfYear, endOfYear, getDay, addMonths, setDate, isSameMonth, endOfMonth } from 'date-fns';
import { isHoliday } from 'holiday-jp';

// 給与の支払日を計算
const getPayDateForShift = (shiftDate, job, customPayDate) => {
    // 1. 手動設定がある場合はそれを優先
    if (customPayDate) return new Date(customPayDate);

    // 2. 仕事設定なし（手入力）の場合
    // ★修正: 未入力なら「シフトの翌月」とする（画面の表記に合わせる）
    if (!job) {
        return addMonths(new Date(shiftDate), 1);
    }

    // 3. 仕事設定に基づく計算
    const workDate = new Date(shiftDate);
    const closingDay = job.closingDay || 99; // 99=末日
    const payTiming = job.payTiming || 'next'; 
    const payDay = job.payDay || 25; // 99=末日

    // 締め日判定
    let baseDate = new Date(workDate);
    if (closingDay !== 99 && workDate.getDate() > closingDay) {
        baseDate = addMonths(baseDate, 1);
    }

    // 支払月の決定
    let targetDate = new Date(baseDate);
    if (payTiming === 'next') targetDate = addMonths(targetDate, 1);
    else if (payTiming === 'after_next') targetDate = addMonths(targetDate, 2);

    // 支払日の設定
    if (payDay === 99) {
        targetDate = endOfMonth(targetDate);
    } else {
        targetDate.setDate(payDay);
    }

    return targetDate;
};

// ★修正版: 給与計算 & 出勤日数計算
export const calculateMonthlyEarnings = (shifts, jobs, currentDate) => {
  // 給与集計用（自分用 / 世帯用）
  let personalFixed = 0;
  let personalProjected = 0;
  let householdFixed = 0;
  let householdProjected = 0;
  
  // 出勤日数カウント用（自分のみ、シフト日ベース）
  const myWorkDates = new Set();

  Object.keys(shifts).forEach(dateStr => {
      const shiftDate = new Date(dateStr);
      const dayShifts = shifts[dateStr];
      
      dayShifts.forEach(shift => {
          // 欠勤はすべて無視
          if (shift.status === 'absence') return;

          const job = jobs.find(j => String(j.id) === String(shift.jobId));
          // 「自分のシフト」判定: 手入力(jobなし) or memberIdがない or memberIdが'me'
          const isMyShift = !job || !job.memberId || job.memberId === 'me';

          // --- 1. 出勤日数の計算 (シフト日ベース) ---
          // 表示中の月と「働いた日」が同じならカウント
          if (isSameMonth(shiftDate, currentDate) && isMyShift) {
              myWorkDates.add(dateStr);
          }

          // --- 2. 給与の計算 (振込日ベース) ---
          // ★ここで「振込日」を計算します。
          // 手入力(jobなし)の場合は、上で修正した通り「翌月」が返ってきます。
          // 通常の仕事(jobあり)の場合は、設定に基づいて（例:翌月25日）が返ってきます。
          const payDate = getPayDateForShift(dateStr, job, shift.customPayDate);

          // 表示中の月と「給料日」が同じなら金額計算
          // ※ここが「振込ベース」の肝です。12月稼働でも1月振込なら、1月の画面に表示されます。
          if (isSameMonth(payDate, currentDate)) {
              let amount = 0;
              
              if (shift.amount) {
                  // 手入力金額
                  amount = parseInt(shift.amount);
              } else if (job) {
                  // 仕事設定から計算
                  if (job.type === 'fixed') {
                      amount = parseInt(job.value);
                  } else if (job.type === 'hourly' && shift.start && shift.end) {
                      const s = new Date(`1970-01-01T${shift.start}`);
                      const e = new Date(`1970-01-01T${shift.end}`);
                      // 休憩時間の取得
                      const breakTime = shift.breakTime !== undefined 
                          ? parseInt(shift.breakTime) 
                          : (parseInt(job.breakTime) || 0);
                      
                      let minutes = (e - s) / (1000 * 60) - breakTime;
                      if (minutes < 0) minutes = 0;
                      amount = Math.floor((minutes / 60) * parseInt(job.value));
                  }
              }

              // 世帯計に加算
              if (payDate <= new Date()) householdFixed += amount;
              householdProjected += amount;

              // 自分計に加算
              if (isMyShift) {
                  if (payDate <= new Date()) personalFixed += amount;
                  personalProjected += amount;
              }
          }
      });
  });

  return { 
      personalFixed, 
      personalProjected, 
      householdFixed, 
      householdProjected, 
      workDays: myWorkDates.size 
  };
};

// ... (以下、他の関数は変更なしですが、一貫性のため再掲します)

export const calculateAnnualIncome = (shifts, jobs, currentDate) => {
    let total = 0;
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);

    Object.keys(shifts).forEach(dateStr => {
        const dayShifts = shifts[dateStr];
        dayShifts.forEach(shift => {
            if (shift.status === 'absence') return;
            const job = jobs.find(j => String(j.id) === String(shift.jobId));
            const payDate = getPayDateForShift(dateStr, job, shift.customPayDate);

            if (payDate >= yearStart && payDate <= yearEnd) {
                let amount = 0;
                if(shift.amount) amount = parseInt(shift.amount);
                else if(job) {
                    if(job.type==='fixed') amount = parseInt(job.value);
                    else if(job.type==='hourly' && shift.start && shift.end) {
                        const s = new Date(`1970-01-01T${shift.start}`);
                        const e = new Date(`1970-01-01T${shift.end}`);
                        const breakTime = shift.breakTime !== undefined ? parseInt(shift.breakTime) : (parseInt(job.breakTime) || 0);
                        let minutes = (e - s) / (1000 * 60) - breakTime;
                        if(minutes > 0) amount = Math.floor((minutes / 60) * parseInt(job.value));
                    }
                }
                total += amount;
            }
        });
    });
    return total;
};

export const getAnnualSummary = (shifts, jobs, currentDate) => {
    const summary = {};
    const yearStart = startOfYear(currentDate);
    const yearEnd = endOfYear(currentDate);

    Object.keys(shifts).forEach(dateStr => {
        shifts[dateStr].forEach(shift => {
            if (shift.status === 'absence') return;
            const job = jobs.find(j => String(j.id) === String(shift.jobId));
            const payDate = getPayDateForShift(dateStr, job, shift.customPayDate);

            if (payDate >= yearStart && payDate <= yearEnd) {
                const name = shift.customName || job?.name || 'その他';
                if(!summary[name]) summary[name] = 0;

                let amount = 0;
                if(shift.amount) amount = parseInt(shift.amount);
                else if(job) {
                    if(job.type==='fixed') amount = parseInt(job.value);
                    else if(job.type==='hourly' && shift.start && shift.end) {
                        const s = new Date(`1970-01-01T${shift.start}`);
                        const e = new Date(`1970-01-01T${shift.end}`);
                        const breakTime = shift.breakTime !== undefined ? parseInt(shift.breakTime) : (parseInt(job.breakTime) || 0);
                        let minutes = (e - s) / (1000 * 60) - breakTime;
                        if(minutes > 0) amount = Math.floor((minutes / 60) * parseInt(job.value));
                    }
                }
                summary[name] += amount;
            }
        });
    });
    return Object.keys(summary).map(name => ({ name, value: summary[name] }));
};

export const generateShiftsRange = (startDate, endDate, job, skipHolidays) => {
  const shifts = {};
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = eachDayOfInterval({ start, end });

  days.forEach(day => {
    if (skipHolidays && isHoliday(day)) return;
    const dayIndex = getDay(day);
    if (job.days && !job.days.includes(dayIndex)) return;

    const dateStr = format(day, 'yyyy-MM-dd');
    shifts[dateStr] = [{
      id: Date.now() + Math.random(),
      jobId: job.id,
      start: job.defaultStart || '09:00',
      end: job.defaultEnd || '17:00',
      breakTime: job.breakTime || 0,
      status: 'normal'
    }];
  });
  return shifts;
};

export const generateShiftsForYear = (year, jobs) => {
    const shifts = {};
    const start = startOfYear(new Date(year, 0, 1));
    const end = endOfYear(new Date(year, 0, 1));
    const days = eachDayOfInterval({ start, end });

    days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        const isHoli = isHoliday(day);
        const dayIndex = getDay(day);

        jobs.forEach(job => {
            if(job.skipHolidays && isHoli) return;
            if(job.days && job.days.includes(dayIndex)) {
                if(!shifts[dateStr]) shifts[dateStr] = [];
                shifts[dateStr].push({
                    id: Date.now() + Math.random(),
                    jobId: job.id,
                    start: job.defaultStart || '09:00',
                    end: job.defaultEnd || '17:00',
                    breakTime: job.breakTime || 0,
                    status: 'normal'
                });
            }
        });
    });
    return shifts;
};

export const deleteShiftsRange = (currentShifts, startDate, endDate, jobId) => {
    const newShifts = { ...currentShifts };
    const start = new Date(startDate);
    const end = new Date(endDate);
    const days = eachDayOfInterval({ start, end });
    days.forEach(day => {
        const dateStr = format(day, 'yyyy-MM-dd');
        if(newShifts[dateStr]) {
            newShifts[dateStr] = newShifts[dateStr].filter(s => String(s.jobId) !== String(jobId));
            if(newShifts[dateStr].length === 0) delete newShifts[dateStr];
        }
    });
    return newShifts;
};

export const mergeSharedData = (local, sharedDocs) => {
    const mergedShifts = { ...local.shifts };
    // 簡易的な共有マージ処理
    return { shifts: mergedShifts };
};