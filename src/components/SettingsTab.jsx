// src/components/SettingsTab.jsx
import React, { useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Button, TextField, 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  FormControl, InputLabel, Select, MenuItem, Divider, 
  FormControlLabel, Switch, Chip, Grid,
  List, ListItem, IconButton, ListItemText
} from '@mui/material';
import { 
  Add, Work, CalendarMonth, Edit, Delete, Download, Upload, 
  FileDownload, PersonAdd, ContentCopy, Groups
} from '@mui/icons-material';
import { format, addMonths } from 'date-fns';
import { PREFECTURES } from '../data';
import { useAuth } from '../AuthContext';

export default function SettingsTab({ 
  jobs, settings, members, 
  onAddJob, onUpdateJob, onDeleteJob, onUpdateSettings, 
  onGenerateRange, onDeleteRange, onUpdateMembers,
  fullData, onImportData 
}) {
  const { isPremium, userProfile, createGroup, kickMember, leaveGroup, isOwner } = useAuth();
  
  const [openJobDialog, setOpenJobDialog] = useState(false);
  const [rangeStart, setRangeStart] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [rangeEnd, setRangeEnd] = useState(format(addMonths(new Date(), 1), 'yyyy-MM-dd'));
  const [targetJobId, setTargetJobId] = useState('');
  
  const initialJobState = { 
    id: null, name: '', type: 'hourly', value: '', color: '#1976d2', 
    days: [], skipHolidays: false, memberId: members[0]?.id || 'me',
    cutoffDay: 31, payDay: 25, 
    payMonth: 1, // 0:当月, 1:翌月, 2:翌々月
    defaultStart: '09:00', defaultEnd: '17:00', defaultBreakTime: 60
  };
  const [editingJob, setEditingJob] = useState(initialJobState);

  const plan = userProfile?.plan;
  const isSharedPlan = ['couple', 'family'].includes(plan);
  const maxSlots = plan === 'couple' ? 2 : (plan === 'family' ? 4 : 0);
  const currentSlots = members.length;

  // --- Handlers ---
  const handleInvite = async () => {
    let groupId = userProfile?.groupId;
    if (!groupId) {
        if(window.confirm("新しく共有グループを作成しますか？")) groupId = await createGroup(); else return;
    }
    const url = `${window.location.origin}/?invite=${groupId}`;
    navigator.clipboard.writeText(url);
    alert("招待URLをコピーしました！:\n" + url);
  };

  const handleExportCSV = () => {
    if (!isPremium) { alert("CSV出力は有料プラン限定です。"); return; }
    let csv = "\uFEFF日付,仕事,メンバー,開始,終了,金額,振込予定日\n";
    const shifts = fullData.shifts || {};
    Object.keys(shifts).sort().forEach(d => {
        shifts[d].forEach(s => {
            const job = (fullData.jobs||[]).find(j => j.id === s.jobId) || { name: s.customName || '不明' };
            const memberName = (fullData.members||[]).find(m => m.id === job.memberId)?.name || '自分';
            const payDate = s.customPayDate || '自動計算';
            csv += `${d},${job.name},${memberName},${s.start||''},${s.end||''},${s.amount},${payDate}\n`;
        });
    });
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "export.csv";
    link.click();
  };

  const handleBackupJSON = () => {
      const blob = new Blob([JSON.stringify(fullData)], { type: 'application/json' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "backup.json";
      link.click();
  };
  
  const handleRestoreJSON = (e) => {
      const file = e.target.files[0];
      if(!file) return;
      const r = new FileReader();
      r.onload = (ev) => onImportData(JSON.parse(ev.target.result));
      r.readAsText(file);
      e.target.value = '';
  };

  const handleAddMember = () => { const name = prompt("メンバーの名前"); if(name) { onUpdateMembers([...members, { id: Date.now(), name, color: '#555' }]); } };
  const handleOpenAdd = () => { setEditingJob({ ...initialJobState, id: Date.now() }); setOpenJobDialog(true); };
  const handleOpenEdit = (job) => { setEditingJob({ ...initialJobState, ...job, days: job.days || [] }); setOpenJobDialog(true); };
  
  const handleSaveJob = () => {
    if (editingJob.name && editingJob.value) {
      const val = parseInt(editingJob.value);
      const jobToSave = { ...editingJob, value: val };
      if (jobs.some(j => j.id === editingJob.id)) onUpdateJob(jobToSave); else onAddJob(jobToSave);
      setOpenJobDialog(false);
    }
  };
  const handleLocationChange = (e) => { const p = PREFECTURES.find(p=>p.name===e.target.value); if(p) onUpdateSettings({...settings, location:p}); };
  const handleDayToggle = (idx) => { const d = editingJob.days || []; setEditingJob({ ...editingJob, days: d.includes(idx) ? d.filter(x=>x!==idx) : [...d, idx].sort() }); };
  const weekLabels = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <Box>
      <Card sx={{ mb: 2, bgcolor: '#e3f2fd' }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{display:'flex', alignItems:'center'}}><CalendarMonth sx={{mr:1}}/> シフト一括操作</Typography>
          <Grid container spacing={2} sx={{mb:2}}>
            <Grid item xs={6}><TextField label="開始日" type="date" fullWidth size="small" InputLabelProps={{shrink:true}} value={rangeStart} onChange={(e)=>setRangeStart(e.target.value)}/></Grid>
            <Grid item xs={6}><TextField label="終了日" type="date" fullWidth size="small" InputLabelProps={{shrink:true}} value={rangeEnd} onChange={(e)=>setRangeEnd(e.target.value)}/></Grid>
            <Grid item xs={12}><FormControl fullWidth size="small"><InputLabel>対象の仕事</InputLabel><Select value={targetJobId} label="対象の仕事" onChange={(e)=>setTargetJobId(e.target.value)}>{jobs.map(j => <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>)}</Select></FormControl></Grid>
          </Grid>
          <Box sx={{display:'flex', gap:1}}>
            <Button fullWidth variant="contained" onClick={() => onGenerateRange(rangeStart, rangeEnd, targetJobId)} disabled={!targetJobId}>登録</Button>
            <Button fullWidth variant="outlined" color="error" onClick={() => onDeleteRange(rangeStart, rangeEnd, targetJobId)} disabled={!targetJobId}>削除</Button>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}><Typography variant="h6">仕事設定</Typography><Button startIcon={<Add />} size="small" onClick={handleOpenAdd}>追加</Button></Box>
          <Divider />
          <List dense>
            {jobs.map(job => {
              const owner = members.find(m => m.id === job.memberId)?.name || '不明';
              return (
                <ListItem key={job.id} sx={{ display:'flex', alignItems:'center', justifyContent:'space-between', px:0, borderBottom:'1px solid #eee' }}>
                  <Box sx={{ display:'flex', alignItems:'center', flexGrow: 1, minWidth:0, mr:1 }}>
                    <Work sx={{ color: job.color, mr: 1, flexShrink:0 }} />
                    <Box sx={{ minWidth:0 }}>
                      <Typography variant="subtitle2" noWrap>{job.name}</Typography>
                      <Typography variant="caption" color="textSecondary" noWrap>
                        {job.type === 'hourly' ? `時給 ¥${job.value}` : '固定/手動'}
                      </Typography>
                    </Box>
                  </Box>
                  <Box sx={{ display:'flex', alignItems:'center', flexShrink: 0 }}>
                    <Chip label={owner} size="small" variant="outlined" sx={{ mr:1, maxWidth:80 }} />
                    <IconButton size="small" onClick={() => handleOpenEdit(job)}><Edit fontSize="small"/></IconButton>
                    <IconButton size="small" color="error" onClick={() => onDeleteJob(job.id)}><Delete fontSize="small"/></IconButton>
                  </Box>
                </ListItem>
              );
            })}
          </List>
        </CardContent>
      </Card>

      {/* アプリ設定・データ管理・共有設定は変更なしのため省略せず記述 */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>⚙ アプリ設定</Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>給与計算のタイミング</InputLabel>
            <Select value={settings.calcMode || 'realtime'} label="給与計算のタイミング" onChange={(e) => onUpdateSettings({ ...settings, calcMode: e.target.value })}><MenuItem value="realtime">⏱ リアルタイム</MenuItem><MenuItem value="completed">✅ 完了ベース</MenuItem><MenuItem value="upfront">☀️ 見込み込み</MenuItem></Select>
          </FormControl>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>地域</InputLabel>
            <Select value={settings.location?.name || '東京'} label="地域" onChange={(e) => { const p = PREFECTURES.find(x=>x.name===e.target.value); if(p) onUpdateSettings({...settings, location:p}); }}>{PREFECTURES.map(p => <MenuItem key={p.name} value={p.name}>{p.name}</MenuItem>)}</Select>
          </FormControl>
          <TextField label="扶養リミット" fullWidth type="number" size="small" value={settings.targetLimit} onChange={(e) => onUpdateSettings({ ...settings, targetLimit: parseInt(e.target.value) })} />
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
            <Typography variant="h6" gutterBottom>💾 データ管理</Typography>
            <Box sx={{display:'flex', gap:1, mb:1}}>
                <Button startIcon={<Download />} variant="outlined" fullWidth onClick={handleBackupJSON}>バックアップ</Button>
                <Button startIcon={<Upload />} variant="outlined" component="label" fullWidth>復元<input type="file" hidden accept=".json" onChange={handleRestoreJSON} /></Button>
            </Box>
            <Button startIcon={<FileDownload />} variant="outlined" fullWidth onClick={handleExportCSV} disabled={!isPremium}>CSVエクスポート {isPremium ? '' : '(有料プラン限定)'}</Button>
        </CardContent>
      </Card>

      {isSharedPlan && (
      <Card sx={{ mb: 2, border: '1px solid #1976d2' }}>
        <CardContent>
          <Box sx={{display:'flex', justifyContent:'space-between', alignItems:'center', mb:1}}>
              <Typography variant="h6" color="primary">👨‍👩‍👧 グループ共有</Typography>
              <Chip icon={<Groups sx={{color:'white !important'}}/>} label={`参加枠: ${currentSlots}/${maxSlots}`} color="primary" size="small" />
          </Box>
          {userProfile?.groupId ? (
              <Box>
                  <Button startIcon={<ContentCopy />} fullWidth variant="contained" onClick={handleInvite} sx={{mb:2}}>招待URLをコピー</Button>
                  {isOwner && (<Button size="small" color="error" fullWidth onClick={() => { const id = prompt("削除するUID"); if(id) kickMember(id); }}>ID指定で強制退会</Button>)}
                  <Button color="inherit" fullWidth onClick={leaveGroup} sx={{mt:1}}>グループを抜ける</Button>
              </Box>
          ) : (
              <Button startIcon={<PersonAdd />} fullWidth variant="contained" onClick={handleInvite}>グループを作成して招待</Button>
          )}
        </CardContent>
      </Card>
      )}

      {/* --- ダイアログ: 締め日・給料日設定を復活 --- */}
      <Dialog open={openJobDialog} onClose={() => setOpenJobDialog(false)}>
        <DialogTitle>{editingJob.id ? '編集' : '追加'}</DialogTitle>
        <DialogContent>
          <TextField label="仕事名" fullWidth margin="dense" value={editingJob.name} onChange={(e) => setEditingJob({ ...editingJob, name: e.target.value })} />
          <FormControl fullWidth margin="dense">
            <InputLabel>誰の仕事？</InputLabel>
            <Select value={editingJob.memberId || ''} label="誰の仕事？" onChange={(e)=>setEditingJob({...editingJob, memberId:e.target.value})}>
               {members.map(m=><MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2, mt:1 }}>
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
          
          <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>{['#1976d2', '#ed6c02', '#2e7d32', '#9c27b0', '#d32f2f'].map(c => (<Box key={c} onClick={() => setEditingJob({ ...editingJob, color: c })} sx={{ width: 30, height: 30, borderRadius: '50%', bgcolor: c, cursor: 'pointer', border: editingJob.color === c ? '2px solid black' : 'none' }} />))}</Box>
          
          {/* ★復活: 締め日・給料日の設定 */}
          <Typography variant="subtitle2" sx={{mt:2}}>給与設定</Typography>
          <Grid container spacing={2} sx={{mb: 2}}>
             <Grid item xs={4}>
               <FormControl fullWidth size="small">
                 <InputLabel>締め日</InputLabel>
                 <Select value={editingJob.cutoffDay || 31} label="締め日" onChange={(e)=>setEditingJob({...editingJob, cutoffDay: e.target.value})}>
                   <MenuItem value={31}>末日</MenuItem>
                   {[...Array(28).keys()].map(i => <MenuItem key={i+1} value={i+1}>{i+1}日</MenuItem>)}
                 </Select>
               </FormControl>
             </Grid>
             <Grid item xs={4}>
               <FormControl fullWidth size="small">
                 <InputLabel>支払い</InputLabel>
                 <Select value={editingJob.payMonth !== undefined ? editingJob.payMonth : 1} label="支払い" onChange={(e)=>setEditingJob({...editingJob, payMonth: e.target.value})}>
                   <MenuItem value={0}>当月</MenuItem>
                   <MenuItem value={1}>翌月</MenuItem>
                   <MenuItem value={2}>翌々月</MenuItem>
                 </Select>
               </FormControl>
             </Grid>
             <Grid item xs={4}>
               <FormControl fullWidth size="small">
                 <InputLabel>給料日</InputLabel>
                 <Select value={editingJob.payDay || 25} label="給料日" onChange={(e)=>setEditingJob({...editingJob, payDay: e.target.value})}>
                   {[...Array(28).keys()].map(i => <MenuItem key={i+1} value={i+1}>{i+1}日</MenuItem>)}
                   <MenuItem value={31}>末日</MenuItem>
                 </Select>
               </FormControl>
             </Grid>
          </Grid>

          <Typography variant="subtitle2" sx={{mt:1}}>詳細設定</Typography>
          <Grid container spacing={2} sx={{mb:2}}>
             <Grid item xs={6}><TextField label="開始" type="time" size="small" fullWidth InputLabelProps={{shrink:true}} value={editingJob.defaultStart} onChange={(e)=>setEditingJob({...editingJob, defaultStart:e.target.value})} /></Grid>
             <Grid item xs={6}><TextField label="終了" type="time" size="small" fullWidth InputLabelProps={{shrink:true}} value={editingJob.defaultEnd} onChange={(e)=>setEditingJob({...editingJob, defaultEnd:e.target.value})} /></Grid>
             <Grid item xs={6}><TextField label="休憩(分)" type="number" size="small" fullWidth value={editingJob.defaultBreakTime} onChange={(e)=>setEditingJob({...editingJob, defaultBreakTime:e.target.value})} /></Grid>
          </Grid>
          <Typography variant="subtitle2">曜日固定</Typography>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>{weekLabels.map((day, idx) => (<Box key={idx} onClick={() => handleDayToggle(idx)} sx={{ width: 30, height: 30, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', bgcolor: editingJob.days?.includes(idx) ? editingJob.color : '#eee', color: editingJob.days?.includes(idx) ? 'white' : 'black', fontWeight: 'bold', fontSize: 12 }}>{day}</Box>))}</Box>
          <FormControlLabel control={<Switch checked={editingJob.skipHolidays} onChange={(e) => setEditingJob({...editingJob, skipHolidays: e.target.checked})} />} label="祝日休み" />
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenJobDialog(false)}>キャンセル</Button><Button onClick={handleSaveJob} variant="contained">保存</Button></DialogActions>
      </Dialog>
    </Box>
  );
}