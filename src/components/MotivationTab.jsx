// src/components/MotivationTab.jsx
import React, { useState } from 'react';
import { Box, Typography, Card, CardContent, TextField, Button, LinearProgress, Paper, Divider } from '@mui/material';
import { EmojiEvents, Redeem, AccountBalanceWallet } from '@mui/icons-material';

// 励ましメッセージ集（AIの代わりにランダム表示）
const CHEER_MESSAGES = {
  low: [ 
    "千里の道も一歩から！まずは固定費分をクリアだ！",
    "今は種まきの時期。コツコツ積み上げよう🌱",
    "焦らなくて大丈夫。確実に前進してるよ！",
    "労働は裏切らない！次のシフトも頑張ろう💪"
  ],
  middle: [
    "いい調子！折り返し地点は見えてきた！",
    "その調子！昨日の自分よりリッチになってるよ💰",
    "順調だね。ちょっと休憩しつつ、ゴールを目指そう☕️",
    "コツコツ頑張る君は偉い！目標まであと半分！"
  ],
  high: [
    "ゴールは目の前！ラストスパートだ！🏃‍♂️",
    "すごい！もう手が届くところまで来てるよ✨",
    "あと少し！ここまで頑張った自分を褒めてあげて！",
    "カウントダウン開始！ワクワクしてきたね！"
  ],
  completed: [
    "おめでとう！目標達成！！🎉",
    "生活費を払っても余裕で買えるよ！すごい！！",
    "頑張った成果だね。さあ、自分へのご褒美タイムだ！🎁",
    "素晴らしい！次の目標は何にする？"
  ]
};

export default function MotivationTab({ currentEarnings, fixedCost }) {
  const [targetItem, setTargetItem] = useState('PS5');
  const [targetPrice, setTargetPrice] = useState(60000);
  const [otherCost, setOtherCost] = useState(30000); 
  
  const [message, setMessage] = useState('');

  // 💰 リアルな計算
  const totalCost = fixedCost + parseInt(otherCost || 0);
  const disposableIncome = Math.max(0, currentEarnings - totalCost);
  
  // 進捗率
  const progress = targetPrice > 0 ? Math.min(100, Math.floor((disposableIncome / targetPrice) * 100)) : 0;
  const remaining = Math.max(0, targetPrice - disposableIncome);

  // ランダムメッセージを表示する関数
  const handleCheerUp = () => {
    let category = 'low';
    if (progress >= 100) category = 'completed';
    else if (progress >= 70) category = 'high';
    else if (progress >= 30) category = 'middle';

    const list = CHEER_MESSAGES[category];
    const randomMsg = list[Math.floor(Math.random() * list.length)];
    
    // 具体的な換算も少し混ぜる
    const beefBowl = Math.floor(disposableIncome / 500); // 牛丼換算
    const coffee = Math.floor(disposableIncome / 150);   // コーヒー換算
    
    if (disposableIncome > 1000 && Math.random() > 0.7) {
       setMessage(`金額で言うと、牛丼${beefBowl}杯分のお金が自由に使えるよ！すごい！🍚`);
    } else {
       setMessage(randomMsg);
    }
  };

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{display:'flex', alignItems:'center'}}>
        <Redeem sx={{mr:1, color:'orange'}}/> リアル・モチベーション
      </Typography>

      {/* 収支計算エリア */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="subtitle2" gutterBottom><AccountBalanceWallet sx={{fontSize:16, mr:0.5}}/> 自由なお金の計算</Typography>
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb:1, color: 'text.secondary' }}>
            <Typography variant="body2">今月の稼ぎ:</Typography>
            <Typography variant="body2">+ ¥{currentEarnings.toLocaleString()}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb:1, color: 'error.main' }}>
            <Typography variant="body2">固定費 (家賃等):</Typography>
            <Typography variant="body2">- ¥{fixedCost.toLocaleString()}</Typography>
          </Box>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
             <Typography variant="body2" color="error.main">その他生活費:</Typography>
             <TextField 
                variant="standard" type="number" size="small" sx={{width:80, input: {textAlign:'right', color:'red'}}}
                value={otherCost} onChange={(e) => setOtherCost(e.target.value)}
                InputProps={{ startAdornment: <span style={{color:'red'}}>- ¥</span> }}
             />
          </Box>
          
          <Divider sx={{my:1}} />
          
          <Box sx={{ display: 'flex', justifyContent: 'space-between', fontWeight:'bold' }}>
            <Typography>自由に使えるお金:</Typography>
            <Typography variant="h5" color={disposableIncome > 0 ? "primary" : "text.disabled"}>
              ¥{disposableIncome.toLocaleString()}
            </Typography>
          </Box>
        </CardContent>
      </Card>

      {/* 目標エリア */}
      <Card sx={{ mb: 2, bgcolor: '#fff8e1' }}>
        <CardContent>
          <Typography variant="caption" color="textSecondary">目標（欲しいもの）</Typography>
          <Box sx={{ display: 'flex', gap: 2, mb: 2, mt: 1 }}>
            <TextField 
              label="モノの名前" variant="standard" size="small" fullWidth
              value={targetItem} onChange={(e) => setTargetItem(e.target.value)}
            />
            <TextField 
              label="金額" type="number" variant="standard" size="small" sx={{width:100}}
              value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)}
            />
          </Box>

          <Box sx={{ mb: 1 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography variant="body2" fontWeight="bold">達成率 {progress}%</Typography>
              <Typography variant="caption">あと ¥{remaining.toLocaleString()}</Typography>
            </Box>
            <LinearProgress 
              variant="determinate" value={progress} 
              sx={{ height: 10, borderRadius: 5, bgcolor: 'white', '& .MuiLinearProgress-bar': { bgcolor: 'orange' } }} 
            />
          </Box>
        </CardContent>
      </Card>

      {/* 励ましボタン */}
      <Box sx={{ textAlign: 'center', mt: 3 }}>
        <Button 
          variant="contained" 
          color="secondary" 
          startIcon={<EmojiEvents />}
          onClick={handleCheerUp}
          sx={{ borderRadius: 20, px: 4, background: 'linear-gradient(45deg, #FF9800 30%, #FF5722 90%)' }}
        >
          励ましてもらう！
        </Button>

        {message && (
          <Paper sx={{ mt: 3, p: 2, position: 'relative', bgcolor: 'white', borderRadius: 2 }}>
            <Box sx={{ 
              position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
              width: 0, height: 0, borderLeft: '10px solid transparent', borderRight: '10px solid transparent', borderBottom: '10px solid white' 
            }} />
            <Typography variant="body1" sx={{ fontWeight: 'bold', color: '#333' }}>
              {message}
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
}