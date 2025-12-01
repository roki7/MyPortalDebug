// src/components/SettingsTab.jsx
import React, { useState } from 'react';
import { 
  Box, Typography, Card, CardContent, List, ListItem, ListItemText, 
  ListItemSecondaryAction, IconButton, Button, TextField, 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  FormControl, InputLabel, Select, MenuItem, Divider, 
  FormControlLabel, Switch, Chip, Grid, ListItemIcon // ★ここに追加しました！
} from '@mui/material';
import { Delete, Add, Work, CalendarMonth, Edit, Person, RestoreFromTrash } from '@mui/icons-material';
import { PREFECTURES } from '../data';
import { format, addMonths } from 'date-fns';

export default function SettingsTab({ 
  jobs, settings, members, 
  onAddJob, onUpdateJob, onDeleteJob, onUpdateSettings, 
  onGenerateRange, onDeleteRange, onUpdateMembers 
}) {
  const [openJobDialog, setOpenJobDialog] = useState(false);
  const [rangeStart, setRangeStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rangeEnd, setRangeEnd] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [targetJobId, setTargetJobId] = useState('');
  
  const initialJobState = { 
    id: null, name: '', type: 'hourly', value: '', color: '#1976d2', 
    days: [], skipHolidays: false, memberId: members[0]?.id || 'me',
    cutoffDay: 31, payDay: 25,
    defaultStart: '09:00', defaultEnd: '17:00', defaultBreakTime: 60
  };
  const [editingJob, setEditingJob] = useState(initialJobState);

  const handleAddMember = () => {
    const name = prompt("メンバーの名前");
    if(name) { onUpdateMembers([...members, { id: Date.now(), name, color: '#555' }]); }
  };

  const handleOpenAdd = () => {
    setEditingJob({ ...initialJobState, id: Date.now() });
    setOpenJobDialog(true);
  };

  const handleOpenEdit = (job) => {
    setEditingJob({ ...initialJobState, ...job, days: job.days || [] });
    setOpenJobDialog(true);
  };

  const handleSaveJob = () => {
    if (editingJob.name && editingJob.value) {
      const exists = jobs.some(j => j.id === editingJob.id);
      const val = parseInt(editingJob.value);
      const jobToSave = { 
          ...editingJob, 
          value: val,
          cutoffDay: editingJob.cutoffDay || 31,
          payDay: editingJob.payDay || 25
      };
      if (exists) onUpdateJob(jobToSave); else onAddJob(jobToSave);
      setOpenJobDialog(false);
    }
  };
  
  const handleLocationChange = (e) => {
    const prefData = PREFECTURES.find(p => p.name === e.target.value);
    if(prefData) onUpdateSettings({ ...settings, location: prefData });
  };
  
  const handleDayToggle = (idx) => {
    const d = editingJob.days || [];
    setEditingJob({ ...editingJob, days: d.includes(idx) ? d.filter(x=>x!==idx) : [...d, idx].sort() });
  };
  const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <Box>
      {/* 1. アプリ設定 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>⚙ アプリ設定</Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>給与計算のタイミング</InputLabel>
            <Select 
              value={settings.calcMode || 'realtime'} 
              label="給与計算のタイミング" 
              onChange={(e) => onUpdateSettings({ ...settings, calcMode: e.target.value })}
            >
              <MenuItem value="realtime">⏱ リアルタイム (分単位)</MenuItem>
              <MenuItem value="completed">✅ 完了ベース (終了後に計上)</MenuItem>
              <MenuItem value="upfront">☀️ 見込み込み (朝イチ全額)</MenuItem>
            </Select>
          </FormControl>

          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>地域</InputLabel>
            <Select value={settings.location?.name || '東京'} label="地域" onChange={handleLocationChange}>
              {PREFECTURES.map(p => <MenuItem key={p.name} value={p.name}>{p.name}</MenuItem>)}
            </Select>
          </FormControl>

          <Typography variant="caption">家族・メンバー</Typography>
          <Box sx={{ mb: 2, display:'flex', flexWrap:'wrap', gap:1 }}>
            {members.map(m => (
              <Chip key={m.id} label={m.name} onDelete={members.length>1 ? () => onUpdateMembers(members.filter(x=>x.id!==m.id)) : undefined} />
            ))}
            <Chip icon={<Add />} label="追加" onClick={handleAddMember} variant="outlined" clickable />
          </Box>

          <TextField 
            label="扶養リミット" fullWidth type="number" size="small"
            value={settings.targetLimit}
            onChange={(e) => onUpdateSettings({ ...settings, targetLimit: parseInt(e.target.value) })}
          />
        </CardContent>
      </Card>

      {/* 2. シフト一括操作 */}
      <Card sx={{ mb: 2, bgcolor: '#e3f2fd' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{display:'flex', alignItems:'center'}}>
            <CalendarMonth sx={{mr:1}}/> シフト一括操作
          </Typography>
          <Grid container spacing={2} sx={{mb:2}}>
            <Grid item xs={6}><TextField label="開始日" type="date" fullWidth size="small" InputLabelProps={{shrink:true}} value={rangeStart} onChange={(e)=>setRangeStart(e.target.value)}/></Grid>
            <Grid item xs={6}><TextField label="終了日" type="date" fullWidth size="small" InputLabelProps={{shrink:true}} value={rangeEnd} onChange={(e)=>setRangeEnd(e.target.value)}/></Grid>
            <Grid item xs={12}>
                <FormControl fullWidth size="small">
                    <InputLabel>対象の仕事</InputLabel>
                    <Select value={targetJobId} label="対象の仕事" onChange={(e)=>setTargetJobId(e.target.value)}>
                        {jobs.map(j => <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>)}
                    </Select>
                </FormControl>
            </Grid>
          </Grid>
          <Box sx={{display:'flex', gap:1}}>
            <Button fullWidth variant="contained" onClick={() => onGenerateRange(rangeStart, rangeEnd, targetJobId)} disabled={!targetJobId}>登録</Button>
            <Button fullWidth variant="outlined" color="error" startIcon={<RestoreFromTrash/>} onClick={() => onDeleteRange(rangeStart, rangeEnd, targetJobId)} disabled={!targetJobId}>削除</Button>
          </Box>
        </CardContent>
      </Card>

      {/* 3. 仕事リスト (★修正済み) */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="h6">仕事設定</Typography>
            <Button startIcon={<Add />} size="small" onClick={handleOpenAdd}>追加</Button>
          </Box>
          <Divider />
          <List dense>
            {jobs.map(job => {
              const owner = members.find(m => m.id === job.memberId)?.name || '不明';
              return (
                <ListItem key={job.id} secondaryAction={
                  <Box>
                      <IconButton onClick={() => handleOpenEdit(job)}><Edit /></IconButton>
                      <IconButton onClick={() => onDeleteJob(job.id)}><Delete /></IconButton>
                  </Box>
                }>
                  <ListItemIcon>
                    <Work sx={{ color: job.color }} />
                  </ListItemIcon>
                  <ListItemText 
                    disableTypography
                    primary={
                      <Box sx={{display:'flex', alignItems:'center', gap:1, mb:0.5}}>
                        <Typography variant="subtitle2" fontWeight="bold">{job.name}</Typography>
                        <Chip label={owner} size="small" variant="outlined" sx={{height:20, fontSize:10}} />
                      </Box>
                    }
                    secondary={
                        <Typography variant="caption" color="textSecondary">
                            {job.type === 'hourly' ? `時給 ¥${job.value} (〆${job.cutoffDay})` : '固定/手動'}
                        </Typography>
                    } 
                  />
                </ListItem>
              );
            })}
          </List>
        </CardContent>
      </Card>

      {/* 仕事追加・編集ダイアログ */}
      <Dialog open={openJobDialog} onClose={() => setOpenJobDialog(false)}>
        <DialogTitle>{editingJob.id ? '編集' : '追加'}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth sx={{ mt: 2, mb: 2 }}>
            <InputLabel>誰の仕事？</InputLabel>
            <Select value={editingJob.memberId || ''} label="誰の仕事？" onChange={(e) => setEditingJob({ ...editingJob, memberId: e.target.value })}>
              {members.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField label="仕事名" fullWidth sx={{ mb: 2 }} value={editingJob.name} onChange={(e) => setEditingJob({ ...editingJob, name: e.target.value })} />
          <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
            <FormControl fullWidth>
                <InputLabel>タイプ</InputLabel>
                <Select value={editingJob.type} label="タイプ" onChange={(e) => setEditingJob({ ...editingJob, type: e.target.value })}>
                <MenuItem value="hourly">⏳ 時給制</MenuItem>
                <MenuItem value="monthly">👔 月給制</MenuItem>
                <MenuItem value="manual">💪 完全歩合</MenuItem>
                </Select>
            </FormControl>
            <TextField label="金額" type="number" fullWidth value={editingJob.value} onChange={(e) => setEditingJob({ ...editingJob, value: e.target.value })} />
          </Box>
          
          {/* 締め日・給料日設定 */}
          <Typography variant="subtitle2" sx={{mt:1, color:'primary.main'}}>給与設定</Typography>
          <Grid container spacing={2} sx={{mb: 2}}>
            <Grid item xs={6}>
                <FormControl fullWidth size="small">
                    <InputLabel>締め日</InputLabel>
                    <Select value={editingJob.cutoffDay || 31} label="締め日" onChange={(e)=>setEditingJob({...editingJob, cutoffDay: e.target.value})}>
                        <MenuItem value={31}>末日</MenuItem><MenuItem value={10}>10日</MenuItem><MenuItem value={15}>15日</MenuItem><MenuItem value={20}>20日</MenuItem><MenuItem value={25}>25日</MenuItem>
                    </Select>
                </FormControl>
            </Grid>
            <Grid item xs={6}>
                <FormControl fullWidth size="small">
                    <InputLabel>給料日</InputLabel>
                    <Select value={editingJob.payDay || 25} label="給料日" onChange={(e)=>setEditingJob({...editingJob, payDay: e.target.value})}>
                        <MenuItem value={25}>25日</MenuItem><MenuItem value={10}>10日</MenuItem><MenuItem value={15}>15日</MenuItem><MenuItem value={20}>20日</MenuItem><MenuItem value={31}>末日</MenuItem>
                    </Select>
                </FormControl>
            </Grid>
          </Grid>

          {/* 時間設定 */}
          <Typography variant="subtitle2" sx={{mt:1}}>詳細設定</Typography>
          <Grid container spacing={2} sx={{mb:2}}>
            <Grid item xs={6}><TextField label="開始" type="time" size="small" fullWidth InputLabelProps={{shrink:true}} value={editingJob.defaultStart} onChange={(e)=>setEditingJob({...editingJob, defaultStart:e.target.value})} /></Grid>
            <Grid item xs={6}><TextField label="終了" type="time" size="small" fullWidth InputLabelProps={{shrink:true}} value={editingJob.defaultEnd} onChange={(e)=>setEditingJob({...editingJob, defaultEnd:e.target.value})} /></Grid>
            <Grid item xs={6}><TextField label="休憩(分)" type="number" size="small" fullWidth value={editingJob.defaultBreakTime} onChange={(e)=>setEditingJob({...editingJob, defaultBreakTime:e.target.value})} /></Grid>
          </Grid>
          
          <Typography variant="subtitle2">曜日固定</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
            {weekLabels.map((day, idx) => (
              <Box key={idx} onClick={() => handleDayToggle(idx)} sx={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', bgcolor: editingJob.days?.includes(idx) ? editingJob.color : '#eee', color: editingJob.days?.includes(idx) ? 'white' : 'black', fontWeight: 'bold', fontSize: 12 }}>{day}</Box>
            ))}
          </Box>
          <FormControlLabel control={<Switch checked={editingJob.skipHolidays} onChange={(e) => setEditingJob({...editingJob, skipHolidays: e.target.checked})} />} label="祝日は休みにする" />
          
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
            {['#1976d2', '#ed6c02', '#2e7d32', '#9c27b0', '#d32f2f'].map(c => (<Box key={c} onClick={() => setEditingJob({ ...editingJob, color: c })} sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: editingJob.color === c ? '2px solid black' : 'none' }} />))}
          </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenJobDialog(false)}>キャンセル</Button>
            <Button onClick={handleSaveJob} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}