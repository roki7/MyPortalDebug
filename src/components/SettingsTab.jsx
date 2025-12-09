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
  onUpdateSettings, onGenerateRange, onDeleteRange, onUpdateMembers,
  // ★追加: MainAppから受け取る編集リクエスト用関数
  onEditJobRequest, onAddJobRequest
}) {
  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [selectedRangeJob, setSelectedRangeJob] = useState('');

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
      <Typography variant="h6" gutterBottom>📅 シフト一括登録/削除</Typography>
      <Card sx={{ mb: 4 }}>
        <CardContent>
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
                                {job.type==='monthly' ? `月給 ¥${(job.monthlySalary||0).toLocaleString()}` :
                                 job.type==='commission' ? '歩合制' :
                                 `${job.type==='hourly'?'時給':'日給'}: ¥${job.value} / 休憩: ${job.breakTime||0}分`}
                            </>
                        } 
                      />
                      <ListItemSecondaryAction>
                        {/* ★修正: ダイアログを開くのは親に任せる */}
                        <IconButton onClick={() => onEditJobRequest(job)}><Edit /></IconButton>
                        <IconButton onClick={() => onDeleteJob(job.id)}><Delete /></IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                );
            })}
          </List>
          {/* ★修正: 新規追加も親に任せる */}
          <Button startIcon={<Add />} fullWidth variant="outlined" onClick={() => onAddJobRequest()}>
            新しい仕事を追加
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}