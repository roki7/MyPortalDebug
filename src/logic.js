// src/logic.js
import {
  format,
  eachDayOfInterval,
  startOfYear,
  endOfYear,
  getDay,
  addMonths,
  setDate,
  isSameMonth,
  endOfMonth,
  isAfter,
  isBefore,
  isSameDay,
} from "date-fns";
import { isHoliday } from "holiday-jp";

// -----------------------------------------------------------------------------
// ヘルパー関数
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
  // 固定日数が設定されていればそれを使う
  if (job.fixedWorkingDays) {
    return Math.floor(salary / parseInt(job.fixedWorkingDays));
  }

  // 設定がなければ、その「給与期間」のシフト数を数えて分母にする
  const targetDate = new Date(targetDateStr);
  const closingDay = job.closingDay || 99;

  // 期間の開始・終了を判定
  let startDate, endDate;
  // 締日より前なら、前月の締日翌日〜当月の締日
  if (closingDay !== 99 && targetDate.getDate() <= closingDay) {
    endDate = new Date(
      targetDate.getFullYear(),
      targetDate.getMonth(),
      closingDay
    );
    startDate = new Date(endDate);
    startDate.setMonth(startDate.getMonth() - 1);
    startDate.setDate(startDate.getDate() + 1);
  } else {
    // 締日より後なら、当月の締日翌日〜翌月の締日
    // (または末日締めの場合)
    if (closingDay === 99) {
      startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
      endDate = endOfMonth(targetDate);
    } else {
      startDate = new Date(
        targetDate.getFullYear(),
        targetDate.getMonth(),
        closingDay + 1
      );
      endDate = new Date(startDate);
      endDate.setMonth(endDate.getMonth() + 1);
      endDate.setDate(closingDay);
    }
  }

  // 期間内のこの仕事のシフト数をカウント
  let count = 0;
  Object.keys(allShifts).forEach((d) => {
    const sDate = new Date(d);
    if (
      (isAfter(sDate, startDate) || isSameDay(sDate, startDate)) &&
      (isBefore(sDate, endDate) || isSameDay(sDate, endDate))
    ) {
      // 欠勤(absence)も分母（日数）には含める
      const hasJob = allShifts[d].some(
        (s) => String(s.jobId) === String(job.id)
      );
      if (hasJob) count++;
    }
  });
  if (count === 0) return 0;
  return Math.floor(salary / count);
};

// 2点間の距離(km)を測る関数
const getDistanceKm = (lat1, lon1, lat2, lon2) => {
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
  const EXPIRE_MINUTES = 60; // 1時間（天気予報の更新頻度に合わせる）
  const MOVE_THRESHOLD_KM = 10; // 10km以上移動したら再取得

  // 1. ローカル保存データをロード
  const savedRaw = localStorage.getItem(CACHE_KEY);
  if (savedRaw) {
    const saved = JSON.parse(savedRaw);
    const now = Date.now();
    const diffMinutes = (now - saved.timestamp) / (1000 * 60);

    // 2. 時間チェック
    if (diffMinutes < EXPIRE_MINUTES) {
      // 3. 距離チェック (GPSモードの場合のみ)
      if (userLat && userLon) {
        const dist = getDistanceKm(userLat, userLon, saved.lat, saved.lon);
        if (dist < MOVE_THRESHOLD_KM) {
          console.log("♻️ キャッシュ有効: API節約中");
          return saved.data; // ★Firebaseに繋がず、保存データを返す
        }
      } else {
        // 都道府県モードなら場所移動はないので、時間内なら即キャッシュ使用
        console.log("♻️ キャッシュ有効(エリア固定): API節約中");
        return saved.data;
      }
    }
  }

  // --- ここから下は「データが古い」か「移動した」場合のみ実行 ---

  console.log("🌍 新しい天気を取得します...");

  // Firebaseから取得する関数を実行
  // (引数で渡された、実際にFirestoreを叩く関数)
  const freshData = await fetchFromFirebaseFunc(userLat, userLon);

  if (freshData) {
    // 新しいデータをスマホに保存（次回の節約のため）
    const cachePayload = {
      timestamp: Date.now(),
      lat: userLat,
      lon: userLon,
      data: freshData,
    };
    localStorage.setItem(CACHE_KEY, JSON.stringify(cachePayload));
  }

  return freshData;
};

