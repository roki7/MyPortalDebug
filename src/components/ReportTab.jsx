// src/components/ReportTab.jsx
import React from 'react';
import { Box, Typography, Card, CardContent, Grid, LinearProgress, Divider, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import { AttachMoney, Savings, AccountBalanceWallet, TrendingUp, Assessment, CalendarMonth } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

export default function ReportTab({ annualIncome, summary, targetLimit, accounts, totalFixedCost }) {
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const remainingToLimit = Math.max(0, targetLimit - annualIncome);
  const monthlyAverage = annualIncome / 12;

  const chartData = summary.map(item => ({
    name: item.month,
    収入: item.income,
  }));

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{display:'flex', alignItems:'center'}}>
        <Assessment sx={{ mr: 1 }} /> 年間分析レポート
      </Typography>

      {/* 1. サマリーカード */}
      <Grid container spacing={2} sx={{ mb: 2 }}>
        <Grid item xs={12} sm={6}>
          <Card sx={{ bgcolor: '#e3f2fd' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="textSecondary">💰 現在の世帯年収</Typography>
                <TrendingUp color="primary" />
              </Box>
              <Typography variant="h4" fontWeight="bold">¥{annualIncome.toLocaleString()}</Typography>
              <Typography variant="caption">月平均: ¥{Math.floor(monthlyAverage).toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6}>
          <Card sx={{ bgcolor: '#f3e5f5' }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="subtitle2" color="textSecondary">🏦 全口座残高</Typography>
                <AccountBalanceWallet color="secondary" />
              </Box>
              <Typography variant="h4" fontWeight="bold">¥{totalBalance.toLocaleString()}</Typography>
              <Typography variant="caption">固定費(月): ¥{totalFixedCost.toLocaleString()}</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* 2. 扶養リミット */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom sx={{display:'flex', alignItems:'center'}}>
            <Savings sx={{ mr: 1, color: 'orange' }} /> 扶養リミット状況
          </Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">目標: ¥{targetLimit.toLocaleString()}</Typography>
            <Typography variant="body2" fontWeight="bold" color={remainingToLimit < 100000 ? 'error' : 'primary'}>
              あと: ¥{remainingToLimit.toLocaleString()}
            </Typography>
          </Box>
          <LinearProgress variant="determinate" value={Math.min(100, (annualIncome / targetLimit) * 100)} sx={{ height: 10, borderRadius: 5, bgcolor: '#eee', '& .MuiLinearProgress-bar': { bgcolor: remainingToLimit < 100000 ? 'red' : '#00e676' } }} />
        </CardContent>
      </Card>

      {/* 3. グラフエリア  */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
            <Typography variant="subtitle2" gutterBottom>📊 年間収入推移</Typography>
            <div style={{ width: '100%', height: 300 }}>
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{top: 10, right: 10, left: -20, bottom: 0}}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="name" tick={{fontSize:10}} interval={0} />
                        <YAxis tick={{fontSize:10}} tickFormatter={(val)=>`${val/10000}万`}/>
                        <Tooltip formatter={(val)=>`¥${val.toLocaleString()}`} />
                        <Bar dataKey="収入" fill="#1976d2" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </CardContent>
      </Card>

      {/* 4. 詳細テーブル */}
      <Card>
        <CardContent sx={{ p: 0 }}>
          <TableContainer component={Paper} elevation={0}>
            <Table size="small">
              <TableHead sx={{ bgcolor: '#f5f5f5' }}>
                <TableRow>
                  <TableCell>月</TableCell>
                  <TableCell align="right">出勤</TableCell>
                  <TableCell align="right">収入</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {summary.map((row) => (
                  <TableRow key={row.month}>
                    <TableCell component="th" scope="row">{row.month}</TableCell>
                    <TableCell align="right">{row.days}日</TableCell>
                    <TableCell align="right" sx={{ fontWeight: 'bold', color: row.income > 0 ? 'primary.main' : 'text.secondary' }}>
                      ¥{row.income.toLocaleString()}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow sx={{ bgcolor: '#fafafa' }}>
                    <TableCell fontWeight="bold">合計</TableCell>
                    <TableCell align="right" fontWeight="bold">{summary.reduce((s,c)=>s+c.days,0)}日</TableCell>
                    <TableCell align="right" fontWeight="bold">¥{annualIncome.toLocaleString()}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
}