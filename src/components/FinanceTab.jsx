// src/components/FinanceTab.jsx
import React, { useState } from 'react';
import { 
  Box, Typography, Card, CardContent, CardActions, 
  List, ListItem, ListItemText, ListItemSecondaryAction, 
  IconButton, Button, Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  Select, MenuItem, InputLabel, FormControl, Tabs, Tab, Checkbox, FormControlLabel, Chip, Divider, Grid
} from '@mui/material';
import { 
  Add, Edit, Delete, AccountBalance, CheckCircle, RadioButtonUnchecked, 
  Loop, AttachMoney, Savings, CreditCard, CalendarToday 
} from '@mui/icons-material';
import { format } from 'date-fns';

export default function FinanceTab({ 
  accounts, payments, templates, myLinks, currentDate,
  onAddAccount, onUpdateAccount, 
  onAddPayment, onUpdatePayment, 
  onAddTemplate, onDeleteTemplate, 
  recurring, onAddRecurring, onUpdateRecurring, onDeleteRecurring,
  onUpdateBalance, onTogglePaid 
}) {
  const [subTab, setSubTab] = useState(0);
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openAccountDialog, setOpenAccountDialog] = useState(false);
  const [openRecurringDialog, setOpenRecurringDialog] = useState(false);

  const [editPayment, setEditPayment] = useState({ name: '', amount: '', accountId: '', isRecurring: false });
  const [editAccount, setEditAccount] = useState({ name: '', type: 'cash', balance: 0, billingDay: '', confirmationDay: '', paymentDay: '' });
  const [editRecurring, setEditRecurring] = useState({ name: '', amount: '', accountId: '', day: 25, isVariable: false, cycle: 'every' });

  const cashAccounts = accounts.filter(a => a.type !== 'credit');
  const creditAccounts = accounts.filter(a => a.type === 'credit');

  const handleOpenAddPayment = () => { setEditPayment({ id: null, name: '', amount: '', accountId: accounts[0]?.id || '', isRecurring: false }); setOpenPaymentDialog(true); };
  const handleSavePayment = () => { if(editPayment.name && editPayment.amount && editPayment.accountId){ const payData = { ...editPayment, amount: parseInt(editPayment.amount) }; if(editPayment.id) onUpdatePayment(payData); else onAddPayment(payData); setOpenPaymentDialog(false); } };
  const handleOpenAddRecurring = () => { setEditRecurring({ id: null, name: '', amount: '', accountId: accounts[0]?.id || '', day: 25, isVariable: false, cycle: 'every' }); setOpenRecurringDialog(true); };
  const handleSaveRecurring = () => { if(editRecurring.name && editRecurring.accountId){ const recData = { ...editRecurring, amount: editRecurring.isVariable ? 0 : parseInt(editRecurring.amount || 0) }; if(editRecurring.id) onUpdateRecurring(recData); else onAddRecurring(recData); setOpenRecurringDialog(false); } };

  const currentMonthStr = format(currentDate, 'yyyy-MM');
  const monthPayments = payments.filter(p => p.month === currentMonthStr);

  return (
    <Box>
      <Tabs value={subTab} onChange={(e,v)=>setSubTab(v)} variant="fullWidth" sx={{mb:2, borderBottom:1, borderColor:'divider'}}>
        <Tab icon={<AttachMoney/>} label="収支" />
        <Tab icon={<Loop/>} label="固定費" />
        <Tab icon={<AccountBalance/>} label="資産" />
        <Tab icon={<CreditCard/>} label="カード" />
      </Tabs>

      {subTab === 0 && (
        <Box>
           <Card sx={{mb:2}}>
             <CardContent>
               <Box sx={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                 <Typography variant="h6">今月の出費</Typography>
                 <Button startIcon={<Add/>} variant="contained" size="small" onClick={handleOpenAddPayment}>記録</Button>
               </Box>
               <Divider sx={{my:1}}/>
               <List dense>
                 {monthPayments.map(p => (
                   <ListItem key={p.id} secondaryAction={<IconButton edge="end" onClick={()=>onTogglePaid(p.id)}>{p.paid ? <CheckCircle color="success"/> : <RadioButtonUnchecked/>}</IconButton>}>
                     <ListItemText primary={p.name} secondary={`${accounts.find(a=>a.id===p.accountId)?.name || '不明'} • ¥${p.amount.toLocaleString()}`} />
                   </ListItem>
                 ))}
                 {monthPayments.length === 0 && <Typography variant="body2" color="textSecondary" align="center">記録がありません</Typography>}
               </List>
             </CardContent>
           </Card>
           <Box sx={{display:'flex', gap:1, flexWrap:'wrap'}}>
             {templates.map(t => (<Chip key={t.id} label={t.name} onClick={()=>{ setEditPayment({ id: null, name: t.name, amount: '', accountId: t.accountId || accounts[0]?.id || '', isRecurring: false }); setOpenPaymentDialog(true); }} onDelete={()=>onDeleteTemplate(t.id)} />))}
             <Chip icon={<Add/>} label="テンプレ登録" variant="outlined" onClick={()=>{ const name = prompt("テンプレート名"); if(name) onAddTemplate(name); }}/>
           </Box>
        </Box>
      )}

      {subTab === 1 && (
         <Box>
            <Button fullWidth startIcon={<Add/>} variant="outlined" sx={{mb:2}} onClick={handleOpenAddRecurring}>固定費を追加</Button>
            <List>
              {recurring.map(rec => (
                <ListItem key={rec.id} sx={{bgcolor:'white', mb:1, borderRadius:1, boxShadow:1}}>
                  <ListItemText primary={rec.name} secondary={`${rec.day}日払い • ${rec.isVariable ? '変動' : `¥${parseInt(rec.amount).toLocaleString()}`} • ${rec.cycle==='every'?'毎月':(rec.cycle==='odd'?'奇数月':'偶数月')}`} />
                  <ListItemSecondaryAction>
                     <IconButton size="small" onClick={()=>{ setEditRecurring(rec); setOpenRecurringDialog(true); }}><Edit/></IconButton>
                     <IconButton size="small" color="error" onClick={()=>{ if(window.confirm('削除しますか？')) onDeleteRecurring(rec.id); }}><Delete/></IconButton>
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
         </Box>
      )}

      {subTab === 2 && (
        <Box>
           <Button fullWidth startIcon={<Add/>} variant="outlined" sx={{mb:2}} onClick={()=>{ setEditAccount({name:'', type:'cash', balance:0, billingDay:'', confirmationDay:'', paymentDay:''}); setOpenAccountDialog(true); }}>銀行口座・財布を追加</Button>
           <Grid container spacing={2}>
             {cashAccounts.map(acc => (
               <Grid item xs={12} key={acc.id}>
                 <Card>
                   <CardContent sx={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                      <Box sx={{display:'flex', alignItems:'center'}}>
                        <Savings sx={{mr:1, color:'green'}}/>
                        <Typography variant="subtitle1">{acc.name}</Typography>
                      </Box>
                      <Typography variant="h6">¥{acc.balance.toLocaleString()}</Typography>
                   </CardContent>
                   <CardActions sx={{justifyContent:'flex-end', pt:0}}>
                      <Button size="small" onClick={()=>{ const val = prompt("現在の残高を入力", acc.balance); if(val !== null) onUpdateBalance(acc.id, val); }}>残高修正</Button>
                   </CardActions>
                 </Card>
               </Grid>
             ))}
           </Grid>
        </Box>
      )}

      {subTab === 3 && (
        <Box>
           <Button fullWidth startIcon={<Add/>} variant="outlined" sx={{mb:2}} onClick={()=>{ setEditAccount({name:'', type:'credit', balance:0, billingDay:'', confirmationDay:'', paymentDay:''}); setOpenAccountDialog(true); }}>クレジットカードを追加</Button>
           <Grid container spacing={2}>
             {creditAccounts.map(acc => (
               <Grid item xs={12} key={acc.id}>
                 <Card>
                   <CardContent>
                      <Box sx={{display:'flex', justifyContent:'space-between', alignItems:'center', mb:1}}>
                        <Box sx={{display:'flex', alignItems:'center'}}>
                            <CreditCard sx={{mr:1, color:'blue'}}/>
                            <Typography variant="subtitle1">{acc.name}</Typography>
                        </Box>
                        <Typography variant="h6" color="error">¥{acc.balance.toLocaleString()}</Typography>
                      </Box>
                      <Box sx={{display:'flex', gap:1, flexWrap:'wrap', fontSize:12, color:'text.secondary', bgcolor:'#f5f5f5', p:1, borderRadius:1}}>
                          <Box>〆日: {acc.billingDay || '--'}日</Box>
                          <Box>確定日: {acc.confirmationDay || '--'}日</Box>
                          <Box>引落日: {acc.paymentDay || '--'}日</Box>
                      </Box>
                   </CardContent>
                   <CardActions sx={{justifyContent:'flex-end', pt:0}}>
                      <Button size="small" color="primary" variant="contained" onClick={()=>{ 
                          const val = prompt(`${acc.name}の確定した請求額を入力してください`, acc.balance); 
                          if(val !== null) onUpdateBalance(acc.id, val); 
                      }}>確定額を入力</Button>
                   </CardActions>
                 </Card>
               </Grid>
             ))}
           </Grid>
        </Box>
      )}

      <Dialog open={openPaymentDialog} onClose={()=>setOpenPaymentDialog(false)}>
        <DialogTitle>出費を記録</DialogTitle>
        <DialogContent>
           <TextField label="項目名" fullWidth margin="dense" value={editPayment.name} onChange={e=>setEditPayment({...editPayment, name:e.target.value})} />
           <TextField label="金額" type="number" fullWidth margin="dense" value={editPayment.amount} onChange={e=>setEditPayment({...editPayment, amount:e.target.value})} />
           <FormControl fullWidth margin="dense"><InputLabel>支払元</InputLabel><Select value={editPayment.accountId} label="支払元" onChange={e=>setEditPayment({...editPayment, accountId:e.target.value})}>{accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}</Select></FormControl>
        </DialogContent>
        <DialogActions><Button onClick={()=>setOpenPaymentDialog(false)}>キャンセル</Button><Button onClick={handleSavePayment} variant="contained">保存</Button></DialogActions>
      </Dialog>

      <Dialog open={openRecurringDialog} onClose={()=>setOpenRecurringDialog(false)}>
        <DialogTitle>{editRecurring.id ? '固定費を編集' : '固定費を追加'}</DialogTitle>
        <DialogContent>
           <TextField label="項目名" fullWidth margin="dense" value={editRecurring.name} onChange={e=>setEditRecurring({...editRecurring, name:e.target.value})} />
           <FormControlLabel control={<Checkbox checked={editRecurring.isVariable} onChange={e=>setEditRecurring({...editRecurring, isVariable: e.target.checked})}/>} label="金額は毎月変動する" sx={{mt:1, mb:1, display:'block'}}/>
           <TextField label="設定金額" type="number" fullWidth margin="dense" value={editRecurring.amount} disabled={editRecurring.isVariable} placeholder={editRecurring.isVariable ? "毎月入力します" : ""} onChange={e=>setEditRecurring({...editRecurring, amount:e.target.value})} />
           <Grid container spacing={2} sx={{mt:0}}>
             <Grid item xs={6}><TextField label="支払日" type="number" fullWidth value={editRecurring.day} onChange={e=>setEditRecurring({...editRecurring, day:parseInt(e.target.value)})} /></Grid>
             <Grid item xs={6}><FormControl fullWidth><InputLabel>サイクル</InputLabel><Select value={editRecurring.cycle} label="サイクル" onChange={e=>setEditRecurring({...editRecurring, cycle:e.target.value})}><MenuItem value="every">毎月</MenuItem><MenuItem value="odd">奇数月</MenuItem><MenuItem value="even">偶数月</MenuItem></Select></FormControl></Grid>
           </Grid>
           <FormControl fullWidth margin="dense" sx={{mt:2}}><InputLabel>支払元</InputLabel><Select value={editRecurring.accountId} label="支払元" onChange={e=>setEditRecurring({...editRecurring, accountId:e.target.value})}>{accounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}</Select></FormControl>
        </DialogContent>
        <DialogActions><Button onClick={()=>setOpenRecurringDialog(false)}>キャンセル</Button><Button onClick={handleSaveRecurring} variant="contained">保存</Button></DialogActions>
      </Dialog>
      
       <Dialog open={openAccountDialog} onClose={()=>setOpenAccountDialog(false)}>
        <DialogTitle>口座・カード追加</DialogTitle>
        <DialogContent>
           <TextField label="名称" fullWidth margin="dense" value={editAccount.name} onChange={e=>setEditAccount({...editAccount, name:e.target.value})} />
           <FormControl fullWidth margin="dense"><InputLabel>種類</InputLabel><Select value={editAccount.type} label="種類" onChange={e=>setEditAccount({...editAccount, type:e.target.value})}><MenuItem value="cash">現金・銀行</MenuItem><MenuItem value="credit">クレジットカード</MenuItem></Select></FormControl>
           <TextField label="現在の残高" type="number" fullWidth margin="dense" value={editAccount.balance} onChange={e=>setEditAccount({...editAccount, balance:e.target.value})} />
           {editAccount.type === 'credit' && (
             <Box sx={{display:'flex', gap:2, mt:1, flexWrap:'wrap'}}>
               <TextField label="締め日" type="number" sx={{width:'30%'}} value={editAccount.billingDay} onChange={e=>setEditAccount({...editAccount, billingDay:parseInt(e.target.value)})} />
               <TextField label="確定日" type="number" sx={{width:'30%'}} value={editAccount.confirmationDay} onChange={e=>setEditAccount({...editAccount, confirmationDay:parseInt(e.target.value)})} />
               <TextField label="引落日" type="number" sx={{width:'30%'}} value={editAccount.paymentDay} onChange={e=>setEditAccount({...editAccount, paymentDay:parseInt(e.target.value)})} />
             </Box>
           )}
        </DialogContent>
        <DialogActions><Button onClick={()=>setOpenAccountDialog(false)}>キャンセル</Button><Button onClick={()=>{ if(editAccount.name){ onAddAccount({ ...editAccount, id: Date.now(), balance: parseInt(editAccount.balance) }); setOpenAccountDialog(false); }}} variant="contained">保存</Button></DialogActions>
      </Dialog>
    </Box>
  );
}