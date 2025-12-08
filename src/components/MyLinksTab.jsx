// src/components/MyLinksTab.jsx
import React, { useState } from 'react';
import { 
  Box, Typography, Card, CardContent, Grid, Button, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, 
  Chip, Menu, MenuItem, ListItemIcon, Select, FormControl, InputLabel
} from '@mui/material';
import { 
    Add, Edit, Delete, MoreVert, Language, Smartphone, 
    CreditCard, AccountBalance, ShoppingBag, Receipt, Apps
} from '@mui/icons-material';

// アイコンマッピング
const getIcon = (iconName, categoryId) => {
    // カテゴリごとのデフォルトアイコン
    if (!iconName) {
        if (categoryId === 'bank') return <AccountBalance fontSize="large" />;
        if (categoryId === 'card') return <CreditCard fontSize="large" />;
        if (categoryId === 'pay') return <Smartphone fontSize="large" />;
        if (categoryId === 'shop') return <ShoppingBag fontSize="large" />;
        if (categoryId === 'infra') return <Receipt fontSize="large" />;
        return <Language fontSize="large" />;
    }
    // テキストが短い場合はそのまま表示、それ以外はカテゴリに基づく
    if (iconName.length <= 3) return iconName;
    return <Language fontSize="large" />;
};

export default function MyLinksTab({ 
  myLinks = [], linkCategories = [], 
  onAddMyLink, onUpdateMyLink, onDeleteMyLink, 
  onAddCategory, onDeleteCategory, onEditCategory 
}) {
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  const [editLink, setEditLink] = useState(null);
  
  const [openCatDialog, setOpenCatDialog] = useState(false);
  const [catName, setCatName] = useState('');

  const [anchorEl, setAnchorEl] = useState(null);
  const [targetLink, setTargetLink] = useState(null);

  const displayedLinks = selectedCategory === 'ALL' 
    ? myLinks 
    : myLinks.filter(l => l.categoryId === selectedCategory);

  const handleSaveLink = () => {
    if (editLink.title && editLink.url) {
      if (editLink.id) onUpdateMyLink(editLink); else onAddMyLink({ ...editLink, id: Date.now() });
      setOpenLinkDialog(false);
    }
  };

  const handleAddCat = () => {
    if (catName) { onAddCategory({ id: Date.now(), name: catName }); setCatName(''); setOpenCatDialog(false); }
  };

  const handleMenuOpen = (e, link) => { setAnchorEl(e.currentTarget); setTargetLink(link); };
  const handleMenuClose = () => { setAnchorEl(null); setTargetLink(null); };

  return (
    <Box>
      <Box sx={{ display: 'flex', gap: 1, overflowX: 'auto', mb: 2, pb: 1, alignItems:'center' }}>
        <Chip label="すべて" color={selectedCategory === 'ALL' ? 'primary' : 'default'} onClick={() => setSelectedCategory('ALL')} clickable />
        {linkCategories.map(cat => (
          <Chip 
            key={cat.id} 
            label={cat.name} 
            color={selectedCategory === cat.id ? 'primary' : 'default'} 
            onClick={() => setSelectedCategory(cat.id)}
            onDelete={() => { if(window.confirm(`「${cat.name}」カテゴリを削除しますか？`)) onDeleteCategory(cat.id); }}
            clickable
          />
        ))}
        <Chip icon={<Add />} label="カテゴリ追加" onClick={() => setOpenCatDialog(true)} variant="outlined" clickable />
      </Box>

      <Grid container spacing={2}>
        {displayedLinks.map(link => (
          <Grid item xs={6} sm={4} md={3} key={link.id}>
            <Card variant="outlined" sx={{ height: '100%', display: 'flex', flexDirection: 'column', position:'relative', minHeight: 140 }}>
              <IconButton size="small" sx={{ position: 'absolute', top: 0, right: 0, zIndex:1 }} onClick={(e) => handleMenuOpen(e, link)}>
                <MoreVert fontSize="small" />
              </IconButton>
              <CardContent sx={{ flexGrow: 1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', cursor:'pointer', pt:3 }} onClick={() => window.open(link.url, '_blank')}>
                
                {/* アイコン表示部分 */}
                <Box sx={{ 
                    width: 60, height: 60, borderRadius: '50%', bgcolor: '#f0f0f0', 
                    display: 'flex', alignItems: 'center', justifyContent: 'center', 
                    fontSize: '1.2rem', fontWeight: 'bold', mb: 1, color: '#1976d2' 
                }}>
                    {getIcon(link.icon, link.categoryId)}
                </Box>

                <Typography variant="body2" fontWeight="bold" noWrap sx={{ width:'100%', textAlign:'center' }}>{link.title}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
        
        <Grid item xs={6} sm={4} md={3}>
          <Button 
            variant="outlined" 
            sx={{ height: '100%', width: '100%', minHeight: 140, borderStyle: 'dashed', flexDirection:'column' }}
            onClick={() => {
              setEditLink({ id: null, title: '', url: '', icon: '', categoryId: selectedCategory === 'ALL' ? '' : selectedCategory });
              setOpenLinkDialog(true);
            }}
          >
            <Add sx={{ fontSize: 40, mb:1 }} />
            <Typography variant="caption">リンク追加</Typography>
          </Button>
        </Grid>
      </Grid>

      <Dialog open={openLinkDialog} onClose={() => setOpenLinkDialog(false)} fullWidth maxWidth="xs">
        <DialogTitle>{editLink?.id ? 'リンク編集' : '新規リンク'}</DialogTitle>
        <DialogContent>
          <TextField label="タイトル" fullWidth margin="dense" value={editLink?.title || ''} onChange={(e) => setEditLink({...editLink, title: e.target.value})} />
          <TextField label="URL" fullWidth margin="dense" value={editLink?.url || ''} onChange={(e) => setEditLink({...editLink, url: e.target.value})} />
          <TextField label="アイコン(短い名前)" fullWidth margin="dense" value={editLink?.icon || ''} onChange={(e) => setEditLink({...editLink, icon: e.target.value})} helperText="空欄でカテゴリのアイコン、または2〜3文字" />
          
          <FormControl fullWidth margin="dense">
            <InputLabel>カテゴリー</InputLabel>
            <Select 
                value={editLink?.categoryId || ''} 
                label="カテゴリー"
                onChange={(e) => setEditLink({...editLink, categoryId: e.target.value})}
            >
                <MenuItem value=""><em>なし</em></MenuItem>
                {linkCategories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLinkDialog(false)}>キャンセル</Button>
          <Button onClick={handleSaveLink} variant="contained">保存</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCatDialog} onClose={() => setOpenCatDialog(false)}>
          <DialogTitle>カテゴリ追加</DialogTitle>
          <DialogContent>
              <TextField autoFocus margin="dense" label="カテゴリ名" fullWidth value={catName} onChange={(e)=>setCatName(e.target.value)}/>
          </DialogContent>
          <DialogActions>
              <Button onClick={()=>setOpenCatDialog(false)}>キャンセル</Button>
              <Button onClick={handleAddCat} variant="contained">追加</Button>
          </DialogActions>
      </Dialog>

      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose}>
        <MenuItem onClick={() => { setEditLink(targetLink); setOpenLinkDialog(true); handleMenuClose(); }}>
          <ListItemIcon><Edit fontSize="small" /></ListItemIcon>編集
        </MenuItem>
        <MenuItem onClick={() => { onDeleteMyLink(targetLink.id); handleMenuClose(); }}>
          <ListItemIcon><Delete fontSize="small" /></ListItemIcon>削除
        </MenuItem>
      </Menu>
    </Box>
  );
}