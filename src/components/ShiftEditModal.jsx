// src/components/ShiftEditModal.jsx (新規作成または既存の編集モーダルを置き換え)
import React, { useState, useEffect } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, FormControlLabel, Switch, Box, Typography, Divider } from '@mui/material';

export default function ShiftEditModal({ open, onClose, shift, job, onUpdate, onDelete }) {
  const [isManual, setIsManual] = useState(false);
  const [manualAmount, setManualAmount] = useState('');
  const [manualDate, setManualDate] = useState('');
  
  // 既存の編集用State
  const [startTime, setStartTime] = useState('');
  const [endTime, setEndTime] = useState('');
  const [status, setStatus] = useState('attended'); // attended, absence, early_leave

  useEffect(() => {
    if (shift) {
      setIsManual(!!shift.isManualOverride);
      setManualAmount(shift.manualAmount || '');
      setManualDate(shift.manualTransferDate || '');
      setStartTime(shift.start || job?.defaultStart || '');
      setEndTime(shift.end || job?.defaultEnd || '');
      setStatus(shift.status || 'attended');
    }
  }, [shift, job]);

  const handleSave = () => {
    const updatedShift = {
      ...shift,
      start: startTime,
      end: endTime,
      status: status,
      isManualOverride: isManual,
      // 手動モードなら入力値を保存、そうでなければクリア
      manualAmount: isManual ? parseInt(manualAmount) : null,
      manualTransferDate: isManual ? manualDate : null,
      // 歩合などで毎回入力が必要な場合
      commissionAmount: job?.type === 'commission' ? parseInt(manualAmount) : shift.commissionAmount, 
    };
    onUpdate(updatedShift);
    onClose();
  };

  if (!shift) return null;

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{job?.name || shift.customName || '詳細編集'}</DialogTitle>
      <DialogContent>
        {/* ステータス変更 */}
        <Box sx={{ mb: 2, display: 'flex', gap: 1 }}>
            <Button 
                variant={status === 'attended' ? 'contained' : 'outlined'} 
                onClick={() => setStatus('attended')} color="primary">通常</Button>
            <Button 
                variant={status === 'early_leave' ? 'contained' : 'outlined'} 
                onClick={() => setStatus('early_leave')} color="warning">早退</Button>
            <Button 
                variant={status === 'absence' ? 'contained' : 'outlined'} 
                onClick={() => setStatus('absence')} color="error">欠勤</Button>
        </Box>

        {/* 時間変更（通常時のみ） */}
        {!isManual && job?.type === 'hourly' && (
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <TextField label="開始" type="time" fullWidth InputLabelProps={{ shrink: true }} value={startTime} onChange={e=>setStartTime(e.target.value)} />
                <TextField label="終了" type="time" fullWidth InputLabelProps={{ shrink: true }} value={endTime} onChange={e=>setEndTime(e.target.value)} />
            </Box>
        )}

        <Divider sx={{ my: 2 }} />

        {/* ★手動修正スイッチ (画面左下あたりをイメージ) */}
        <Box sx={{ bgcolor: '#fff3e0', p: 2, borderRadius: 2 }}>
            <FormControlLabel 
                control={<Switch checked={isManual} onChange={(e) => setIsManual(e.target.checked)} />} 
                label="金額・振込日を強制修正" 
                sx={{ mb: 1, display: 'block' }}
            />
            
            {/* スイッチONの時だけ表示 */}
            {isManual && (
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <TextField 
                        label="金額 (強制上書き)" 
                        type="number" 
                        value={manualAmount} 
                        onChange={(e) => setManualAmount(e.target.value)} 
                        helperText="自動計算を無視してこの金額にします"
                    />
                    <TextField 
                        label="振込予定日" 
                        type="date" 
                        InputLabelProps={{ shrink: true }}
                        value={manualDate} 
                        onChange={(e) => setManualDate(e.target.value)} 
                    />
                </Box>
            )}
        </Box>

      </DialogContent>
      <DialogActions>
        <Button onClick={() => { if(window.confirm('削除しますか？')) onDelete(shift); }} color="error">削除</Button>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSave} variant="contained" color="primary">保存</Button>
      </DialogActions>
    </Dialog>
  );
}