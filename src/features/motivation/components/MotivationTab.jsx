import React, { useState, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  CircularProgress,
  Chip,
  Alert,
  TextField,
  List,
  ListItem,
  ListItemText,
  IconButton,
  Divider,
  LinearProgress,
  Collapse,
  useTheme,
  Grid,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from "@mui/material";
import {
  Psychology,
  AutoAwesome,
  DeleteOutline,
  ExpandLess,
  Fastfood,
  Add,
} from "@mui/icons-material";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { format } from "date-fns";
import AdSenseBanner from "../../../components/AdSenseBanner";

export default function MotivationTab({
  currentEarnings,
  fixedCost,
  settings,
  onUpdateSettings,
  isPremium = true,
  wishlist = [],
  onAddWishlist,
  onDeleteWishlist,
  onUpdateWishlist,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [loading, setLoading] = useState(false);
  const [dailyMessage, setDailyMessage] = useState(null);
  const [error, setError] = useState(null);

  const [showLivingInput, setShowLivingInput] = useState(false);

  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemPriority, setNewItemPriority] = useState(1);

  const livingExpenses = parseInt(settings.livingExpenses) || 0;

  const listBgColor = isDark ? "rgba(255, 255, 255, 0.05)" : "#f9f9f9";

  const aiCardBgColor = isDark ? "rgba(255, 248, 225, 0.05)" : "#fff8e1";
  const aiCardBorderColor = isDark
    ? "rgba(255, 215, 0, 0.3)"
    : "secondary.main";

  const messageBoxBgColor = isDark ? theme.palette.background.paper : "white";
  const messageTextColor = isDark ? theme.palette.text.primary : "#4e342e";

  // ★修正: 生活費入力欄の背景色と文字色を定義
  const collapseBgColor = isDark ? "rgba(255, 255, 255, 0.1)" : "#f5f5f5";
  const collapseTextColor = isDark ? "text.primary" : "text.secondary";

  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const savedData = localStorage.getItem("gemini_daily_motivation");
    if (savedData) {
      const parsed = JSON.parse(savedData);
      if (parsed.date === today) {
        setDailyMessage(parsed.message);
      }
    }
  }, []);

  const trueDisposableIncome = Math.max(
    0,
    currentEarnings - fixedCost - livingExpenses
  );

  const totalWishlistCost = wishlist.reduce(
    (sum, item) => sum + parseInt(item.price),
    0
  );

  const remainingNeeded = totalWishlistCost - trueDisposableIncome;

  const progress =
    totalWishlistCost > 0
      ? Math.min(100, (trueDisposableIncome / totalWishlistCost) * 100)
      : 100;

  const handleUpdateLivingExpenses = (val) => {
    onUpdateSettings({ ...settings, livingExpenses: val });
  };

  const handleAddItem = () => {
    const limit = isPremium ? 3 : 1;
    if (wishlist.length >= limit) {
      alert(isPremium ? "登録できるのは3つまでです" : "無料会員は1つまでです");
      return;
    }

    if (
      parseInt(newItemPriority) === 1 &&
      wishlist.some((i) => i.priority === 1)
    ) {
      if (
        !window.confirm(
          "優先度「1: 高 (Top)」は既に存在します。重複して登録しますか？"
        )
      ) {
        return;
      }
    }

    if (newItemName && newItemPrice) {
      onAddWishlist({
        id: Date.now(),
        name: newItemName,
        price: parseInt(newItemPrice),
        priority: parseInt(newItemPriority),
      });
      setNewItemName("");
      setNewItemPrice("");
      setNewItemPriority(1);
    }
  };

  const handleChangeItemPriority = (item, newPriority) => {
    if (
      parseInt(newPriority) === 1 &&
      wishlist.some((i) => i.priority === 1 && i.id !== item.id)
    ) {
      if (
        !window.confirm(
          "優先度「1: 高 (Top)」は既に存在します。重複して登録しますか？"
        )
      ) {
        return;
      }
    }
    if (onUpdateWishlist) {
      onUpdateWishlist({ ...item, priority: parseInt(newPriority) });
    }
  };

  const handleGenerateMessage = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;

      if (!apiKey) throw new Error("APIキーが設定されていません");

      const savedData = localStorage.getItem("gemini_daily_motivation");
      const previousMessage = savedData
        ? JSON.parse(savedData).message
        : "特になし";

      const sortedList = [...wishlist].sort((a, b) => a.priority - b.priority);
      const wishlistStatus =
        sortedList.length > 0
          ? sortedList
              .map((i) => `[優先度${i.priority}] ${i.name}(${i.price}円)`)
              .join(", ")
          : "現在登録なし";

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash-lite",
      });
      const prompt = `
        あなたはユーザー専属の情熱的で親しみやすいライフコーチです。
        以下の詳細な収支状況をもとに、今日一日を頑張るための励ましメッセージを生成してください。

        【ユーザーの状況】
        - 現在の稼ぎ(見込み): ${currentEarnings}円
        - 月の固定費(家賃等): ${fixedCost}円
        - 設定された生活費(食費・酒・タバコ等): ${livingExpenses}円
        - ★本当に自由に使えるお金(見込み): ${trueDisposableIncome}円
          (稼ぎから固定費と生活費を引いた額)

        【欲しいものリスト】
        ${wishlistStatus}
        
        【計算上の状況】
        - 欲しいもの総額: ${totalWishlistCost}円
        - 目標達成まであと: ${
          remainingNeeded > 0 ? remainingNeeded + "円足りない" : "全額達成！"
        }

        【制約事項】
        - ユーザーを励まし、節約や稼ぎへのモチベーションを上げて。
        - 60文字程度で、ポジティブかつユーモアを交えて。
      `;

      const result = await model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      setDailyMessage(text);

      const today = format(new Date(), "yyyy-MM-dd");
      localStorage.setItem(
        "gemini_daily_motivation",
        JSON.stringify({ date: today, message: text })
      );
    } catch (err) {
      console.error(err);
      setError("AIコーチが休憩中です...また後で！");
    } finally {
      setLoading(false);
    }
  };

  const balanceDisplay = currentEarnings - fixedCost - livingExpenses;
  const isBudgetSafe = balanceDisplay >= 0;

  const displayWishlist = [...wishlist].sort((a, b) => a.priority - b.priority);

  const maxItems = isPremium ? 3 : 1;
  const isLimitReached = wishlist.length >= maxItems;

  return (
    <Box>
      <Card sx={{ pd: 15, mb: 2, bgcolor: "background.paper" }}>
        <CardContent sx={{ textAlign: "center" }}>
          <Typography
            variant="h6"
            gutterBottom
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            今月のゆとり資金
            <Chip
              label="Projected"
              size="small"
              color="primary"
              variant="outlined"
              sx={{ ml: 1, height: 20, fontSize: 10 }}
            />
          </Typography>

          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 2,
              mb: 1,
              flexWrap: "wrap",
            }}
          >
            <Box>
              <Typography variant="caption" color="text.secondary">
                稼ぎ(見込)
              </Typography>
              <Typography variant="body2" color="success" fontWeight="bold">
                +¥{currentEarnings.toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                固定費
              </Typography>
              <Typography variant="body2" color="error" fontWeight="bold">
                -¥{fixedCost.toLocaleString()}
              </Typography>
            </Box>
            <Box>
              <Typography variant="caption" color="text.secondary">
                生活費(概算)
              </Typography>
              <Typography
                variant="body2"
                color="warning.main"
                fontWeight="bold"
              >
                -¥{livingExpenses.toLocaleString()}
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ my: 1 }} />

          <Typography variant="caption" color="text.secondary">
            自由に使えるお金 (見込)
          </Typography>
          <Typography
            variant="h3"
            fontWeight="bold"
            color={isBudgetSafe ? "primary" : "error"}
          >
            {isBudgetSafe ? "" : "-"}¥
            {Math.abs(balanceDisplay).toLocaleString()}
          </Typography>

          <Box sx={{ mt: 2 }}>
            <Button
              size="small"
              startIcon={showLivingInput ? <ExpandLess /> : <Fastfood />}
              onClick={() => setShowLivingInput(!showLivingInput)}
              sx={{ color: "text.secondary", fontSize: "0.8rem" }}
            >
              生活費(食費・酒・タバコ等)を設定
            </Button>
            <Collapse in={showLivingInput}>
              <Box
                sx={{
                  mt: 1,
                  p: 2,
                  bgcolor: collapseBgColor, // ★修正: ダークモード対応色
                  borderRadius: 2,
                }}
              >
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ mb: 1, textAlign: "left", color: collapseTextColor }} // ★修正: ダークモード対応色
                >
                  毎月大体かかる生活費（食事、お酒、おやつ、タバコなど）を入力してください。これを引いた額を「自由なお金」として計算します。
                </Typography>
                <TextField
                  label="月の大まかな生活費"
                  type="number"
                  size="small"
                  fullWidth
                  value={livingExpenses === 0 ? "" : livingExpenses}
                  onChange={(e) =>
                    handleUpdateLivingExpenses(parseInt(e.target.value) || 0)
                  }
                  InputProps={{
                    endAdornment: <Typography variant="caption">円</Typography>,
                  }}
                />
              </Box>
            </Collapse>
          </Box>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 1,
            }}
          >
            <Typography variant="h6">🎁 欲しいものリスト</Typography>
            <Typography variant="caption">
              {remainingNeeded <= 0 && wishlist.length > 0
                ? "🎉 全て買えます！"
                : isBudgetSafe
                ? `あと ¥${remainingNeeded.toLocaleString()}`
                : "まずは赤字解消！"}
            </Typography>
          </Box>

          {wishlist.length > 0 && isBudgetSafe && (
            <Box sx={{ mb: 2 }}>
              <LinearProgress
                variant="determinate"
                value={progress}
                sx={{ height: 10, borderRadius: 5, mb: 1 }}
                color={progress >= 100 ? "success" : "primary"}
              />
              <Typography variant="caption" align="right" display="block">
                達成率: {Math.floor(progress)}%
              </Typography>
            </Box>
          )}

          <List dense sx={{ bgcolor: listBgColor, borderRadius: 1, mb: 2 }}>
            {displayWishlist.map((item) => (
              <ListItem
                key={item.id}
                secondaryAction={
                  <IconButton
                    edge="end"
                    size="small"
                    onClick={() => onDeleteWishlist(item.id)}
                  >
                    <DeleteOutline fontSize="small" />
                  </IconButton>
                }
              >
                <ListItemText
                  primary={
                    <Box
                      component="span"
                      sx={{ display: "flex", alignItems: "center" }}
                    >
                      <Select
                        value={item.priority}
                        onChange={(e) =>
                          handleChangeItemPriority(item, e.target.value)
                        }
                        variant="standard"
                        disableUnderline
                        size="small"
                        sx={{
                          mr: 1,
                          height: 24,
                          fontSize: "0.75rem",
                          fontWeight: "bold",
                          color:
                            item.priority === 1
                              ? "secondary.main"
                              : "text.secondary",
                          ".MuiSelect-select": {
                            paddingRight: "16px !important",
                          },
                        }}
                      >
                        <MenuItem value={1} sx={{ fontSize: "0.8rem" }}>
                          1:高
                        </MenuItem>
                        <MenuItem value={2} sx={{ fontSize: "0.8rem" }}>
                          2:中
                        </MenuItem>
                        <MenuItem value={3} sx={{ fontSize: "0.8rem" }}>
                          3:低
                        </MenuItem>
                      </Select>
                      {item.name}
                    </Box>
                  }
                  secondary={`¥${item.price.toLocaleString()}`}
                  secondaryTypographyProps={{ color: "text.secondary" }}
                />
              </ListItem>
            ))}
            {displayWishlist.length === 0 && (
              <Typography
                variant="caption"
                align="center"
                display="block"
                sx={{ p: 2, color: "text.secondary" }}
              >
                登録なし
              </Typography>
            )}
          </List>

          {!isLimitReached ? (
            <Grid container spacing={1} alignItems="center">
              <Grid item xs={4}>
                <TextField
                  label="品名"
                  size="small"
                  fullWidth
                  value={newItemName}
                  onChange={(e) => setNewItemName(e.target.value)}
                />
              </Grid>
              <Grid item xs={3}>
                <TextField
                  label="金額"
                  type="number"
                  size="small"
                  fullWidth
                  value={newItemPrice}
                  onChange={(e) => setNewItemPrice(e.target.value)}
                />
              </Grid>
              <Grid item xs={3}>
                <FormControl fullWidth size="small">
                  <InputLabel>優先度</InputLabel>
                  <Select
                    value={newItemPriority}
                    label="優先度"
                    onChange={(e) => setNewItemPriority(e.target.value)}
                  >
                    <MenuItem value={1}>1:高</MenuItem>
                    <MenuItem value={2}>2:中</MenuItem>
                    <MenuItem value={3}>3:低</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={2}>
                <Button
                  variant="contained"
                  fullWidth
                  onClick={handleAddItem}
                  disabled={!newItemName || !newItemPrice}
                  sx={{ minWidth: 0, px: 0 }}
                >
                  <Add />
                </Button>
              </Grid>
            </Grid>
          ) : (
            <Alert severity="info" sx={{ py: 0 }}>
              {isPremium
                ? "登録上限(3つ)です"
                : "無料版は1つまで。有料版で解放！"}
            </Alert>
          )}
        </CardContent>
      </Card>

      {isPremium && (
        <Card
          sx={{
            border: "2px solid",
            borderColor: aiCardBorderColor,
            bgcolor: aiCardBgColor,
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <AutoAwesome color="secondary" sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="bold" color="secondary">
                今日のAIコーチ
              </Typography>
            </Box>

            <>
              {dailyMessage ? (
                <Box
                  sx={{
                    p: 2,
                    bgcolor: messageBoxBgColor,
                    borderRadius: 2,
                    border: isDark
                      ? "1px dashed rgba(255,255,255,0.3)"
                      : "1px dashed #fbc02d",
                    textAlign: "center",
                    position: "relative",
                  }}
                >
                  <Typography
                    variant="body1"
                    sx={{
                      fontWeight: "bold",
                      fontSize: "1.05rem",
                      mb: 1,
                      color: messageTextColor,
                    }}
                  >
                    "{dailyMessage}"
                  </Typography>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    明日また新しい言葉を届けます
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ textAlign: "center" }}>
                  <Typography
                    variant="body2"
                    sx={{ mb: 2, color: "text.primary" }}
                  >
                    生活費も確保した上で、欲しいものに手が届くか。
                    <br />
                    今の頑張りをAIが分析してエールを送ります！
                  </Typography>
                  <Button
                    variant="contained"
                    color="secondary"
                    size="large"
                    startIcon={
                      loading ? (
                        <CircularProgress size={20} color="inherit" />
                      ) : (
                        <Psychology />
                      )
                    }
                    onClick={handleGenerateMessage}
                    disabled={loading}
                    fullWidth
                    sx={{ fontWeight: "bold" }}
                  >
                    {loading ? "分析中..." : "今日の言葉を受け取る"}
                  </Button>
                </Box>
              )}
              {error && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  {error}
                </Alert>
              )}
            </>
          </CardContent>
        </Card>
      )}
      <AdSenseBanner clientId="ca-pub-2913122779764758" slotId="1840701793" />
    </Box>
  );
}
