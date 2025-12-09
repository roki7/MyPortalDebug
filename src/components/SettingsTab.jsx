// src/components/SettingsTab.jsx
import React, { useState } from 'react';
import { 
  Box, Typography, Card, CardContent, List, ListItem, ListItemText, ListItemSecondaryAction, 
  IconButton, Button, TextField, FormControl, InputLabel, Select, MenuItem, 
  Chip, Divider, Grid, Switch, FormControlLabel, InputAdornment 
} from '@mui/material';
import { Edit, Delete, Add, ContentCopy, PersonRemove, Group } from '@mui/icons-material';
import { useAuth } from '../AuthContext'; // ★追加

export default function SettingsTab({ 
  jobs, settings, members, 
  onAddJob, onUpdateJob, onDeleteJob, 
  onUpdateSettings, onGenerateRange, onDeleteRange, onUpdateMembers,
  onEditJobRequest, onAddJobRequest,
  sharedDocs // ★追加: MainAppから渡される共有データ
}) {
  const { userProfile, kickMember, canShareGroup, isOwner } = useAuth(); // AuthContext使用

  const [rangeStart, setRangeStart] = useState('');
  const [rangeEnd, setRangeEnd] = useState('');
  const [selectedRangeJob, setSelectedRangeJob] = useState('');
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
    if (window.confirm("削除しますか？")) {
        onUpdateMembers(members.filter(m => m.id !== id));
    }
  };

  // プライバシー設定の切り替え
  const handlePrivacyChange = (key) => {
      const currentPrivacy = settings.privacy || { shifts: false, finance: false, shopping: false };
      onUpdateSettings({
          ...settings,
          privacy: { ...currentPrivacy, [key]: !currentPrivacy[key] }
      });
  };

  // 招待リンクコピー
  const handleCopyInvite = () => {
      const url = `${window.location.origin}?invite=${userProfile.groupId}`;
      navigator.clipboard.writeText(url);
      alert("招待リンクをコピーしました");
  };

  // 共有関連の定数
  const planName = userProfile?.plan === 'family' ? 'ファミリー' : userProfile?.plan === 'couple' ? 'カップル' : '無料';
  const maxMembers = userProfile?.plan === 'family' ? 4 : userProfile?.plan === 'couple' ? 2 : 1;
  // 共有人数: sharedDocsの数(相手) + 1(自分)
  const currentMemberCount = (sharedDocs?.length || 0) + 1;

  return (
    <Box sx={{ pb: 4 }}>
      {/* 1. 一括登録 */}
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

      {/* 2. 仕事の設定 */}
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
                        secondary={job.type==='monthly'?`月給 ¥${(job.monthlySalary||0).toLocaleString()}`:`${job.type==='hourly'?'時給':'日給'}: ¥${job.value}`} 
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

      {/* 3. メンバー設定 */}
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
                <TextField label="新しいメンバー名" size="small" fullWidth value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)}/>
                <Button variant="contained" onClick={handleAddMember} disabled={!newMemberName}>追加</Button>
            </Box>
        </CardContent>
      </Card>

      {/* 4. ★追加: 扶養・目標設定 */}
      <Typography variant="h6" gutterBottom>🎯 扶養・目標設定</Typography>
      <Card sx={{ mb: 3 }}>
          <CardContent>
              <Grid container spacing={2}>
                  <Grid item xs={12}>
                      <Typography variant="body2" color="textSecondary" gutterBottom>
                          年収の計算対象とするメンバーと目標額（扶養上限など）を設定します。
                      </Typography>
                  </Grid>
                  <Grid item xs={6}>
                      <FormControl fullWidth size="small">
                          <InputLabel>対象メンバー</InputLabel>
                          <Select 
                              value={settings.targetMemberId || 'me'} 
                              label="対象メンバー" 
                              onChange={e => onUpdateSettings({ ...settings, targetMemberId: e.target.value })}
                          >
                              {members.map(m => <MenuItem key={m.id} value={m.id}>{m.name}</MenuItem>)}
                          </Select>
                      </FormControl>
                  </Grid>
                  <Grid item xs={6}>
                      <TextField 
                          label="目標金額" 
                          type="number" 
                          size="small" 
                          fullWidth 
                          value={settings.targetLimit || ''} 
                          onChange={e => onUpdateSettings({ ...settings, targetLimit: parseInt(e.target.value) })}
                          InputProps={{ startAdornment: <InputAdornment position="start">¥</InputAdornment> }}
                      />
                  </Grid>
              </Grid>
          </CardContent>
      </Card>

      {/* 5. ★追加: 共有管理 (対象者のみ表示) */}
      {canShareGroup && (
          <>
            <Typography variant="h6" gutterBottom>🔗 共有管理 ({planName})</Typography>
            <Card sx={{ mb: 4, bgcolor: '#f0f4ff' }}>
                <CardContent>
                    {/* 人数表示 */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                        <Box sx={{ display:'flex', alignItems:'center' }}>
                            <Group color="primary" sx={{ mr: 1 }} />
                            <Typography fontWeight="bold">共有メンバー</Typography>
                        </Box>
                        <Chip 
                            label={`${currentMemberCount} / ${maxMembers}`} 
                            color={currentMemberCount > maxMembers ? "error" : "primary"} 
                            variant="outlined" 
                        />
                    </Box>

                    {/* 招待リンク */}
                    {userProfile?.groupId && (
                        <Box sx={{ mb: 3 }}>
                            <Typography variant="caption" color="textSecondary">招待リンクを共有してパートナーを追加</Typography>
                            <Button startIcon={<ContentCopy />} fullWidth variant="contained" onClick={handleCopyInvite} sx={{ mt: 1 }}>
                                招待リンクをコピー
                            </Button>
                        </Box>
                    )}

                    <Divider sx={{ my: 2 }} />

                    {/* プライバシー設定 */}
                    <Typography variant="subtitle2" gutterBottom>プライバシー設定 (共有するデータ)</Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mb: 2 }}>
                        <FormControlLabel 
                            control={<Switch checked={settings.privacy?.shifts || false} onChange={() => handlePrivacyChange('shifts')} />} 
                            label="シフト表を共有" 
                        />
                        <FormControlLabel 
                            control={<Switch checked={settings.privacy?.finance || false} onChange={() => handlePrivacyChange('finance')} />} 
                            label="家計簿(収支)を共有" 
                        />
                        <FormControlLabel 
                            control={<Switch checked={settings.privacy?.shopping || false} onChange={() => handlePrivacyChange('shopping')} />} 
                            label="買い物リストを共有" 
                        />
                    </Box>
                    <Typography variant="caption" color="error">
                        ※OFFにすると、相手の画面にあなたのデータは表示されません。<br/>
                        ※全員OFFにすることが推奨されます（初期設定）。
                    </Typography>

                    <Divider sx={{ my: 2 }} />

                    {/* メンバーリスト & 削除 */}
                    {sharedDocs && sharedDocs.length > 0 && (
                        <List dense>
                            <Typography variant="subtitle2" sx={{ px: 2 }}>参加中のメンバー</Typography>
                            {sharedDocs.map(doc => (
                                <ListItem key={doc.uid}>
                                    <ListItemText primary={doc.userName || '名無し'} secondary={doc.uid === userProfile.uid ? 'あなた' : 'パートナー'} />
                                    {/* オーナーだけが削除可能 */}
                                    {isOwner && doc.uid !== userProfile.uid && (
                                        <IconButton size="small" color="error" onClick={() => kickMember(doc.uid)}>
                                            <PersonRemove fontSize="small" />
                                        </IconButton>
                                    )}
                                </ListItem>
                            ))}
                        </List>
                    )}
                </CardContent>
            </Card>
          </>
      )}
    </Box>
  );
}