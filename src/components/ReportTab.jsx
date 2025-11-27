// src/components/ReportTab.jsx
import React from 'react';
import { 
  Box, Typography, Card, CardContent, LinearProgress, Grid, 
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Divider
} from '@mui/material';
import { AccountBalanceWallet, TrendingUp, CalendarMonth } from '@mui/icons-material';

export default function ReportTab({ annualIncome, summary, targetLimit, accounts, totalFixedCost }) {
  
  // 扶養の壁計算
  const remaining = targetLimit - annualIncome;
  const progress = Math.min(100, Math.max(0, (annualIncome / targetLimit) * 100));
  let progressColor = "primary";
  if (progress > 80) progressColor = "warning";
  if (progress > 95) progressColor = "error";

  // 総資産計算
  const totalAssets = accounts.reduce((sum, acc) => sum + acc.balance, 0);

  return (
    <Box>
      {/* 1. 扶養・年収の壁 */}
      <Card sx={{ mb: 2, bgcolor: '#f5f5f5' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{display:'flex', alignItems:'center'}}>
            <TrendingUp sx={{mr:1}}/> 年収・扶養チェック
          </Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">現在のみこみ年収</Typography>
            <Typography variant="h6" fontWeight="bold">¥{annualIncome.toLocaleString()}</Typography>
          </Box>
          
          <LinearProgress 
            variant="determinate" value={progress} color={progressColor} 
            sx={{ height: 15, borderRadius: 5, mb: 1 }} 
          />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="textSecondary">上限: ¥{targetLimit.toLocaleString()}</Typography>
            <Typography variant="subtitle2" color={remaining < 0 ? "error" : "primary"} fontWeight="bold">
              {remaining >= 0 ? `あと ¥${remaining.toLocaleString()} 稼げます` : `¥${Math.abs(remaining).toLocaleString()} オーバーです！`}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* 2. 家計・資産サマリー */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{display:'flex', alignItems:'center'}}>
            <AccountBalanceWallet sx={{mr:1}}/> 家計簿サマリー
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
              <Paper elevation={0} sx={{ p: 1, bgcolor: '#e3f2fd', textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">現在の総資産</Typography>
                <Typography variant="h6" color="primary">¥{totalAssets.toLocaleString()}</Typography>
              </Paper>
            </Grid>
            <Grid item xs={6}>
              <Paper elevation={0} sx={{ p: 1, bgcolor: '#ffebee', textAlign: 'center' }}>
                <Typography variant="caption" color="textSecondary">毎月の固定費</Typography>
                <Typography variant="h6" color="error">-¥{totalFixedCost.toLocaleString()}</Typography>
              </Paper>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 3. 年間スケジュール一覧 */}
      <Card>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{display:'flex', alignItems:'center'}}>
            <CalendarMonth sx={{mr:1}}/> 年間出勤スケジュール
          </Typography>
          <TableContainer sx={{ maxHeight: 300 }}>
            <Table stickyHeader size="small">
              <TableHead>
                <TableRow>
                  <TableCell>月</TableCell>
                  <TableCell align="center">出勤日数</TableCell>
                  <TableCell align="right">予想給与</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell component="th" scope="row" sx={{fontWeight:'bold'}}>{row.month}</TableCell>
                    <TableCell align="center">{row.days}日</TableCell>
                    <TableCell align="right">¥{row.income.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
                {/* 合計行 */}
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                  <TableCell component="th" scope="row" sx={{fontWeight:'bold'}}>合計</TableCell>
                  <TableCell align="center" sx={{fontWeight:'bold'}}>{summary.reduce((s,r)=>s+r.days,0)}日</TableCell>
                  <TableCell align="right" sx={{fontWeight:'bold'}}>¥{annualIncome.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}