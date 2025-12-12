// src/components/ReportTab.jsx
import React from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  LinearProgress,
  useTheme,
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
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
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

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
