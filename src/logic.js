import {
  format,
  eachDayOfInterval,
  startOfYear,
  endOfYear,
  getDay,
  addMonths, // 必須
  setDate,
  isSameMonth,
  endOfMonth,
  startOfMonth,
  isAfter,
  isBefore,
  isSameDay,
} from "date-fns";
import { isHoliday } from "holiday-jp";

// -----------------------------------------------------------------------------
// 割増計算・時間計算用ヘルパー
// -----------------------------------------------------------------------------

const toMin = (hhmm) => {
  if (!hhmm) return 0;
  const [h, m] = String(hhmm)
    .split(":")
    .map((n) => parseInt(n, 10));
  return (h || 0) * 60 + (m || 0);
};

// シフトの労働分数（休憩控除後）
const getWorkMinutes = (shift, job) => {
  if (!shift?.start || !shift?.end) return 0;

  const s = toMin(shift.start);
  let e = toMin(shift.end);
  if (e < s) e += 1440;

  const breakMin =
    shift.breakTime !== undefined && shift.breakTime !== null
      ? parseInt(shift.breakTime) || 0
      : parseInt(job?.breakTime) || 0;

  const raw = e - s - breakMin;
  return Math.max(0, raw);
};

// ある区間[a,b)と[c,d)の重なり（分）
const overlapMin = (a, b, c, d) => {
  const start = Math.max(a, c);
  const end = Math.min(b, d);
  return Math.max(0, end - start);
};

// 深夜(22:00-05:00)の重なり分数を返す
const getNightMinutes = (shift) => {
  if (!shift?.start || !shift?.end) return 0;

  const s = toMin(shift.start);
  let e = toMin(shift.end);
  if (e < s) e += 1440;

  const night1a = 22 * 60;
  const night1b = 24 * 60;
  const night2a = 24 * 60;
  const night2b = 29 * 60; // 翌5:00

  return (
    overlapMin(s, e, night1a, night1b) + overlapMin(s, e, night2a, night2b)
  );
};

// 1日8時間(480分)超過分を分離
const splitRegularOvertime = (workMin, thresholdMin = 480) => {
  const overtimeMin = Math.max(0, workMin - thresholdMin);
  return { overtimeMin };
};

// ★修正: 給与対象期間を安全に取得（締め日ベースの逆算）
const getSalaryPeriodRange = (workBaseDate, job) => {
  const closingDay = job.closingDay || 99;
  const year = workBaseDate.getFullYear();
  const month = workBaseDate.getMonth();

  let startDate, endDate;

  if (closingDay === 99) {
    // 末日締め
    startDate = startOfMonth(workBaseDate);
    endDate = endOfMonth(workBaseDate);
  } else {
    // 指定日締め
    // workBaseDateが「締め日以前」なら前月期間、「締め日以後」なら当月期間
    if (workBaseDate.getDate() <= closingDay) {
      endDate = new Date(year, month, closingDay);
      // 安全な開始日計算: 終了日の1ヶ月前 + 1日
      startDate = new Date(endDate);
      startDate.setMonth(startDate.getMonth() - 1);
      startDate.setDate(startDate.getDate() + 1);
    } else {
      startDate = new Date(year, month, closingDay + 1);
      // 安全な終了日計算: 開始日の1ヶ月後 - 1日
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(closingDay);
    }
  }
  return { startDate, endDate };
};

// -----------------------------------------------------------------------------
// 以下、既存のヘルパーと関数
// -----------------------------------------------------------------------------

const getPayDateForShift = (shiftDate, job, customPayDate) => {
  if (customPayDate) return new Date(customPayDate);
  if (!job) {
    const d = new Date(shiftDate);
    d.setMonth(d.getMonth() + 1);
    d.setDate(25);
    return d;
  }

  const workDate = new Date(shiftDate);
  const closingDay = job.closingDay || 99;
  const payTiming = job.payTiming || "next";
  const payDay = job.payDay || 25;

  let baseDate = new Date(workDate);
  if (closingDay !== 99 && workDate.getDate() > closingDay) {
    baseDate = addMonths(baseDate, 1);
  }

  let targetDate = new Date(baseDate);
  if (payTiming === "next") targetDate = addMonths(targetDate, 1);
  else if (payTiming === "after_next") targetDate = addMonths(targetDate, 2);

  if (payDay === 99) {
    targetDate = endOfMonth(targetDate);
  } else {
    targetDate.setDate(payDay);
  }
  return targetDate;
};

