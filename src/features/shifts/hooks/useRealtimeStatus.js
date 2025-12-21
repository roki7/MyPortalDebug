import { useState, useEffect } from "react";
import {
  calculateCurrentEarnings,
  getDisplayLabel,
  filterShiftsForUser,
} from "../../../logic";

/**
 * Handles realtime earnings calculation and "now" timer management.
 */
export const useRealtimeStatus = (
  fullMergedData,
  currentDate,
  settings,
  isHousehold
) => {
  const [now, setNow] = useState(new Date());
  const [currentRealtimeEarnings, setCurrentRealtimeEarnings] = useState(0);
  const [realtimeLabel, setRealtimeLabel] = useState("");

  useEffect(() => {
    setNow(new Date());
    const interval = setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!fullMergedData) return;

    const targetShifts = isHousehold
      ? fullMergedData.shifts
      : filterShiftsForUser(fullMergedData.shifts, fullMergedData.jobs, "me");

    const val = calculateCurrentEarnings(
      targetShifts,
      fullMergedData.jobs,
      currentDate,
      now,
      settings
    );
    const label = getDisplayLabel(settings);

    setCurrentRealtimeEarnings(val);
    setRealtimeLabel(label);
  }, [fullMergedData, currentDate, now, settings, isHousehold]);

  return {
    now,
    currentRealtimeEarnings,
    realtimeLabel,
  };
};
