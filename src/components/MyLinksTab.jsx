// src/components/MyLinksTab.jsx
import React, { useState } from 'react';
import { 
  Box, Typography, Button, Card, CardContent, TextField, Chip, 
  Dialog, DialogTitle, DialogContent, DialogActions, 
  FormControl, InputLabel, Select, MenuItem, IconButton, Switch, FormControlLabel, Stack, Grid,
  List, ListItem, ListItemText, ListItemIcon, Divider
} from '@mui/material';
import { Add, Edit, Delete, OpenInNew, Smartphone, Language, Category, Save, Apps, AccountBalanceWallet, CreditCard } from '@mui/icons-material';

// プリセットデータ (FinanceTabから移動・統合)
const APP_SCHEMES = [
    { name: 'LINE', url: 'line://', short: 'LINE', defCat: 'shop' },
    { name: 'PayPay', url: 'paypay://', short: 'PayPay', defCat: 'shop' },
    { name: 'Amazon', url: 'https://www.amazon.co.jp/', short: 'Amazon', defCat: 'shop' },
    { name: '楽天市場', url: 'https://www.rakuten.co.jp/', short: '楽天', defCat: 'shop' },
    { name: '楽天カード', url: 'https://www.rakuten-card.co.jp/e-navi/', short: '楽天C', defCat: 'card' },
    { name: '三井住友(Vpass)', url: 'https://www.smbc-card.com/mem/top/index.jsp', short: 'Vpass', defCat: 'card' },
    { name: '三菱UFJ', url: 'https://www.bk.mufg.jp/', short: 'MUFG', defCat: 'bank' },
    { name: '三井住友銀行', url: 'https://www.smbc.co.jp/', short: 'SMBC', defCat: 'bank' },
    { name: 'みずほ', url: 'https://www.mizuhobank.co.jp/', short: 'みずほ', defCat: 'bank' },
    { name: 'ゆうちょ', url: 'https://www.jp-bank.japanpost.jp/', short: '郵貯', defCat: 'bank' },
    { name: '東京電力', url: 'https://www.kurashi.tepco.co.jp/', short: '東電', defCat: 'infra' },
];

