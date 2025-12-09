import React, { useState } from 'react';
import { 
  Box, Typography, Card, CardContent, List, ListItem, ListItemText, ListItemSecondaryAction, 
  IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  FormControl, InputLabel, Select, MenuItem, Checkbox, FormControlLabel, Chip, Divider, Grid 
} from '@mui/material';
import { Edit, Delete, Add, Person } from '@mui/icons-material';

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
  
  // メンバー追加用
  const [newMemberName, setNewMemberName] = useState('');

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

  // メンバー管理
  const handleAddMember = () => {
    if (!newMemberName) return;
    const newMember = {
        id: Date.now().toString(),
        name: newMemberName,
        color: '#' + Math.floor(Math.random()*16777215).toString(16)
    };
    onUpdateMembers([...members, newMember]);
    setNewMemberName('');
  };

  const handleEditMember = (member) => {
    const newName = prompt("メンバー名を変更", member.name);
    if (newName && newName !== member.name) {
        onUpdateMembers(members.map(m => m.id === member.id ? {...m, name: newName} : m));
    }
  };

  const handleDeleteMember = (id) => {
    if (id === 'me') {
        alert("「自分」は削除できません。");
        return;
    }
    if (window.confirm("このメンバーを削除しますか？\n※このメンバーに割り当てられた仕事やシフトがある場合、表示がおかしくなる可能性があります。")) {
        onUpdateMembers(members.filter(m => m.id !== id));
    }
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
                        <IconButton onClick={() => onEditJobRequest(job)}><Edit /></IconButton>
                        <IconButton onClick={() => onDeleteJob(job.id)}><Delete /></IconButton>
                      </ListItemSecondaryAction>
                    </ListItem>
                    <Divider />
                  </React.Fragment>
                );
            })}
          </List>
          <Button startIcon={<Add />} fullWidth variant="outlined" onClick={() => onAddJobRequest()}>
            新しい仕事を追加
          </Button>
        </CardContent>
      </Card>

      {/* ★復元: メンバー設定エリア */}
      <Typography variant="h6" gutterBottom>👥 メンバー設定</Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
            <List dense>
                {members.map(member => (
                    <ListItem key={member.id}>
                        <Box sx={{mr:2, display:'flex', alignItems:'center', justifyContent:'center', width:30, height:30, borderRadius:'50%', bgcolor:member.color || '#ccc', color:'#fff', fontWeight:'bold'}}>
                           {member.name.charAt(0)}
                        </Box>
                        <ListItemText primary={member.name} secondary={member.id === 'me' ? 'デフォルト' : ''} />
                        <ListItemSecondaryAction>
                            <IconButton onClick={() => handleEditMember(member)}><Edit /></IconButton>
                            <IconButton onClick={() => handleDeleteMember(member.id)} disabled={member.id === 'me'}><Delete /></IconButton>
                        </ListItemSecondaryAction>
                    </ListItem>
                ))}
            </List>
            <Divider sx={{my:2}} />
            <Box sx={{display:'flex', gap:1}}>
                <TextField 
                    label="新しいメンバー名" 
                    size="small" 
                    fullWidth 
                    value={newMemberName} 
                    onChange={(e) => setNewMemberName(e.target.value)}
                />
                <Button variant="contained" onClick={handleAddMember} disabled={!newMemberName}>追加</Button>
            </Box>
        </CardContent>
      </Card>
    </Box>
  );
}