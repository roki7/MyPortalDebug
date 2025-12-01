// src/components/FinanceTab.jsx
import React, { useState } from 'react';
import { 
  Box, Typography, Button, Card, CardContent, TextField, Divider, List, ListItem, 
  ListItemIcon, ListItemText, IconButton, Alert, Dialog, DialogTitle, DialogContent, 
  DialogActions, Chip, FormControl, InputLabel, Select, MenuItem, Grid, Switch, FormControlLabel, Stack
} from '@mui/material';
import { AddCircleOutline, CheckCircle, ErrorOutline, CreditCard, Add, Delete, OpenInNew, AttachMoney, AccountBalanceWallet, Smartphone, Language, Edit, Save } from '@mui/icons-material';
import { format, parseISO, set, subMonths, addDays, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

const getTargetPeriod = (currentDate, billingDay, type) => {
  if (type !== 'credit' || !billingDay || billingDay >= 31) {
    return { start: startOfMonth(currentDate), end: endOfMonth(currentDate) };
  }
  const currentMonthEndpoint = set(currentDate, { date: billingDay });
  const prevMonthEndpoint = set(subMonths(currentDate, 1), { date: billingDay });
  return { start: addDays(prevMonthEndpoint, 1), end: currentMonthEndpoint };
};

// アプリスキーム候補
const APP_SCHEMES = [
    { name: 'LINE', url: 'line://', short: 'LINE' },
    { name: 'PayPay', url: 'paypay://', short: 'Pay' },
    { name: 'Instagram', url: 'instagram://app', short: 'Insta' },
    { name: 'X(Twitter)', url: 'twitter://', short: 'X' },
    { name: 'Googleマップ', url: 'maps://', short: 'Map' },
    { name: 'Amazon', url: 'https://www.amazon.co.jp/', short: 'Amz' },
];

// ★修正: onAddMyApp -> onAddMyLink, onDeleteMyApp -> onDeleteMyLink に変更
export default function FinanceTab({ accounts, payments, templates, myLinks, onAddAccount, onAddPayment, onAddTemplate, onDeleteTemplate, onAddMyLink, onDeleteMyLink, onUpdateBalance, onTogglePaid, currentDate }) {
  
  const [openAccDialog, setOpenAccDialog] = useState(false);
  const [openPayDialog, setOpenPayDialog] = useState(false);
  
  // MyLinks用
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false); 
  
  const initialLinkState = { id: null, name: '', url: '', autoInput: true, browserMode: 'in-app' };
  const [editingLink, setEditingLink] = useState(initialLinkState);

  const [newAcc, setNewAcc] = useState({ name: '', balance: '', linkUrl: '', type: 'bank', billingDay: 27, paymentDay: 12, confirmationDay: 10 }); 
  const [newPay, setNewPay] = useState({ name: '', amount: '', accountId: '' });

  // --- ハンドラー ---

  const handleSaveAccount = () => {
    if(newAcc.name) {
      onAddAccount({ 
        id: Date.now(), 
        name: newAcc.name, 
        balance: parseInt(newAcc.balance) || 0, 
        linkUrl: newAcc.linkUrl,
        type: newAcc.type, 
        billingDay: newAcc.type === 'credit' ? parseInt(newAcc.billingDay) : undefined, 
        paymentDay: newAcc.type === 'credit' ? parseInt(newAcc.paymentDay) : undefined,
        confirmationDay: newAcc.type === 'credit' ? parseInt(newAcc.confirmationDay) : undefined,
      });
      setOpenAccDialog(false);
      setNewAcc({ name: '', balance: '', linkUrl: '', type: 'bank', billingDay: 27, paymentDay: 12, confirmationDay: 10 });
    }
  };

  // MyLinksの保存（追加・更新）
  const handleSaveMyLink = () => {
    if(editingLink.name && editingLink.url) {
      const newLinkData = { 
          id: editingLink.id || 'link_'+Date.now(), 
          name: editingLink.name, 
          url: editingLink.url, 
          autoInput: editingLink.autoInput,
          browserMode: editingLink.browserMode,
          icon: '🔗' 
      };
      
      if (editingLink.id) {
          // ★修正: 正しい props 名で呼ぶ
          onDeleteMyLink(editingLink.id);
          onAddMyLink(newLinkData);
      } else {
          onAddMyLink(newLinkData);
      }
      setOpenLinkDialog(false);
      setEditingLink(initialLinkState);
    }
  };

  const handleSavePayment = () => {
    if(newPay.name && newPay.amount && newPay.accountId) {
      onAddPayment({...newPay, isSettled: accounts.find(a=>a.id===parseInt(newPay.accountId))?.type !== 'credit'});
      setOpenPayDialog(false);
      setNewPay({ name: '', amount: '', accountId: '' });
    }
  };
  
  const getAccountIcon = (type) => {
    switch (type) {
        case 'credit': return <CreditCard sx={{color: '#9c27b0'}} />;
        case 'cash': return <AttachMoney sx={{color: '#4caf50'}} />;
        case 'bank': return <AccountBalanceWallet sx={{color: '#1976d2'}} />;
        default: return <AccountBalanceWallet />;
    }
  };

  const getLinkIcon = (url) => {
      if (!url) return <OpenInNew sx={{fontSize:12}}/>;
      if (url.startsWith('http')) return <Language sx={{fontSize:12}}/>; 
      return <Smartphone sx={{fontSize:12}}/>;
  };

  const handleOpenLink = (link) => {
      if (!link || !link.url) return;
      
      const url = link.url;
      const isWeb = url.startsWith('http');

      if (isWeb) {
          if (link.browserMode === 'external') {
             window.open(url, '_blank'); 
          } else {
             window.open(url, '_blank'); 
          }
      } else {
          window.location.href = url;
      }

      if (link.autoInput) {
        const defaultAcc = accounts.find(a => a.type === 'credit') || accounts[0];
        setNewPay({ name: link.name, amount: '', accountId: defaultAcc?.id || '' });
        setOpenPayDialog(true);
      }
  };

  // ★修正: 不要になった重複定義 (const onAddMyApp = ...) を削除しました

  return (
    <Box>
      {/* MyLinks */}
      <Card sx={{ mb: 2, bgcolor: '#f3e5f5' }}>
        <CardContent sx={{py:1, px:2, '&:last-child': {paddingBottom: 1}}}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" fontWeight="bold">MyLinks (よく使うサイト)</Typography>
            <Button size="small" onClick={() => setIsEditMode(!isEditMode)} startIcon={isEditMode ? <Save/> : <Edit/>} sx={{minWidth:0}}>
                {isEditMode ? '完了' : '編集'}
            </Button>
          </Box>
          
          {isEditMode ? (
             <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', py: 1 }}>
                 <Chip icon={<Add />} label="新規追加" onClick={() => { setEditingLink({...initialLinkState}); setOpenLinkDialog(true); }} color="primary" clickable />
                 {myLinks.map(link => (
                  <Chip 
                    key={link.id} label={link.name} icon={<Edit sx={{fontSize:12}}/>}
                    onClick={() => { setEditingLink(link); setOpenLinkDialog(true); }} 
                    onDelete={() => onDeleteMyLink(link.id)} // ★修正
                    color="default" variant="outlined"
                    sx={{ bgcolor: 'white' }}
                  />
                ))}
             </Box>
          ) : (
             <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', py: 1 }}>
                {myLinks.map(link => (
                <Chip 
                    key={link.id} label={link.name} icon={getLinkIcon(link.url)}
                    onClick={() => handleOpenLink(link)} 
                    sx={{ bgcolor: 'white' }} size="small" clickable
                />
                ))}
                {myLinks.length === 0 && <Chip label="＋追加" onClick={() => { setEditingLink({...initialLinkState}); setOpenLinkDialog(true); }} />}
             </Box>
          )}
        </CardContent>
      </Card>

      {/* テンプレート */}
      <Box sx={{ mb: 2, overflowX: 'auto', whiteSpace: 'nowrap', py: 1 }}>
        {templates.map(tmpl => (
          <Chip key={tmpl.id} icon={<CreditCard />} label={tmpl.name} onClick={() => { setNewPay({ name: tmpl.name, amount: '', accountId: accounts.find(a => a.type !== 'credit')?.id || '' }); setOpenPayDialog(true); }} onDelete={() => onDeleteTemplate(tmpl.id)} sx={{ mr: 1 }} color="primary" variant="outlined" />
        ))}
        <Chip label="＋項目" onClick={() => { const n=prompt("項目名"); if(n) onAddTemplate(n); }} sx={{bgcolor:'#e3f2fd'}} />
      </Box>

      <Box sx={{display:'flex', justifyContent:'space-between', alignItems:'center', mb:2}}>
          <Typography variant="h6">🏦 口座管理</Typography>
          <Box>
            <Button variant="outlined" size="small" sx={{mr:1}} onClick={() => setOpenAccDialog(true)}>口座追加</Button>
            <Button variant="contained" size="small" onClick={() => {setNewPay({name:'', amount:'', accountId:''}); setOpenPayDialog(true);}} startIcon={<AddCircleOutline />}>支払追加</Button>
          </Box>
      </Box>

      {/* 口座リスト */}
      {accounts.map(acc => {
          const isCredit = acc.type === 'credit';
          const period = getTargetPeriod(currentDate, acc.billingDay, acc.type);
          const accPayments = payments.filter(p => { if (p.accountId !== acc.id) return false; if (p.date) { return isWithinInterval(parseISO(p.date), period); } else { return p.month === format(currentDate, 'yyyy-MM'); } });
          const totalPay = accPayments.filter(p => !p.paid).reduce((sum, p) => sum + p.amount, 0);
          const totalUnsettled = isCredit ? payments.filter(p => p.accountId === acc.id && !p.isSettled).reduce((sum, p) => sum + p.amount, 0) : 0;
          const periodText = isCredit ? `${format(period.start, 'M/d')}〜${format(period.end, 'M/d')}利用分` : '今月の予定';
          
          const accLinkObj = acc.linkUrl ? { url: acc.linkUrl, autoInput: true, browserMode: 'in-app' } : null;

          return (
              <Card key={acc.id} sx={{ mb: 2, borderLeft: (acc.type === 'bank' || acc.type === 'cash') && acc.balance < totalPay ? '5px solid red' : '5px solid green' }}>
                  <CardContent>
                      <Box sx={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <Box sx={{display:'flex', alignItems:'center'}}>
                            {getAccountIcon(acc.type)}
                            <Typography variant="h6" sx={{ml:1, mr:1}}>{acc.name}</Typography>
                            {acc.linkUrl && ( 
                                <IconButton size="small" color="primary" onClick={() => handleOpenLink(accLinkObj)}>
                                    {getLinkIcon(acc.linkUrl)}
                                </IconButton> 
                            )}
                          </Box>
                          {isCredit ? ( <Box sx={{textAlign:'right'}}> <Typography variant="caption" color="textSecondary">全期間の未確定:</Typography> <Typography color={totalUnsettled > 0 ? 'error' : 'primary'} fontWeight="bold">¥{totalUnsettled.toLocaleString()}</Typography> </Box> ) : ( <Typography color={acc.balance < totalPay ? 'error' : 'primary'} fontWeight="bold">残り: ¥{(acc.balance - totalPay).toLocaleString()}</Typography> )}
                      </Box>
                      {acc.type !== 'credit' ? ( <Box sx={{my: 1, p:1, bgcolor: '#f5f5f5', borderRadius: 1}}> <Typography variant="caption" color="textSecondary">現在残高</Typography> <TextField variant="standard" fullWidth value={acc.balance} type="number" onChange={(e) => onUpdateBalance(acc.id, e.target.value)} InputProps={{ startAdornment: <Typography sx={{mr:1}}>¥</Typography> }} /> </Box> ) : ( <Alert severity="info" sx={{my:1, p:1}}> {acc.billingDay}日締: <b>{periodText}</b> <br/> <span style={{fontSize:10}}>確定:{acc.confirmationDay || '未設定'}日 / 引落:{acc.paymentDay}日</span> </Alert> )}
                      <Divider sx={{my:1}} />
                      <List dense>
                          {accPayments.map(pay => ( <ListItem key={pay.id} disablePadding secondaryAction={<IconButton size="small" onClick={() => onTogglePaid(pay.id)}>{pay.paid ? <CheckCircle color="success" /> : <ErrorOutline color="action" />}</IconButton>}> <ListItemText primary={pay.name} secondary={`¥${pay.amount.toLocaleString()} (${format(parseISO(pay.date || new Date().toISOString()), 'M/d')})`} sx={{textDecoration: pay.paid ? 'line-through' : 'none'}} /> </ListItem> ))}
                          {accPayments.length === 0 && <Typography variant="caption" sx={{p:1}}>利用なし</Typography>}
                      </List>
                      {isCredit && accPayments.length > 0 && ( <Box sx={{textAlign:'right', mt:1}}> <Typography variant="caption">この期間の合計: </Typography> <Typography variant="body2" fontWeight="bold">¥{accPayments.reduce((sum,p)=>sum+p.amount,0).toLocaleString()}</Typography> </Box> )}
                  </CardContent>
              </Card>
          );
      })}

      <Dialog open={openAccDialog} onClose={() => setOpenAccDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>新しい口座/カード</DialogTitle>
        <DialogContent sx={{pt: 2}}>
            <FormControl fullWidth sx={{ mt: 2, mb: 3 }}>
                <InputLabel>タイプ</InputLabel>
                <Select value={newAcc.type} label="タイプ" onChange={(e) => setNewAcc({...newAcc, type:e.target.value, balance: e.target.value === 'credit' ? 0 : newAcc.balance})}>
                    <MenuItem value="bank">銀行口座</MenuItem>
                    <MenuItem value="credit">クレジットカード</MenuItem>
                    <MenuItem value="cash">現金 (手持ち)</MenuItem>
                </Select>
            </FormControl>
            <TextField label="名前" fullWidth sx={{ mb: 3 }} value={newAcc.name} onChange={(e) => setNewAcc({...newAcc, name:e.target.value})} />
            {newAcc.type !== 'credit' && ( <TextField label="現在の残高" type="number" fullWidth sx={{ mb: 3 }} value={newAcc.balance} onChange={(e) => setNewAcc({...newAcc, balance:e.target.value})} /> )}
            {newAcc.type === 'credit' && ( <Grid container spacing={2} sx={{mb: 3}}> <Grid item xs={4}> <TextField label="締め日" type="number" fullWidth value={newAcc.billingDay} onChange={(e) => setNewAcc({...newAcc, billingDay: e.target.value})} /> </Grid> <Grid item xs={4}> <TextField label="確定日" type="number" fullWidth value={newAcc.confirmationDay} onChange={(e) => setNewAcc({...newAcc, confirmationDay: e.target.value})} /> </Grid> <Grid item xs={4}> <TextField label="引落日" type="number" fullWidth value={newAcc.paymentDay} onChange={(e) => setNewAcc({...newAcc, paymentDay: e.target.value})} /> </Grid> </Grid> )}
            <FormControl fullWidth sx={{mt: 2}}> 
                <InputLabel>連携サイト (MyLinks)</InputLabel>
                <Select value={newAcc.linkUrl} label="連携サイト (MyLinks)" onChange={(e) => setNewAcc({...newAcc, linkUrl:e.target.value})} displayEmpty>
                    <MenuItem value=""><em>連携なし</em></MenuItem>
                    {myLinks.map(link => <MenuItem key={link.id} value={link.url}>{link.name}</MenuItem>)}
                </Select>
            </FormControl>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenAccDialog(false)}>キャンセル</Button>
            <Button onClick={handleSaveAccount} variant="contained" disabled={!newAcc.name}>登録</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openLinkDialog} onClose={() => setOpenLinkDialog(false)}>
        <DialogTitle>{editingLink.id ? 'サイト設定の編集' : 'サイトを追加'}</DialogTitle>
        <DialogContent sx={{pt: 2}}>
            {!editingLink.id && (
                <Box sx={{mb:2}}>
                    <Typography variant="caption" sx={{mb:1, display:'block'}}>定番アプリを一発入力:</Typography>
                    <Box sx={{display:'flex', gap:0.5, flexWrap:'wrap'}}>
                        {APP_SCHEMES.map(app => (
                            <Chip 
                                key={app.name} label={app.short} size="small" 
                                icon={<Smartphone style={{fontSize:14}}/>}
                                onClick={() => setEditingLink({ ...editingLink, name: app.name, url: app.url })}
                                variant="outlined" clickable
                            />
                        ))}
                    </Box>
                </Box>
            )}
            <TextField label="サイト名" fullWidth sx={{ mb: 3 }} value={editingLink.name} onChange={(e) => setEditingLink({...editingLink, name:e.target.value})} />
            <TextField 
                label="URL または スキーム" fullWidth value={editingLink.url} 
                onChange={(e) => setEditingLink({...editingLink, url:e.target.value})} 
                helperText="例: https://... または line://" sx={{ mb: 2 }}
            />
            
            <Box sx={{border: '1px solid #eee', p:1, borderRadius:1}}>
                <Typography variant="caption" color="primary">詳細設定</Typography>
                <FormControlLabel 
                    control={<Switch checked={editingLink.autoInput} onChange={(e)=>setEditingLink({...editingLink, autoInput: e.target.checked})} />} 
                    label={<Typography variant="body2">戻ったら「金額入力画面」を開く</Typography>}
                    sx={{width:'100%'}}
                />
                <FormControlLabel 
                    control={<Switch checked={editingLink.browserMode === 'external'} onChange={(e)=>setEditingLink({...editingLink, browserMode: e.target.checked ? 'external' : 'in-app'})} />} 
                    label={<Typography variant="body2">ブラウザで開く (推奨)</Typography>}
                />
            </Box>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenLinkDialog(false)}>キャンセル</Button>
            <Button onClick={handleSaveMyLink} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)}>
        <DialogTitle>支払いを追加</DialogTitle>
        <DialogContent sx={{pt: 2}}>
          <TextField label="項目名" fullWidth sx={{ mt: 2, mb: 3 }} value={newPay.name} onChange={(e) => setNewPay({...newPay, name:e.target.value})} />
          <TextField label="金額" type="number" fullWidth autoFocus sx={{ mb: 3 }} value={newPay.amount} onChange={(e) => setNewPay({...newPay, amount:e.target.value})} />
          <FormControl fullWidth>
            <InputLabel>口座</InputLabel>
            <Select value={newPay.accountId} label="口座" onChange={(e) => setNewPay({...newPay, accountId:e.target.value})}>
              {accounts.map(acc => <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenPayDialog(false)}>キャンセル</Button>
            <Button onClick={handleSavePayment} variant="contained">登録</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}