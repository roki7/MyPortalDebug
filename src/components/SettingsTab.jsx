import React, { useState } from 'react';
import { 
  Box, Typography, Card, CardContent, List, ListItem, ListItemText, ListItemSecondaryAction, 
  IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Chip, Divider, Grid 
} from '@mui/material';
import { Edit, Delete, Add } from '@mui/icons-material';

const WEEKDAYS = ['日', '月', '火', '水', '木', '金', '土'];

export default function SettingsTab({ 
  jobs, settings, members, 
  onAddJob, onUpdateJob, onDeleteJob, 
  onUpdateSettings, onGenerateRange, onDeleteRange, onUpdateMembers 
}) {
  const [openJobDialog, setOpenJobDialog] = useState(false);
  const [editJob, setEditJob] = useState(null);

  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [selectedRangeJob, setSelectedRangeJob] = useState('');

  const handleEditJobOpen = (job) => {
    setEditJob(job || { 
      name: '', type: 'hourly', value: 1000, 
      color: '#2196f3', skipHolidays: true, days: [],
      defaultStart: '09:00', defaultEnd: '18:00', breakTime: 60,
      memberId: 'me', // ★担当者の初期値
      closingDay: 99, // 99=末日
      payTiming: 'next', 
      payDay: 25 
    });
    setOpenJobDialog(true);
  };

  const handleJobSave = () => {
    if (!editJob.name) return;
    const jobData = { 
        ...editJob, 
        value: parseInt(editJob.value), 
        breakTime: parseInt(editJob.breakTime) || 0,
        closingDay: parseInt(editJob.closingDay),
        payDay: parseInt(editJob.payDay)
    };
    if (jobData.id) onUpdateJob(jobData);
    else onAddJob({ ...jobData, id: Date.now() });
    setOpenJobDialog(false);
  };

  const handleRangeSubmit = () => {
    if(!rangeStart || !rangeEnd || !selectedRangeJob) {
        alert("期間と仕事を選択してください");
        return;
    }
    onGenerateRange(rangeStart, rangeEnd, selectedRangeJob);
  };
  
  const handleRangeDelete = () => {
    if(!rangeStart || !rangeEnd || !selectedRangeJob) return;
    if(window.confirm("本当に削除しますか？")) onDeleteRange(rangeStart, rangeEnd, selectedRangeJob);
  };

  return (
    <Box sx={{ pb: 4 }}>
      {/* ★順序変更: 一括登録を上に */}
      <Typography variant="h6" gutterBottom>📅 シフト一括登録/削除</Typography>
      <Card sx={{ mb: 4 }}>
        <CardContent>
            <Typography variant="caption" color="textSecondary">
                指定した期間に、仕事設定の「曜日」に基づいてシフトを一括登録します。
            </Typography>
            <Grid container spacing={2} sx={{ mt: 1 }}>
                <Grid item xs={6}>
                    <TextField label="開始" type="date" fullWidth InputLabelProps={{shrink:true}} value={rangeStart} onChange={e=>setRangeStart(e.target.value)} autoComplete="off" />
                </Grid>
                <Grid item xs={6}>
                    <TextField label="終了" type="date" fullWidth InputLabelProps={{shrink:true}} value={rangeEnd} onChange={e=>setRangeEnd(e.target.value)} autoComplete="off" />
                </Grid>
                <Grid item xs={12}>
                    <FormControl fullWidth>
                        <InputLabel>対象の仕事</InputLabel>
                        <Select value={selectedRangeJob} label="対象の仕事" onChange={e=>setSelectedRangeJob(e.target.value)}>
                            {jobs.map(j => <MenuItem key={j.id} value={j.id}>{j.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                <Grid item xs={6}>
                    <Button variant="contained" fullWidth onClick={handleRangeSubmit}>一括登録</Button>
                </Grid>
                <Grid item xs={6}>
                    <Button variant="outlined" color="error" fullWidth onClick={handleRangeDelete}>一括削除</Button>
                </Grid>
            </Grid>
        </CardContent>
      </Card>

      <Typography variant="h6" gutterBottom>⚙️ 仕事の設定</Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <List>
            {jobs.map(job => {
                // 担当者名を取得
                const ownerName = members.find(m => m.id === job.memberId)?.name || '自分';
                return (
                  <React.Fragment key={job.id}>
                    <ListItem>
                      <ListItemText 
                        primary={
                            <Box sx={{display:'flex', alignItems:'center', gap:1}}>
                                <Box sx={{width:12, height:12, borderRadius:'50%', bgcolor:job.color}}/>
                                <Typography fontWeight="bold">{job.name}</Typography>
                                <Chip label={ownerName} size="small" variant="outlined" sx={{height:20, fontSize:'0.6rem'}} />
                            </Box>
                        }
                        secondary={
                            <>
                                {`${job.type==='hourly'?'時給':'日給'}: ¥${job.value} / 休憩: ${job.breakTime||0}分`}
                                <br/>
                                {`締め: ${job.closingDay===99?'月末':job.closingDay+'日'} / 払い: ${job.payTiming==='current'?'当月':job.payTiming==='next'?'翌月':'翌々月'}${job.payDay===99?'末日':job.payDay+'日'}`}
                            </>
                        } 
                      />
                      <ListItemSecondaryAction>
                        <IconButton onClick={() => handleEditJobOpen(job)}><Edit /></IconButton>
                        <IconButton onClick={() => onDeleteJob(job.id)}><Delete /></IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                );
            })}
          </List>
          <Button startIcon={<Add />} fullWidth variant="outlined" onClick={() => handleEditJobOpen(null)}>
            新しい仕事を追加
          </Button>
        </CardContent>
      </Card>

      <Dialog open={openJobDialog} onClose={() => setOpenJobDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editJob?.id ? '仕事を編集' : '新規作成'}</DialogTitle>
        <DialogContent sx={{ pt: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
          
          <TextField label="仕事名" fullWidth value={editJob?.name || ''} onChange={(e) => setEditJob({ ...editJob, name: e.target.value })} autoComplete="off" />
          
          {/* ★追加: 担当者選択 */}
          <FormControl fullWidth>
            <InputLabel>担当者</InputLabel>
            <Select value={editJob?.memberId || 'me'} label="担当者" onChange={(e) => setEditJob({ ...editJob, memberId: e.target.value })}>
                {members.map(m => (
                    <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>
                ))}
            </Select>
          </FormControl>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>給与タイプ</InputLabel>
              <Select value={editJob?.type || 'hourly'} label="給与タイプ" onChange={(e) => setEditJob({ ...editJob, type: e.target.value })}>
                <MenuItem value="hourly">時給</MenuItem>
                <MenuItem value="fixed">日給</MenuItem>
              </Select>
            </FormControl>
            <TextField label="金額" type="number" fullWidth value={editJob?.value || ''} onChange={(e) => setEditJob({ ...editJob, value: e.target.value })} autoComplete="off" />
          </Box>

          <Divider sx={{my:1}}><Chip label="給与規定" size="small" /></Divider>
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl fullWidth>
                <InputLabel>締め日</InputLabel>
                <Select value={editJob?.closingDay || 99} label="締め日" onChange={(e) => setEditJob({ ...editJob, closingDay: e.target.value })}>
                    <MenuItem value={99}>末日</MenuItem>
                    <MenuItem value={15}>15日</MenuItem>
                    <MenuItem value={20}>20日</MenuItem>
                    <MenuItem value={25}>25日</MenuItem>
                    <MenuItem value={10}>10日</MenuItem>
                </Select>
            </FormControl>
            <FormControl fullWidth>
                <InputLabel>支払月</InputLabel>
                <Select value={editJob?.payTiming || 'next'} label="支払月" onChange={(e) => setEditJob({ ...editJob, payTiming: e.target.value })}>
                    <MenuItem value="current">当月</MenuItem>
                    <MenuItem value="next">翌月</MenuItem>
                    <MenuItem value="after_next">翌々月</MenuItem>
                </Select>
            </FormControl>
            <FormControl fullWidth>
                <InputLabel>支払日</InputLabel>
                <Select value={editJob?.payDay || 25} label="支払日" onChange={(e) => setEditJob({ ...editJob, payDay: e.target.value })}>
                    <MenuItem value={25}>25日</MenuItem>
                    <MenuItem value={99}>末日</MenuItem> {/* ★修正: 末日(99) */}
                    <MenuItem value={15}>15日</MenuItem>
                    <MenuItem value={10}>10日</MenuItem>
                    <MenuItem value={1}>1日</MenuItem>
                </Select>
            </FormControl>
          </Box>

          <Divider sx={{my:1}}><Chip label="勤怠デフォルト" size="small" /></Divider>

          <Box sx={{ display: 'flex', gap: 2 }}>
            <TextField label="開始" type="time" fullWidth InputLabelProps={{ shrink: true }} value={editJob?.defaultStart || ''} onChange={(e) => setEditJob({ ...editJob, defaultStart: e.target.value })} autoComplete="off" />
            <TextField label="終了" type="time" fullWidth InputLabelProps={{ shrink: true }} value={editJob?.defaultEnd || ''} onChange={(e) => setEditJob({ ...editJob, defaultEnd: e.target.value })} autoComplete="off" />
          </Box>

          <TextField 
            label="休憩 (分)" 
            type="number" 
            fullWidth 
            value={editJob?.breakTime !== undefined ? editJob.breakTime : 60} 
            onChange={(e) => setEditJob({ ...editJob, breakTime: e.target.value })} 
            helperText="シフト自動生成時や初期値として使われます"
            autoComplete="off" 
          />

          <Box>
            <Typography variant="caption">出勤曜日 (一括登録で使用)</Typography>
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5 }}>
              {WEEKDAYS.map((day, i) => (
                <Chip 
                  key={day} 
                  label={day} 
                  color={editJob?.days?.includes(i) ? 'primary' : 'default'} 
                  onClick={() => {
                    const newDays = editJob?.days?.includes(i) 
                      ? editJob.days.filter(d => d !== i) 
                      : [...(editJob?.days || []), i];
                    setEditJob({ ...editJob, days: newDays });
                  }}
                  clickable
                />
              ))}
            </Box>
          </Box>
          
          <FormControlLabel 
            control={<Checkbox checked={editJob?.skipHolidays || false} onChange={(e) => setEditJob({ ...editJob, skipHolidays: e.target.checked })} />} 
            label="祝日は休みにする" 
          />
          
          <Box sx={{ mt: 1 }}>
             <Typography variant="caption">カレンダー表示色</Typography>
             <input type="color" value={editJob?.color || '#2196f3'} onChange={(e)=>setEditJob({...editJob, color:e.target.value})} style={{width:'100%', height:40, border:'none'}} />
          </Box>

        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenJobDialog(false)}>キャンセル</Button>
          <Button onClick={handleJobSave} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}