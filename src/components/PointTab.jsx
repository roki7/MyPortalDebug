// src/components/PointTab.jsx
import React, { useState, useRef, useEffect } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert,
  Chip,
} from "@mui/material";
import {
  Casino,
  MonetizationOn,
  Stars,
  SentimentVeryDissatisfied,
  Lock,
} from "@mui/icons-material";
import { useAuth } from "../AuthContext";
import { doc, updateDoc, increment } from "firebase/firestore";
import { db } from "../firebase";
import AdSenseBanner from "./AdSenseBanner";

// スロットの絵柄
const SYMBOLS = ["🍒", "🔔", "⭐", "7️⃣", "🍇"];

export default function PointTab() {
  const { userProfile, isPremium } = useAuth();
  const [points, setPoints] = useState(userProfile?.points || 0);

  // スロット用ステート
  const [openSlot, setOpenSlot] = useState(false);
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState(["❓", "❓", "❓"]);
  const [resultMessage, setResultMessage] = useState(null);
  const [winAmount, setWinAmount] = useState(0);

  // ★修正: 日付のフォーマットを統一 (YYYY-MM-DD)
  const getTodayStr = () => new Date().toISOString().split("T")[0];
  const todayStr = getTodayStr();

  // ★修正: 即時反映用のローカルステート
  // userProfileのデータが来るまではnull、来たらその値を使う。回したら即座に更新する。
  const [localLastDate, setLocalLastDate] = useState(null);

  useEffect(() => {
    if (userProfile) {
      setPoints(userProfile.points || 0);
      // ローカルステートがまだセットされていない、または古い場合に同期
      if (localLastDate === null) {
        setLocalLastDate(userProfile.lastSlotDate);
      }
    }
  }, [userProfile]);

  // 無料スピン権があるか判定 (ローカルステートを優先して判定)
  const isFreeSpinAvailable = localLastDate !== todayStr;

  const intervalRef = useRef(null);

  // ▼ スロット回転ロジック
  const spinSlot = async () => {
    // 【不正対策】有料会員以外はブロック
    if (!isPremium) {
      alert("この機能はプレミアム会員限定です。");
      setOpenSlot(false);
      return;
    }

    // コスト計算
    let cost = 1; // 基本は1pt
    if (isFreeSpinAvailable) {
      cost = 0; // 本日初回は無料
    }

    // 【残高チェック】有料スピンの場合のみ
    if (cost > 0 && points < cost) {
      alert(`ポイントが足りません（1回${cost}pt）`);
      return;
    }

    if (isSpinning) return;

    // --- 回転処理開始 ---
    setIsSpinning(true);
    setResultMessage(null);
    setWinAmount(0);

    // ★重要: ボタン連打防止 & 無料即時消費
    // 回した瞬間に「今日はもう回した」と記録してしまう
    if (cost === 0) {
      setLocalLastDate(todayStr);
    }

    // UI上のポイント消費
    const newPoints = points - cost;
    setPoints(newPoints);

    try {
      const userRef = doc(db, "users", userProfile.uid);

      const updateData = {
        points: increment(-cost),
      };

      // 無料分を使った場合はDBの日付も更新
      if (cost === 0) {
        updateData.lastSlotDate = todayStr;
      }

      await updateDoc(userRef, updateData);
    } catch (error) {
      console.error("データ更新エラー", error);
      // エラー時はロールバックなどの処理が必要ですが、簡易的にアラート
    }

    // アニメーション
    intervalRef.current = setInterval(() => {
      setReels([
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
        SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)],
      ]);
    }, 100);

    // 2秒後に停止
    setTimeout(() => {
      stopSlot();
    }, 2000);
  };

  const stopSlot = async () => {
    clearInterval(intervalRef.current);

    const rand = Math.floor(Math.random() * 1000) + 1;
    let finalReels = [];
    let reward = 0;
    let message = "";

    // 確率設定
    if (rand <= 5) {
      // 0.5%
      finalReels = ["7️⃣", "7️⃣", "7️⃣"];
      reward = 10;
      message = "大当たり！ 10ポイント獲得！";
    } else if (rand <= 50) {
      // 4.5%
      finalReels = ["🍇", "🍇", "🍇"];
      reward = 5;
      message = "当たり！ 5ポイント獲得！";
    } else if (rand <= 500) {
      // 45%
      finalReels = ["🍒", "🍒", "🍒"];
      reward = 1;
      message = "Win! 1ポイント獲得";
    } else {
      // 50%
      let r1, r2, r3;
      do {
        r1 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        r2 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
        r3 = SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)];
      } while (r1 === r2 && r2 === r3);
      finalReels = [r1, r2, r3];
      reward = 0;
      message = "残念... ハズレ";
    }

    setReels(finalReels);
    setIsSpinning(false);
    setResultMessage(message);
    setWinAmount(reward);

    if (reward > 0) {
      try {
        const userRef = doc(db, "users", userProfile.uid);
        await updateDoc(userRef, { points: increment(reward) });
        setPoints((prev) => prev + reward);
      } catch (error) {
        console.error("ポイント付与エラー", error);
      }
    }
  };

  // ボタンラベルの制御
  let buttonLabel = "SPIN! (1pt)";
  let buttonColor = "secondary";
  let isButtonDisabled = false;

  if (isSpinning) {
    buttonLabel = "回転中...";
    isButtonDisabled = true;
  } else if (isFreeSpinAvailable) {
    buttonLabel = "SPIN! (1日1回無料)";
    buttonColor = "primary";
  } else if (points < 1) {
    buttonLabel = "ポイント不足 (1pt必要)";
    isButtonDisabled = true;
  }

  return (
    <Box sx={{ pb: 4 }}>
      <Typography
        variant="h5"
        gutterBottom
        sx={{ display: "flex", alignItems: "center", gap: 1 }}
      >
        <Stars color="warning" /> ポイント管理
      </Typography>

      <Card
        sx={{
          mb: 3,
          background: "linear-gradient(135deg, #FFD700 30%, #FF8C00 90%)",
          color: "#fff",
        }}
      >
        <CardContent sx={{ textAlign: "center" }}>
          <Typography variant="h6">現在の所持ポイント</Typography>
          <Typography variant="h2" fontWeight="bold">
            {points.toLocaleString()}{" "}
            <span style={{ fontSize: "1.5rem" }}>pt</span>
          </Typography>
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent sx={{ textAlign: "center" }}>
          <Casino sx={{ fontSize: 60, color: "primary.main", mb: 1 }} />
          <Typography variant="h6" gutterBottom>
            運試しスロット
          </Typography>
          <Typography variant="body2" color="text.secondary" paragraph>
            毎日1回 無料で挑戦！
            <br />
            最大10ポイント獲得のチャンス
          </Typography>

          <Button
            variant="contained"
            size="large"
            onClick={() => setOpenSlot(true)}
            startIcon={<Casino />}
          >
            スロット画面を開く
          </Button>
        </CardContent>
      </Card>

      <AdSenseBanner clientId="ca-pub-XXXXXXXXXXXXXX" slotId="YYYYYYYYYY" />

      <Dialog
        open={openSlot}
        onClose={() => !isSpinning && setOpenSlot(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle sx={{ textAlign: "center" }}>
          🎰 スロットマシン
          {isFreeSpinAvailable && (
            <Chip
              label="今回無料"
              color="primary"
              size="small"
              sx={{ ml: 1, verticalAlign: "middle" }}
            />
          )}
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: "flex",
              justifyContent: "center",
              gap: 2,
              my: 3,
              p: 2,
              bgcolor: "#333",
              borderRadius: 2,
            }}
          >
            {reels.map((symbol, index) => (
              <Box
                key={index}
                sx={{
                  width: 60,
                  height: 80,
                  bgcolor: "#fff",
                  borderRadius: 1,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: "2.5rem",
                  boxShadow: "inset 0 0 10px rgba(0,0,0,0.5)",
                }}
              >
                {symbol}
              </Box>
            ))}
          </Box>

          {resultMessage && (
            <Alert
              severity={winAmount > 0 ? "success" : "info"}
              icon={
                winAmount > 0 ? (
                  <MonetizationOn />
                ) : (
                  <SentimentVeryDissatisfied />
                )
              }
              sx={{ mb: 2 }}
            >
              {resultMessage}
            </Alert>
          )}

          <Typography align="center" variant="body2" color="text.secondary">
            {isFreeSpinAvailable ? "消費: 0pt (ボーナス)" : "消費: 1pt"} / 現在:{" "}
            {points}pt
          </Typography>
        </DialogContent>
        <DialogActions
          sx={{
            justifyContent: "center",
            pb: 3,
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Button
            variant="contained"
            color={buttonColor}
            size="large"
            onClick={spinSlot}
            disabled={isButtonDisabled}
            sx={{
              width: "80%",
              borderRadius: 50,
              height: 50,
              fontSize: "1.2rem",
            }}
          >
            {buttonLabel}
          </Button>

          <Button
            onClick={() => setOpenSlot(false)}
            disabled={isSpinning}
            sx={{ color: "text.secondary" }}
          >
            やめる
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
