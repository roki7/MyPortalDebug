// src/components/ShiftDrawer.jsx
import React, { useState, useEffect } from 'react';
import { 
  Drawer, List, ListItem, ListItemIcon, ListItemText, Typography, 
  Box, Divider, TextField, Button, Tabs, Tab, FormControlLabel, Switch 
} from '@mui/material';
import { Work, AddCircle, Edit, AccessTime, CalendarToday } from '@mui/icons-material';
import { format } from 'date-fns';

export default function ShiftDrawer({ open, onClose, jobs, members, selectedDate, onAddShift }) {
  const [tabIndex, setTabIndex] = useState(0); // 0:選択, 1:単発
  
  // 共通: 振込日
  const [customPayDate, setCustomPayDate] = useState('');

  // 単発用State
  const [customName, setCustomName] = useState('');
  const [customAmount, setCustomAmount] = useState('');
  const [customStart, setCustomStart] = useState('09:00');
  const [customEnd, setCustomEnd] = useState('17:00');
  const [hasTime, setHasTime] = useState(true); // 時間指定ありなし

  const dateStr = selectedDate ? format(selectedDate, 'M月d日') : '';

  // 開くたびにリセット
  useEffect(() => {
    if (open) {
      setTabIndex(0);
      setCustomPayDate('');
      setCustomName('');
      setCustomAmount('');
      setCustomStart('09:00');
      setCustomEnd('17:00');
      setHasTime(true);
    }
  }, [open]);

  // 既存ジョブ選択時
  const handleSelectJob = (job) => {
    // 振込日(customPayDate)のみ渡す。金額はJob設定依存
    onAddShift(job, 0, customPayDate);
    onClose();
  };

  // 単発登録時
  const handleSaveCustom = () => {
    if (!customName) {
      alert("仕事名を入力してください");
      return;
    }
    const customJob = { id: 'custom', name: customName, type: 'manual' };
    const amount = parseInt(customAmount) || 0;
    
    // 時間指定がない場合は start/end を空にする
    const start = hasTime ? customStart : '';
    const end = hasTime ? customEnd : '';

    onAddShift(customJob, amount, customPayDate, start, end);
    onClose();
  };

  return (
    <Drawer anchor="bottom" open={open} onClose={onClose} PaperProps={{ sx: { borderRadius: '16px 16px 0 0', pb: 2, maxHeight: '85vh' } }}>
      <Box sx={{ p: 1, textAlign: 'center', borderBottom: 1, borderColor: 'divider' }}>
        <Typography variant="h6">{dateStr}のシフト</Typography>
      </Box>

      <Tabs 
        value={tabIndex} 
        onChange={(e, v) => setTabIndex(v)} 
        variant="fullWidth" 
        sx={{ borderBottom: 1, borderColor: 'divider', mb: 1 }}
      >
        <Tab label="いつもの仕事" />
        <Tab label="単発・手入力" />
      </Tabs>

      {/* タブ0: 既存リスト選択 */}
      {tabIndex === 0 && (
        <Box>
          {/* 振込日指定 (オプション) */}
          <Box sx={{ px: 2, py: 1, bgcolor: '#f9f9f9', display: 'flex', alignItems: 'center', gap: 1 }}>
            <CalendarToday fontSize="small" color="action" />
            <TextField 
              label="振込予定日 (任意)" 
              type="date" 
              size="small" 
              fullWidth 
              InputLabelProps={{ shrink: true }}
              value={customPayDate} 
              onChange={(e) => setCustomPayDate(e.target.value)} 
              sx={{ bgcolor: 'white' }}
            />
          </Box>
          <Divider />

          <List sx={{ maxHeight: '50vh', overflowY: 'auto' }}>
            {jobs.map(job => {
              const owner = members.find(m => m.id === job.memberId)?.name || '自分';
              return (
                <ListItem button key={job.id} onClick={() => handleSelectJob(job)}>
                  <ListItemIcon>
                    <Work sx={{ color: job.color }} />
                  </ListItemIcon>
                  <ListItemText 
                    primary={job.name} 
                    secondary={`${owner} • ${job.type === 'hourly' ? `¥${job.value}/h` : `¥${job.value}`}`} 
                  />
                  <AddCircle color="primary" />
                </ListItem>
              );
            })}
            {jobs.length === 0 && (
              <Box sx={{ p: 4, textAlign: 'center', opacity: 0.6 }}>
                <Typography>登録済みの仕事がありません</Typography>
                <Typography variant="caption">設定タブから仕事を追加するか、「単発」タブを使ってください</Typography>
              </Box>
            )}
          </List>
        </Box>
      )}

      {/* タブ1: 単発入力フォーム */}
      {tabIndex === 1 && (
        <Box sx={{ p: 3 }}>
          <TextField 
            label="仕事名 (必須)" 
            fullWidth 
            value={customName} 
            onChange={(e) => setCustomName(e.target.value)} 
            sx={{ mb: 2 }}
            placeholder="例: 引っ越し手伝い"
          />
          
          <TextField 
            label="金額 (円)" 
            type="number" 
            fullWidth 
            value={customAmount} 
            onChange={(e) => setCustomAmount(e.target.value)} 
            sx={{ mb: 2 }}
          />

          <Box sx={{ mb: 2, p: 1, border: '1px solid #eee', borderRadius: 1 }}>
            <FormControlLabel 
              control={<Switch checked={hasTime} onChange={(e) => setHasTime(e.target.checked)} />} 
              label="時間を指定する" 
            />
            {hasTime && (
              <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
                <TextField 
                  label="開始" type="time" fullWidth size="small" InputLabelProps={{ shrink: true }}
                  value={customStart} onChange={(e) => setCustomStart(e.target.value)} 
                />
                <TextField 
                  label="終了" type="time" fullWidth size="small" InputLabelProps={{ shrink: true }}
                  value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} 
                />
              </Box>
            )}
          </Box>

          <TextField 
            label="振込予定日 (任意)" 
            type="date" 
            fullWidth 
            InputLabelProps={{ shrink: true }}
            value={customPayDate} 
            onChange={(e) => setCustomPayDate(e.target.value)} 
            sx={{ mb: 3 }}
          />

          <Button 
            variant="contained" 
            fullWidth 
            size="large" 
            onClick={handleSaveCustom}
            startIcon={<AddCircle />}
          >
            保存して追加
          </Button>
        </Box>
      )}
    </Drawer>
  );
}