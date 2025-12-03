// src/components/FinanceTab.jsx
import React, { useState } from 'react';
import { 
  Box, Typography, Button, Card, CardContent, TextField, Divider, List, ListItem, 
  ListItemIcon, ListItemText, IconButton, Alert, Dialog, DialogTitle, DialogContent, 
  DialogActions, Chip, FormControl, InputLabel, Select, MenuItem, Grid, Switch, FormControlLabel
} from '@mui/material';
import { AddCircleOutline, CheckCircle, ErrorOutline, CreditCard, Add, Delete, OpenInNew, AttachMoney, AccountBalanceWallet, Edit, Repeat, Link as LinkIcon } from '@mui/icons-material';
import { format, parseISO, set, subMonths, addDays, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

const getTargetPeriod = (currentDate, billingDay, type) => {
  if (type !== 'credit' || !billingDay || billingDay >= 31) {
    return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
  }
  const currentMonthEndpoint = set(currentDate, { date: billingDay });
  const prevMonthEndpoint = set(subMonths(currentDate, 1), { date: billingDay });
  return { start: addDays(prevMonthEndpoint, 1), end: currentMonthEndpoint };
};

export default function FinanceTab({ accounts, payments, templates, myLinks, onAddAccount, onAddPayment, onUpdatePayment, onDeleteTemplate, onUpdateBalance, onTogglePaid, recurring, onAddRecurring, onUpdateRecurring, onDeleteRecurring, currentDate, onUpdateAccount }) {
  
  const [openAccDialog, setOpenAccDialog] = useState(false);
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [openRecDialog, setOpenRecDialog] = useState(false);
  
  const [openEditPayDialog, setOpenEditPayDialog] = useState(false);
  const [editingPay, setEditingPay] = useState(null);

  const initialAccState = { id: null, name: '', balance: '', linkUrl: '', type: 'bank', billingDay: 27, paymentDay: 12, confirmationDay: 10 };
  const [editingAcc, setEditingAcc] = useState(initialAccState);

  const [newPay, setNewPay] = useState({ name: '', amount: '', accountId: '' });
  
  const initialRecState = { id: null, name: '', amount: '', day: '25', cycle: '1', isVariable: false, accountId: '', linkUrl: '' };
  const [editingRec, setEditingRec] = useState(initialRecState);

  const safeAccounts = accounts || [];
  const safeRecurring = recurring || [];
  const safeTemplates = templates || [];
  const safeLinks = myLinks || [];

  const handleOpenAccDialog = (acc = null) => {
    if (acc) { setEditingAcc({ ...acc, balance: acc.balance.toString() }); } 
    else { setEditingAcc({ ...initialAccState, id: Date.now() }); }
    setOpenAccDialog(true);
  };

  const handleSaveAccount = () => {
    if(editingAcc.name) {
      const accData = { 
        ...editingAcc,
        balance: parseInt(editingAcc.balance) || 0, 
        billingDay: editingAcc.type === 'credit' ? parseInt(editingAcc.billingDay) : undefined, 
        paymentDay: editingAcc.type === 'credit' ? parseInt(editingAcc.paymentDay) : undefined,
        confirmationDay: editingAcc.type === 'credit' ? parseInt(editingAcc.confirmationDay) : undefined,
      };
      const isExist = safeAccounts.some(a => a.id === editingAcc.id);
      if (isExist) onUpdateAccount(accData); else onAddAccount(accData);
      setOpenAccDialog(false);
    }
  };

  const handleSavePayment = () => {
    if(newPay.name && newPay.amount && newPay.accountId) {
      onAddPayment({
          name: newPay.name, 
          amount: parseInt(newPay.amount), 
          accountId: newPay.accountId,
          isSettled: safeAccounts.find(a=>a.id===parseInt(newPay.accountId))?.type !== 'credit'
      });
      setOpenPayDialog(false);
      setNewPay({ name: '', amount: '', accountId: '' });
    }
  };
  
  const handleUpdatePaymentItem = () => {
      if (editingPay && editingPay.amount) {
          onUpdatePayment({ ...editingPay, amount: parseInt(editingPay.amount), isSettled: true });
          setOpenEditPayDialog(false);
          setEditingPay(null);
      }
  };
  
  const handleSaveRecurring = () => {
     if(editingRec.name && editingRec.accountId) {
         const recData = {
              ...editingRec,
              id: editingRec.id || Date.now(),
              amount: editingRec.amount ? parseInt(editingRec.amount) : 0,
              day: parseInt(editingRec.day)
          };
          if (editingRec.id && safeRecurring.some(r => r.id === editingRec.id)) {
              onUpdateRecurring(recData); 
          } else {
              onAddRecurring(recData); 
          }
          setEditingRec(initialRecState);
     }
  };
  
  const handleEditRecurring = (rec) => {
      setEditingRec({ ...rec, amount: rec.amount.toString() });
      setOpenRecDialog(true);
  };

  const getAccountIcon = (type) => {
    switch (type) {
        case 'credit': return <CreditCard sx={{color: '#9c27b0'}} />;
        case 'cash': return <AttachMoney sx={{color: '#4caf50'}} />;
        case 'bank': return <AccountBalanceWallet sx={{color: '#1976d2'}} />;
        default: return <AccountBalanceWallet />;
    }
  };

  return (
    <Box>
      <Box sx={{ mb: 2, overflowX: 'auto', whiteSpace: 'nowrap', py: 1 }}>
        {safeTemplates.map(tmpl => (
          <Chip key={tmpl.id} icon={<CreditCard />} label={tmpl.name} onClick={() => { setNewPay({ name: tmpl.name, amount: '', accountId: safeAccounts.find(a => a.type !== 'credit')?.id || '' }); setOpenPayDialog(true); }} onDelete={() => onDeleteTemplate(tmpl.id)} sx={{ mr: 1 }} color="primary" variant="outlined" />
        ))}
        <Chip label="＋項目" onClick={() => { const n=prompt("項目名"); if(n) onAddTemplate(n); }} sx={{bgcolor:'#e3f2fd'}} />
      </Box>

      <Box sx={{display:'flex', justifyContent:'space-between', alignItems:'center', mb:2}}>
          <Typography variant="h6">🏦 口座・固定費</Typography>
          <Box>
            <Button variant="outlined" size="small" sx={{mr:1}} onClick={() => { setEditingRec(initialRecState); setOpenRecDialog(true); }} startIcon={<Repeat/>}>固定費</Button>
            <Button variant="contained" size="small" onClick={() => handleOpenAccDialog()} startIcon={<AddCircleOutline />}>口座追加</Button>
          </Box>
      </Box>

      {safeAccounts.map(acc => {
          const isCredit = acc.type === 'credit';
          const period = getTargetPeriod(currentDate, acc.billingDay, acc.type);
          const accPayments = payments.filter(p => { if (p.accountId !== acc.id) return false; if (p.date) { return isWithinInterval(parseISO(p.date), period); } else { return p.month === format(currentDate, 'yyyy-MM'); } });
          const totalPay = accPayments.filter(p => !p.paid).reduce((sum, p) => sum + p.amount, 0);
          const totalUnsettled = isCredit ? payments.filter(p => p.accountId === acc.id && !p.isSettled).reduce((sum, p) => sum + p.amount, 0) : 0;
          
          return (
              <Card key={acc.id} sx={{ mb: 2, borderLeft: (acc.type === 'bank' || acc.type === 'cash') && acc.balance < totalPay ? '5px solid red' : '5px solid green' }}>
                  <CardContent>
                      <Box sx={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <Box sx={{display:'flex', alignItems:'center'}}>
                            {getAccountIcon(acc.type)}
                            <Typography variant="h6" sx={{ml:1, mr:1}}>{acc.name}</Typography>
                            <IconButton size="small" onClick={() => handleOpenAccDialog(acc)}><Edit fontSize="small"/></IconButton>
                            {acc.linkUrl && (
                                <IconButton size="small" color="primary" onClick={() => window.open(acc.linkUrl, '_blank')}><OpenInNew fontSize="small"/></IconButton>
                            )}
                          </Box>
                          {isCredit ? ( <Box sx={{textAlign:'right'}}> <Typography variant="caption" color="textSecondary">全期間の未確定:</Typography> <Typography color={totalUnsettled > 0 ? 'error' : 'primary'} fontWeight="bold">¥{totalUnsettled.toLocaleString()}</Typography> </Box> ) : ( <Typography color={acc.balance < totalPay ? 'error' : 'primary'} fontWeight="bold">残り: ¥{(acc.balance - totalPay).toLocaleString()}</Typography> )}
                      </Box>
                      {acc.type !== 'credit' ? ( <Box sx={{my: 1, p:1, bgcolor: '#f5f5f5', borderRadius: 1}}> <Typography variant="caption" color="textSecondary">現在残高</Typography> <TextField variant="standard" fullWidth value={acc.balance} type="number" onChange={(e) => onUpdateBalance(acc.id, e.target.value)} InputProps={{ startAdornment: <Typography sx={{mr:1}}>¥</Typography> }} /> </Box> ) : ( <Alert severity="info" sx={{my:1, p:1}}> {acc.billingDay}日締: <b>{isCredit ? `${format(period.start, 'M/d')}〜${format(period.end, 'M/d')}利用分` : '今月の予定'}</b><br/> <span style={{fontSize:10}}>確定:{acc.confirmationDay || '未設定'}日 / 引落:{acc.paymentDay}日</span> </Alert> )}
                      <Divider sx={{my:1}} />
                      <List dense>
                          {accPayments.map(pay => ( 
                              <ListItem key={pay.id} disablePadding secondaryAction={<IconButton size="small" onClick={() => onTogglePaid(pay.id)}>{pay.paid ? <CheckCircle color="success" /> : <ErrorOutline color="action" />}</IconButton>}>
                                  <ListItemText 
                                      primary={pay.name} 
                                      secondary={`¥${pay.amount.toLocaleString()} ${!pay.isSettled ? '(未確定)' : ''}`} 
                                      sx={{textDecoration: pay.paid ? 'line-through' : 'none', cursor: 'pointer', color: !pay.isSettled ? 'orange' : 'inherit'}} 
                                      onClick={() => { setEditingPay(pay); setOpenEditPayDialog(true); }}
                                  />
                              </ListItem> 
                          ))}
                          {accPayments.length === 0 && <Typography variant="caption" sx={{p:1}}>利用なし</Typography>}
                      </List>
                      {isCredit && accPayments.length > 0 && ( <Box sx={{textAlign:'right', mt:1}}> <Typography variant="caption">この期間の合計: </Typography> <Typography variant="body2" fontWeight="bold">¥{accPayments.reduce((sum,p)=>sum+p.amount,0).toLocaleString()}</Typography> </Box> )}
                  </CardContent>
              </Card>
          );
      })}

      {/* 口座編集・追加ダイアログ */}
      <Dialog open={openAccDialog} onClose={() => setOpenAccDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editingAcc.id ? '設定を編集' : '新しい口座'}</DialogTitle>
        <DialogContent sx={{pt: 2}}>
            <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
                <InputLabel>タイプ</InputLabel>
                <Select value={editingAcc.type} label="タイプ" onChange={(e) => setEditingAcc({...editingAcc, type:e.target.value})}>
                    <MenuItem value="bank">銀行口座</MenuItem>
                    <MenuItem value="credit">クレジットカード</MenuItem>
                    <MenuItem value="cash">現金 (手持ち)</MenuItem>
                </Select>
            </FormControl>
            <TextField label="名前" fullWidth sx={{ mb: 3 }} value={editingAcc.name} onChange={(e) => setEditingAcc({...editingAcc, name:e.target.value})} />
            {editingAcc.type !== 'credit' && ( <TextField label="現在の残高" type="number" fullWidth sx={{ mb: 3 }} value={editingAcc.balance} onChange={(e) => setEditingAcc({...editingAcc, balance:e.target.value})} /> )}
            {editingAcc.type === 'credit' && ( <Grid container spacing={2} sx={{mb: 3}}> <Grid item xs={4}> <TextField label="締め日" type="number" fullWidth value={editingAcc.billingDay} onChange={(e) => setEditingAcc({...editingAcc, billingDay: e.target.value})} /> </Grid> <Grid item xs={4}> <TextField label="確定日" type="number" fullWidth value={editingAcc.confirmationDay} onChange={(e) => setEditingAcc({...editingAcc, confirmationDay: e.target.value})} /> </Grid> <Grid item xs={4}> <TextField label="引落日" type="number" fullWidth value={editingAcc.paymentDay} onChange={(e) => setEditingAcc({...editingAcc, paymentDay: e.target.value})} /> </Grid> </Grid> )}
            
            {/* 連携サイト選択 */}
            <FormControl fullWidth sx={{mt: 2}}>
                <InputLabel shrink>連携サイト (MyLinks)</InputLabel>
                <Select value={editingAcc.linkUrl || ''} label="連携サイト (MyLinks)" onChange={(e) => setEditingAcc({...editingAcc, linkUrl:e.target.value})} displayEmpty>
                    <MenuItem value=""><em>連携なし</em></MenuItem>
                    {safeLinks.map(link => <MenuItem key={link.id} value={link.url}>{link.name}</MenuItem>)}
                </Select>
            </FormControl>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenAccDialog(false)}>キャンセル</Button>
            <Button onClick={handleSaveAccount} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      {/* 支払い追加ダイアログ */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)}>
        <DialogTitle>支払いを追加</DialogTitle>
        <DialogContent sx={{pt: 2}}>
          <TextField label="項目名" fullWidth sx={{ mt: 2, mb: 3 }} value={newPay.name} onChange={(e) => setNewPay({...newPay, name:e.target.value})} />
          <TextField label="金額" type="number" fullWidth autoFocus sx={{ mb: 3 }} value={newPay.amount} onChange={(e) => setNewPay({...newPay, amount:e.target.value})} />
          <FormControl fullWidth>
            <InputLabel>口座</InputLabel>
            <Select value={newPay.accountId} label="口座" onChange={(e) => setNewPay({...newPay, accountId:e.target.value})}>
              {safeAccounts.map(acc => <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenPayDialog(false)}>キャンセル</Button>
            <Button onClick={handleSavePayment} variant="contained">登録</Button>
        </DialogActions>
      </Dialog>

      {/* 固定費管理ダイアログ */}
      <Dialog open={openRecDialog} onClose={() => setOpenRecDialog(false)}>
        <DialogTitle>固定費・サブスク管理</DialogTitle>
        <DialogContent sx={{pt: 2}}>
            <Typography variant="subtitle2" gutterBottom color="primary">{editingRec.id ? '編集' : '新規登録'}</Typography>
            <Grid container spacing={1} sx={{mb: 3, borderBottom:'1px solid #eee', pb:2}}>
                <Grid item xs={12}><TextField label="名称" size="small" fullWidth value={editingRec.name} onChange={(e)=>setEditingRec({...editingRec, name:e.target.value})} placeholder="例: 電気代" /></Grid>
                <Grid item xs={6}><FormControl fullWidth size="small"><InputLabel>サイクル</InputLabel><Select value={editingRec.cycle} label="サイクル" onChange={(e)=>setEditingRec({...editingRec, cycle: e.target.value})}><MenuItem value="1">毎月</MenuItem><MenuItem value="odd">奇数月</MenuItem><MenuItem value="even">偶数月</MenuItem></Select></FormControl></Grid>
                <Grid item xs={6}><TextField label="支払日" type="number" size="small" fullWidth value={editingRec.day} onChange={(e)=>setEditingRec({...editingRec, day:e.target.value})} /></Grid>
                <Grid item xs={6}><TextField label="金額" size="small" type="number" fullWidth value={editingRec.amount} onChange={(e)=>setEditingRec({...editingRec, amount:e.target.value})} disabled={editingRec.isVariable} placeholder={editingRec.isVariable ? "変動" : "0"} /></Grid>
                <Grid item xs={6}><FormControlLabel control={<Switch checked={editingRec.isVariable} onChange={(e)=>setEditingRec({...editingRec, isVariable: e.target.checked})} />} label={<Typography variant="caption">金額は毎月変わる</Typography>} /></Grid>
                
                {/* ★追加: 引き落とし口座選択 */}
                <Grid item xs={12}>
                    <FormControl fullWidth size="small">
                        <InputLabel>引き落とし口座</InputLabel>
                        <Select value={editingRec.accountId} label="引き落とし口座" onChange={(e)=>setEditingRec({...editingRec, accountId:e.target.value})}>
                            {safeAccounts.map(acc => <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>
                {/* ★追加: 連携サイト選択（文字被り防止にmt追加） */}
                <Grid item xs={12} sx={{mt: 2}}>
                    <FormControl fullWidth size="small">
                        <InputLabel shrink>明細確認サイト(MyLinks)</InputLabel>
                        <Select value={editingRec.linkUrl || ''} label="明細確認サイト(MyLinks)" onChange={(e)=>setEditingRec({...editingRec, linkUrl:e.target.value})} displayEmpty>
                             <MenuItem value=""><em>設定なし</em></MenuItem>
                             {safeLinks.map(link => <MenuItem key={link.id} value={link.url}>{link.name}</MenuItem>)}
                        </Select>
                    </FormControl>
                </Grid>

                <Grid item xs={12} sx={{mt:1}}>
                    <Button variant="contained" fullWidth onClick={handleSaveRecurring} disabled={!editingRec.name || !editingRec.accountId}>{editingRec.id ? '更新' : '追加'}</Button>
                </Grid>
                {editingRec.id && <Grid item xs={12}><Button fullWidth onClick={() => setEditingRec(initialRecState)} size="small">キャンセル（新規に戻る）</Button></Grid>}
            </Grid>

            <List dense>
                {safeRecurring.map(rec => {
                    const recAcc = safeAccounts.find(a => a.id === rec.accountId);
                    return (
                        <ListItem key={rec.id} secondaryAction={
                            <Box>
                                {/* ★リンクがあれば開くボタン */}
                                {rec.linkUrl && (
                                    <IconButton onClick={() => window.open(rec.linkUrl, '_blank')} color="primary">
                                        <OpenInNew fontSize="small"/>
                                    </IconButton>
                                )}
                                <IconButton onClick={() => handleEditRecurring(rec)}><Edit fontSize="small"/></IconButton>
                                <IconButton edge="end" onClick={() => onDeleteRecurring(rec.id)}><Delete fontSize="small"/></IconButton>
                            </Box>
                        }>
                            <ListItemText 
                                primary={rec.name} 
                                secondary={`${rec.isVariable ? '変動' : '¥'+rec.amount.toLocaleString()} / ${rec.cycle==='odd'?'奇数':rec.cycle==='even'?'偶数':'毎月'}${rec.day}日 (${recAcc?.name || '口座不明'})`} 
                            />
                        </ListItem>
                    );
                })}
                {safeRecurring.length === 0 && <Typography variant="caption">登録がありません</Typography>}
            </List>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenRecDialog(false)}>閉じる</Button></DialogActions>
      </Dialog>

      {/* 支払い修正ダイアログ */}
      <Dialog open={!!editingPay} onClose={() => setOpenEditPayDialog(false)}>
        <DialogTitle>金額の修正</DialogTitle>
        <DialogContent sx={{pt:2}}>
            <Typography variant="subtitle1" gutterBottom>{editingPay?.name}</Typography>
            <TextField 
                label="金額" type="number" fullWidth autoFocus 
                value={editingPay?.amount || ''} 
                onChange={(e) => setEditingPay({...editingPay, amount: e.target.value})} 
            />
            <Typography variant="caption" color="textSecondary" sx={{mt:1, display:'block'}}>
                金額を入力して「保存」すると確定されます。
            </Typography>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => { setOpenEditPayDialog(false); setEditingPay(null); }}>キャンセル</Button>
            <Button onClick={handleUpdatePaymentItem} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}