const calculateDailyRate = (targetDateStr, job, allShifts) => {
  if (job.type !== "monthly") return 0;
  const salary = parseInt(job.monthlySalary) || 0;
  if (job.fixedWorkingDays) {
    return Math.floor(salary / parseInt(job.fixedWorkingDays));
  }

  // 期間計算
  const targetDate = new Date(targetDateStr);
  const { startDate, endDate } = getSalaryPeriodRange(targetDate, job);

  // 期間内のシフト数をカウント (欠勤含む)
  let count = 0;
  Object.keys(allShifts).forEach((d) => {
    const sDate = new Date(d);
    if (
      (isAfter(sDate, startDate) || isSameDay(sDate, startDate)) &&
      (isBefore(sDate, endDate) || isSameDay(sDate, endDate))
    ) {
      const hasJob = allShifts[d].some(
        (s) => String(s.jobId) === String(job.id)
      );
      if (hasJob) count++;
    }
  });
  if (count === 0) return 0;
  return Math.floor(salary / count);
};

// (getDistanceKm, getWeatherDataSmart は変更なしのため省略可能ですが、念のため維持)
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
  /* 省略せずに維持 */
  const R = 6371;
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) *
      Math.cos(lat2 * (Math.PI / 180)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

export const getWeatherDataSmart = async (
  userLat,
  userLon,
  fetchFromFirebaseFunc
) => {
  const CACHE_KEY = "smart_weather_cache";
  const EXPIRE_MINUTES = 60;
  const MOVE_THRESHOLD_KM = 10;
  const savedRaw = localStorage.getItem(CACHE_KEY);
  if (savedRaw) {
    const saved = JSON.parse(savedRaw);
    const now = Date.now();
    const diffMinutes = (now - saved.timestamp) / (1000 * 60);
    if (diffMinutes < EXPIRE_MINUTES) {
      if (userLat && userLon) {
        const dist = getDistanceKm(userLat, userLon, saved.lat, saved.lon);
        if (dist < MOVE_THRESHOLD_KM) return saved.data;
      } else {
        return saved.data;
      }
    }
  }
  const freshData = await fetchFromFirebaseFunc(userLat, userLon);
  if (freshData) {
    localStorage.setItem(
      CACHE_KEY,
      JSON.stringify({
        timestamp: Date.now(),
        lat: userLat,
        lon: userLon,
        data: freshData,
      })
    );
  }
  return freshData;
};

export const calculateShiftAmount = (shift, job, allShifts, dateStr) => {
  if (shift.isManualOverride) return parseInt(shift.manualAmount || 0);
  if (shift.amount) return parseInt(shift.amount);
  if (!job) return 0;
  if (shift.status === "absence") return 0;

  if (job.type === "fixed") {
    const base = parseInt(job.value) || 0;
    const workMin = getWorkMinutes(shift, job);
    if (workMin <= 0) return base;
    const { overtimeMin } = splitRegularOvertime(workMin, 480);
    const nightMin = getNightMinutes(shift);
    const overtimePremium = 0.25;
    const nightPremium = 0.25;
    const impliedHourly = base / (workMin / 60);
    const otAddon = impliedHourly * (overtimeMin / 60) * overtimePremium;
    const nightAddon = impliedHourly * (nightMin / 60) * nightPremium;
    return Math.floor(base + otAddon + nightAddon);
  } else if (job.type === "hourly" && shift.start && shift.end) {
    const hourlyRate = parseInt(job.value) || 0;
    const workMin = getWorkMinutes(shift, job);
    const { overtimeMin } = splitRegularOvertime(workMin, 480);
    const nightMin = getNightMinutes(shift);
    const overtimePremium = 0.25;
    const nightPremium = 0.25;
    const base = hourlyRate * (workMin / 60);
    const otAddon = hourlyRate * (overtimeMin / 60) * overtimePremium;
    const nightAddon = hourlyRate * (nightMin / 60) * nightPremium;
    return Math.floor(base + otAddon + nightAddon);
  } else if (job.type === "monthly") {
    if (!allShifts || !dateStr) return 0;
    const dailyRate = calculateDailyRate(dateStr, job, allShifts);
    return dailyRate;
  } else if (job.type === "commission") {
    return parseInt(shift.commissionAmount || 0);
  }
  return 0;
};

const getTargetPayMonth = (currentViewDate, settings) => {
  const viewYear = currentViewDate.getFullYear();
  const viewMonth = currentViewDate.getMonth();
  const base = settings?.transferBase || "next_month";
  let targetYear, targetMonth;
  if (base === "next_month") {
    targetYear = viewMonth === 11 ? viewYear + 1 : viewYear;
    targetMonth = viewMonth === 11 ? 0 : viewMonth + 1;
  } else {
    targetYear = viewYear;
    targetMonth = viewMonth;
  }
  return { targetYear, targetMonth };
};

export const mergeSharedData = (local, sharedDocs) => {
  let mergedShifts = { ...local.shifts };
  let mergedJobs = [...(local.jobs || [])];
  const seenJobIds = new Set(mergedJobs.map((j) => String(j.id)));
  if (!sharedDocs || !Array.isArray(sharedDocs))
    return { shifts: mergedShifts, jobs: mergedJobs };
  sharedDocs.forEach((doc) => {
    if (doc.id === local.uid) return;
    const rawData = typeof doc.data === "function" ? doc.data() : doc.data;
    const data = rawData?.personal || {};
    const sShifts = data.shifts || {};
    const sJobs = data.jobs || [];
    const partnerId = doc.id;
    sJobs.forEach((job) => {
      if (!seenJobIds.has(String(job.id))) {
        const newJob = { ...job };
        if (newJob.memberId === "me") newJob.memberId = partnerId;
        mergedJobs.push(newJob);
        seenJobIds.add(String(newJob.id));
      }
    });
    Object.keys(sShifts).forEach((date) => {
      const current = mergedShifts[date] || [];
      mergedShifts[date] = [...current, ...sShifts[date]];
    });
  });
  return { shifts: mergedShifts, jobs: mergedJobs };
};

// ★修正: calculateMonthlyEarnings (ご提案のロジック反映版)
export const calculateMonthlyEarnings = (
  shifts,
  jobs,
  currentDate,
  settings
) => {
  let personalFixed = 0;
  let personalProjected = 0;
  let householdFixed = 0;
  let householdProjected = 0;
  const myWorkDates = new Set();

  const { targetYear, targetMonth } = getTargetPayMonth(currentDate, settings);
  const processedMonthlyJobIds = new Set();

  // 1. 個別シフトの積み上げ (時給・固定給の割増含む)
  Object.keys(shifts).forEach((dateStr) => {
    const shiftDate = new Date(dateStr);
    const dayShifts = shifts[dateStr];
    dayShifts.forEach((shift) => {
      if (shift.status === "absence") return;
      const job = jobs.find((j) => String(j.id) === String(shift.jobId));
      if (!job) return;
      const isMyShift = !job.memberId || job.memberId === "me";
      if (isSameMonth(shiftDate, currentDate) && isMyShift) {
        myWorkDates.add(dateStr);
      }
      const payDate = getPayDateForShift(dateStr, job, shift.customPayDate);
      if (
        payDate.getFullYear() === targetYear &&
        payDate.getMonth() === targetMonth
      ) {
        let amount = calculateShiftAmount(shift, job, shifts, dateStr);
        if (payDate <= new Date()) householdFixed += amount;
        householdProjected += amount;
        if (isMyShift) {
          if (payDate <= new Date()) personalFixed += amount;
          personalProjected += amount;
        }
        if (job.type === "monthly") {
          processedMonthlyJobIds.add(job.id);
        }
      }
    });
  });

  // 2. 月給制の「みなし残業・深夜割増」一括計算
  processedMonthlyJobIds.forEach((jobId) => {
    const job = jobs.find((j) => String(j.id) === String(jobId));
    if (!job) return;

    const isMyShift = !job.memberId || job.memberId === "me";

    // ✅ 支払月（targetYear/targetMonth）の代表日
    const payMonthDate = new Date(targetYear, targetMonth, 1);

    // ✅ 勤務期間を「支払月」から逆算
    // PayTimingに基づいて「いつ働いた分か」を特定
    let workBase = new Date(payMonthDate);
    const payTiming = job.payTiming || "next";

    // nextなら前月稼働分、after_nextなら前々月稼働分
    if (payTiming === "next") workBase = addMonths(workBase, -1);
    else if (payTiming === "after_next") workBase = addMonths(workBase, -2);
    else if (payTiming === "current") {
      /* 当月払いならそのまま */
    }

    // 給与期間の開始・終了を取得
    const { startDate, endDate } = getSalaryPeriodRange(workBase, job);

    let totalWorkMin = 0;
    let totalNightMin = 0;
    let workDaysCount = 0; // 分母用日数

    // 期間内のシフトを走査
    Object.keys(shifts).forEach((dStr) => {
      const d = new Date(dStr);
      // 日付範囲チェック
      if (isBefore(d, startDate) || isAfter(d, endDate)) return;

      const sList = (shifts[dStr] || []).filter(
        (s) => String(s.jobId) === String(jobId)
      );

      if (sList.length === 0) return;

      // ✅ 分母カウント: その仕事のシフトがあれば「1日」とカウント (欠勤含む)
      workDaysCount += 1;

      // 分子: 欠勤以外の実働時間を加算
      sList.forEach((s) => {
        if (s.status === "absence") return;
        totalWorkMin += getWorkMinutes(s, job);
        totalNightMin += getNightMinutes(s);
      });
    });

    // --- 計算パラメータ ---
    // UIで設定された「1日の所定労働時間」(未設定なら8時間)
    const standardHoursPerDay =
      job.standardHoursPerDay != null ? Number(job.standardHoursPerDay) : 8;

    const fixedOvertimeHours = job.fixedOvertimeHours
      ? parseInt(job.fixedOvertimeHours)
      : 0;

    const fixedWorkingDays = job.fixedWorkingDays
      ? parseInt(job.fixedWorkingDays)
      : 0;

    // 所定労働時間 (分)
    const denominatorDays =
      fixedWorkingDays > 0 ? fixedWorkingDays : workDaysCount;
    const expectedMin = denominatorDays * standardHoursPerDay * 60;

    // 基礎時給単価: 月給 ÷ 所定労働時間
    const monthlySalary = parseInt(job.monthlySalary) || 0;
    const baseHourly = expectedMin > 0 ? monthlySalary / (expectedMin / 60) : 0;

    // A) みなし残業超過分（超過分は1.25倍支給）
    const totalOvertimeMin = Math.max(0, totalWorkMin - expectedMin);
    const payableOvertimeMin = Math.max(
      0,
      totalOvertimeMin - fixedOvertimeHours * 60
    );
    const overtimePay = baseHourly * (payableOvertimeMin / 60) * 1.25;

    // B) 深夜割増（+0.25の上乗せ）
    const nightPay = baseHourly * (totalNightMin / 60) * 0.25;

    const totalExtra = Math.floor(overtimePay + nightPay);

    if (totalExtra > 0) {
      householdProjected += totalExtra;
      if (isMyShift) personalProjected += totalExtra;

      // 期間が終了している(確定済み)ならFixedにも加算 (簡易判定: endDateが今日より前)
      if (endDate < new Date()) {
        householdFixed += totalExtra;
        if (isMyShift) personalFixed += totalExtra;
      }
    }
  });

  return {
    personalFixed,
    personalProjected,
    householdFixed,
    householdProjected,
    workDays: myWorkDates.size,
  };
};

export const calculateAnnualIncome = (shifts, jobs, currentDate) => {
  let personal = 0;
  let household = 0;
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);

  Object.keys(shifts).forEach((dateStr) => {
    shifts[dateStr].forEach((shift) => {
      if (shift.status === "absence") return;
      const job = jobs.find((j) => String(j.id) === String(shift.jobId));
      const isMyShift = !job || !job.memberId || job.memberId === "me";

      const payDate = getPayDateForShift(dateStr, job, shift.customPayDate);

      if (payDate >= yearStart && payDate <= yearEnd) {
        const amount = calculateShiftAmount(shift, job, shifts, dateStr);

        household += amount;
        if (isMyShift) personal += amount;
      }
    });
  });
  return { personal, household };
};

