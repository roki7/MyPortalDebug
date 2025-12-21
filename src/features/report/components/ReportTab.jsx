import React, { useMemo, useState } from "react";
import {
  Box,
  Paper,
  Typography,
  Divider,
  Switch,
  FormControlLabel,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import { ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip } from "recharts";
import AdSenseBanner from "../../../components/ads/AdSenseBanner";
import { calculateAnnualIncome, getAnnualMonthlyIncome } from "../../../logic";

function filterShiftsByTargetMember(shifts, targetMemberId) {
  if (!shifts || typeof shifts !== "object") return {};
  if (!targetMemberId) return shifts;
  const filtered = {};
  for (const [dateStr, dayShifts] of Object.entries(shifts)) {
    if (!Array.isArray(dayShifts)) {
      filtered[dateStr] = dayShifts;
      continue;
    }
    filtered[dateStr] = dayShifts.filter((s) => {
      if (s?.memberId == null) return true;
      return String(s.memberId) === String(targetMemberId);
    });
  }
  return filtered;
}

export default function ReportTab({
  shifts = {},
  jobs = [],
  settings = {},
  accounts = [],
  totalFixedCost = 0,
  isHousehold = false,
  isPremium = false,
}) {
  const nowYear = new Date().getFullYear();
  const minYear = nowYear - (isPremium ? 7 : 1);

  // 年間収入推移の表示年（ヘッダーとは独立）
  const [reportYear, setReportYear] = useState(nowYear);
  const [yearPickerOpen, setYearPickerOpen] = useState(false);

  // 見込み表示（直近3か月平均）トグル
  const [showForecast, setShowForecast] = useState(true);

  // 年の範囲をクランプ（無料は過去1年、プレミアムは過去7年まで）
  const effectiveYear = Math.max(minYear, Math.min(nowYear, reportYear));

  // 年間収入推移（本人/世帯）
  const monthlyIncomeData = useMemo(() => {
    const y = effectiveYear;
    const raw = getAnnualMonthlyIncome(shifts, jobs, y) || [];
    return raw.map((r) => ({
      ...r,
      income: isHousehold ? (r.householdIncome ?? 0) : (r.personalIncome ?? 0),
    }));
  }, [shifts, jobs, effectiveYear, isHousehold]);

  // 見込み表示：直近3か月平均（年跨ぎ対応）
  const forecastValue = useMemo(() => {
    if (!showForecast) return null;
    // selected yearの「12月」までを対象…ではなく、常に「現在時点の直近3か月平均」を出す方が直感的
    // ただし「年跨ぎで計算されない」問題の対策として、年を跨いでも取得できるようにする
    const ref = new Date();
    const months = [];
    for (let i = 1; i <= 3; i++) {
      const d = new Date(ref.getFullYear(), ref.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = d.getMonth() + 1; // 1-12
      const arr = getAnnualMonthlyIncome(shifts, jobs, y) || [];
      const row = arr.find((x) => Number(x.month) === m);
      months.push(row ? (isHousehold ? (row.householdIncome ?? 0) : (row.personalIncome ?? 0)) : 0);
    }
    const avg = months.reduce((a, b) => a + b, 0) / 3;
    return Math.round(avg);
  }, [showForecast, shifts, jobs, isHousehold]);

  // 扶養範囲チャート：設定の対象メンバーのみ（世帯スイッチとは連動しない）
  const targetMemberId = settings?.targetMemberId ?? "me";
  const targetLimit = Number(settings?.targetLimit ?? 1230000);
  const targetShifts = useMemo(
    () => filterShiftsByTargetMember(shifts, targetMemberId),
    [shifts, targetMemberId]
  );

  const fuyoAnnualIncome = useMemo(() => {
    const res = calculateAnnualIncome(targetShifts, jobs, effectiveYear);
    // calculateAnnualIncome は { personal, household } 形式を返すことが多いので personal を採用
    return Number(res?.personal ?? 0);
  }, [targetShifts, jobs, effectiveYear]);

  const remaining = Math.max(0, targetLimit - fuyoAnnualIncome);
  const percent = targetLimit > 0 ? Math.min(100, (fuyoAnnualIncome / targetLimit) * 100) : 0;

  const yearButtons = useMemo(() => {
    const years = [];
    for (let y = nowYear; y >= minYear; y--) years.push(y);
    return years;
  }, [nowYear, minYear]);

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
      {/* 年間収入推移 */}
      <Paper sx={{ p: 2 }}>
        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 1 }}>
          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Typography variant="h6" fontWeight="bold">
              年間収入推移
            </Typography>

            <Button
              variant="outlined"
              size="small"
              onClick={() => setYearPickerOpen(true)}
              sx={{ borderRadius: 999, px: 1.5 }}
            >
              <Typography variant="h6" fontWeight="bold" sx={{ lineHeight: 1 }}>
                {effectiveYear}年
              </Typography>
            </Button>
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={showForecast}
                onChange={(e) => setShowForecast(e.target.checked)}
                size="small"
              />
            }
            label={<Typography variant="body2">見込み表示</Typography>}
            sx={{ m: 0 }}
          />
        </Box>

        {showForecast && (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            直近3か月平均: ¥{(forecastValue ?? 0).toLocaleString()}
          </Typography>
        )}

        <Divider sx={{ my: 2 }} />

        <Box sx={{ width: "100%", minWidth: 0, height: 320 }}>
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={monthlyIncomeData}>
              <XAxis dataKey="month" />
              <YAxis />
              <Tooltip />
              <Line type="monotone" dataKey="income" dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </Box>
      </Paper>

      {/* スポンサーリンク（枠を分離） */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="caption" color="text.secondary">
          スポンサーリンク
        </Typography>
        <Box sx={{ mt: 1 }}>
          <AdSenseBanner slotId="1234567890" />
        </Box>
      </Paper>

      {/* 扶養範囲 */}
      <Paper sx={{ p: 2 }}>
        <Typography variant="h6" fontWeight="bold">
          扶養範囲チャート
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          対象: {targetMemberId === "me" ? "本人" : "メンバー"} / 上限: ¥{targetLimit.toLocaleString()}
        </Typography>

        <Box sx={{ mt: 2 }}>
          <Typography variant="body2">
            現在: ¥{fuyoAnnualIncome.toLocaleString()}（残り ¥{remaining.toLocaleString()}）
          </Typography>
          <Box
            sx={{
              mt: 1,
              height: 10,
              borderRadius: 999,
              bgcolor: "divider",
              overflow: "hidden",
            }}
          >
            <Box sx={{ height: "100%", width: `${percent}%`, bgcolor: "primary.main" }} />
          </Box>
        </Box>
      </Paper>

      {/* 年選択（直感的: 年ボタン） */}
      <Dialog open={yearPickerOpen} onClose={() => setYearPickerOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>表示する年を選択</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <Box
            sx={{
              display: "grid",
              gridTemplateColumns: "repeat(3, 1fr)",
              gap: 1,
            }}
          >
            {yearButtons.map((y) => (
              <Button
                key={y}
                variant={y === effectiveYear ? "contained" : "outlined"}
                onClick={() => {
                  setReportYear(y);
                  setYearPickerOpen(false);
                }}
              >
                {y}
              </Button>
            ))}
          </Box>

          {!isPremium && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block", mt: 2 }}>
              無料プランは過去1年まで閲覧できます（プレミアムは過去7年）。
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setYearPickerOpen(false)}>閉じる</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
