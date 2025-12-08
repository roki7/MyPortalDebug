// src/components/MotivationTab.jsx
import React from 'react';
import { Box, Card, CardContent, Typography, Grid } from '@mui/material';
import { EmojiEvents, FlightTakeoff, LocalDining } from '@mui/icons-material';

export default function MotivationTab({ currentEarnings, fixedCost }) {
  // 自由に使えるお金（概算）
  const disposable = Math.max(0, currentEarnings - fixedCost);

  // ご褒美換算
  const rewards = [
    { name: 'スタバ', price: 600, icon: <LocalDining/> },
    { name: '焼肉', price: 5000, icon: <LocalDining/> },
    { name: '旅行', price: 30000, icon: <FlightTakeoff/> },
  ];

  return (
    <Box>
      <Card sx={{ mb: 2, background: 'linear-gradient(135deg, #FFD700 0%, #FF8C00 100%)', color: 'white' }}>
        <CardContent sx={{ textAlign: 'center' }}>
          <EmojiEvents sx={{ fontSize: 60, mb: 1 }} />
          <Typography variant="h5" fontWeight="bold">今月の頑張り</Typography>
          <Typography variant="h3" sx={{ my: 2 }}>¥{currentEarnings.toLocaleString()}</Typography>
          <Typography variant="body2">固定費(¥{fixedCost.toLocaleString()})を引いて...</Typography>
          <Typography variant="h6" sx={{ mt: 1 }}>自由に使える: ¥{disposable.toLocaleString()}</Typography>
        </CardContent>
      </Card>

      <Typography variant="h6" gutterBottom>🎁 ご褒美換算</Typography>
      <Grid container spacing={2}>
        {rewards.map((r, i) => (
            <Grid item xs={4} key={i}>
                <Card sx={{ textAlign: 'center', p: 1, opacity: disposable >= r.price ? 1 : 0.5 }}>
                    <Box sx={{ color: 'primary.main', mb: 1 }}>{r.icon}</Box>
                    <Typography variant="body2" fontWeight="bold">{r.name}</Typography>
                    <Typography variant="caption">{Math.floor(disposable / r.price)}回分</Typography>
                </Card>
            </Grid>
        ))}
      </Grid>
    </Box>
  );
}