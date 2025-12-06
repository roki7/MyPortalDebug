// src/components/SettingsTab.jsx
import React, { useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Button, TextField, 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  FormControl, InputLabel, Select, MenuItem, Divider, 
  FormControlLabel, Switch, Chip, Grid,
  List, ListItem, ListItemText, IconButton, ListItemSecondaryAction
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
    defaultStart: '09:00', defaultEnd: '17:00', defaultBreakTime: 60 
  };
  const [editingJob, setEditingJob] = useState(initialJobState);

  // --- プラン判定 & 枠数計算 ---
  const plan = userProfile?.plan;
  const isSharedPlan = ['couple', 'family'].includes(plan);
  const maxSlots = plan === 'couple' ? 2 : (plan === 'family' ? 4 : 0);
  const currentSlots = members.length; // 現在のメンバー数

  // --- 招待URL生成 ---
  const handleInvite = async () => {
    let groupId = userProfile?.groupId;
    if (!groupId) {
        if(window.confirm("新しく共有グループを作成しますか？")) {
            groupId = await createGroup();
        } else {
            return;
        }
    }
    const url = `${window.location.origin}/?invite=${groupId}`;
    navigator.clipboard.writeText(url);
    alert("招待URLをコピーしました！パートナーに送ってください:\n" + url);
  };

  // --- CSV Export ---
  const handleExportCSV = () => {
    if (!isPremium) {
        alert("CSV出力は有料プラン（スタンダード/ペア/ファミリー）限定の機能です。");
        return;
    }
    
    let csvContent = "\uFEFF"; // BOM
    csvContent += "【シフト記録】\n";
    csvContent += "日付,仕事名,メンバー,開始時間,終了時間,休憩,金額,ステータス\n";
    
    const shifts = fullData.shifts || {};
    const jobList = fullData.jobs || [];
    const memberList = fullData.members || [];

    Object.keys(shifts).sort().forEach(dateStr => {
        shifts[dateStr].forEach(s => {
            const job = jobList.find(j => j.id === s.jobId) || { name: s.customName || '不明' };
            const memberName = memberList.find(m => m.id === job.memberId)?.name || '自分';
            csvContent += `${dateStr},${job.name},${memberName},${s.start||''},${s.end||''},${s.breakTime||0},${s.amount||0},${s.status}\n`;
        });
    });

    csvContent += "\n【家計簿履歴】\n";
    csvContent += "日付,項目,金額,支払口座,精算済\n";
    const payments = fullData.payments || [];
    const accounts = fullData.accounts || [];
    
    payments.sort((a,b) => (a.date > b.date ? -1 : 1)).forEach(p => {
        const accName = accounts.find(a => a.id === p.accountId)?.name || '不明';
        csvContent += `${p.date || p.month},${p.name},${p.amount},${accName},${p.isSettled?'済':'未'}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `my_portal_export_${format(new Date(), 'yyyyMMdd')}.csv`;
    link.click();
  };

  // --- JSON Backup/Restore ---
  const handleBackupJSON = () => {
      const jsonString = JSON.stringify(fullData, null, 2);
      const blob = new Blob([jsonString], { type: 'application/json' });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `my_portal_backup_${format(new Date(), 'yyyyMMdd')}.json`;
      link.click();
  };
  
  const handleRestoreJSON = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
          try {
              const data = JSON.parse(event.target.result);
              onImportData(data);
          } catch (err) {
              alert("ファイルの読み込みに失敗しました。正しいJSONファイルですか？");
          }
      };
      reader.readAsText(file);
      e.target.value = '';
  };

  // --- Job Helpers ---
  const handleAddMember = () => {
    const name = prompt("メンバーの名前");
    if(name) { onUpdateMembers([...members, { id: Date.now(), name, color: '#555' }]); }
  };
  const handleOpenAdd = () => { setEditingJob({ ...initialJobState, id: Date.now() }); setOpenJobDialog(true); };
  const handleOpenEdit = (job) => { setEditingJob({ ...initialJobState, ...job, days: job.days || [] }); setOpenJobDialog(true); };
  const handleSaveJob = () => {
    if (editingJob.name && editingJob.value) {
      const exists = jobs.some(j => j.id === editingJob.id);
      const val = parseInt(editingJob.value);
      const jobToSave = { ...editingJob, value: val };
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
      {/* =================================================================
          1. シフト一括操作
         ================================================================= */}
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

      {/* =================================================================
          2. 仕事設定
         ================================================================= */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}><Typography variant="h6">仕事設定</Typography><Button startIcon={<Add />} size="small" onClick={handleOpenAdd}>追加</Button></Box>
          <Divider />
          <List dense>
            {jobs.map(job => {
              const owner = members.find(m => m.id === job.memberId)?.name || '不明';
              return (
                <ListItem key={job.id} secondaryAction={<Box><IconButton onClick={() => handleOpenEdit(job)}><Edit /></IconButton><IconButton onClick={() => onDeleteJob(job.id)}><Delete /></IconButton></Box>}>
                  <Work sx={{ color: job.color, mr: 2 }} />
                  <ListItemText primary={job.name} secondary={job.type === 'hourly' ? `時給 ¥${job.value}` : '固定/手動'} />
                  <Chip label={owner} size="small" variant="outlined" sx={{ml:1}} />
                </ListItem>
              );
            })}
          </List>
        </CardContent>
      </Card>

      {/* =================================================================
          3. アプリ設定
         ================================================================= */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom>⚙ アプリ設定</Typography>
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>給与計算のタイミング</InputLabel>
            <Select value={settings.calcMode || 'realtime'} label="給与計算のタイミング" onChange={(e) => onUpdateSettings({ ...settings, calcMode: e.target.value })}>
              <MenuItem value="realtime">⏱ リアルタイム</MenuItem>
              <MenuItem value="completed">✅ 完了ベース</MenuItem>
              <MenuItem value="upfront">☀️ 見込み込み</MenuItem>
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
            {members.map(m => (<Chip key={m.id} label={m.name} onDelete={members.length>1 ? () => onUpdateMembers(members.filter(x=>x.id!==m.id)) : undefined} />))}
            <Chip icon={<Add />} label="追加" onClick={handleAddMember} variant="outlined" clickable />
          </Box>
          <TextField label="扶養リミット" fullWidth type="number" size="small" value={settings.targetLimit} onChange={(e) => onUpdateSettings({ ...settings, targetLimit: parseInt(e.target.value) })} />
        </CardContent>
      </Card>

      {/* =================================================================
          4. データ管理
         ================================================================= */}
      <Card sx={{ mb: 2 }}>
        <CardContent>
            <Typography variant="h6" gutterBottom>💾 データ管理</Typography>
            <Box sx={{display:'flex', gap:1, mb:1}}>
                <Button startIcon={<Download />} variant="outlined" fullWidth onClick={handleBackupJSON}>バックアップ</Button>
                <Button startIcon={<Upload />} variant="outlined" component="label" fullWidth>
                    復元
                    <input type="file" hidden accept=".json" onChange={handleRestoreJSON} />
                </Button>
            </Box>
            <Button startIcon={<FileDownload />} variant="outlined" fullWidth onClick={handleExportCSV} disabled={!isPremium}>
                CSVエクスポート {isPremium ? '' : '(有料プラン限定)'}
            </Button>
        </CardContent>
      </Card>

      {/* =================================================================
          5. グループ共有 (ペア・ファミリープランのみ)
         ================================================================= */}
      {isSharedPlan && (
      <Card sx={{ mb: 2, border: '1px solid #1976d2' }}>
        <CardContent>
          <Box sx={{display:'flex', justifyContent:'space-between', alignItems:'center', mb:1}}>
              <Typography variant="h6" color="primary">👨‍👩‍👧 グループ共有</Typography>
              <Chip icon={<Groups sx={{color:'white !important'}}/>} label={`参加枠: ${currentSlots}/${maxSlots}`} color="primary" size="small" />
          </Box>
          
          {userProfile?.groupId ? (
              <Box>
                  <Typography variant="body2" gutterBottom>参加中: {userProfile.groupId}</Typography>
                  <Button startIcon={<ContentCopy />} fullWidth variant="contained" onClick={handleInvite} sx={{mb:2}}>
                      招待URLをコピー
                  </Button>
                  {isOwner && (
                      <Box sx={{bgcolor:'#f5f5f5', p:1, borderRadius:1}}>
                          <Typography variant="caption">メンバー管理 (オーナーのみ)</Typography>
                          <Button size="small" color="error" fullWidth onClick={() => { const id = prompt("削除するUID"); if(id) kickMember(id); }}>
                              ID指定で強制退会
                          </Button>
                      </Box>
                  )}
                  <Button color="inherit" fullWidth onClick={leaveGroup} sx={{mt:1}}>グループを抜ける</Button>
              </Box>
          ) : (
              <Button startIcon={<PersonAdd />} fullWidth variant="contained" onClick={handleInvite}>
                  グループを作成して招待
              </Button>
          )}
        </CardContent>
      </Card>
      )}

      {/* 仕事編集ダイアログ */}
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
          <Typography variant="subtitle2" sx={{mt:1}}>給与設定</Typography>
          <Grid container spacing={2} sx={{mb: 2}}>
             <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>締め日</InputLabel><Select value={editingJob.cutoffDay || 31} label="締め日" onChange={(e)=>setEditingJob({...editingJob, cutoffDay: e.target.value})}><MenuItem value={31}>末日</MenuItem><MenuItem value={10}>10日</MenuItem><MenuItem value={15}>15日</MenuItem><MenuItem value={20}>20日</MenuItem><MenuItem value={25}>25日</MenuItem></Select></FormControl></Grid>
             <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>給料日</InputLabel><Select value={editingJob.payDay || 25} label="給料日" onChange={(e)=>setEditingJob({...editingJob, payDay: e.target.value})}><MenuItem value={25}>25日</MenuItem><MenuItem value={10}>10日</MenuItem><MenuItem value={15}>15日</MenuItem><MenuItem value={20}>20日</MenuItem><MenuItem value={31}>末日</MenuItem></Select></FormControl></Grid>
          </Grid>
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
          <FormControlLabel control={<Switch checked={editingJob.skipHolidays} onChange={(e) => setEditingJob({...editingJob, skipHolidays: e.target.checked})} />} label="祝日休み" />
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