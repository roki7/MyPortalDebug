// src/components/ReportTab.jsx
import React, { useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  useTheme,
  Switch, // ★追加
  FormControlLabel, // ★追加
  Divider, // ★追加
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  ComposedChart, // ★追加: 複合グラフ用
  Bar, // ★追加
  Line, // ★追加
  XAxis, // ★追加
  YAxis, // ★追加
  CartesianGrid, // ★追加
} from "recharts";

const COLORS = [
  "#0088FE",
  "#00C49F",
  "#FFBB28",
  "#FF8042",
  "#AF19FF",
  "#FF4560",
];

export default function ReportTab({
  annualIncome,
  summary,
  targetLimit,
  accounts,
  totalFixedCost,
  monthlyIncomeData = [],
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // ★追加: 個人事業主モード（見込み表示）のオンオフ
  const [showForecast, setShowForecast] = useState(false);

  // ★追加: グラフ用データの計算（見込み線の追加）
  const chartData = useMemo(() => {
    if (!monthlyIncomeData || monthlyIncomeData.length === 0) return [];
    // 元データをコピーして加工
    const data = monthlyIncomeData.map((d) => ({ ...d }));

    // 過去3ヶ月平均の計算 (Forecast)
    // data[i] の見込み = (data[i-1] + data[i-2] + data[i-3]) / 3
    // データがない月はスキップまたは存在する月だけで平均を取る
    for (let i = 0; i < data.length; i++) {
      if (i === 0) {
        data[i].forecast = null; // 1月は見込み計算不可
        continue;
      }

      let sum = 0;
      let count = 0;
      // 過去3ヶ月分を遡る (i-1, i-2, i-3)
      for (let k = 1; k <= 3; k++) {
        if (i - k >= 0) {
          sum += data[i - k].income;
          count++;
        }
      }

      // 平均値を計算（小数点以下切り捨て）
      data[i].forecast = count > 0 ? Math.floor(sum / count) : null;
    }

    return data;
  }, [monthlyIncomeData]);

  // 資産合計
  const totalAssets = accounts.reduce(
    (sum, acc) => sum + (acc.type !== "credit" ? acc.balance : 0),
    0
  );
  const totalLiability = accounts.reduce(
    (sum, acc) => sum + (acc.type === "credit" ? Math.abs(acc.balance) : 0),
    0
  );
  const netAssets = totalAssets - totalLiability;

  return (
    <Box>
      <Card
        sx={{
          mb: 2,
          bgcolor: isDark ? "rgba(255, 255, 255, 0.05)" : "#e3f2fd",
          border: isDark ? "1px solid rgba(255,255,255,0.1)" : "none",
        }}
      >
        <CardContent>
          <Typography variant="h6" gutterBottom>
            💰 資産サマリー
          </Typography>
          <Grid container spacing={2} sx={{ textAlign: "center" }}>
            <Grid item xs={4}>
              <Typography variant="caption">総資産</Typography>
              <Typography variant="body1" fontWeight="bold">
                ¥{totalAssets.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption">負債(カード)</Typography>
              <Typography variant="body1" color="error">
                ¥{totalLiability.toLocaleString()}
              </Typography>
            </Grid>
            <Grid item xs={4}>
              <Typography variant="caption">純資産</Typography>
              <Typography variant="body1" color="primary">
                ¥{netAssets.toLocaleString()}
              </Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ★追加: 年間収入推移グラフ */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="h6">📈 年間収入推移</Typography>
            <FormControlLabel
              control={
                <Switch
                  checked={showForecast}
                  onChange={(e) => setShowForecast(e.target.checked)}
                  size="small"
                  color="warning"
                />
              }
              label={<Typography variant="caption">見込み表示</Typography>}
            />
          </Box>
          <Divider sx={{ mb: 2 }} />

          <div style={{ width: "100%", height: 300 }}>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                <YAxis
                  tickFormatter={(val) => `${val / 10000}万`}
                  tick={{ fontSize: 10 }}
                  width={35}
                />
                <Tooltip
                  formatter={(value, name) => [
                    `¥${value.toLocaleString()}`,
                    name === "income" ? "実績収入" : "見込み(3ヶ月平均)",
                  ]}
                  labelStyle={{ color: "black" }}
                />
                <Legend />
                {/* 棒グラフ: 実績 */}
                <Bar
                  dataKey="income"
                  name="実績収入"
                  barSize={20}
                  fill="#0088FE"
                  radius={[4, 4, 0, 0]}
                />
                {/* 折れ線グラフ: 見込み（スイッチON時のみ表示） */}
                {showForecast && (
                  <Line
                    type="monotone"
                    dataKey="forecast"
                    name="見込み"
                    stroke="#ff9800"
                    strokeWidth={2}
                    dot={{ r: 3 }}
                  />
                )}
              </ComposedChart>
            </ResponsiveContainer>
          </div>
          {showForecast && (
            <Typography
              variant="caption"
              color="textSecondary"
              sx={{ mt: 1, display: "block" }}
            >
              ※見込み＝直近3ヶ月の実績平均値
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6">扶養範囲チャート</Typography>
          <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
            年収: ¥{annualIncome.toLocaleString()} / リミット: ¥
            {targetLimit.toLocaleString()}
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.min((annualIncome / targetLimit) * 100, 100)}
            sx={{
              height: 10,
              borderRadius: 5,
              mb: 1,
              "& .MuiLinearProgress-bar": {
                bgcolor: annualIncome > targetLimit ? "red" : "primary.main",
              },
            }}
          />
          <Typography variant="caption" align="right" display="block">
            残り: ¥{Math.max(0, targetLimit - annualIncome).toLocaleString()}
          </Typography>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom>
            📊 収支内訳 (概算)
          </Typography>
          {/* ★修正: 素のdivでサイズを固定し、ResponsiveContainerに渡す */}
          <div style={{ width: "100%", height: 250 }}>
            {summary && summary.length > 0 ? (
              <ResponsiveContainer width="99%" height="100%">
                <PieChart>
                  <Pie
                    data={summary}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={80}
                    fill="#8884d8"
                    paddingAngle={5}
                    dataKey="value"
                    label
                  >
                    {summary.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip formatter={(val) => `¥${val.toLocaleString()}`} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <Box
                display="flex"
                alignItems="center"
                justifyContent="center"
                height="100%"
              >
                <Typography color="textSecondary">
                  データがありません
                </Typography>
              </Box>
            )}
          </div>
        </CardContent>
      </Card>
    </Box>
  );
}
