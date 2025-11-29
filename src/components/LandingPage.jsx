// src/components/LandingPage.jsx
import React from 'react';
import { Box, Typography, Button, Container, Grid, Card, CardContent, AppBar, Toolbar, Chip } from '@mui/material';
import { useNavigate } from 'react-router-dom';
import { CheckCircle, SentimentSatisfiedAlt, Favorite } from '@mui/icons-material';

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <Box sx={{ bgcolor: 'white', minHeight: '100vh', pb: 10 }}>
      {/* ヘッダー */}
      <AppBar position="static" color="transparent" elevation={0}>
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1, fontWeight: 'bold', letterSpacing: 1 }}>
            MyPortalOne
          </Typography>
          <Button variant="outlined" onClick={() => navigate('/app')} sx={{ borderRadius: 4 }}>
            ログイン
          </Button>
        </Toolbar>
      </AppBar>

      {/* ヒーローエリア */}
      <Container maxWidth="md" sx={{ textAlign: 'center', mt: 10, mb: 12 }}>
        <Chip 
          label="ズボラでもOK" 
          color="secondary" 
          variant="outlined" 
          sx={{ mb: 3, fontWeight: 'bold', px: 1 }} 
        />
        <Typography variant="h3" component="h1" fontWeight="bold" gutterBottom sx={{ lineHeight: 1.4 }}>
          自分だけの<br/>ポータルサイト
        </Typography>
        <Typography variant="h6" color="text.secondary" paragraph sx={{ mt: 3, lineHeight: 1.8 }}>
          シフトも、家計も、買い物も。<br/>
          頑張らなくていい。必要なことだけ、ここにまとめて。
        </Typography>
        <Button 
          variant="contained" 
          size="large" 
          color="primary"
          sx={{ mt: 5, px: 6, py: 1.5, fontSize: '1.1rem', borderRadius: 8, boxShadow: '0 4px 14px rgba(0,0,0,0.1)' }} 
          onClick={() => navigate('/app')}
        >
          無料で始める
        </Button>
      </Container>

      {/* 特徴エリア */}
      <Box sx={{ bgcolor: '#f9f9f9', py: 10 }}>
        <Container maxWidth="md">
          <Typography variant="h5" textAlign="center" fontWeight="bold" mb={6}>
            続けられる理由
          </Typography>
          <Grid container spacing={4}>
            {[
              { 
                title: '入力は最低限', 
                desc: 'レシート撮影すら面倒なあなたへ。金額を入れるだけ、タップするだけの超シンプル設計。',
                icon: <SentimentSatisfiedAlt fontSize="large" color="primary"/> 
              },
              { 
                title: '家族とゆるく共有', 
                desc: '「これ買った？」「今日いる？」の確認作業をゼロに。プライバシーは守りつつ、必要なことだけシェア。',
                icon: <CheckCircle fontSize="large" color="secondary"/>
              },
              { 
                title: '私のモチベ管理', 
                desc: '「あと〇〇円で推しのグッズが買える！」 働く理由が見えるから、明日もちょっと頑張れる。',
                icon: <Favorite fontSize="large" sx={{color:'pink'}}/>
              },
            ].map((item, i) => (
              <Grid item xs={12} md={4} key={i}>
                <Card sx={{ height: '100%', textAlign: 'center', p: 3, borderRadius: 4, boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: 'none' }}>
                  <Box sx={{ mb: 2 }}>{item.icon}</Box>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>{item.title}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7 }}>{item.desc}</Typography>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Container>
      </Box>

      {/* 料金プラン */}
      <Container maxWidth="md" sx={{ py: 10 }}>
        <Typography variant="h5" textAlign="center" fontWeight="bold" mb={6}>プラン</Typography>
        <Grid container spacing={4} justifyContent="center">
          {[
            { name: 'ソロ', price: '150', desc: '自分だけで管理', color: '#f5f5f5' },
            { name: 'カップル', price: '280', desc: '二人で共有するなら', color: '#e3f2fd', badge: '人気' },
            { name: 'ファミリー', price: '380', desc: '最大4人までOK', color: '#f5f5f5' },
          ].map((plan, i) => (
            <Grid item xs={12} sm={4} key={i}>
              <Card sx={{ 
                height: '100%', 
                bgcolor: plan.color, 
                position: 'relative', 
                border: plan.badge ? '2px solid #1976d2' : '1px solid #eee',
                borderRadius: 4,
                boxShadow: 'none'
              }}>
                {plan.badge && <Box sx={{ position: 'absolute', top: 0, right: 0, bgcolor: '#1976d2', color: 'white', px: 1.5, py: 0.5, fontSize: 12, borderBottomLeftRadius: 8, borderTopRightRadius: 16 }}>{plan.badge}</Box>}
                <CardContent sx={{ textAlign: 'center', py: 5 }}>
                  <Typography variant="h6" fontWeight="bold" gutterBottom>{plan.name}</Typography>
                  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'baseline', mb: 1 }}>
                    <Typography variant="h4" fontWeight="bold">¥{plan.price}</Typography>
                    <Typography variant="body2" color="text.secondary">/月</Typography>
                  </Box>
                  <Typography variant="body2" sx={{ opacity: 0.8 }}>{plan.desc}</Typography>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Container>

      {/* フッター */}
      <Box sx={{ bgcolor: '#333', color: '#eee', py: 6, textAlign: 'center' }}>
        <Typography variant="body2" sx={{ opacity: 0.7 }} paragraph>&copy; 2025 MyPortalOne</Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 3, flexWrap: 'wrap' }}>
          <Button color="inherit" size="small" onClick={() => navigate('/terms')}>利用規約</Button>
          <Button color="inherit" size="small" onClick={() => navigate('/privacy')}>プライバシーポリシー</Button>
          <Button color="inherit" size="small" onClick={() => navigate('/law')}>特定商取引法に基づく表記</Button>
        </Box>
      </Box>
    </Box>
  );
}