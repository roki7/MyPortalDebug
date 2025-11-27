// src/components/FinanceTab.jsx
import React, { useState } from 'react';
import { 
  Box, Typography, Button, Card, CardContent, TextField, Divider, List, ListItem, 
  ListItemIcon, ListItemText, IconButton, Alert, Dialog, DialogTitle, DialogContent, 
  DialogActions, Chip, FormControl, InputLabel, Select, MenuItem, Link, Grid
} from '@mui/material';
import { AddCircleOutline, CheckCircle, ErrorOutline, CreditCard, Add, Delete, OpenInNew, Link as LinkIcon, AttachMoney, AccountBalanceWallet } from '@mui/icons-material';
import { format } from 'date-fns';

export default function FinanceTab({ accounts, payments, templates, myLinks, onAddAccount, onAddPayment, onAddTemplate, onDeleteTemplate, onAddMyLink, onDeleteMyLink, onUpdateBalance, onTogglePaid, currentDate }) {
  const currentMonthStr = format(currentDate || new Date(), 'yyyy-MM');
  
  const [openAccDialog, setOpenAccDialog] = useState(false);
  const [openPayDialog, setOpenPayDialog] = useState(false);
  const [openLinkDialog, setOpenLinkDialog] = useState(false); // Link用

  // 口座追加用
  const [newAcc, setNewAcc] = useState({ name: '', balance: '', linkUrl: '', type: 'bank', billingDay: 27, paymentDay: 12 }); 
  
  // MyLinks追加用
  const [newLink, setNewLink] = useState({ name: '', url: '' });

  // 支払い登録用
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
      });
      setOpenAccDialog(false);
      setNewAcc({ name: '', balance: '', linkUrl: '', type: 'bank', billingDay: 27, paymentDay: 12 });
    }
  };

  const handleSaveMyLink = () => {
    if(newLink.name && newLink.url) {
      onAddMyLink({ id: 'link_'+Date.now(), name: newLink.name, url: newLink.url, icon: '🔗' });
      setOpenLinkDialog(false);
      setNewLink({ name: '', url: '' });
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

  return (
    <Box>
      {/* 1. MyLinks (MyPortal機能) */}
      <Card sx={{ mb: 2, bgcolor: '#f3e5f5' }}>
        <CardContent sx={{py:1, px:2, '&:last-child': {paddingBottom: 1}}}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="subtitle2" fontWeight="bold">MyLinks (よく使うサイト)</Typography>
            <IconButton size="small" onClick={() => setOpenLinkDialog(true)}><Add fontSize="small"/></IconButton>
          </Box>
          <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', py: 1 }}>
            {myLinks.map(link => (
              <Chip 
                key={link.id} 
                label={link.name} 
                icon={<OpenInNew sx={{fontSize:12}}/>}
                onClick={() => window.open(link.url, '_blank')} 
                onDelete={() => onDeleteMyLink(link.id)}
                sx={{ bgcolor: 'white' }}
                size="small"
                clickable
              />
            ))}
            {myLinks.length === 0 && <Typography variant="caption" color="textSecondary">サイトを登録して即アクセス</Typography>}
          </Box>
        </CardContent>
      </Card>

      {/* 2. 変動費テンプレート */}
      <Box sx={{ mb: 2, overflowX: 'auto', whiteSpace: 'nowrap', py: 1 }}>
        {templates.map(tmpl => (
          <Chip 
            key={tmpl.id} icon={<CreditCard />} label={tmpl.name} 
            onClick={() => { setNewPay({ name: tmpl.name, amount: '', accountId: accounts.find(a => a.type !== 'credit')?.id || '' }); setOpenPayDialog(true); }} 
            onDelete={() => onDeleteTemplate(tmpl.id)} sx={{ mr: 1 }} color="primary" variant="outlined"
          />
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
          const accPayments = payments.filter(p => p.accountId === acc.id && p.month === currentMonthStr);
          const totalPay = accPayments.filter(p => !p.paid).reduce((sum, p) => sum + p.amount, 0);
          
          const isCredit = acc.type === 'credit';
          const totalUnsettled = isCredit ? payments.filter(p => p.accountId === acc.id && !p.isSettled).reduce((sum, p) => sum + p.amount, 0) : 0;
          
          return (
              <Card key={acc.id} sx={{ mb: 2, borderLeft: (acc.type === 'bank' || acc.type === 'cash') && acc.balance < totalPay ? '5px solid red' : '5px solid green' }}>
                  <CardContent>
                      <Box sx={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
                          <Box sx={{display:'flex', alignItems:'center'}}>
                            {getAccountIcon(acc.type)}
                            <Typography variant="h6" sx={{ml:1, mr:1}}>{acc.name}</Typography>
                            {acc.linkUrl && (
                                <IconButton size="small" color="primary" title="サイトを開く" onClick={() => window.open(acc.linkUrl, '_blank')}>
                                    <OpenInNew fontSize="small" />
                                </IconButton>
                            )}
                          </Box>
                          
                          {isCredit ? (
                              <Box sx={{textAlign:'right'}}>
                                <Typography variant="caption" color="textSecondary">未確定利用額:</Typography>
                                <Typography color={totalUnsettled > 0 ? 'error' : 'primary'} fontWeight="bold">¥{totalUnsettled.toLocaleString()}</Typography>
                              </Box>
                          ) : (
                              <Typography color={acc.balance < totalPay ? 'error' : 'primary'} fontWeight="bold">残り: ¥{(acc.balance - totalPay).toLocaleString()}</Typography>
                          )}
                      </Box>

                      {acc.type !== 'credit' ? (
                          <Box sx={{my: 1, p:1, bgcolor: '#f5f5f5', borderRadius: 1}}>
                              <Typography variant="caption" color="textSecondary">現在残高</Typography>
                              <TextField variant="standard" fullWidth value={acc.balance} type="number" onChange={(e) => onUpdateBalance(acc.id, e.target.value)} InputProps={{ startAdornment: <Typography sx={{mr:1}}>¥</Typography> }} />
                          </Box>
                      ) : (
                           <Alert severity="info" sx={{my:1, p:1.5}}>
                              **{acc.billingDay}日締めの{acc.paymentDay}日払い**です。
                          </Alert>
                      )}
                      
                      <Divider sx={{my:1}} />
                      <List dense>
                          {accPayments.map(pay => (
                              <ListItem key={pay.id} disablePadding secondaryAction={<IconButton size="small" onClick={() => onTogglePaid(pay.id)}>{pay.paid ? <CheckCircle color="success" /> : <ErrorOutline color="action" />}</IconButton>}>
                                  <ListItemText 
                                      primary={pay.name} 
                                      secondary={`¥${pay.amount.toLocaleString()}${isCredit && !pay.isSettled ? ' (未確定)' : ''}`} 
                                      sx={{textDecoration: pay.paid ? 'line-through' : 'none'}} 
                                  />
                              </ListItem>
                          ))}
                          {accPayments.length === 0 && <Typography variant="caption" sx={{p:1}}>引落予定なし</Typography>}
                      </List>
                  </CardContent>
              </Card>
          );
      })}

      {/* 口座追加ダイアログ */}
      <Dialog open={openAccDialog} onClose={() => {setOpenAccDialog(false); setNewAcc({ name: '', balance: '', linkUrl: '', type: 'bank', billingDay: 27, paymentDay: 12 });}}>
        <DialogTitle>新しい口座/カード</DialogTitle>
        <DialogContent>
            <FormControl fullWidth sx={{ mt: 1, mb: 2 }}>
                <InputLabel>タイプ</InputLabel>
                <Select value={newAcc.type} label="タイプ" onChange={(e) => setNewAcc({...newAcc, type:e.target.value, balance: e.target.value === 'credit' ? 0 : newAcc.balance})}>
                    <MenuItem value="bank">銀行口座</MenuItem>
                    <MenuItem value="credit">クレジットカード</MenuItem>
                    <MenuItem value="cash">現金 (手持ち)</MenuItem>
                </Select>
            </FormControl>

            <TextField label="名前" fullWidth sx={{ mb: 2 }} value={newAcc.name} onChange={(e) => setNewAcc({...newAcc, name:e.target.value})} />
            
            {newAcc.type !== 'credit' && (
                <TextField label="現在の残高" type="number" fullWidth sx={{ mb: 2 }} value={newAcc.balance} onChange={(e) => setNewAcc({...newAcc, balance:e.target.value})} />
            )}

            {newAcc.type === 'credit' && (
                <Grid container spacing={2} sx={{mb:2}}>
                    <Grid item xs={6}>
                        <TextField label="締め日" type="number" fullWidth size="small" value={newAcc.billingDay} onChange={(e) => setNewAcc({...newAcc, billingDay: e.target.value})} />
                    </Grid>
                    <Grid item xs={6}>
                        <TextField label="引落日" type="number" fullWidth size="small" value={newAcc.paymentDay} onChange={(e) => setNewAcc({...newAcc, paymentDay: e.target.value})} />
                    </Grid>
                </Grid>
            )}

            <FormControl fullWidth>
                <InputLabel>連携サイト (MyLinks)</InputLabel>
                <Select value={newAcc.linkUrl} label="連携サイト (MyLinks)" onChange={(e) => setNewAcc({...newAcc, linkUrl:e.target.value})} displayEmpty>
                    <MenuItem value=""><em>連携なし</em></MenuItem>
                    {myLinks.map(link => <MenuItem key={link.id} value={link.url}>{link.name}</MenuItem>)}
                </Select>
            </FormControl>
        </DialogContent>
        <DialogActions><Button onClick={handleSaveAccount} variant="contained" disabled={!newAcc.name}>登録</Button></DialogActions>
      </Dialog>

      {/* MyLinks追加ダイアログ */}
      <Dialog open={openLinkDialog} onClose={() => setOpenLinkDialog(false)}>
        <DialogTitle>よく使うサイトを追加</DialogTitle>
        <DialogContent>
            <TextField label="サイト名" fullWidth sx={{ mt: 1, mb: 2 }} value={newLink.name} onChange={(e) => setNewLink({...newLink, name:e.target.value})} />
            <TextField label="URL (https://...)" fullWidth value={newLink.url} onChange={(e) => setNewLink({...newLink, url:e.target.value})} />
        </DialogContent>
        <DialogActions><Button onClick={handleSaveMyLink} variant="contained">追加</Button></DialogActions>
      </Dialog>

      {/* 支払い登録ダイアログ */}
      <Dialog open={openPayDialog} onClose={() => setOpenPayDialog(false)}>
        <DialogTitle>支払いを追加</DialogTitle>
        <DialogContent>
          <TextField label="項目名" fullWidth sx={{ mt: 1, mb: 2 }} value={newPay.name} onChange={(e) => setNewPay({...newPay, name:e.target.value})} />
          <TextField label="金額" type="number" fullWidth autoFocus sx={{ mt: 1, mb: 2 }} value={newPay.amount} onChange={(e) => setNewPay({...newPay, amount:e.target.value})} />
          <FormControl fullWidth>
            <InputLabel>口座</InputLabel>
            <Select value={newPay.accountId} label="口座" onChange={(e) => setNewPay({...newPay, accountId:e.target.value})}>
              {accounts.map(acc => <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions><Button onClick={handleSavePayment} variant="contained">登録</Button></DialogActions>
      </Dialog>
    </Box>
  );
}