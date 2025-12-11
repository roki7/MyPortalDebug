// src/components/JobEditDialog.jsx
import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Box,
  Divider,
  Chip,
  Typography,
  FormControlLabel,
  Checkbox,
} from "@mui/material";

const WEEKDAYS = ["日", "月", "火", "水", "木", "金", "土"];

export default function JobEditDialog({ open, onClose, job, members, onSave }) {
  // 初期値設定
  const [editJob, setEditJob] = useState({
    name: "",
    type: "hourly",
    value: 1000,
    color: "#2196f3",
    skipHolidays: true,
    days: [],
    defaultStart: "09:00",
    defaultEnd: "18:00",
    breakTime: 60,
    memberId: "me",
    closingDay: 99,
    payTiming: "next",
    payDay: 25,
  });

  useEffect(() => {
    if (job) {
      setEditJob(job);
    } else {
      // 新規作成時のリセット
      setEditJob({
        name: "",
        type: "hourly",
        value: 1000,
        color: "#2196f3",
        skipHolidays: true,
        days: [],
        defaultStart: "09:00",
        defaultEnd: "18:00",
        breakTime: 60,
        memberId: "me",
        closingDay: 99,
        payTiming: "next",
        payDay: 25,
      });
    }
  }, [job, open]);

  const handleSave = () => {
    if (!editJob.name) return;
    const jobData = {
      ...editJob,
      value: parseInt(editJob.value) || 0,
      breakTime: parseInt(editJob.breakTime) || 0,
      closingDay: parseInt(editJob.closingDay),
      payDay: parseInt(editJob.payDay),
      // 月給・減額設定も数値化
      monthlySalary: parseInt(editJob.monthlySalary) || 0,
      fixedWorkingDays: editJob.fixedWorkingDays
        ? parseInt(editJob.fixedWorkingDays)
        : null,
      deductionEarlyLeave: editJob.deductionEarlyLeave
        ? parseInt(editJob.deductionEarlyLeave)
        : null,
      deductionAbsence: editJob.deductionAbsence
        ? parseInt(editJob.deductionAbsence)
        : null,
    };
    onSave(jobData);
    onClose();
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="xs">
      <DialogTitle>{job?.id ? "仕事を編集" : "新規作成"}</DialogTitle>
      <DialogContent
        sx={{ pt: 2, display: "flex", flexDirection: "column", gap: 2 }}
      >
        <TextField
          label="仕事名"
          fullWidth
          value={editJob.name || ""}
          onChange={(e) => setEditJob({ ...editJob, name: e.target.value })}
          autoComplete="off"
        />

        <FormControl fullWidth>
          <InputLabel>担当者</InputLabel>
          <Select
            value={editJob.memberId || "me"}
            label="担当者"
            onChange={(e) =>
              setEditJob({ ...editJob, memberId: e.target.value })
            }
          >
            {members.map((m) => (
              <MenuItem key={m.id} value={m.id}>
                {m.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          <FormControl fullWidth>
            <InputLabel>給与タイプ</InputLabel>
            <Select
              value={editJob.type || "hourly"}
              label="給与タイプ"
              onChange={(e) => setEditJob({ ...editJob, type: e.target.value })}
            >
              <MenuItem value="hourly">時給</MenuItem>
              <MenuItem value="fixed">日給</MenuItem>
              <MenuItem value="monthly">月給</MenuItem>
              <MenuItem value="commission">歩合</MenuItem>
            </Select>
          </FormControl>

          {editJob.type !== "monthly" && (
            <TextField
              label={editJob.type === "commission" ? "単価 (目安)" : "金額"}
              type="number"
              fullWidth
              value={editJob.value || ""}
              onChange={(e) =>
                setEditJob({ ...editJob, value: e.target.value })
              }
              autoComplete="off"
            />
          )}
        </Box>

        {editJob.type === "monthly" && (
          <Box
            sx={{
              p: 2,
              border: "1px solid #eee",
              borderRadius: 2,
              bgcolor: "#f9f9f9",
            }}
          >
            <TextField
              label="月額給与"
              type="number"
              fullWidth
              sx={{ mb: 2 }}
              value={editJob.monthlySalary || ""}
              onChange={(e) =>
                setEditJob({ ...editJob, monthlySalary: e.target.value })
              }
            />
            <TextField
              label="所定労働日数 (任意)"
              type="number"
              fullWidth
              sx={{ mb: 2 }}
              value={editJob.fixedWorkingDays || ""}
              onChange={(e) =>
                setEditJob({ ...editJob, fixedWorkingDays: e.target.value })
              }
              helperText="未入力ならカレンダーから自動計算"
            />
            <Box sx={{ display: "flex", gap: 2 }}>
              <TextField
                label="早退減額"
                type="number"
                fullWidth
                value={editJob.deductionEarlyLeave || ""}
                onChange={(e) =>
                  setEditJob({
                    ...editJob,
                    deductionEarlyLeave: e.target.value,
                  })
                }
                placeholder="日割り分"
              />
              <TextField
                label="欠勤減額"
                type="number"
                fullWidth
                value={editJob.deductionAbsence || ""}
                onChange={(e) =>
                  setEditJob({ ...editJob, deductionAbsence: e.target.value })
                }
                placeholder="日割り分"
              />
            </Box>
          </Box>
        )}

        <Divider sx={{ my: 1 }}>
          <Chip label="給与規定" size="small" />
        </Divider>

        <Box sx={{ display: "flex", gap: 2 }}>
          <FormControl fullWidth>
            <InputLabel>締め日</InputLabel>
            <Select
              value={editJob.closingDay || 99}
              label="締め日"
              onChange={(e) =>
                setEditJob({ ...editJob, closingDay: e.target.value })
              }
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
              value={editJob.payTiming || "next"}
              label="支払月"
              onChange={(e) =>
                setEditJob({ ...editJob, payTiming: e.target.value })
              }
            >
              <MenuItem value="current">当月</MenuItem>
              <MenuItem value="next">翌月</MenuItem>
              <MenuItem value="after_next">翌々月</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth>
            <InputLabel>支払日</InputLabel>
            <Select
              value={editJob.payDay || 25}
              label="支払日"
              onChange={(e) =>
                setEditJob({ ...editJob, payDay: e.target.value })
              }
            >
              <MenuItem value={25}>25日</MenuItem>
              <MenuItem value={99}>末日</MenuItem>
              <MenuItem value={15}>15日</MenuItem>
              <MenuItem value={10}>10日</MenuItem>
              <MenuItem value={1}>1日</MenuItem>
            </Select>
          </FormControl>
        </Box>

        <Divider sx={{ my: 1 }}>
          <Chip label="勤怠デフォルト" size="small" />
        </Divider>

        <Box sx={{ display: "flex", gap: 2 }}>
          <TextField
            label="開始"
            type="time"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={editJob.defaultStart || ""}
            onChange={(e) =>
              setEditJob({ ...editJob, defaultStart: e.target.value })
            }
            autoComplete="off"
          />
          <TextField
            label="終了"
            type="time"
            fullWidth
            InputLabelProps={{ shrink: true }}
            value={editJob.defaultEnd || ""}
            onChange={(e) =>
              setEditJob({ ...editJob, defaultEnd: e.target.value })
            }
            autoComplete="off"
          />
        </Box>

        <TextField
          label="休憩 (分)"
          type="number"
          fullWidth
          value={editJob.breakTime !== undefined ? editJob.breakTime : 60}
          onChange={(e) =>
            setEditJob({ ...editJob, breakTime: e.target.value })
          }
          autoComplete="off"
        />

        <Box>
          <Typography variant="caption">出勤曜日 (一括登録で使用)</Typography>
          <Box sx={{ display: "flex", gap: 0.5, mt: 0.5 }}>
            {WEEKDAYS.map((day, i) => (
              <Chip
                key={day}
                label={day}
                color={editJob.days?.includes(i) ? "primary" : "default"}
                onClick={() => {
                  const newDays = editJob.days?.includes(i)
                    ? editJob.days.filter((d) => d !== i)
                    : [...(editJob.days || []), i];
                  setEditJob({ ...editJob, days: newDays });
                }}
                clickable
              />
            ))}
          </Box>
        </Box>

        <FormControlLabel
          control={
            <Checkbox
              checked={editJob.skipHolidays || false}
              onChange={(e) =>
                setEditJob({ ...editJob, skipHolidays: e.target.checked })
              }
            />
          }
          label="祝日は休みにする"
        />

        <Box sx={{ mt: 1 }}>
          <Typography variant="caption">カレンダー表示色</Typography>
          <input
            type="color"
            value={editJob.color || "#2196f3"}
            onChange={(e) => setEditJob({ ...editJob, color: e.target.value })}
            style={{ width: "100%", height: 40, border: "none" }}
          />
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
