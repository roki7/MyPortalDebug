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
  Paper,
  useTheme,
} from "@mui/material";

export default function ShiftEditModal({
  open,
  onClose,
  shift,
  job,
  onUpdate,
  onDelete,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [isManual, setIsManual] = useState(false);
  const [manualAmount, setManualAmount] = useState("");
  const [manualDate, setManualDate] = useState("");

  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [breakTime, setBreakTime] = useState("");
  const [status, setStatus] = useState("attended");

  useEffect(() => {
    if (shift) {
      setIsManual(!!shift.isManualOverride);
      setManualAmount(shift.manualAmount || "");
      setManualDate(shift.manualTransferDate || "");
      setStartTime(shift.start || job?.defaultStart || "");
      setEndTime(shift.end || job?.defaultEnd || "");
      setBreakTime(
        shift.breakTime !== undefined ? shift.breakTime : job?.breakTime || 0
      );
      // データに古い "early_leave" が残っていたら "paid_leave" か "attended" に読み替える
      // ここでは安全に "attended" (通常) に戻し、ユーザーに再選択させます
      setStatus(
        shift.status === "early_leave" ? "attended" : shift.status || "attended"
      );
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
      manualAmount: isManual ? parseInt(manualAmount) : null,
      manualTransferDate: isManual ? manualDate : null,
      commissionAmount:
        job?.type === "commission"
          ? parseInt(manualAmount)
          : shift.commissionAmount,
    };
    onUpdate(updatedShift);
    onClose();
  };

  const handleToggleStatus = (targetStatus) => {
    if (status === targetStatus) {
      setStatus("attended");
    } else {
      setStatus(targetStatus);
    }
  };

  if (!shift) return null;

  // 欠勤(absence)の時だけ時間をグレーアウト
  const isTimeDisabled = status === "absence";

  // 色設定
  const paperBgColor = isDark ? theme.palette.background.paper : "#fff";
  const manualBoxBgColor = isDark ? "rgba(255, 152, 0, 0.15)" : "#fff3e0";
  const inputBgColor = isDark ? "rgba(255, 255, 255, 0.05)" : "transparent";

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{job?.name || shift.customName || "詳細編集"}</DialogTitle>
      <DialogContent>
        {/* ステータス変更ボタンエリア */}
        <Box sx={{ mb: 2, display: "flex", gap: 1 }}>
          {/* ★修正: 有給ボタン (早退を廃止) */}
          <Button
            variant={status === "paid_leave" ? "contained" : "outlined"}
            onClick={() => handleToggleStatus("paid_leave")}
            color="success"
            fullWidth
            sx={{ fontWeight: "bold" }}
          >
            有給
          </Button>
          <Button
            variant={status === "absence" ? "contained" : "outlined"}
            onClick={() => handleToggleStatus("absence")}
            color="error"
            fullWidth
            sx={{ fontWeight: "bold" }}
          >
            欠勤
          </Button>
        </Box>

        {/* 時間変更（時給制の場合のみ表示） */}
        {job?.type === "hourly" && (
          <Paper
            elevation={0}
            sx={{
              p: 2,
              borderRadius: 2,
              bgcolor: paperBgColor,
              border: `1px solid ${theme.palette.divider}`,
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
              <TextField
                label="開始"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isTimeDisabled}
                sx={{ "& .MuiInputBase-root": { bgcolor: inputBgColor } }}
              />
              <TextField
                label="終了"
                type="time"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isTimeDisabled}
                sx={{ "& .MuiInputBase-root": { bgcolor: inputBgColor } }}
              />
            </Box>
            <TextField
              label="休憩 (分)"
              type="number"
              fullWidth
              value={breakTime}
              onChange={(e) => setBreakTime(e.target.value)}
              disabled={isTimeDisabled}
              placeholder="例: 60"
              autoComplete="off"
              sx={{ "& .MuiInputBase-root": { bgcolor: inputBgColor } }}
            />
          </Paper>
        )}

        <Divider sx={{ my: 2 }} />

        {/* 手動修正スイッチエリア */}
        <Box sx={{ bgcolor: manualBoxBgColor, p: 2, borderRadius: 2 }}>
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

          {isManual && (
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <TextField
                label="金額"
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(e.target.value)}
                helperText="設定済みの金額を上書きします"
                sx={{ "& .MuiInputBase-root": { bgcolor: inputBgColor } }}
              />
              <TextField
                label="振込予定日"
                type="date"
                InputLabelProps={{ shrink: true }}
                value={manualDate}
                onChange={(e) => setManualDate(e.target.value)}
                sx={{ "& .MuiInputBase-root": { bgcolor: inputBgColor } }}
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