export const getAnnualSummary = (shifts, jobs, currentDate) => {
  const summary = {};
  const yearStart = startOfYear(currentDate);
  const yearEnd = endOfYear(currentDate);

  Object.keys(shifts).forEach((dateStr) => {
    shifts[dateStr].forEach((shift) => {
      if (shift.status === "absence") return;
      const job = jobs.find((j) => String(j.id) === String(shift.jobId));
      const payDate = getPayDateForShift(dateStr, job, shift.customPayDate);

      if (payDate >= yearStart && payDate <= yearEnd) {
        const name = shift.customName || job?.name || "その他";
        if (!summary[name]) summary[name] = 0;
        summary[name] += calculateShiftAmount(shift, job, shifts, dateStr);
      }
    });
  });
  return Object.keys(summary).map((name) => ({ name, value: summary[name] }));
};

export const filterShiftsForUser = (shifts, jobs, memberId = "me") => {
  const newShifts = {};
  Object.keys(shifts).forEach((dateStr) => {
    const filtered = shifts[dateStr].filter((shift) => {
      const job = jobs.find((j) => String(j.id) === String(shift.jobId));
      return !job || !job.memberId || job.memberId === memberId;
    });
    if (filtered.length > 0) newShifts[dateStr] = filtered;
  });
  return newShifts;
};

