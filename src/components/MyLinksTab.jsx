// src/components/MyLinksTab.jsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Menu,
  InputAdornment,
  Grid,
  Paper,
  Tabs,
  Tab,
  ListItemIcon,
  List,
  ListItem,
  ListItemText,
} from "@mui/material";
import {
  Add,
  MoreVert,
  Edit,
  Delete,
  Search,
  PhoneIphone,
  Settings,
  Link as LinkIcon,
} from "@mui/icons-material";

export default function MyLinksTab({
  myLinks,
  linkCategories,
  onAddMyLink,
  onUpdateMyLink,
  onDeleteMyLink,
  onAddCategory,
  onDeleteCategory,
  onEditCategory,
}) {
  // State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("ALL"); // カテゴリフィルタ用

  // リンク編集・追加用モーダル
  const [openLinkDialog, setOpenLinkDialog] = useState(false);
  const [editLink, setEditLink] = useState(null);
  const [linkForm, setLinkForm] = useState({
    title: "",
    url: "",
    categoryId: "",
  });

  // カテゴリ管理用モーダル
  const [openCatDialog, setOpenCatDialog] = useState(false);
  const [catForm, setCatForm] = useState("");
  const [editingCatId, setEditingCatId] = useState(null);

  // メニュー用 (編集・削除のポップアップ)
  const [anchorEl, setAnchorEl] = useState(null);
  const [selectedLink, setSelectedLink] = useState(null);

  // --- ヘルパー ---

  const handleLinkClick = (url) => {
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const renderIcon = (url) => {
    if (!url) return <LinkIcon fontSize="large" color="action" />;
    const isWebUrl = /^https?:\/\//i.test(url);
    if (isWebUrl) {
      try {
        const domain = new URL(url).hostname;
        return (
          <Box
            component="img"
            src={`https://www.google.com/s2/favicons?domain=${domain}&sz=64`}
            onError={(e) => {
              e.target.style.display = "none";
            }} // エラー時は非表示(親の背景色等でカバー)
            sx={{ width: 32, height: 32, borderRadius: 1 }}
          />
        );
      } catch (e) {
        return <LinkIcon fontSize="large" color="action" />;
      }
    } else {
      // URLスキームなど
      return <PhoneIphone fontSize="large" color="primary" />;
    }
  };

  // --- リンク操作 ---

  const handleOpenLinkAdd = () => {
    setEditLink(null);
    // 新規作成時は現在選択中のカテゴリをデフォルトにする（ALLなら先頭）
    const initialCat =
      selectedCategory !== "ALL"
        ? selectedCategory
        : linkCategories[0]?.id || "other";
    setLinkForm({ title: "", url: "", categoryId: initialCat });
    setOpenLinkDialog(true);
  };

  const handleOpenLinkEdit = (link) => {
    setEditLink(link);
    // 古いデータでtitleがない場合はnameを使う、それもなければ空文字
    const title = link.title || link.name || "";
    setLinkForm({
      title: title,
      url: link.url,
      categoryId: link.categoryId || "other",
    });
    setOpenLinkDialog(true);
    setAnchorEl(null);
  };

  const handleSaveLink = () => {
    if (!linkForm.title || !linkForm.url) {
      alert("タイトルとURLは必須です");
      return;
    }
    const linkData = {
      ...linkForm,
      id: editLink ? editLink.id : Date.now().toString(),
      icon: "link", // 互換性のため
    };

    if (editLink) {
      onUpdateMyLink(linkData);
    } else {
      onAddMyLink(linkData);
    }
    setOpenLinkDialog(false);
  };

  const handleDeleteLinkAction = () => {
    if (selectedLink && window.confirm("削除しますか？")) {
      onDeleteMyLink(selectedLink.id);
    }
    setAnchorEl(null);
  };

  // --- カテゴリ操作 ---

  const handleSaveCategory = () => {
    if (!catForm) return;
    if (editingCatId) {
      onEditCategory(editingCatId, catForm);
    } else {
      onAddCategory({ id: Date.now().toString(), name: catForm });
    }
    setCatForm("");
    setEditingCatId(null);
  };

  const handleDeleteCategoryAction = (catId) => {
    if (
      window.confirm(
        "カテゴリを削除しますか？\n含まれるリンクは「その他」になります。"
      )
    ) {
      onDeleteCategory(catId);
    }
  };

  // --- フィルタリング & 表示データ作成 ---

  // 1. 検索フィルタ
  // ★修正: title が undefined の場合に備えて空文字にフォールバックする処理を追加
  let displayLinks = (myLinks || []).filter((l) => {
    const title = l.title || l.name || "";
    return title.toLowerCase().includes((searchQuery || "").toLowerCase());
  });

  // 2. カテゴリフィルタ (ALL以外の場合)
  if (selectedCategory !== "ALL") {
    if (selectedCategory === "uncategorized") {
      displayLinks = displayLinks.filter(
        (l) => !linkCategories.find((c) => c.id === l.categoryId)
      );
    } else {
      displayLinks = displayLinks.filter(
        (l) => l.categoryId === selectedCategory
      );
    }
  }

  return (
    <Box sx={{ pb: 10 }}>
      {/* 検索バー */}
      <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
        <TextField
          fullWidth
          size="small"
          placeholder="検索"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{ bgcolor: "white", borderRadius: 1 }}
        />
        <Button
          variant="contained"
          sx={{ minWidth: 40, p: 1 }}
          onClick={handleOpenLinkAdd}
        >
          <Add />
        </Button>
      </Box>

      {/* カテゴリ選択タブ (スクロール可能) */}
      <Tabs
        value={selectedCategory}
        onChange={(e, v) => setSelectedCategory(v)}
        variant="scrollable"
        scrollButtons="auto"
        sx={{
          mb: 2,
          minHeight: 40,
          "& .MuiTab-root": { minHeight: 40, py: 0, fontSize: "0.85rem" },
        }}
      >
        <Tab value="ALL" label="すべて" />
        {linkCategories.map((cat) => (
          <Tab key={cat.id} value={cat.id} label={cat.name} />
        ))}
        {myLinks.some(
          (l) => !linkCategories.find((c) => c.id === l.categoryId)
        ) && <Tab value="uncategorized" label="未分類" />}
      </Tabs>

      {/* MyApps風グリッド表示 */}
      <Grid container spacing={2}>
        {displayLinks.map((link) => (
          <Grid item xs={3} sm={2} key={link.id}>
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                textAlign: "center",
                cursor: "pointer",
                position: "relative",
                "&:hover .menu-btn": { opacity: 1 }, // PCでのホバー時
              }}
              onClick={() => handleLinkClick(link.url)}
            >
              {/* アイコンエリア */}
              <Paper
                elevation={2}
                sx={{
                  width: 56,
                  height: 56,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  mb: 1,
                  borderRadius: 2,
                  bgcolor: "white",
                  overflow: "hidden",
                }}
              >
                {renderIcon(link.url)}
              </Paper>

              {/* 名称 (titleがない場合はnameを表示) */}
              <Typography
                variant="caption"
                sx={{ lineHeight: 1.2, width: "100%", wordBreak: "break-word" }}
              >
                {link.title || link.name || "名称なし"}
              </Typography>

              {/* 編集メニューボタン (絶対配置) */}
              <IconButton
                className="menu-btn"
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setAnchorEl(e.currentTarget);
                  setSelectedLink(link);
                }}
                sx={{
                  position: "absolute",
                  top: -8,
                  right: -8,
                  opacity: 0,
                  transition: "opacity 0.2s",
                  bgcolor: "rgba(255,255,255,0.8)",
                  "&:hover": { bgcolor: "white" },
                  opacity: 0.5,
                }}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Box>
          </Grid>
        ))}
        {displayLinks.length === 0 && (
          <Grid item xs={12}>
            <Typography align="center" color="textSecondary" sx={{ mt: 4 }}>
              リンクがありません
            </Typography>
          </Grid>
        )}
      </Grid>

      {/* カテゴリ管理ボタン (下部) */}
      <Box sx={{ mt: 4, textAlign: "center" }}>
        <Button
          variant="outlined"
          startIcon={<Settings />}
          onClick={() => setOpenCatDialog(true)}
          size="small"
          color="inherit"
        >
          カテゴリを管理
        </Button>
      </Box>

      {/* --- ダイアログ: リンク追加・編集 --- */}
      <Dialog
        open={openLinkDialog}
        onClose={() => setOpenLinkDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>{editLink ? "リンクを編集" : "リンクを追加"}</DialogTitle>
        <DialogContent>
          <TextField
            label="タイトル"
            fullWidth
            margin="dense"
            value={linkForm.title}
            onChange={(e) =>
              setLinkForm({ ...linkForm, title: e.target.value })
            }
          />
          <TextField
            label="URL / スキーム"
            fullWidth
            margin="dense"
            placeholder="https://... or line://..."
            value={linkForm.url}
            onChange={(e) => setLinkForm({ ...linkForm, url: e.target.value })}
            helperText="http以外はスマホアイコンになります"
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>カテゴリ</InputLabel>
            <Select
              value={linkForm.categoryId}
              label="カテゴリ"
              onChange={(e) =>
                setLinkForm({ ...linkForm, categoryId: e.target.value })
              }
            >
              {linkCategories.map((c) => (
                <MenuItem key={c.id} value={c.id}>
                  {c.name}
                </MenuItem>
              ))}
              <MenuItem value="other">その他</MenuItem>
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenLinkDialog(false)}>キャンセル</Button>
          <Button onClick={handleSaveLink} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- ダイアログ: カテゴリ管理 --- */}
      <Dialog
        open={openCatDialog}
        onClose={() => setOpenCatDialog(false)}
        fullWidth
        maxWidth="xs"
      >
        <DialogTitle>カテゴリ管理</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 1, mb: 2, mt: 1 }}>
            <TextField
              label={editingCatId ? "カテゴリ名を変更" : "新しいカテゴリ"}
              size="small"
              fullWidth
              value={catForm}
              onChange={(e) => setCatForm(e.target.value)}
            />
            <Button variant="contained" onClick={handleSaveCategory}>
              {editingCatId ? "更新" : "追加"}
            </Button>
          </Box>
          <List dense>
            {linkCategories.map((cat) => (
              <ListItem
                key={cat.id}
                secondaryAction={
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setCatForm(cat.name);
                        setEditingCatId(cat.id);
                      }}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDeleteCategoryAction(cat.id)}
                    >
                      <Delete fontSize="small" />
                    </IconButton>
                  </Box>
                }
              >
                <ListItemText primary={cat.name} />
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setOpenCatDialog(false);
              setCatForm("");
              setEditingCatId(null);
            }}
          >
            閉じる
          </Button>
        </DialogActions>
      </Dialog>

      {/* --- メニュー (編集/削除) --- */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={() => setAnchorEl(null)}
      >
        <MenuItem onClick={() => handleOpenLinkEdit(selectedLink)}>
          <ListItemIcon>
            <Edit fontSize="small" />
          </ListItemIcon>
          編集
        </MenuItem>
        <MenuItem onClick={handleDeleteLinkAction} sx={{ color: "error.main" }}>
          <ListItemIcon>
            <Delete fontSize="small" color="error" />
          </ListItemIcon>
          削除
        </MenuItem>
      </Menu>
    </Box>
  );
}
