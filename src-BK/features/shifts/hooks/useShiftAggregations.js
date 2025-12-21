import { useMemo } from "react";
import {
  calculateMonthlyEarnings,
  calculateAnnualIncome,
  getAnnualSummary,
  mergeSharedData,
} from "../../../logic";

/**
 * Aggregations for shifts/jobs including shared merge and annual/monthly summaries.
 */
export const useShiftAggregations = (
  currentUser,
  shifts,
  jobs,
  sharedDocs,
  currentDate,
  settings,
  viewMode,
  isHousehold
) => {
  const fullMergedData = useMemo(() => {
    return mergeSharedData({ uid: currentUser?.uid, shifts, jobs }, sharedDocs);
  }, [currentUser?.uid, shifts, jobs, sharedDocs]);

  const displayShifts = viewMode === "shared" ? fullMergedData.shifts : shifts;
  const displayJobs = viewMode === "shared" ? fullMergedData.jobs : jobs;

  const calculationShifts = fullMergedData.shifts;
  const calculationJobs = fullMergedData.jobs;

  const earnings = useMemo(() => {
    return calculateMonthlyEarnings(
      calculationShifts,
      calculationJobs,
      currentDate,
      settings
    );
  }, [calculationShifts, calculationJobs, currentDate, settings]);

  const annualIncome = useMemo(() => {
    return calculateAnnualIncome(calculationShifts, calculationJobs, currentDate);
  }, [calculationShifts, calculationJobs, currentDate]);

  const annualSummary = useMemo(() => {
    return getAnnualSummary(calculationShifts, calculationJobs, currentDate);
  }, [calculationShifts, calculationJobs, currentDate]);

  const currentAnnualIncome = isHousehold
    ? annualIncome.household
    : annualIncome.personal;

  const currentProjected = isHousehold
    ? earnings.householdProjected
    : earnings.personalProjected;

  return {
    fullMergedData,
    displayShifts,
    displayJobs,
    earnings,
    annualIncome,
    annualSummary,
    uiValues: {
      workDays: earnings.workDays,
      currentAnnualIncome,
      currentProjected,
    },
  };
};
