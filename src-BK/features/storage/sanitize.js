import { subYears, isBefore } from "date-fns";

// undefined対策
export const sanitizeData = (data) => {
  if (data === undefined) return null;
  // Deep Copy to avoid reference issues
  return JSON.parse(JSON.stringify(data ?? {}));
};

// ローカル保存用に軽量化（2年以上前のシフトを削除）
export const cleanDataForLocal = (data) => {
  const clean = sanitizeData(data);
  if (!clean || !clean.shifts) return clean;

  const twoYearsAgo = subYears(new Date(), 2);
  const newShifts = {};

  Object.keys(clean.shifts).forEach((dateStr) => {
    const d = new Date(dateStr);
    // 日付として有効かつ、2年以内なら残す
    if (!isNaN(d.getTime()) && !isBefore(d, twoYearsAgo)) {
      newShifts[dateStr] = clean.shifts[dateStr];
    }
  });

  clean.shifts = newShifts;
  return clean;
};
