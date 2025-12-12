// src/components/MotivationTab.jsx
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
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  useTheme,
} from "@mui/material";
import {
  Psychology,
  AutoAwesome,
  Lock,
  AddCircleOutline,
  DeleteOutline,
  ExpandMore,
  ExpandLess,
  Fastfood, // 食事・生活費アイコン用
} from "@mui/icons-material";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { format } from "date-fns";

export default function MotivationTab({
  currentEarnings,
  fixedCost,
  settings,
  onUpdateSettings,
  isPremium = true,
  wishlist = [],
  onAddWishlist,
  onDeleteWishlist,
}) {
  const theme = useTheme(); // ★追加: テーマ取得
  const isDark = theme.palette.mode === "dark"; // ★追加: ダークモード判定

  const [loading, setLoading] = useState(false);
  const [dailyMessage, setDailyMessage] = useState(null);
  const [error, setError] = useState(null);

  // 生活費入力の開閉用
  const [showLivingInput, setShowLivingInput] = useState(false);

  // 欲しいもの入力用
  const [newItemName, setNewItemName] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [newItemPriority, setNewItemPriority] = useState(1); // 1:高, 2:中, 3:低

  // 生活費 (settingsから取得、なければ0)
  const livingExpenses = parseInt(settings.livingExpenses) || 0;

  // 欲しいものリストの背景
  const listBgColor = isDark ? "rgba(255, 255, 255, 0.05)" : "#f9f9f9";

  // AIコーチカードの背景 (ライト: 薄い黄色, ダーク: ダークグレー)
  const aiCardBgColor = isDark ? "rgba(255, 248, 225, 0.05)" : "#fff8e1";
  const aiCardBorderColor = isDark
    ? "rgba(255, 215, 0, 0.3)"
    : "secondary.main";

  // AIメッセージボックスの背景 (ライト: 白, ダーク: カードより少し明るいグレー)
  const messageBoxBgColor = isDark ? theme.palette.background.paper : "white";
  const messageTextColor = isDark ? theme.palette.text.primary : "#4e342e";

  // 前回のメッセージ取得用（日付チェック付き）
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

  // --- 計算ロジック (新) ---
  // 本当に自由なお金 = 稼ぎ - 固定費 - 生活費
  const trueDisposableIncome = Math.max(
    0,
    currentEarnings - fixedCost - livingExpenses
  );

  // 欲しいもの総額
  const totalWishlistCost = wishlist.reduce(
    (sum, item) => sum + parseInt(item.price),
    0
  );

  // 残り必要な金額
  const remainingNeeded = totalWishlistCost - trueDisposableIncome;

  // 進捗率
  const progress =
    totalWishlistCost > 0
      ? Math.min(100, (trueDisposableIncome / totalWishlistCost) * 100)
      : 100;

  // --- ハンドラ ---
  const handleUpdateLivingExpenses = (val) => {
    onUpdateSettings({ ...settings, livingExpenses: val });
  };

  const handleAddItem = () => {
    // 制限チェック
    const limit = isPremium ? 3 : 1;
    if (wishlist.length >= limit) {
      alert(isPremium ? "登録できるのは3つまでです" : "無料会員は1つまでです");
      return;
    }

    if (newItemName && newItemPrice) {
      onAddWishlist({
        id: Date.now(),
        name: newItemName,
        price: parseInt(newItemPrice),
        priority: isPremium ? newItemPriority : 1, // 無料会員は強制的に優先度1(または非表示)
      });
      setNewItemName("");
      setNewItemPrice("");
      setNewItemPriority(1);
    }
  };

  const handleGenerateMessage = async () => {
    setLoading(true);
    setError(null);
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("APIキーが設定されていません");

      // 前回のメッセージを取得（重複回避用）
      const savedData = localStorage.getItem("gemini_daily_motivation");
      const previousMessage = savedData
        ? JSON.parse(savedData).message
        : "特になし";

      // 欲しいものリストの状況を文字列化 (優先順位順にソートして渡す)
      const sortedList = [...wishlist].sort((a, b) => a.priority - b.priority);
      const wishlistStatus =
        sortedList.length > 0
          ? sortedList
              .map((i) => `[優先度${i.priority}] ${i.name}(${i.price}円)`)
              .join(", ")
          : "現在登録なし";

      const genAI = new GoogleGenerativeAI(apiKey);
      const model = genAI.getGenerativeModel(
        {
          model: "gemini-1.5-flash",
        },
        { apiVersion: "v1beta" }
      );
      const prompt = `
        あなたはユーザー専属の情熱的で親しみやすいライフコーチです。
        以下の詳細な収支状況をもとに、今日一日を頑張るための励ましメッセージを生成してください。

        【ユーザーの状況】
        - 現在の稼ぎ: ${currentEarnings}円
        - 月の固定費(家賃等): ${fixedCost}円
        - 設定された生活費(食費・酒・タバコ等): ${livingExpenses}円
        - ★本当に自由に使えるお金: ${trueDisposableIncome}円
          (稼ぎから固定費と生活費を引いた額)

        【欲しいものリスト】
        ${wishlistStatus}
        
        【計算上の状況】
        - 欲しいもの総額: ${totalWishlistCost}円
        - 目標達成まであと: ${
          remainingNeeded > 0 ? remainingNeeded + "円足りない" : "全額達成！"
        }

        【制約事項】
        1. 前回のアドバイス「${previousMessage.substring(
          0,
          15
        )}...」とは違う切り口で話してください。
        2. 「生活費」はユーザーにとって大事な息抜き資金(食費やおやつ代)です。これを確保した上で、さらに欲しいものが買えるかどうかに言及してください。
        3. 欲しいものリストがある場合は、優先順位が高いものを具体的に挙げ、「あと少しで〇〇が手に入る！」などと鼓舞してください。
        4. 60文字程度で、ポジティブかつユーモアを交えて。
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

  // 表示用のバランス計算（マイナスにならないように）
  const balanceDisplay = currentEarnings - fixedCost - livingExpenses;
  const isBudgetSafe = balanceDisplay >= 0;

  // リストのソート（表示用）
  const displayWishlist = [...wishlist].sort((a, b) => a.priority - b.priority);

  // 登録制限数
  const maxItems = isPremium ? 3 : 1;
  const isLimitReached = wishlist.length >= maxItems;

  return (
    <Box>
      {/* 1. 収支状況カード */}
      <Card sx={{ mb: 2, bgcolor: "background.paper" }}>
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
            今月の余裕資金{" "}
            <Chip
              label="Real"
              size="small"
              color="success"
              sx={{ ml: 1, height: 20 }}
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
                稼ぎ
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
            本当に自由に使えるお金
          </Typography>
          <Typography
            variant="h3"
            fontWeight="bold"
            color={isBudgetSafe ? "primary" : "error"}
          >
            {isBudgetSafe ? "" : "-"}¥
            {Math.abs(balanceDisplay).toLocaleString()}
          </Typography>

          {/* 生活費設定アコーディオン */}
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
              <Box sx={{ mt: 1, p: 2, bgcolor: "#f5f5f5", borderRadius: 2 }}>
                <Typography
                  variant="caption"
                  display="block"
                  sx={{ mb: 1, textAlign: "left" }}
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

      {/* 2. 欲しいものリスト機能 */}
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
                      {isPremium && (
                        <Chip
                          label={`No.${item.priority}`}
                          size="small"
                          color={item.priority === 1 ? "secondary" : "default"}
                          sx={{ mr: 1, height: 20, fontSize: "0.6rem" }}
                        />
                      )}
                      {item.name}
                    </Box>
                  }
                  secondary={`¥${item.price.toLocaleString()}`}
                  // ★必要なら文字色も明示的に指定（通常はtheme依存でOKだが念のため）
                  secondaryTypographyProps={{ color: "text.secondary" }}
                />
              </ListItem>
            ))}
            {/* ... (リストが空の場合の表示) ... */}
          </List>

          {/* ... (追加フォーム) ... */}
        </CardContent>
      </Card>

      {/* 3. AIコーチ (Gemini) - 有料会員のみ表示するよう変更 */}
      {/* ★修正: isPremium が true の場合のみレンダリングする */}
      {isPremium && (
        <Card
          sx={{
            border: "2px solid",
            borderColor: aiCardBorderColor, // ★修正
            bgcolor: aiCardBgColor, // ★修正
          }}
        >
          <CardContent>
            <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
              <AutoAwesome color="secondary" sx={{ mr: 1 }} />
              <Typography variant="h6" fontWeight="bold" color="secondary">
                今日のAIコーチ
              </Typography>
            </Box>

            {/* isPremium判定は親で行っているので、ここは中身だけでOK */}
            <>
              {dailyMessage ? (
                <Box
                  sx={{
                    p: 2,
                    bgcolor: messageBoxBgColor, // ★修正
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
                      color: messageTextColor, // ★修正
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
    </Box>
  );
}
