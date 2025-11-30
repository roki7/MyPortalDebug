// src/components/ShiftDrawer.jsx
import React, { useState } from 'react';
import { Drawer, Box, Typography, Grid, Button, Divider, TextField } from '@mui/material';
import { format } from 'date-fns';
import { Person, EditNote } from '@mui/icons-material';

export default function ShiftDrawer({ open, onClose, jobs, members, selectedDate, onAddShift }) {
  const [showManual, setShowManual] = useState(false);
  const [manualName, setManualName] = useState('');
  const [manualAmount, setManualAmount] = useState('');

  const handleAddManual = () => {
      if(manualName && manualAmount) {
          // 特別なジョブオブジェクトを作成して渡す
          onAddShift({ 
              id: 'custom', // 特別ID
              type: 'manual', 
              name: manualName, 
              value: 0, // 値はシフト側に持たせる
              isCustom: true 
          }, parseInt(manualAmount));
          setManualName('');
          setManualAmount('');
          setShowManual(false);
      }
  };

  return (
    <Drawer anchor="bottom" open={open} onClose={() => { setShowManual(false); onClose(); }}>
      <Box sx={{ p: 3, maxHeight: '80vh', overflowY: 'auto' }}>
        <Typography variant="h6" gutterBottom>
          {selectedDate && format(selectedDate, 'M月d日')}のシフトを追加
        </Typography>

        {/* ★追加: 単発・手入力エリア */}
        <Box sx={{ mb: 2 }}>
            {!showManual ? (
                <Button 
                    fullWidth variant="outlined" startIcon={<EditNote />} 
                    onClick={() => setShowManual(true)}
                    sx={{ borderStyle: 'dashed', color: 'text.secondary' }}
                >
                    単発・手入力 (ウーバーなど)
                </Button>
            ) : (
                <Box sx={{ bgcolor: '#f5f5f5', p: 2, borderRadius: 2 }}>
                    <Typography variant="caption" fontWeight="bold">単発案件の入力</Typography>
                    <Grid container spacing={2} sx={{ mt: 0.5, mb: 2 }}>
                        <Grid item xs={7}>
                            <TextField label="仕事名" size="small" fullWidth value={manualName} onChange={(e)=>setManualName(e.target.value)} placeholder="例: Uber" />
                        </Grid>
                        <Grid item xs={5}>
                            <TextField label="金額" type="number" size="small" fullWidth value={manualAmount} onChange={(e)=>setManualAmount(e.target.value)} />
                        </Grid>
                    </Grid>
                    <Box sx={{ display:'flex', gap:1 }}>
                        <Button fullWidth variant="outlined" onClick={() => setShowManual(false)}>戻る</Button>
                        <Button fullWidth variant="contained" onClick={handleAddManual} disabled={!manualName || !manualAmount}>追加</Button>
                    </Box>
                </Box>
            )}
        </Box>
        <Divider sx={{ mb: 2 }} />

        {/* 既存の仕事リスト */}
        {members.map((member) => {
          const memberJobs = jobs.filter(j => j.memberId === member.id);
          if (memberJobs.length === 0) return null;

          return (
            <Box key={member.id} sx={{ mb: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Person sx={{ mr: 0.5, color: 'text.secondary' }} />
                <Typography variant="subtitle1" fontWeight="bold">{member.name}</Typography>
              </Box>
              <Grid container spacing={2}>
                {memberJobs.map(job => (
                  <Grid item xs={6} key={job.id}>
                    <Button 
                      fullWidth variant="contained" 
                      onClick={() => onAddShift(job)}
                      sx={{ 
                        bgcolor: job.color, height: 60, 
                        display: 'flex', flexDirection: 'column', justifyContent: 'center',
                        boxShadow: 'none', '&:hover': { bgcolor: job.color, opacity: 0.9 }
                      }}
                    >
                      <Typography fontWeight="bold" variant="body2">{job.name}</Typography>
                      <Typography variant="caption" sx={{ opacity: 0.9, fontSize: 10 }}>
                        {job.type === 'manual' ? '金額入力' : `${job.defaultStart || '09:00'} - ${job.defaultEnd || '17:00'}`}
                      </Typography>
                    </Button>
                  </Grid>
                ))}
              </Grid>
              <Divider sx={{ mt: 2 }} />
            </Box>
          );
        })}
      </Box>
    </Drawer>
  );
}