export const generateShiftsRange = (startDate, endDate, job, skipHolidays) => {
  const shifts = {};
  const start = new Date(startDate);
  const end = new Date(endDate);
  const days = eachDayOfInterval({ start, end });
  days.forEach((day) => {
    if (skipHolidays && isHoliday(day)) return;
    const dayIndex = getDay(day);
    if (job.days && !job.days.includes(dayIndex)) return;
    const dateStr = format(day, "yyyy-MM-dd");
    shifts[dateStr] = [
      {
        id: crypto.randomUUID(),
        jobId: job.id,
        start: job.defaultStart || "09:00",
        end: job.defaultEnd || "17:00",
        breakTime: job.breakTime || 0,
        status: "normal",
      },
    ];
  });
  return shifts;
};

export const generateShiftsForYear = (year, jobs) => {
  const shifts = {};
  const start = startOfYear(new Date(year, 0, 1));
  const end = endOfYear(new Date(year, 0, 1));
  const days = eachDayOfInterval({ start, end });
  days.forEach((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    const isHoli = isHoliday(day);
    const dayIndex = getDay(day);
    jobs.forEach((job) => {
      if (job.skipHolidays && isHoli) return;
      if (job.days && job.days.includes(dayIndex)) {
        if (!shifts[dateStr]) shifts[dateStr] = [];
        shifts[dateStr].push({
          id: crypto.randomUUID(),
          jobId: job.id,
          start: job.defaultStart || "09:00",
          end: job.defaultEnd || "17:00",
          breakTime: job.breakTime || 0,
          status: "normal",
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
  days.forEach((day) => {
    const dateStr = format(day, "yyyy-MM-dd");
    if (newShifts[dateStr]) {
      newShifts[dateStr] = newShifts[dateStr].filter(
        (s) => String(s.jobId) !== String(jobId)
      );
      if (newShifts[dateStr].length === 0) delete newShifts[dateStr];
    }
  });
  return newShifts;
};

export const calculateCurrentEarnings = (
  shifts,
  jobs,
  currentViewDate,
  now,
  settings
) => {
  const timing = settings.calcTiming || "realtime";
  const { targetYear, targetMonth } = getTargetPayMonth(
    currentViewDate,
    settings
  );

  let total = 0;

  Object.keys(shifts).forEach((dateStr) => {
    shifts[dateStr].forEach((shift) => {
      if (shift.status === "absence") return;
      const job = jobs.find((j) => String(j.id) === String(shift.jobId));

      const payDate = getPayDateForShift(dateStr, job, shift.customPayDate);

      if (
        payDate.getFullYear() !== targetYear ||
        payDate.getMonth() !== targetMonth
      )
        return;

      const amount = calculateShiftAmount(shift, job, shifts, dateStr);

      if (!shift.start || !shift.end) {
        const shiftDate = new Date(dateStr);
        const todayStart = new Date(now);
        todayStart.setHours(0, 0, 0, 0);

        if (shiftDate <= todayStart || shiftDate <= now) {
          total += amount;
        }
        return;
      }

      const start = new Date(`${dateStr}T${shift.start}`);
      const end = new Date(`${dateStr}T${shift.end}`);

      switch (timing) {
        case "start_of_day":
          const dayStart = new Date(start);
          dayStart.setHours(0, 0, 0, 0);
          if (now >= dayStart) total += amount;
          break;
        case "end_of_work":
          if (now >= end) total += amount;
          break;
        case "realtime":
          if (now < start) {
          } else if (now >= end) {
            total += amount;
          } else {
            const duration = end.getTime() - start.getTime();
            const elapsed = now.getTime() - start.getTime();
            if (duration > 0)
              total += Math.floor(amount * (elapsed / duration));
          }
          break;
        default:
          total += amount;
      }
    });
  });
  return total;
};

export const getDisplayLabel = (settings) => {
  const base = settings.transferBase || "next_month";
  const baseText = base === "next_month" ? "翌月振込" : "当月振込";
  return `確定 (${baseText})`;
};

export const getAnnualMonthlyIncome = (shifts, jobs, currentDate) => {
  // 1月〜12月の器を作成 (0埋め)
  const monthlyTotals = Array(12).fill(0);

  const targetYear = currentDate.getFullYear();

  // 全シフトを走査して集計
  Object.keys(shifts).forEach((dateStr) => {
    shifts[dateStr].forEach((shift) => {
      if (shift.status === "absence") return;

      const job = jobs.find((j) => String(j.id) === String(shift.jobId));
      // 自分（ユーザー）の仕事のみを対象とする場合
      // const isMyShift = !job.memberId || job.memberId === "me";
      // if (!isMyShift) return; // 必要に応じてコメントアウトを外してください（世帯合算か個人かによる）

      // 振込日(PayDate)を基準に集計する（キャッシュフローベース）
      const payDate = getPayDateForShift(dateStr, job, shift.customPayDate);

      // 表示中の年のデータのみ加算
      if (payDate.getFullYear() === targetYear) {
        // calculateShiftAmount は内部関数ですが、このファイル内なら参照可能と仮定
        // もし参照できない場合は、ロジックをコピーするか、calculateShiftAmountをexportしてください
        // ここでは同じファイル内にある前提で呼び出します
        const amount = calculateShiftAmount(shift, job, shifts, dateStr);
        monthlyTotals[payDate.getMonth()] += amount;
      }
    });
  });

  // グラフ用にデータを整形して返す
  return monthlyTotals.map((amount, index) => ({
    month: `${index + 1}月`,
    income: amount,
  }));
};