export default function MyLinksTab({ myLinks, linkCategories, onAddMyLink, onDeleteMyLink, onAddCategory, onDeleteCategory }) {
  const [filterCat, setFilterCat] = useState('all');
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  const [openCatManageDialog, setOpenCatManageDialog] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);

  const initialLinkState = { id: null, name: '', url: '', categoryId: 'other', autoInput: true, browserMode: 'in-app' };
  const [editingLink, setEditingLink] = useState(initialLinkState);
  
  // カテゴリ管理用
  const [newCatName, setNewCatName] = useState('');

  // --- ハンドラー ---
  const handleSaveLink = () => {
    if(editingLink.name && editingLink.url) {
      const newLinkData = { 
          ...editingLink,
          id: editingLink.id || 'link_'+Date.now(),
          icon: '🔗' 
      };
      if (editingLink.id) onDeleteMyLink(editingLink.id); // 更新の場合は一度消す（簡易実装）
      onAddMyLink(newLinkData);
      setOpenLinkDialog(false);
      setEditingLink(initialLinkState);
    }
  };

  const handleAddCategory = () => {
    if(newCatName) {
      onAddCategory({ id: 'cat_'+Date.now(), name: newCatName });
      setNewCatName('');
    }
  };

  const getLinkIcon = (url) => {
      if (!url) return <OpenInNew sx={{fontSize:16}}/>;
      if (url.startsWith('http')) return <Language sx={{fontSize:16}}/>; 
      return <Smartphone sx={{fontSize:16}}/>;
  };

  const handleOpenLink = (link) => {
      if (!link || !link.url) return;
      if (link.url.startsWith('http')) {
          window.open(link.url, '_blank'); 
      } else {
          window.location.href = link.url;
      }
  };

  // 表示データのフィルタリング
  const displayedLinks = myLinks.filter(link => filterCat === 'all' || link.categoryId === filterCat);

  return (
    <Box>
      <Typography variant="h6" gutterBottom sx={{display:'flex', alignItems:'center', justifyContent:'space-between'}}>
        <Box sx={{display:'flex', alignItems:'center'}}><Apps sx={{ mr: 1 }} /> MyLinks</Box>
        <Button size="small" onClick={() => setIsEditMode(!isEditMode)} startIcon={isEditMode ? <Save/> : <Edit/>}>
            {isEditMode ? '完了' : '編集'}
        </Button>
      </Typography>

      {/* カテゴリフィルタ（横スクロール） */}
      <Box sx={{ display: 'flex', overflowX: 'auto', pb: 1, mb: 1, gap: 1, alignItems:'center' }}>
        <Chip 
            label="すべて" 
            color={filterCat === 'all' ? "primary" : "default"} 
            onClick={() => setFilterCat('all')} 
            variant={filterCat === 'all' ? "filled" : "outlined"}
        />
        {linkCategories.map(cat => (
            <Chip 
                key={cat.id} label={cat.name} 
                color={filterCat === cat.id ? "primary" : "default"}
                onClick={() => setFilterCat(cat.id)}
                variant={filterCat === cat.id ? "filled" : "outlined"}
            />
        ))}
        <IconButton size="small" onClick={() => setOpenCatManageDialog(true)} sx={{border:'1px solid #ddd', p:0.5}}>
            <Category fontSize="small" />
        </IconButton>
      </Box>

      {/* リンク一覧 */}
      <Grid container spacing={2}>
        {/* 追加ボタン */}
        <Grid item xs={4} sm={3}>
            <Card 
                sx={{ height: '100%', display:'flex', alignItems:'center', justifyContent:'center', cursor:'pointer', border:'2px dashed #ccc', boxShadow:'none' }}
                onClick={() => { setEditingLink({...initialLinkState, categoryId: filterCat === 'all' ? 'other' : filterCat}); setOpenLinkDialog(true); }}
            >
                <CardContent sx={{textAlign:'center', p:1}}>
                    <Add color="action" fontSize="large" />
                    <Typography variant="caption" display="block" color="textSecondary">追加</Typography>
                </CardContent>
            </Card>
        </Grid>
        
        {displayedLinks.map(link => (
            <Grid item xs={4} sm={3} key={link.id}>
                <Card 
                    sx={{ 
                        height: '100%', cursor: 'pointer', position:'relative',
                        bgcolor: isEditMode ? '#fff3e0' : 'white',
                        transition: 'transform 0.1s', '&:active': { transform: 'scale(0.95)' }
                    }}
                    onClick={() => isEditMode ? (setEditingLink(link) || setOpenLinkDialog(true)) : handleOpenLink(link)}
                >
                    <CardContent sx={{textAlign:'center', p:1, '&:last-child':{pb:1}}}>
                        <Box sx={{color: 'primary.main', mb:0.5}}>{getLinkIcon(link.url)}</Box>
                        <Typography variant="caption" sx={{fontWeight:'bold', lineHeight:1.2, display:'block', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>
                            {link.name}
                        </Typography>
                        {isEditMode && (
                            <Box sx={{position:'absolute', top:0, right:0, bgcolor:'rgba(255,255,255,0.8)', borderRadius:'0 0 0 8px'}}>
                                <Edit sx={{fontSize:14, color:'orange'}} />
                            </Box>
                        )}
                    </CardContent>
                </Card>
            </Grid>
        ))}
      </Grid>

      {/* リンク追加・編集ダイアログ */}
      <Dialog open={openLinkDialog} onClose={() => setOpenLinkDialog(false)}>
        <DialogTitle>{editingLink.id ? 'リンク編集' : 'リンク追加'}</DialogTitle>
        <DialogContent sx={{pt:2}}>
            {!editingLink.id && (
                <Box sx={{mb:2}}>
                    <Typography variant="caption" color="textSecondary">プリセットから選択:</Typography>
                    <Box sx={{display:'flex', gap:0.5, flexWrap:'wrap', mt:0.5}}>
                        {APP_SCHEMES.map(app => (
                            <Chip 
                                key={app.name} label={app.short} size="small" 
                                onClick={() => setEditingLink({ ...editingLink, name: app.name, url: app.url, categoryId: app.defCat })}
                                clickable variant="outlined"
                            />
                        ))}
                    </Box>
                </Box>
            )}
            <FormControl fullWidth sx={{mb:2, mt:1}}>
                <InputLabel>カテゴリ</InputLabel>
                <Select value={editingLink.categoryId} label="カテゴリ" onChange={(e)=>setEditingLink({...editingLink, categoryId:e.target.value})}>
                    {linkCategories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                </Select>
            </FormControl>
            <TextField label="名称" fullWidth value={editingLink.name} onChange={(e)=>setEditingLink({...editingLink, name:e.target.value})} sx={{mb:2}} />
            <TextField label="URL / スキーム" fullWidth value={editingLink.url} onChange={(e)=>setEditingLink({...editingLink, url:e.target.value})} helperText="https://... または line:// など" sx={{mb:2}} />
        </DialogContent>
        <DialogActions sx={{justifyContent:'space-between'}}>
            {editingLink.id ? (
                 <Button onClick={() => { if(window.confirm('削除しますか？')) { onDeleteMyLink(editingLink.id); setOpenLinkDialog(false); } }} color="error">削除</Button>
            ) : <div/>}
            <Box>
                <Button onClick={() => setOpenLinkDialog(false)}>キャンセル</Button>
                <Button onClick={handleSaveLink} variant="contained">保存</Button>
            </Box>
        </DialogActions>
      </Dialog>

      {/* カテゴリ管理ダイアログ */}
      <Dialog open={openCatManageDialog} onClose={() => setOpenCatManageDialog(false)}>
        <DialogTitle>ジャンル管理</DialogTitle>
        <DialogContent sx={{pt:2}}>
            <Box sx={{display:'flex', gap:1, mb:2}}>
                <TextField label="新しいジャンル" size="small" fullWidth value={newCatName} onChange={(e)=>setNewCatName(e.target.value)} />
                <Button variant="contained" onClick={handleAddCategory} disabled={!newCatName}>追加</Button>
            </Box>
            <List dense>
                {linkCategories.map(cat => (
                    <ListItem key={cat.id} secondaryAction={
                        <IconButton edge="end" onClick={() => { if(window.confirm(`「${cat.name}」を削除しますか？`)) onDeleteCategory(cat.id); }}>
                            <Delete fontSize="small" />
                        </IconButton>
                    }>
                        <ListItemText primary={cat.name} />
                    </ListItem>
                ))}
            </List>
        </DialogContent>
        <DialogActions><Button onClick={() => setOpenCatManageDialog(false)}>閉じる</Button></DialogActions>
      </Dialog>
    </Box>
  );
}