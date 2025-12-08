// src/components/ShoppingTab.jsx
import React, { useState } from 'react';
import { 
  Box, Typography, Card, CardContent, List, ListItem, ListItemText, ListItemIcon, 
  IconButton, TextField, Button, Checkbox, Tabs, Tab, Divider 
} from '@mui/material';
import { Add, Delete, ShoppingCart, Kitchen, CheckCircle, RadioButtonUnchecked, Share } from '@mui/icons-material';

export default function ShoppingTab({ shopping, onUpdateShopping, onUpdateStock, onAddPayment, accounts }) {
  const [tab, setTab] = useState(0);
  const [newItem, setNewItem] = useState('');
  const [price, setPrice] = useState('');

  const list = shopping.list || [];
  const stock = shopping.stock || [];

  const handleAddItem = () => {
    if (!newItem) return;
    const item = { id: Date.now(), name: newItem, checked: false, shared: true }; // デフォルト共有
    if (tab === 0) {
      onUpdateShopping({ ...shopping, list: [...list, item] });
    } else {
      onUpdateStock([...stock, item]);
    }
    setNewItem('');
    setPrice('');
  };

  const handleToggle = (item, isStock) => {
    const target = isStock ? stock : list;
    const updated = target.map(i => i.id === item.id ? { ...i, checked: !i.checked } : i);
    if (isStock) onUpdateStock(updated);
    else onUpdateShopping({ ...shopping, list: updated });
  };

  const handleDelete = (id, isStock) => {
    const target = isStock ? stock : list;
    const updated = target.filter(i => i.id !== id);
    if (isStock) onUpdateStock(updated);
    else onUpdateShopping({ ...shopping, list: updated });
  };

  // 買い物完了処理（チェックしたものを家計簿へ）
  const handleCheckout = () => {
    const bought = list.filter(i => i.checked);
    if (bought.length === 0) return;
    
    // 合計金額入力
    const total = prompt(`「${bought[0].name}」など${bought.length}点の合計金額は？`, price);
    if (total) {
        onAddPayment({
            id: Date.now(),
            name: '買い物 (' + bought.map(i=>i.name).join(',') + ')',
            amount: parseInt(total),
            accountId: accounts[0]?.id, // デフォルト口座
            date: new Date().toISOString().split('T')[0],
            isShared: true // 買い物は共有出費とする
        });
        // 買ったものをリストから削除
        onUpdateShopping({ ...shopping, list: list.filter(i => !i.checked) });
    }
  };

  return (
    <Box>
      <Tabs value={tab} onChange={(e,v)=>setTab(v)} variant="fullWidth" sx={{mb:2}}>
        <Tab icon={<ShoppingCart/>} label="買うもの" />
        <Tab icon={<Kitchen/>} label="ストック" />
      </Tabs>

      <Box sx={{ display:'flex', gap:1, mb:2 }}>
        <TextField 
            label="アイテム名" size="small" fullWidth 
            value={newItem} onChange={e=>setNewItem(e.target.value)} 
            onKeyPress={e=>e.key==='Enter' && handleAddItem()}
        />
        <Button variant="contained" onClick={handleAddItem}><Add/></Button>
      </Box>

      <Card>
        <CardContent>
          <List>
            {(tab === 0 ? list : stock).map(item => (
              <ListItem key={item.id} dense button onClick={() => handleToggle(item, tab===1)}>
                <ListItemIcon>
                  {item.checked ? <CheckCircle color="success"/> : <RadioButtonUnchecked/>}
                </ListItemIcon>
                <ListItemText 
                    primary={item.name} 
                    sx={{ textDecoration: item.checked ? 'line-through' : 'none', color: item.checked ? 'gray' : 'inherit' }}
                />
                {/* 共有アイコン（飾り） */}
                {item.shared && <Share fontSize="small" sx={{color:'#ddd', mr:1}} />}
                <IconButton onClick={(e) => { e.stopPropagation(); handleDelete(item.id, tab===1); }}><Delete/></IconButton>
              </ListItem>
            ))}
            {(tab === 0 ? list : stock).length === 0 && <Typography align="center" color="textSecondary" sx={{py:2}}>リストは空です</Typography>}
          </List>
          
          {tab === 0 && list.some(i => i.checked) && (
              <>
                <Divider />
                <Button fullWidth variant="contained" color="secondary" sx={{mt:2}} onClick={handleCheckout}>
                    チェックしたものを家計簿に記録
                </Button>
              </>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}