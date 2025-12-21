import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  InputAdornment,
  Box,
  Typography,
  Switch,
  FormControlLabel,
  ToggleButton,
  ToggleButtonGroup,
  useTheme,
  Collapse, // ★追加: アニメーション用
} from "@mui/material";

export default function JobEditDialog({
  open,
  onClose,
  job,
  onSave,
  members = [],
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [name, setName] = useState("");
  const [type, setType] = useState("hourly");
  const [value, setValue] = useState("");
  const [monthlySalary, setMonthlySalary] = useState("");
  const [closingDay, setClosingDay] = useState(99);
  const [payDay, setPayDay] = useState(25);
  const [payTiming, setPayTiming] = useState("next");
  const [defaultStart, setDefaultStart] = useState("09:00");
  const [defaultEnd, setDefaultEnd] = useState("17:00");
  const [breakTime, setBreakTime] = useState("60");
  const [fixedWorkingDays, setFixedWorkingDays] = useState("");
  const [memberId, setMemberId] = useState("me");

  const [fixedOvertimeHours, setFixedOvertimeHours] = useState("");
  const [standardHoursPerDay, setStandardHoursPerDay] = useState("8");

  const [days, setDays] = useState([1, 2, 3, 4, 5]);
  const [skipHolidays, setSkipHolidays] = useState(true);

  // ★追加: 時間記録を有効にするかどうか
  const [enableTimeRecording, setEnableTimeRecording] = useState(true);

  useEffect(() => {
    if (open) {
      if (job) {
        setName(job.name);
        setType(job.type);
        setValue(job.value || "");
        setMonthlySalary(job.monthlySalary || "");
        setClosingDay(job.closingDay !== undefined ? job.closingDay : 99);
        setPayDay(job.payDay !== undefined ? job.payDay : 25);
        setPayTiming(job.payTiming || "next");
        setDefaultStart(job.defaultStart || "09:00");
        setDefaultEnd(job.defaultEnd || "17:00");
        setBreakTime(job.breakTime || "60");
        setFixedWorkingDays(job.fixedWorkingDays || "");
        setMemberId(job.memberId || "me");
        setDays(job.days || [1, 2, 3, 4, 5]);
        setSkipHolidays(
          job.skipHolidays !== undefined ? job.skipHolidays : true
        );
        setFixedOvertimeHours(job.fixedOvertimeHours || "");
        setStandardHoursPerDay(job.standardHoursPerDay || "8");

        // ★追加: 完全歩合かつ、初期値が入っていない(または09:00/17:00のまま使っていない)場合はOFF判定
        if (job.type === "commission") {
          // すでにカスタム値が入っているっぽいならON、そうでなければOFF
          const hasCustomTime =
            job.defaultStart && job.defaultStart !== "09:00";
          setEnableTimeRecording(hasCustomTime);
        } else {
          setEnableTimeRecording(true);
        }
      } else {
        // 新規作成
        setName("");
        setType("hourly");
        setValue("");
        setMonthlySalary("");
        setClosingDay(99);
        setPayDay(25);
        setPayTiming("next");
        setDefaultStart("09:00");
        setDefaultEnd("17:00");
        setBreakTime("60");
        setFixedWorkingDays("");
        setMemberId("me");
        setDays([1, 2, 3, 4, 5]);
        setSkipHolidays(true);
        setFixedOvertimeHours("");
        setStandardHoursPerDay("8");
        setEnableTimeRecording(true); // デフォルトはON
      }
    }
  }, [open, job]);

  // ★追加: タイプ変更時に完全歩合ならデフォルトOFFにする
  const handleTypeChange = (newType) => {
    setType(newType);
    if (newType === "commission") {
      setEnableTimeRecording(false);
    } else {
      setEnableTimeRecording(true);
    }
  };

  const handleSave = () => {
    // 完全歩合で時間記録OFFなら、時間はnullや空文字にして保存する手もあるが、
    // いったん「入力された値」または「デフォルト」をそのまま保存しても実害はない。
    // UI上の表示制御を主目的とする。

    const newJob = {
      id: job ? job.id : crypto.randomUUID(),
      name,
      type,
      value: type === "hourly" || type === "fixed" ? parseInt(value) : 0,
      monthlySalary: type === "monthly" ? parseInt(monthlySalary) : 0,
      closingDay: parseInt(closingDay),
      payDay: parseInt(payDay),
      payTiming,
      // OFFの場合は空文字にする？一旦そのまま保存してOK（計算に使われないので）
      defaultStart,
      defaultEnd,
      breakTime: parseInt(breakTime),
      memberId,
      days,
      skipHolidays,
      fixedWorkingDays:
        type === "monthly" && fixedWorkingDays
          ? parseInt(fixedWorkingDays)
          : null,
      fixedOvertimeHours:
        type === "monthly" && fixedOvertimeHours
          ? parseInt(fixedOvertimeHours)
          : null,
      standardHoursPerDay:
        type === "monthly" && standardHoursPerDay
          ? parseInt(standardHoursPerDay)
          : null,
    };
    onSave(newJob);
    onClose();
  };

  const handleDayToggle = (dayIndex) => {
    if (days.includes(dayIndex)) {
      setDays(days.filter((d) => d !== dayIndex));
    } else {
      setDays([...days, dayIndex]);
    }
  };

  const weekLabel = ["日", "月", "火", "水", "木", "金", "土"];

  const boxBgColor = isDark ? "rgba(255, 255, 255, 0.05)" : "#f5f5f5";
  const boxBorder = isDark ? "1px solid rgba(255, 255, 255, 0.1)" : "none";

  // 時間設定を表示するかどうかのフラグ
  // 他のタイプは常に強制表示、Commissionのみスイッチ依存
  const showTimeSettings = type !== "commission" || enableTimeRecording;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>{job ? "仕事設定の編集" : "新しい仕事を追加"}</DialogTitle>
      <DialogContent>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
          <TextField
            label="仕事名 (例: A社, 副業)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            fullWidth
          />

          {members.length > 0 && (
            <FormControl fullWidth>
              <InputLabel>誰の仕事？</InputLabel>
              <Select
                value={memberId}
                label="誰の仕事？"
                onChange={(e) => setMemberId(e.target.value)}
              >
                <MenuItem value="me">自分</MenuItem>
                {members.map((m) => (
                  <MenuItem key={m.id} value={m.id}>
                    {m.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          <FormControl fullWidth>
            <InputLabel>給与タイプ</InputLabel>
            <Select
              value={type}
              label="給与タイプ"
              onChange={(e) => handleTypeChange(e.target.value)}
            >
              <MenuItem value="hourly">時給</MenuItem>
              <MenuItem value="monthly">月給</MenuItem>
              <MenuItem value="fixed">日給 (固定額)</MenuItem>
              <MenuItem value="commission">完全歩合</MenuItem>
            </Select>
          </FormControl>

          {(type === "hourly" || type === "fixed") && (
            <TextField
              label={type === "hourly" ? "時給" : "日給"}
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">円</InputAdornment>
                ),
              }}
              fullWidth
            />
          )}

          {type === "monthly" && (
            <Box
              sx={{
                p: 2,
                bgcolor: boxBgColor,
                border: boxBorder,
                borderRadius: 2,
                display: "flex",
                flexDirection: "column",
                gap: 2,
              }}
            >
              <Typography variant="subtitle2" color="primary">
                月給設定
              </Typography>
              <TextField
                label="月額基本給"
                type="number"
                value={monthlySalary}
                onChange={(e) => setMonthlySalary(e.target.value)}
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">円</InputAdornment>
                  ),
                }}
                fullWidth
              />
              <TextField
                label="所定労働日数 (日割り計算用)"
                type="number"
                value={fixedWorkingDays}
                onChange={(e) => setFixedWorkingDays(e.target.value)}
                placeholder="空欄ならシフト数で自動割"
                helperText="未入力: その月のシフト数で割ります / 入力時: この日数で割ります"
                InputProps={{
                  endAdornment: (
                    <InputAdornment position="end">日</InputAdornment>
                  ),
                }}
                fullWidth
              />

              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="1日の所定時間"
                  type="number"
                  value={standardHoursPerDay}
                  onChange={(e) => setStandardHoursPerDay(e.target.value)}
                  placeholder="8"
                  helperText="残業計算の基準"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">H</InputAdornment>
                    ),
                  }}
                  fullWidth
                />
                <TextField
                  label="みなし残業時間"
                  type="number"
                  value={fixedOvertimeHours}
                  onChange={(e) => setFixedOvertimeHours(e.target.value)}
                  helperText="これを超えると残業代発生"
                  InputProps={{
                    endAdornment: (
                      <InputAdornment position="end">H</InputAdornment>
                    ),
                  }}
                  fullWidth
                />
              </Box>
            </Box>
          )}

          {/* ★追加: 完全歩合の場合のみスイッチを表示 */}
          {type === "commission" && (
            <FormControlLabel
              control={
                <Switch
                  checked={enableTimeRecording}
                  onChange={(e) => setEnableTimeRecording(e.target.checked)}
                />
              }
              label="勤務時間・休憩時間を記録する（メモ）"
              sx={{ ml: 1 }}
            />
          )}

          {/* ★修正: Collapseで開閉制御 */}
          <Collapse in={showTimeSettings}>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
              <Box sx={{ display: "flex", gap: 2 }}>
                <TextField
                  label="基本開始"
                  type="time"
                  value={defaultStart}
                  onChange={(e) => setDefaultStart(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
                <TextField
                  label="基本終了"
                  type="time"
                  value={defaultEnd}
                  onChange={(e) => setDefaultEnd(e.target.value)}
                  InputLabelProps={{ shrink: true }}
                  fullWidth
                />
              </Box>
              <TextField
                label="休憩時間 (分)"
                type="number"
                value={breakTime}
                onChange={(e) => setBreakTime(e.target.value)}
                fullWidth
              />
            </Box>
          </Collapse>

          <Box sx={{ display: "flex", gap: 2 }}>
            <FormControl fullWidth>
              <InputLabel>締め日</InputLabel>
              <Select
                value={closingDay}
                label="締め日"
                onChange={(e) => setClosingDay(e.target.value)}
              >
                <MenuItem value={99}>末日</MenuItem>
                <MenuItem value={15}>15日</MenuItem>
                <MenuItem value={20}>20日</MenuItem>
                <MenuItem value={25}>25日</MenuItem>
                <MenuItem value={10}>10日</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>支払月</InputLabel>
              <Select
                value={payTiming}
                label="支払月"
                onChange={(e) => setPayTiming(e.target.value)}
              >
                <MenuItem value="current">当月</MenuItem>
                <MenuItem value="next">翌月</MenuItem>
                <MenuItem value="after_next">翌々月</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>支払日</InputLabel>
              <Select
                value={payDay}
                label="支払日"
                onChange={(e) => setPayDay(e.target.value)}
              >
                <MenuItem value={25}>25日</MenuItem>
                <MenuItem value={99}>末日</MenuItem>
                <MenuItem value={15}>15日</MenuItem>
                <MenuItem value={10}>10日</MenuItem>
                <MenuItem value={1}>1日</MenuItem>
              </Select>
            </FormControl>
          </Box>

          <Box
            sx={{
              mt: 1,
              p: 2,
              border: boxBorder,
              borderRadius: 2,
              bgcolor: boxBgColor,
            }}
          >
            <Typography variant="subtitle2" gutterBottom>
              シフト自動生成のデフォルト曜日
            </Typography>
            <ToggleButtonGroup
              value={days}
              onChange={(e, newDays) => setDays(newDays)}
              aria-label="working days"
              size="small"
              fullWidth
            >
              {weekLabel.map((label, index) => (
                <ToggleButton key={index} value={index}>
                  {label}
                </ToggleButton>
              ))}
            </ToggleButtonGroup>
            <FormControlLabel
              control={
                <Switch
                  checked={skipHolidays}
                  onChange={(e) => setSkipHolidays(e.target.checked)}
                />
              }
              label="祝日はスキップする"
              sx={{ mt: 1 }}
            />
          </Box>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>キャンセル</Button>
        <Button onClick={handleSave} variant="contained">
          保存
        </Button>
      </DialogActions>
    </Dialog>
  );
}
