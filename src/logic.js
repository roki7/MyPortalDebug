import { format, eachDayOfInterval, startOfYear, endOfYear, getDay, addMonths, setDate, isSameMonth, endOfMonth } from 'date-fns';
import { isHoliday } from 'holiday-jp';

// 給与の支払日を計算
const getPayDateForShift = (shiftDate, job, customPayDate) => {
    // 1. 手動設定
    if (customPayDate) return new Date(customPayDate);

    // 2. 仕事設定なし（即日扱い）
    if (!job) return new Date(shiftDate);

    // 3. 仕事設定に基づく計算
    const workDate = new Date(shiftDate);
    const closingDay = job.closingDay || 99; // 99=末日
    const payTiming = job.payTiming || 'next'; 
    const payDay = job.payDay || 25; // 99=末日

    // 締め日判定
    let baseDate = new Date(workDate);
    // 締め日が末日(99)の場合は、常に「その月」が基準。
    // 日付指定(ex:15日)で、かつ働いた日がそれより後なら翌月基準。
    if (closingDay !== 99 && workDate.getDate() > closingDay) {
        baseDate = addMonths(baseDate, 1);
    }

    // 支払月の決定
    let targetDate = new Date(baseDate);
    if (payTiming === 'next') targetDate = addMonths(targetDate, 1);
    else if (payTiming === 'after_next') targetDate = addMonths(targetDate, 2);

    // 支払日の設定
    if (payDay === 99) {
        // 末日払いの場合
        targetDate = endOfMonth(targetDate);
    } else {
        // 日付指定の場合（存在しない日付の自動繰越はDateオブジェクトがやるが、念のため）
        targetDate.setDate(payDay);
    }

    return targetDate;
};

// 給与計算 (振り込み日ベース ＆ 出勤日数は自分のみ)
export const calculateMonthlyEarnings = (shifts, jobs, currentDate) => {
  let fixed = 0;
  let projected = 0;
  
  // ★出勤日数は「自分のシフト」かつ「ユニークな日付」でカウント
  const myWorkDates = new Set();

  Object.keys(shifts).forEach(dateStr => {
      const dayShifts = shifts[dateStr];
      dayShifts.forEach(shift => {
          // 欠勤は計算対象外
          if (shift.status === 'absence') return;

          const job = jobs.find(j => String(j.id) === String(shift.jobId));
          
          // ★自分のシフトなら日付を記録（1日1回カウント用）
          // jobがない(手入力)場合や、job.memberIdが'me'の場合
          if (!job || job.memberId === 'me') {
              myWorkDates.add(dateStr);
          }

          // --- 金額計算（こちらは世帯全員分を合算）---
          
          // 支払日を計算
          const payDate = getPayDateForShift(dateStr, job, shift.customPayDate);

          // 支払日が「表示中の月」か？
          if (!isSameMonth(payDate, currentDate)) return;

          let amount = 0;
          if (shift.amount) {
              amount = parseInt(shift.amount);
          } else if (job) {
              if (job.type === 'fixed') {
                  amount = parseInt(job.value);
              } else if (job.type === 'hourly' && shift.start && shift.end) {
                  const s = new Date(`1970-01-01T${shift.start}`);
                  const e = new Date(`1970-01-01T${shift.end}`);
                  const breakTime = shift.breakTime !== undefined ? parseInt(shift.breakTime) : (parseInt(job.breakTime) || 0);
                  
                  let minutes = (e - s) / (1000 * 60) - breakTime;
                  if (minutes < 0) minutes = 0;
                  amount = Math.floor((minutes / 60) * parseInt(job.value));
              }
          }

          if (payDate <= new Date()) fixed += amount;
          projected += amount;
      });
  });

  return { fixed, projected, workDays: myWorkDates.size };
};

// 年収計算
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

// サマリー生成
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

// 期間指定の一括生成
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

// 年間一括生成
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
    // 簡易的な共有マージ処理（必要に応じて実装）
    return { shifts: mergedShifts };
};