const calculateShiftAmount = (shift, job, allShifts, dateStr) => {
  // 1. 手動修正モード (Manual Override)
  if (shift.isManualOverride) {
    return parseInt(shift.manualAmount || 0);
  }

  // 2. レガシーな手入力 (amountプロパティ)
  if (shift.amount) return parseInt(shift.amount);

  if (!job) return 0;

  // 3. 仕事設定ごとの計算
  if (job.type === "fixed") {
    return parseInt(job.value);
  } else if (job.type === "hourly" && shift.start && shift.end) {
    const s = new Date(`1970-01-01T${shift.start}`);
    const e = new Date(`1970-01-01T${shift.end}`);
    const breakTime =
      shift.breakTime !== undefined
        ? parseInt(shift.breakTime)
        : parseInt(job.breakTime) || 0;

    let minutes = (e - s) / (1000 * 60) - breakTime;
    if (minutes < 0) minutes = 0;
    return Math.floor((minutes / 60) * parseInt(job.value));
  } else if (job.type === "monthly") {
    // 月給計算: 日割り単価を取得
    if (!allShifts || !dateStr) return 0;

    const dailyRate = calculateDailyRate(dateStr, job, allShifts);

    if (shift.status === "early_leave") {
      const deduction = job.deductionEarlyLeave
        ? parseInt(job.deductionEarlyLeave)
        : 0;
      return dailyRate - deduction;
    }
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

// -----------------------------------------------------------------------------
// エクスポート関数
// -----------------------------------------------------------------------------

export const mergeSharedData = (local, sharedDocs) => {
  let mergedShifts = { ...local.shifts };
  let mergedJobs = [...(local.jobs || [])];
  const seenJobIds = new Set(mergedJobs.map((j) => String(j.id)));

  if (!sharedDocs || !Array.isArray(sharedDocs)) {
    return { shifts: mergedShifts, jobs: mergedJobs };
  }

  sharedDocs.forEach((doc) => {
    if (doc.id === local.uid) return;

    // ★修正: doc.data() が関数の場合に対応
    const rawData = typeof doc.data === "function" ? doc.data() : doc.data;
    const data = rawData?.personal || {};

    const sShifts = data.shifts || {};
    const sJobs = data.jobs || [];

    const partnerId = doc.id;

    // --- 仕事のマージ ---
    sJobs.forEach((job) => {
      if (!seenJobIds.has(String(job.id))) {
        const newJob = { ...job };
        if (newJob.memberId === "me") {
          newJob.memberId = partnerId;
        }
        mergedJobs.push(newJob);
        seenJobIds.add(String(newJob.id));
      }
    });

    // --- シフトのマージ ---
    Object.keys(sShifts).forEach((date) => {
      const current = mergedShifts[date] || [];
      mergedShifts[date] = [...current, ...sShifts[date]];
    });
  });

  return { shifts: mergedShifts, jobs: mergedJobs };
};

// settingsを受け取り、ターゲット月を判定して計算
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

  Object.keys(shifts).forEach((dateStr) => {
    const shiftDate = new Date(dateStr);
    const dayShifts = shifts[dateStr];

    dayShifts.forEach((shift) => {
      if (shift.status === "absence") return;

      const job = jobs.find((j) => String(j.id) === String(shift.jobId));
      // jobが見つからない場合はスキップ
      if (!job) return;

      const isMyShift = !job.memberId || job.memberId === "me";

      if (isSameMonth(shiftDate, currentDate) && isMyShift) {
        myWorkDates.add(dateStr);
      }

      const payDate = getPayDateForShift(dateStr, job, shift.customPayDate);

      // 支給日が「表示中の月（のターゲット年・月）」と一致するか判定
      if (
        payDate.getFullYear() === targetYear &&
        payDate.getMonth() === targetMonth
      ) {
        let amount = calculateShiftAmount(shift, job, shifts, dateStr);

        // 世帯計算には常に加算
        if (payDate <= new Date()) householdFixed += amount;
        householdProjected += amount;

        // 個人計算
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
