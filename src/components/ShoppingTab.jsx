// src/components/ShoppingTab.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, Typography, Card, CardContent, List, ListItem, ListItemText, ListItemIcon, 
  IconButton, TextField, Button, Tabs, Tab, Divider, Grid, Dialog, DialogTitle, 
  DialogContent, DialogActions, Select, MenuItem, FormControl, InputLabel, InputAdornment 
} from '@mui/material';
import { 
  ShoppingCart, Inventory, History, Mic, Search, Add, Delete, Edit,
  CheckCircle, RadioButtonUnchecked, Close
} from '@mui/icons-material';
import { format, formatDistanceToNow, parseISO } from 'date-fns';
import { ja } from 'date-fns/locale';

export default function ShoppingTab({ shopping, onUpdateShopping, onAddPayment, accounts }) {
  const [tab, setTab] = useState(0); // 0:List, 1:Stock, 2:History
  
  // データ（なければ初期化）
  const list = shopping.list || [];
  const stock = shopping.stock || [];
  const history = shopping.history || [];

  // 入力・検索系State
  const [newItemName, setNewItemName] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  
  // 定番在庫登録・編集用
  const [openStockDialog, setOpenStockDialog] = useState(false);
  const [editStockItem, setEditStockItem] = useState(null); // 編集対象
  const [newStockName, setNewStockName] = useState('');
  const [newStockYomi, setNewStockYomi] = useState('');

  // 購入モーダル用State
  const [openPurchaseDialog, setOpenPurchaseDialog] = useState(false);
  const [purchaseMode, setPurchaseMode] = useState('bulk'); // 'bulk' | 'individual'
  const [bulkTotal, setBulkTotal] = useState('');
  const [individualPrices, setIndividualPrices] = useState({}); // { itemId: price }
  const [paymentMethod, setPaymentMethod] = useState('');

  // -------------------------
  // ヘルパー関数
  // -------------------------
  
  // 音声入力の開始
  const startVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window)) {
      alert("このブラウザは音声入力に対応していません。");
      return;
    }
    const recognition = new window.webkitSpeechRecognition();
    recognition.lang = 'ja-JP';
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setNewItemName(transcript);
    };
    recognition.start();
  };

  // リストへの追加
  const handleAddItemToList = (name) => {
    if (!name) return;
    if (list.some(i => i.name === name)) {
        alert("すでにリストに入っています");
        return;
    }
    const newItem = { id: Date.now(), name, checked: false };
    onUpdateShopping({ ...shopping, list: [...list, newItem] });
    setNewItemName('');
  };

  // 定番在庫の登録・更新
  const handleSaveStock = () => {
      if (!newStockName) return;
      
      if (editStockItem) {
          // 更新
          const updatedStock = stock.map(item => 
              item.id === editStockItem.id 
                  ? { ...item, name: newStockName, yomi: newStockYomi || newStockName } 
                  : item
          );
          onUpdateShopping({ ...shopping, stock: updatedStock });
      } else {
          // 新規追加
          const newItem = { 
              id: Date.now(), 
              name: newStockName, 
              yomi: newStockYomi || newStockName 
          };
          onUpdateShopping({ ...shopping, stock: [...stock, newItem] });
      }
      handleCloseStockDialog();
  };

  const handleOpenStockAdd = () => {
      setEditStockItem(null);
      setNewStockName('');
      setNewStockYomi('');
      setOpenStockDialog(true);
  };

  const handleOpenStockEdit = (item) => {
      setEditStockItem(item);
      setNewStockName(item.name);
      setNewStockYomi(item.yomi || '');
      setOpenStockDialog(true);
  };

  const handleCloseStockDialog = () => {
      setOpenStockDialog(false);
      setEditStockItem(null);
      setNewStockName('');
      setNewStockYomi('');
  };

  // 定番在庫からリストへ追加
  const handleStockClick = (stockItem) => {
      handleAddItemToList(stockItem.name);
      // alert(`${stockItem.name}をリストに追加しました`); // 邪魔ならコメントアウト
  };

  // チェック切り替え
  const handleToggleCheck = (id) => {
      onUpdateShopping({ 
          ...shopping, 
          list: list.map(i => i.id === id ? { ...i, checked: !i.checked } : i)
      });
  };

  // 削除
  const handleDeleteItem = (id, target) => {
      if (target === 'list') {
          onUpdateShopping({ ...shopping, list: list.filter(i => i.id !== id) });
      } else if (target === 'stock') {
          if(window.confirm("定番在庫から削除しますか？")) {
              onUpdateShopping({ ...shopping, stock: stock.filter(i => i.id !== id) });
          }
      }
  };

  // 履歴から最終購入日を取得
  const getLastPurchasedDate = (itemName) => {
      const target = history.find(h => h.name === itemName);
      if (!target) return '未購入';
      try {
          return formatDistanceToNow(parseISO(target.date), { addSuffix: true, locale: ja });
      } catch (e) {
          return '日付不明';
      }
  };

  // -------------------------
  // 購入処理
  // -------------------------
  
  const handleOpenPurchase = () => {
      const checkedItems = list.filter(i => i.checked);
      if (checkedItems.length === 0) return;
      
      setPurchaseMode('bulk');
      setBulkTotal('');
      setIndividualPrices({});
      setPaymentMethod(accounts[0]?.id || '');
      setOpenPurchaseDialog(true);
  };

  const getIndividualTotal = () => {
      return Object.values(individualPrices).reduce((sum, val) => sum + (parseInt(val) || 0), 0);
  };

  const handleCompletePurchase = () => {
      const checkedItems = list.filter(i => i.checked);
      const totalAmount = purchaseMode === 'bulk' ? parseInt(bulkTotal) : getIndividualTotal();

      if (!totalAmount || totalAmount <= 0) {
          alert("金額を入力してください");
          return;
      }
      if (!paymentMethod) {
          alert("支払い方法を選択してください");
          return;
      }

      // 1. 家計簿への記録
      const paymentData = {
          id: Date.now(),
          name: `買い物 (${checkedItems.length}点)`,
          amount: totalAmount,
          accountId: paymentMethod,
          date: format(new Date(), 'yyyy-MM-dd'),
          isShared: true 
      };
      onAddPayment(paymentData);

      // 2. 履歴への記録
      const newHistoryItems = checkedItems.map(item => ({
          id: Date.now() + Math.random(), 
          name: item.name,
          date: new Date().toISOString(),
          price: purchaseMode === 'individual' && individualPrices[item.id] ? parseInt(individualPrices[item.id]) : null
      }));
      const updatedHistory = [...newHistoryItems, ...history];

      // 3. リストから削除
      const updatedList = list.filter(i => !i.checked);

      onUpdateShopping({
          ...shopping,
          list: updatedList,
          history: updatedHistory
      });

      setOpenPurchaseDialog(false);
  };

  // -------------------------
  // レンダリング
  // -------------------------

  // 定番在庫のフィルタリング
  const filteredStock = stock.filter(item => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return item.name.toLowerCase().includes(q) || (item.yomi && item.yomi.includes(q));
  });

  return (
    <Box sx={{ pb: 10 }}>
      {/* タブ切り替え */}
      <Tabs value={tab} onChange={(e,v)=>setTab(v)} variant="fullWidth" sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tab icon={<ShoppingCart/>} label="リスト" />
        <Tab icon={<Inventory/>} label="定番在庫" />
        <Tab icon={<History/>} label="履歴" />
      </Tabs>

      {/* --- 1. 買い物リスト --- */}
      {tab === 0 && (
          <Box>
              {/* 入力エリア */}
              <Card sx={{ mb: 2, p: 1 }}>
                  <Grid container spacing={1} alignItems="center">
                      <Grid item xs>
                          <TextField 
                              fullWidth size="small" placeholder="買うものを追加"
                              value={newItemName} onChange={e=>setNewItemName(e.target.value)}
                              InputProps={{
                                  endAdornment: (
                                      <InputAdornment position="end">
                                          <IconButton onClick={startVoiceInput} edge="end"><Mic color="primary"/></IconButton>
                                      </InputAdornment>
                                  )
                              }}
                              onKeyPress={e => e.key === 'Enter' && handleAddItemToList(newItemName)}
                          />
                      </Grid>
                      <Grid item>
                          <Button variant="contained" onClick={()=>handleAddItemToList(newItemName)} sx={{minWidth:0, p:1}}><Add/></Button>
                      </Grid>
                  </Grid>
              </Card>

              {/* リスト表示 */}
              <Card>
                  <List dense>
                      {list.map(item => (
                          <ListItem key={item.id} button onClick={() => handleToggleCheck(item.id)} divider>
                              <ListItemIcon>
                                  {item.checked ? <CheckCircle color="success"/> : <RadioButtonUnchecked/>}
                              </ListItemIcon>
                              <ListItemText 
                                  primary={item.name} 
                                  sx={{ 
                                      textDecoration: item.checked ? 'line-through' : 'none', 
                                      color: item.checked ? 'gray' : 'inherit' 
                                  }}
                              />
                              <IconButton size="small" onClick={(e)=>{e.stopPropagation(); handleDeleteItem(item.id, 'list');}}>
                                  <Delete fontSize="small"/>
                              </IconButton>
                          </ListItem>
                      ))}
                      {list.length === 0 && <Typography align="center" color="textSecondary" sx={{py:4}}>リストは空です</Typography>}
                  </List>
                  
                  {/* 購入ボタン (チェックがある時のみ) */}
                  {list.some(i => i.checked) && (
                      <Box sx={{ p: 2 }}>
                          <Button fullWidth variant="contained" color="secondary" onClick={handleOpenPurchase} size="large">
                              チェックした品を購入する
                          </Button>
                      </Box>
                  )}
              </Card>
          </Box>
      )}

      {/* --- 2. 定番在庫 --- */}
      {tab === 1 && (
          <Box>
              {/* 検索と追加 */}
              <Box sx={{ display: 'flex', gap: 1, mb: 2, alignItems: 'center' }}>
                  <TextField 
                      fullWidth size="small" placeholder="名前やよみで検索"
                      InputProps={{ startAdornment: <InputAdornment position="start"><Search/></InputAdornment> }}
                      value={searchQuery} onChange={e=>setSearchQuery(e.target.value)}
                  />
                  <Button variant="outlined" onClick={handleOpenStockAdd} sx={{whiteSpace:'nowrap', height: 40}}>追加</Button>
              </Box>

              {/* ★修正: ボタンを小さく、読み仮名非表示、コンパクトに配置 */}
              <Grid container spacing={1} sx={{ mb: 4 }}>
                  {filteredStock.map(item => (
                      <Grid item xs={3} sm={2} key={item.id}>
                          <Button 
                              variant="outlined" 
                              fullWidth 
                              size="small"
                              onClick={() => handleStockClick(item)}
                              sx={{ 
                                  height: '100%', 
                                  minHeight: 40,
                                  fontSize: '0.75rem',
                                  padding: '4px',
                                  lineHeight: 1.2,
                                  color: 'text.primary',
                                  borderColor: 'divider',
                                  bgcolor: 'background.paper'
                              }}
                          >
                              {item.name}
                          </Button>
                      </Grid>
                  ))}
              </Grid>
              {filteredStock.length === 0 && <Typography align="center" color="textSecondary" sx={{mt:2, mb:4}}>在庫が見つかりません</Typography>}

              <Divider sx={{ mb: 2 }} />
              <Typography variant="subtitle2" color="textSecondary" gutterBottom>在庫管理・購入履歴</Typography>

              {/* ★修正: 在庫一覧リストを復活（編集・削除・最終購入日） */}
              <Card>
                  <List dense>
                      {filteredStock.map(item => (
                          <ListItem key={item.id} divider>
                              <ListItemText 
                                  primary={item.name} 
                                  secondary={`最終購入: ${getLastPurchasedDate(item.name)}`}
                              />
                              <IconButton size="small" onClick={()=>handleOpenStockEdit(item)}>
                                  <Edit fontSize="small"/>
                              </IconButton>
                              <IconButton size="small" color="error" onClick={()=>handleDeleteItem(item.id, 'stock')}>
                                  <Delete fontSize="small"/>
                              </IconButton>
                          </ListItem>
                      ))}
                  </List>
              </Card>
          </Box>
      )}

      {/* --- 3. 履歴 --- */}
      {tab === 2 && (
          <Card>
              <List dense>
                  {history.map((item, index) => {
                      let dateLabel = '';
                      try {
                          dateLabel = formatDistanceToNow(parseISO(item.date), { addSuffix: true, locale: ja });
                      } catch(e) { dateLabel = '不明'; }
                      
                      return (
                          <ListItem key={index} divider>
                              <ListItemText 
                                  primary={item.name} 
                                  secondary={`${dateLabel} に購入 ${item.price ? `(¥${item.price})` : ''}`}
                              />
                          </ListItem>
                      );
                  })}
                  {history.length === 0 && <Typography align="center" color="textSecondary" sx={{py:4}}>履歴はありません</Typography>}
              </List>
          </Card>
      )}

      {/* --- ダイアログ: 在庫追加・編集 --- */}
      <Dialog open={openStockDialog} onClose={handleCloseStockDialog}>
          <DialogTitle>{editStockItem ? '定番在庫を編集' : '定番在庫を追加'}</DialogTitle>
          <DialogContent>
              <TextField label="商品名" fullWidth margin="dense" value={newStockName} onChange={e=>setNewStockName(e.target.value)} />
              <TextField label="よみ (ひらがな)" fullWidth margin="dense" value={newStockYomi} onChange={e=>setNewStockYomi(e.target.value)} helperText="検索用" />
          </DialogContent>
          <DialogActions>
              <Button onClick={handleCloseStockDialog}>キャンセル</Button>
              <Button onClick={handleSaveStock} variant="contained">保存</Button>
          </DialogActions>
      </Dialog>

      {/* --- ダイアログ: 購入 --- */}
      <Dialog open={openPurchaseDialog} onClose={()=>setOpenPurchaseDialog(false)} fullWidth maxWidth="xs">
          <DialogTitle>購入手続き</DialogTitle>
          <DialogContent>
              <Tabs value={purchaseMode} onChange={(e,v)=>setPurchaseMode(v)} variant="fullWidth" sx={{ mb: 2 }}>
                  <Tab value="bulk" label="まとめて" />
                  <Tab value="individual" label="個別に" />
              </Tabs>

              {/* 支払い方法選択 */}
              <FormControl fullWidth margin="dense" sx={{ mb: 2 }}>
                  <InputLabel>支払い方法</InputLabel>
                  <Select value={paymentMethod} label="支払い方法" onChange={e=>setPaymentMethod(e.target.value)}>
                      {accounts.map(acc => <MenuItem key={acc.id} value={acc.id}>{acc.name}</MenuItem>)}
                  </Select>
              </FormControl>

              {/* まとめてモード */}
              {purchaseMode === 'bulk' && (
                  <TextField 
                      label="合計金額" type="number" fullWidth autoFocus
                      value={bulkTotal} onChange={e=>setBulkTotal(e.target.value)}
                      InputProps={{ startAdornment: <InputAdornment position="start">¥</InputAdornment> }}
                  />
              )}

              {/* 個別にモード */}
              {purchaseMode === 'individual' && (
                  <Box>
                      {list.filter(i => i.checked).map(item => (
                          <Box key={item.id} sx={{ display:'flex', alignItems:'center', gap:1, mb:1 }}>
                              <Typography variant="body2" sx={{flex:1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                                  {item.name}
                              </Typography>
                              <TextField 
                                  size="small" type="number" placeholder="¥" sx={{width:100}}
                                  value={individualPrices[item.id] || ''}
                                  onChange={e => setIndividualPrices({ ...individualPrices, [item.id]: e.target.value })}
                              />
                          </Box>
                      ))}
                      <Divider sx={{ my: 1 }} />
                      <Box sx={{ display:'flex', justifyContent:'space-between', fontWeight:'bold' }}>
                          <Typography>合計</Typography>
                          <Typography>¥{getIndividualTotal().toLocaleString()}</Typography>
                      </Box>
                  </Box>
              )}
          </DialogContent>
          <DialogActions>
              <Button onClick={()=>setOpenPurchaseDialog(false)} color="inherit">キャンセル</Button>
              <Button onClick={handleCompletePurchase} variant="contained" color="primary">完了</Button>
          </DialogActions>
      </Dialog>

    </Box>
  );
}