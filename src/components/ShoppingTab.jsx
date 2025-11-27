// src/components/ShoppingTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Button, Card, CardContent, List, ListItem, ListItemIcon, ListItemText, Checkbox, 
  TextField, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, 
  Select, MenuItem, InputAdornment, Grid, Paper, Stack, Snackbar, Alert, Tabs, Tab, Chip, FormControlLabel, Switch, Divider, ToggleButton, ToggleButtonGroup
} from '@mui/material';
import { AddShoppingCart, Delete, Search, Edit, Add, Save, CheckCircle, Event, Mic, ReceiptLong, ListAlt } from '@mui/icons-material';
import { format, parseISO, isToday, isYesterday, differenceInDays } from 'date-fns';

// 日付フォーマット
const formatLastPurchased = (dateStr) => {
    if (!dateStr) return "未購入";
    const date = parseISO(dateStr);
    if (isToday(date)) return "今日";
    if (isYesterday(date)) return "昨日";
    const diff = differenceInDays(new Date(), date);
    if (diff < 30) return `${diff}日前`;
    return format(date, 'yyyy/MM/dd');
};

export default function ShoppingTab({ shopping, onUpdateShopping, onUpdateStock, onAddPayment, accounts }) {
  const [tabIndex, setTabIndex] = useState(0);
  const [newItemName, setNewItemName] = useState('');
  const [openAddDialog, setOpenAddDialog] = useState(false);
  
  // 購入完了ダイアログ用
  const [openCompleteDialog, setOpenCompleteDialog] = useState(false);
  const [purchaseMode, setPurchaseMode] = useState('batch'); // 'batch'(合計) or 'individual'(個別)
  const [totalCost, setTotalCost] = useState('');
  const [selectedAccount, setSelectedAccount] = useState('');
  const [individualPrices, setIndividualPrices] = useState({}); // { itemId: price }
  const [selectedItems, setSelectedItems] = useState([]); // チェックされたアイテムたち

  // 個別追加用
  const [isStockItem, setIsStockItem] = useState(false); 

  // 在庫管理用
  const [searchTerm, setSearchTerm] = useState('');
  const [isEditMode, setIsEditMode] = useState(false); 
  const [newStockName, setNewStockName] = useState('');
  const [newStockYomi, setNewStockYomi] = useState('');

  // 音声入力用
  const [isListening, setIsListening] = useState(false);
  const [voiceText, setVoiceText] = useState('');

  // 安全策
  const shoppingList = shopping.list || [];
  const shoppingStock = shopping.stock || [];
  const shoppingHistory = shopping.history || [];

  // アカウント分類
  const bankAccounts = accounts.filter(a => a.type === 'bank');
  const cashAccounts = accounts.filter(a => a.type === 'cash');
  const creditCards = accounts.filter(a => a.type === 'credit');

  // --- 購入完了フロー ---

  // 1. 「買い物完了」ボタンを押した時
  const handleOpenCompleteDialog = () => {
    const items = shoppingList.filter(i => i.checked);
    setSelectedItems(items);
    
    // 個別価格の初期値（空）をセット
    const initialPrices = {};
    items.forEach(i => initialPrices[i.id] = '');
    setIndividualPrices(initialPrices);
    
    // デフォルトは現金払い
    const defaultAcc = cashAccounts.length > 0 ? cashAccounts[0].id : accounts[0]?.id;
    setSelectedAccount(defaultAcc || '');
    setTotalCost('');
    setPurchaseMode('batch'); // デフォルトは「まとめて」
    setOpenCompleteDialog(true);
  };

  // 個別価格が変更されたら合計を再計算
  useEffect(() => {
    if (purchaseMode === 'individual') {
        const sum = Object.values(individualPrices).reduce((a, b) => a + (parseInt(b) || 0), 0);
        setTotalCost(sum > 0 ? sum : '');
    }
  }, [individualPrices, purchaseMode]);

  // 2. 登録実行
  const handleExecutePurchase = () => {
    if (!totalCost || !selectedAccount) return;
    const account = accounts.find(a => a.id === selectedAccount);
    const purchaseDate = new Date().toISOString();
    const purchaseAmount = parseInt(totalCost);

    // A. 家計簿への記録（支払いは常に1回にまとめる）
    const itemNames = selectedItems.map(i => i.name).join('、');
    onAddPayment({
        name: `買い物 (${itemNames.substring(0, 15)}${itemNames.length>15?'...':''})`, 
        amount: purchaseAmount, 
        accountId: selectedAccount,
        date: purchaseDate,
        isSettled: account?.type !== 'credit' 
    });

    // B. 履歴への記録（モードによって分岐）
    let newHistoryEntries = [];
    
    if (purchaseMode === 'batch') {
        // まとめて1行
        newHistoryEntries.push({
            id: Date.now(),
            name: `買い物 (${itemNames})`,
            amount: purchaseAmount,
            date: purchaseDate,
            accountId: selectedAccount
        });
    } else {
        // 個別に記録
        newHistoryEntries = selectedItems.map((item, idx) => ({
            id: Date.now() + idx,
            name: item.name,
            amount: parseInt(individualPrices[item.id]) || 0,
            date: purchaseDate,
            accountId: selectedAccount
        }));
    }

    // C. 在庫の最終購入日を更新
    let newStock = [...shoppingStock];
    selectedItems.forEach(item => {
        const stockIndex = newStock.findIndex(s => s.name === item.name);
        if (stockIndex !== -1) {
            newStock[stockIndex] = { ...newStock[stockIndex], lastPurchased: format(new Date(), 'yyyy-MM-dd') };
        }
    });

    // D. 買ったものをリストから削除
    const boughtIds = selectedItems.map(i => i.id);
    const newList = shoppingList.filter(i => !boughtIds.includes(i.id));

    // データ更新
    onUpdateShopping({ 
        list: newList, 
        stock: newStock, 
        history: [...newHistoryEntries, ...shoppingHistory] 
    });

    setOpenCompleteDialog(false);
    alert("家計簿と履歴に記録しました！");
  };

  // --- その他のハンドラー ---

  const handleAddToList = (addToStock=false) => {
    if (!newItemName) return;
    const newItem = { id: Date.now(), name: newItemName, checked: false };
    if (addToStock) {
        onUpdateShopping({ ...shopping, stock: [...shoppingStock, { ...newItem, lastPurchased: null, remaining: 1 }] });
    } else {
        if (!shoppingList.some(i => i.name === newItemName)) {
            onUpdateShopping({ ...shopping, list: [...shoppingList, { ...newItem, needed: true, quantity: 1 }] });
        }
    }
    setOpenAddDialog(false);
    setNewItemName('');
    setSearchTerm('');
    setIsStockItem(false);
  };

  const handleAddStockToBuy = (name) => {
    setNewItemName(name);
    handleAddToList(false);
  };

  const handleAddNewStock = () => {
    if (!newStockName) return;
    const newStockItem = { 
      id: 's' + Date.now(), name: newStockName, yomi: newStockYomi || newStockName, 
      icon: '📦', lastPurchased: null 
    };
    onUpdateStock([...shoppingStock, newStockItem]);
    setNewStockName(''); setNewStockYomi('');
  };

  const handleDeleteStock = (id) => {
    if(window.confirm('削除しますか？')) onUpdateStock(shoppingStock.filter(s => s.id !== id));
  };

  const handleToggle = (id) => {
      const updated = shoppingList.map(item => item.id === id ? { ...item, checked: !item.checked } : item);
      onUpdateShopping({ ...shopping, list: updated });
  };

  const handleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) { alert("Chromeで試してください"); return; }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.onstart = () => { setIsListening(true); setVoiceText('聞き取り中...'); };
    recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setVoiceText(transcript);
        setIsListening(false);
        const match = transcript.match(/(.*)\s*(\d+)円/);
        let name = transcript.trim();
        if (match) { name = match[1].trim(); } 
        setNewItemName(name);
        setOpenAddDialog(true);
    };
    recognition.onend = () => setIsListening(false);
    recognition.start();
  };

  const groupedHistory = shoppingHistory.reduce((acc, log) => {
    const dateKey = format(parseISO(log.date), 'yyyy/MM/dd');
    if (!acc[dateKey]) acc[dateKey] = [];
    acc[dateKey].push(log);
    return acc;
  }, {});

  const filteredStock = shoppingStock.filter(item => {
    const term = searchTerm.toLowerCase();
    return item.name.toLowerCase().includes(term) || (item.yomi && item.yomi.includes(term));
  });

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">🛒 買い物</Typography>
        <Box>
            <IconButton color="primary" onClick={handleVoiceInput} disabled={isListening}><Mic /></IconButton>
            <Button variant="contained" size="small" startIcon={<Add />} onClick={() => setOpenAddDialog(true)}>追加</Button>
        </Box>
      </Box>

      <Snackbar open={!!(isListening || (voiceText && !openAddDialog))} autoHideDuration={3000}>
        <Alert severity={isListening ? "info" : "success"}>
            {isListening ? "お話しください..." : `${voiceText} を入力`}
        </Alert>
      </Snackbar>

      <Tabs value={tabIndex} onChange={(e, v) => setTabIndex(v)} variant="fullWidth" sx={{ mb: 2 }}>
        <Tab label={`リスト(${shoppingList.length})`} />
        <Tab label="定番在庫" />
        <Tab label="履歴" />
      </Tabs>

      {/* Tab 1: リスト */}
      {tabIndex === 0 && (
        <Card>
            <List dense>
                {shoppingList.length === 0 && <Typography sx={{p:2, textAlign:'center', color:'gray'}}>リストは空です</Typography>}
                {shoppingList.map(item => (
                    <ListItem key={item.id} 
                        secondaryAction={<IconButton edge="end" onClick={() => onUpdateShopping({ ...shopping, list: shoppingList.filter(i => i.id !== item.id) })}><Delete /></IconButton>}
                    >
                        <ListItemIcon><Checkbox edge="start" checked={item.checked} onChange={() => handleToggle(item.id)} /></ListItemIcon>
                        <ListItemText primary={item.name} sx={{ textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'gray' : 'black' }} />
                    </ListItem>
                ))}
            </List>
            {shoppingList.some(i => i.checked) && (
                <Button fullWidth variant="contained" color="warning" size="large" sx={{ mt: 2, borderRadius: 0 }} onClick={handleOpenCompleteDialog}>
                  チェックした品を購入する
                </Button>
            )}
        </Card>
      )}

      {/* Tab 2: 定番在庫 */}
      {tabIndex === 1 && (
        <Box>
            <Paper sx={{ p: 2, mb: 2, bgcolor: isEditMode ? '#fff3e0' : 'white' }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="subtitle2" fontWeight="bold">{isEditMode ? '📦 編集モード' : '🔍 検索して追加'}</Typography>
                    <Button size="small" onClick={() => setIsEditMode(!isEditMode)} startIcon={isEditMode ? <Save/> : <Edit/>}>{isEditMode ? '完了' : '編集'}</Button>
                </Box>
                {isEditMode ? (
                    <Stack spacing={1} sx={{ mb: 2 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField fullWidth size="small" label="品名" value={newStockName} onChange={(e) => setNewStockName(e.target.value)} />
                            <TextField fullWidth size="small" label="よみ" value={newStockYomi} onChange={(e) => setNewStockYomi(e.target.value)} />
                        </Box>
                        <Button variant="contained" fullWidth onClick={handleAddNewStock} startIcon={<Add/>}>リストに追加</Button>
                    </Stack>
                ) : (
                    <TextField fullWidth size="small" placeholder="検索..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }} sx={{ mb: 1 }} />
                )}
                <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #eee', borderRadius: 1, p: 1 }}>
                    <Grid container spacing={1}>
                        {filteredStock.map(item => (
                            <Grid item xs={4} sm={3} key={item.id}>
                                <Button 
                                    variant="outlined" fullWidth size="small" color={isEditMode ? "error" : "primary"}
                                    onClick={() => isEditMode ? handleDeleteStock(item.id) : handleAddStockToBuy(item.name)}
                                    sx={{ justifyContent: 'flex-start', textTransform: 'none', fontSize: 11, px: 1, height: 36, whiteSpace:'nowrap', overflow:'hidden', display:'block', textOverflow:'ellipsis' }}
                                    startIcon={isEditMode ? <Delete sx={{fontSize:14}}/> : null}
                                >{item.name}</Button>
                            </Grid>
                        ))}
                    </Grid>
                </Box>
            </Paper>
            <List dense sx={{bgcolor:'white', borderRadius:1}}>
                {shoppingStock.map(item => (
                    <ListItem key={item.id} secondaryAction={<Chip label={formatLastPurchased(item.lastPurchased)} icon={<Event fontSize="small"/>} size="small" variant="outlined" />}>
                        <ListItemText primary={item.name} secondary={item.lastPurchased ? '購入済' : '未購入'} />
                    </ListItem>
                ))}
            </List>
        </Box>
      )}

      {/* Tab 3: 履歴 */}
      {tabIndex === 2 && (
        <Box>
            {Object.keys(groupedHistory).sort().reverse().map(dateKey => (
                <Card key={dateKey} sx={{mb:1, bgcolor:'#fff'}}>
                    <CardContent sx={{py:1}}>
                        <Typography variant="subtitle2" fontWeight="bold" sx={{mb:1}}>{dateKey}</Typography>
                        <List dense disablePadding>
                            {groupedHistory[dateKey].map(log => {
                                const account = accounts.find(a => a.id === log.accountId);
                                return (
                                    <ListItem key={log.id} disablePadding>
                                        <ListItemText primary={log.name} secondary={`¥${log.amount.toLocaleString()} (${account?.name || '不明'})`} />
                                        <Typography variant="caption">{format(parseISO(log.date), 'HH:mm')}</Typography>
                                    </ListItem>
                                );
                            })}
                        </List>
                    </CardContent>
                </Card>
            ))}
            {shoppingHistory.length === 0 && <Typography variant="caption" sx={{ p: 2 }}>履歴はありません</Typography>}
        </Box>
      )}

      {/* 追加ダイアログ */}
      <Dialog open={openAddDialog} onClose={() => setOpenAddDialog(false)}>
        <DialogTitle>買い物追加</DialogTitle>
        <DialogContent>
            <TextField label="項目名" fullWidth autoFocus sx={{ mt: 1, mb: 2 }} value={newItemName} onChange={(e) => setNewItemName(e.target.value)} />
            <FormControlLabel control={<Switch checked={isStockItem} onChange={(e)=>setIsStockItem(e.target.checked)} />} label="定番在庫として登録" />
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenAddDialog(false)}>キャンセル</Button>
            <Button onClick={() => handleAddToList(isStockItem)} variant="contained" disabled={!newItemName}>追加</Button>
        </DialogActions>
      </Dialog>

      {/* ★購入完了ダイアログ (高機能版) */}
      <Dialog open={openCompleteDialog} onClose={() => setOpenCompleteDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle>購入の記録</DialogTitle>
        <DialogContent>
            <Box sx={{ mb: 2, textAlign: 'center' }}>
                <ToggleButtonGroup
                    value={purchaseMode} exclusive
                    onChange={(e, newMode) => { if(newMode) setPurchaseMode(newMode); }}
                    size="small" fullWidth
                >
                    <ToggleButton value="batch"><ReceiptLong sx={{mr:1}}/>まとめて</ToggleButton>
                    <ToggleButton value="individual"><ListAlt sx={{mr:1}}/>個別に</ToggleButton>
                </ToggleButtonGroup>
            </Box>

            {/* モードによって表示切替 */}
            {purchaseMode === 'batch' ? (
                <Box>
                    <Typography variant="caption" sx={{mb:1, display:'block'}}>合計金額を入力してください</Typography>
                    <TextField 
                        label="合計金額" type="number" fullWidth autoFocus
                        value={totalCost} onChange={(e) => setTotalCost(e.target.value)} 
                        InputProps={{ startAdornment: <Typography sx={{mr:1}}>¥</Typography> }}
                    />
                    <Typography variant="caption" color="textSecondary" sx={{mt:1, display:'block'}}>
                        ※履歴には「買い物 ({selectedItems.length}点)」として保存されます
                    </Typography>
                </Box>
            ) : (
                <Box sx={{maxHeight: 250, overflowY: 'auto'}}>
                    {selectedItems.map(item => (
                        <Box key={item.id} sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 1 }}>
                            <Typography variant="body2" sx={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{item.name}</Typography>
                            <TextField 
                                placeholder="0" type="number" size="small" sx={{width: 100}}
                                value={individualPrices[item.id]} 
                                onChange={(e) => setIndividualPrices({...individualPrices, [item.id]: e.target.value})}
                                InputProps={{ endAdornment: <Typography variant="caption">円</Typography> }}
                            />
                        </Box>
                    ))}
                    <Divider sx={{my:1}} />
                    <Box sx={{display:'flex', justifyContent:'space-between', fontWeight:'bold'}}>
                        <Typography>合計:</Typography>
                        <Typography>¥{totalCost || 0}</Typography>
                    </Box>
                </Box>
            )}

            <FormControl fullWidth size="small" sx={{ mt: 2 }}>
                <InputLabel>支払い方法</InputLabel>
                <Select value={selectedAccount} label="支払い方法" onChange={(e) => setSelectedAccount(e.target.value)}>
                    <MenuItem disabled>--- カード ---</MenuItem>
                    {creditCards.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                    <Divider />
                    <MenuItem disabled>--- 現金 ---</MenuItem>
                    {cashAccounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                    <Divider />
                    <MenuItem disabled>--- 銀行 ---</MenuItem>
                    {bankAccounts.map(a => <MenuItem key={a.id} value={a.id}>{a.name}</MenuItem>)}
                </Select>
            </FormControl>
        </DialogContent>
        <DialogActions>
            <Button onClick={() => setOpenCompleteDialog(false)}>キャンセル</Button>
            <Button onClick={handleExecutePurchase} variant="contained" disabled={!totalCost || !selectedAccount}>完了</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}