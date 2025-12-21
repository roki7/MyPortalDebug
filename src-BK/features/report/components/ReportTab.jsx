import React, { useMemo, useState } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  useTheme,
  Switch,
  FormControlLabel,
  Stack,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from "@mui/material";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from "recharts";
import AdSenseBanner from "../../../components/AdSenseBanner";
export default function ReportTab({
  // 扶養（制限）チャート
  fuyoAnnualIncome = 0,
  fuyoTargetLimit = 1230000,

  // 年間収入推移
  reportYear = new Date().getFullYear(),
  onChangeReportYear = () => {},
  isHousehold = false,
  monthlyIncomeData = [],
  prevYearMonthlyIncomeData = [],

  // その他
  accounts = [],
  totalFixedCost = 0,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [showForecast, setShowForecast] = useState(false);
  const [yearDialogOpen, setYearDialogOpen] = useState(false);
  const [tempYear, setTempYear] = useState(reportYear);

  const thisYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth(); // 0-11

  const yearOptions = useMemo(() => {
    const base = thisYear;
    // 直近±5年
    return Array.from({ length: 11 }, (_, i) => base - 5 + i);
  }, [thisYear]);

  // 年間収入推移用のデータ（必要なら見込みを追加）
  const chartData = useMemo(() => {
    const src = Array.isArray(monthlyIncomeData) ? monthlyIncomeData : [];
    const prev = Array.isArray(prevYearMonthlyIncomeData)
      ? prevYearMonthlyIncomeData
      : [];

    const data = src.map((d, idx) => ({
      month: d.month ?? `${idx + 1}月`,
      income: Number(d.income) || 0,
      forecast: null,
    }));

    // 見込み表示は「現在年」を見ている時だけ有効
    if (!showForecast || reportYear !== thisYear) return data;

    // 直近3ヶ月平均（年跨ぎ対応）
    const combined = [...prev, ...src].map((d) => Number(d?.income) || 0);
    const end = 12 + currentMonth; // combined index
    const last3 = [];
    for (let k = 1; k <= 3; k++) {
      const v = combined[end - k];
      if (typeof v === "number" && !Number.isNaN(v)) last3.push(v);
    }
    const avg = last3.length
      ? last3.reduce((a, b) => a + b, 0) / last3.length
      : 0;

    // 現在月より後ろを見込み（月収=avg）として表示
    for (let m = currentMonth + 1; m < data.length; m++) {
      data[m].forecast = avg;
    }
    return data;
  }, [
    monthlyIncomeData,
    prevYearMonthlyIncomeData,
    showForecast,
    reportYear,
    thisYear,
    currentMonth,
  ]);

  const fuyoProgress = useMemo(() => {
    const limit = Number(fuyoTargetLimit) || 0;
    const income = Number(fuyoAnnualIncome) || 0;
    if (limit <= 0) return 0;
    return Math.min(100, Math.max(0, (income / limit) * 100));
  }, [fuyoTargetLimit, fuyoAnnualIncome]);

  return (
    <Box>
      <Grid container spacing={2}>
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Typography variant="h6" fontWeight="bold">
                扶養範囲チャート
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                ※
                世帯合算スイッチとは独立して、設定で選んだ「扶養対象メンバー」の給料だけで計算します
              </Typography>

              <Box sx={{ mt: 2 }}>
                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="baseline"
                >
                  <Typography variant="body2">年収（対象）</Typography>
                  <Typography variant="h6" fontWeight="bold">
                    ¥{Number(fuyoAnnualIncome || 0).toLocaleString()}
                  </Typography>
                </Stack>

                <Stack
                  direction="row"
                  justifyContent="space-between"
                  alignItems="baseline"
                  sx={{ mt: 0.5 }}
                >
                  <Typography variant="body2">扶養上限</Typography>
                  <Typography variant="body2">
                    ¥{Number(fuyoTargetLimit || 0).toLocaleString()}
                  </Typography>
                </Stack>

                <LinearProgress
                  variant="determinate"
                  value={fuyoProgress}
                  sx={{ mt: 1.5, height: 10, borderRadius: 5 }}
                />
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ mt: 0.5, display: "block" }}
                >
                  進捗: {fuyoProgress.toFixed(1)}%
                </Typography>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Stack
                direction="row"
                alignItems="center"
                justifyContent="space-between"
                sx={{ mb: 1 }}
              >
                <Stack direction="row" alignItems="center" spacing={1}>
                  <Typography variant="h6" fontWeight="bold">
                    年間収入推移
                  </Typography>
                  <Button
                    variant="text"
                    size="small"
                    sx={{ minWidth: 0, px: 1 }}
                    onClick={() => {
                      setTempYear(reportYear);
                      setYearDialogOpen(true);
                    }}
                  >
                    {reportYear}年
                  </Button>
                  <Typography variant="caption" color="text.secondary">
                    {isHousehold ? "世帯" : "本人"}
                  </Typography>
                </Stack>

                <FormControlLabel
                  control={
                    <Switch
                      size="small"
                      checked={showForecast}
                      onChange={(e) => setShowForecast(e.target.checked)}
                    />
                  }
                  label="見込み表示"
                />
              </Stack>

              <Divider sx={{ mb: 2 }} />

              <Box sx={{ width: "100%", height: 320, minWidth: 0 }}>
                <ResponsiveContainer>
                  <ComposedChart
                    data={chartData}
                    margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip
                      formatter={(v, name) => [
                        `¥${Number(v || 0).toLocaleString()}`,
                        name === "income" ? "実績" : "見込み",
                      ]}
                    />
                    <Legend />
                    <Bar dataKey="income" name="実績" />
                    <Line
                      type="monotone"
                      dataKey="forecast"
                      name="見込み(月収)"
                      dot={false}
                      strokeWidth={2}
                      connectNulls
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </Box>

              {/* 広告（存在する場合のみ表示される想定） */}
              <Box sx={{ mt: 2 }}>
                <AdSenseBanner slotId="report" />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Dialog
        open={yearDialogOpen}
        onClose={() => setYearDialogOpen(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>表示年を変更</DialogTitle>
        <DialogContent sx={{ pt: 2 }}>
          <FormControl fullWidth>
            <InputLabel>年</InputLabel>
            <Select
              label="年"
              value={tempYear}
              onChange={(e) => setTempYear(Number(e.target.value))}
            >
              {yearOptions.map((y) => (
                <MenuItem key={y} value={y}>
                  {y}年
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <Typography
            variant="caption"
            color="text.secondary"
            sx={{ mt: 1, display: "block" }}
          >
            ※ ヘッダーの年月とは独立して切り替わります
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setYearDialogOpen(false)}>キャンセル</Button>
          <Button
            variant="contained"
            onClick={() => {
              onChangeReportYear(tempYear);
              setYearDialogOpen(false);
            }}
          >
            変更
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
