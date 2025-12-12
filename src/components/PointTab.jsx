// src/components/PointTab.jsx
import React, { useState, useEffect } from "react";
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Dialog,
  DialogContent,
  LinearProgress,
  Grid,
  Chip,
} from "@mui/material";
import {
  Casino,
  CardGiftcard,
  PlayCircleFilled,
  Lock,
} from "@mui/icons-material";
import { format } from "date-fns";

export default function PointTab({ points, onAddPoints, isPremium = true }) {
  const [openAd, setOpenAd] = useState(false);
  const [adTimer, setAdTimer] = useState(5);
  const [isSpinning, setIsSpinning] = useState(false);
  const [slotResult, setSlotResult] = useState(null); // null, 0(ハズレ), 1, 5, 10
  const [todayDone, setTodayDone] = useState(false);

  // 1日1回チェック
  useEffect(() => {
    const today = format(new Date(), "yyyy-MM-dd");
    const lastPlayed = localStorage.getItem("slot_last_played");
    if (lastPlayed === today) {
      setTodayDone(true);
    }
  }, []);

  // 広告(疑似)を見る処理
  const handleWatchAd = () => {
    setOpenAd(true);
    setAdTimer(5); // 5秒の広告
    const timer = setInterval(() => {
      setAdTimer((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  // 広告を見終わってスロット開始
  const handleStartSlot = () => {
    setOpenAd(false);
    setIsSpinning(true);
    setSlotResult(null);

    // スロットの回転演出 (2秒後に結果)
    setTimeout(() => {
      const rand = Math.random();
      let result = 0;
      // 確率設定 (例: ハズレ40%, 1pt:40%, 5pt:15%, 10pt:5%)
      if (rand < 0.4) result = 0;
      else if (rand < 0.8) result = 1;
      else if (rand < 0.95) result = 5;
      else result = 10;

      setSlotResult(result);
      setIsSpinning(false);

      if (result > 0) {
        onAddPoints(result);
      }

      // 記録
      const today = format(new Date(), "yyyy-MM-dd");
      localStorage.setItem("slot_last_played", today);
      setTodayDone(true);
    }, 2000);
  };

  return (
    <Box>
      {/* ポイント表示カード */}
      <Card
        sx={{
          mb: 2,
          background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
          color: "white",
        }}
      >
        <CardContent sx={{ textAlign: "center" }}>
          <Typography variant="subtitle1" sx={{ opacity: 0.8 }}>
            現在のポイント
          </Typography>
          <Typography variant="h2" fontWeight="bold">
            {points.toLocaleString()}{" "}
            <span style={{ fontSize: "20px" }}>pt</span>
          </Typography>
          <Typography variant="caption" sx={{ opacity: 0.8 }}>
            100pt = 100円分ギフトと交換可能 (予定)
          </Typography>
        </CardContent>
      </Card>

      {/* スロット機能 */}
      <Card>
        <CardContent sx={{ textAlign: "center" }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              mb: 2,
            }}
          >
            <Casino color="warning" sx={{ fontSize: 30, mr: 1 }} />
            <Typography variant="h6">デイリースロット</Typography>
            {!isPremium && <Chip label="Premium" size="small" sx={{ ml: 1 }} />}
          </Box>

          {!isPremium ? (
            <Box sx={{ py: 3, color: "text.secondary" }}>
              <Lock sx={{ fontSize: 40, mb: 1 }} />
              <Typography variant="body2">
                有料会員限定のコンテンツです。
                <br />
                毎日ポイントを貯めてギフトをゲット！
              </Typography>
            </Box>
          ) : todayDone ? (
            <Box sx={{ py: 3 }}>
              <Typography variant="h5" color="text.secondary" gutterBottom>
                本日は終了しました
              </Typography>
              <Typography variant="body2">
                また明日チャレンジしてください！
              </Typography>
            </Box>
          ) : (
            <Box>
              {/* スロット画面 */}
              <Box
                sx={{
                  height: 100,
                  bgcolor: "#f5f5f5",
                  mb: 2,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: 2,
                  border: "2px solid #ddd",
                  fontSize: 40,
                  fontWeight: "bold",
                  color: "#333",
                }}
              >
                {isSpinning
                  ? "🎰"
                  : slotResult !== null
                  ? slotResult === 0
                    ? "ハズレ"
                    : `${slotResult}pt`
                  : "777"}
              </Box>

              {slotResult !== null ? (
                <Box>
                  <Typography
                    variant="h6"
                    color={slotResult > 0 ? "error" : "text.secondary"}
                    sx={{ mb: 2 }}
                  >
                    {slotResult > 0
                      ? `おめでとう！ ${slotResult}ポイントGET！`
                      : "残念！また明日！"}
                  </Typography>
                </Box>
              ) : (
                <Button
                  variant="contained"
                  color="warning"
                  size="large"
                  fullWidth
                  startIcon={<PlayCircleFilled />}
                  onClick={handleWatchAd}
                  disabled={isSpinning}
                >
                  CMを見てスロットを回す
                </Button>
              )}
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 広告待機ダイアログ (AdSenseのプレースホルダー) */}
      <Dialog open={openAd} maxWidth="xs" fullWidth>
        <DialogContent sx={{ textAlign: "center", py: 4 }}>
          <Typography variant="h6" gutterBottom>
            CM再生中...
          </Typography>
          <Box sx={{ my: 3 }}>
            {/* ここに将来的にAdSenseのバナーなどを貼る */}
            <Box
              sx={{
                width: "100%",
                height: 150,
                bgcolor: "#eee",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#999",
              }}
            >
              [ 広告スペース ]
            </Box>
          </Box>
          <Typography variant="caption" display="block" sx={{ mb: 1 }}>
            あと {adTimer} 秒で特典を獲得できます
          </Typography>
          <LinearProgress
            variant="determinate"
            value={((5 - adTimer) / 5) * 100}
          />

          <Button
            variant="contained"
            fullWidth
            sx={{ mt: 3 }}
            disabled={adTimer > 0}
            onClick={handleStartSlot}
          >
            {adTimer > 0 ? "視聴中..." : "スロットへ進む"}
          </Button>
        </DialogContent>
      </Dialog>
    </Box>
  );
}
