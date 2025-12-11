// src/components/ShiftEditModal.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControlLabel,
  Switch,
  Box,
  Divider,
} from "@mui/material";

export default function ShiftEditModal({
  open,
  onClose,
  shift,
  job,
  onUpdate,
  onDelete,
}) {
  const [isManual, setIsManual] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState("");

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [breakTime, setBreakTime] = useState(""); // 休憩時間
  const [status, setStatus] = useState("attended"); // attended, absence, early_leave

  useEffect(() => {
    if (shift) {
      setIsManual(!!shift.isManualOverride);
      setManualAmount(shift.manualAmount || "");
      setManualDate(shift.manualTransferDate || "");
      setStartTime(shift.start || job?.defaultStart || "");
      setEndTime(shift.end || job?.defaultEnd || "");
      // 休憩時間: シフトに保存されていればそれ、なければ仕事設定のデフォルト、なければ0
      setBreakTime(
        shift.breakTime !== undefined ? shift.breakTime : job?.breakTime || 0
      );
      setStatus(shift.status || "attended");
    }
  }, [shift, job]);

  const handleSave = () => {
    const updatedShift = {
      ...shift,
      start: startTime,
      end: endTime,
      breakTime: parseInt(breakTime) || 0,
      status: status,
      isManualOverride: isManual,
      // 手動モードなら入力値を保存、そうでなければクリア
      manualAmount: isManual ? parseInt(manualAmount) : null,
      manualTransferDate: isManual ? manualDate : null,
      // 歩合などで毎回入力が必要な場合
      commissionAmount:
        job?.type === "commission"
          ? parseInt(manualAmount)
          : shift.commissionAmount,
    };
    onUpdate(updatedShift);
    onClose();
  };

  // ★修正: ステータスのトグル処理（同じボタンを押すと通常に戻る）
  const handleToggleStatus = (targetStatus) => {
    if (status === targetStatus) {
      setStatus("attended"); // 解除して通常へ
    } else {
      setStatus(targetStatus);
    }
  };

  if (!shift) return null;

  // 早退・欠勤時は時間をグレーアウトする判定
  const isTimeDisabled = status === "early_leave" || status === "absence";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{job?.name || shift.customName || "詳細編集"}</DialogTitle>
      <DialogContent>
        {/* ステータス変更: トグル式に変更 */}
        <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
          <Button
            variant={status === "early_leave" ? "contained" : "outlined"}
            onClick={() => handleToggleStatus("early_leave")}
            color="warning"
            fullWidth
          >
            早退
          </Button>
          <Button
            variant={status === "absence" ? "contained" : "outlined"}
            onClick={() => handleToggleStatus("absence")}
            color="error"
            fullWidth
          >
            欠勤
          </Button>
        </Box>

        {/* 時間変更（時給制の場合のみ表示、手動ONでも消さない） */}
        {job?.type === "hourly" && (
          <>
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                label="開始"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isTimeDisabled} // 早退・欠勤時は入力不可
              />
              <TextField
                label="終了"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isTimeDisabled} // 早退・欠勤時は入力不可
              />
            </Box>
            {/* 休憩時間の復活 */}
            <TextField
              label="休憩 (分)"
              type="number"
              fullWidth
              value={breakTime}
              onChange={(e) => setBreakTime(e.target.value)}
              disabled={isTimeDisabled} // 早退・欠勤時は入力不可
              placeholder="例: 60"
              autoComplete="off"
              sx={{ mb: 2 }}
            />
          </>
        )}

        <Divider sx={{ my: 2 }} />

        {/* 手動修正スイッチエリア */}
        <Box sx={{ bgcolor: "#fff3e0", p: 2, borderRadius: 2 }}>
          <FormControlLabel
            control={
              <Switch
                checked={isManual}
                onChange={(e) => setIsManual(e.target.checked)}
              />
            }
            label="選択シフトのみ修正 (金額・振込予定日)"
            sx={{ mb: 1, display: "block" }}
          />

          {/* スイッチONの時だけ表示 */}
          {isManual && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="金額"
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                helperText="今回のみ設定済みの金額から変更した金額で計算されます"
              />
              <TextField
                label="振込予定日"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
              />
            </Box>
          )}
        </Box>
      </DialogContent>
      <DialogActions>
        <Button
          onClick={() => {
            if (window.confirm("削除しますか？")) onDelete(shift);
          }}
          color="error"
        >
          削除
        </Button>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSave} variant="contained" color="primary">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
