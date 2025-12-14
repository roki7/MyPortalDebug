// src/components/CalendarTab.jsx
import React from "react";
import { Box, Paper, Typography, Grid, useTheme } from "@mui/material";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  isSameMonth,
  isSameDay,
  getDay,
} from "date-fns";
import {
  WbSunny,
  Cloud,
  Umbrella,
  AcUnit,
  Thunderstorm,
  TrendingDown,
} from "@mui/icons-material";
import { isHoliday } from "holiday-jp";

// ★追加: プレミアム判定のために読み込み
import { useAuth } from "../AuthContext";
import AdSenseBanner from "./AdSenseBanner";

const getWeatherIcon = (code) => {
  if (code === undefined) return null;
  if (code <= 1) return <WbSunny sx={{ fontSize: 16, color: "orange" }} />;
  if (code <= 3) return <Cloud sx={{ fontSize: 16, color: "gray" }} />;
  if (code <= 67) return <Umbrella sx={{ fontSize: 16, color: "#4fc3f7" }} />;
  if (code <= 77) return <AcUnit sx={{ fontSize: 16, color: "cyan" }} />;
  return <Thunderstorm sx={{ fontSize: 16, color: "purple" }} />;
};

const getPressureIcon = (pressure) => {
  if (!pressure) return null;
  if (pressure < 1005)
    return <TrendingDown sx={{ fontSize: 16, color: "red" }} />;
  if (pressure < 1013)
    return <TrendingDown sx={{ fontSize: 16, color: "#1976d2" }} />;
  return null;
};

export default function CalendarTab({
  currentDate,
  shifts,
  jobs,
  weatherData,
  onDateClick,
  onShiftClick,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  // ★追加: プレミアム会員かどうかチェック
  const { isPremium } = useAuth();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  // 背景色の定義
  const headerBg = isDark ? "#1c1f2e" : "#fafafa";
  const cellBgCurrent = isDark ? "#171a23" : "white";
  const cellBgOther = isDark ? "#0f1118" : "#f9f9f9";
  const cellBgToday = isDark ? "rgba(0, 229, 255, 0.15)" : "#e3f2fd";
  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "#e0e0e0";

  return (
    <Box
      sx={{
        // ★修正: プレミアムなら高さを広く(120px引き)、無料なら広告分狭く(200px引き)
        height: isPremium ? "calc(100dvh - 120px)" : "calc(100dvh - 200px)",

        overflowY: "auto",

        // ★修正: プレミアムなら余白小さめ(4)、無料なら広告分大きく(10)
        pb: isPremium ? 4 : 10,

        scrollbarWidth: "none",
        msOverflowStyle: "none",
        "&::-webkit-scrollbar": {
          display: "none",
        },
        border: "none",
      }}
    >
      {/* 曜日ヘッダー */}
      <Grid container spacing={0}>
        {weekDays.map((day, index) => (
          <Grid
            item
            xs={12 / 7}
            key={day}
            sx={{
              textAlign: "center",
              bgcolor: headerBg,
              borderBottom: `1px solid ${borderColor}`,
              borderLeft: index === 0 ? "none" : `1px solid ${borderColor}`,
              py: 0.5,
            }}
          >
            <Typography
              variant="caption"
              sx={{
                color:
                  index === 0
                    ? "red"
                    : index === 6
                    ? "#448aff"
                    : "text.secondary",
                fontWeight: "bold",
              }}
            >
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* カレンダー本体 */}
      <Grid container spacing={0}>
        {calendarDays.map((day, index) => {
          const dateStr = format(day, "yyyy-MM-dd");
          const dayShifts = shifts[dateStr] || [];
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, monthStart);
          const weather = weatherData[dateStr];

          const holiday = isHoliday(day);
          const dayIndex = getDay(day);

          let dateColor = isCurrentMonth ? "text.primary" : "text.disabled";
          if (holiday) dateColor = "red";
          else if (dayIndex === 0) dateColor = "red";
          else if (dayIndex === 6) dateColor = "#448aff";

          const bgColor = isToday
            ? cellBgToday
            : isCurrentMonth
            ? cellBgCurrent
            : cellBgOther;

          const isLeftEdge = index % 7 === 0;

          return (
            <Grid
              item
              xs={12 / 7}
              key={day.toString()}
              onClick={() => onDateClick(day)}
            >
              <Paper
                square
                elevation={0}
                sx={{
                  height: 100,
                  p: 0.5,
                  bgcolor: bgColor,
                  borderBottom: `1px solid ${borderColor}`,
                  borderLeft: isLeftEdge ? "none" : `1px solid ${borderColor}`,
                  display: "flex",
                  flexDirection: "column",
                  cursor: "pointer",
                  position: "relative",
                  "&:hover": { bgcolor: isDark ? "#2c3142" : "#f5f5f5" },
                }}
              >
                {/* 日付・祝日・天気 */}
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                    mb: 0.5,
                  }}
                >
                  <Box sx={{ display: "flex", flexDirection: "column" }}>
                    <Typography
                      variant="caption"
                      sx={{
                        fontWeight: isToday ? "bold" : "normal",
                        color: dateColor,
                        lineHeight: 1,
                      }}
                    >
                      {format(day, "d")}
                    </Typography>
                    {holiday && (
                      <Typography
                        variant="caption"
                        sx={{
                          fontSize: "0.5rem",
                          color: "red",
                          lineHeight: 1,
                          mt: 0.2,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          maxWidth: "3em",
                        }}
                      >
                        {holiday.name}
                      </Typography>
                    )}
                  </Box>

                  {/* 天気・気圧 */}
                  <Box sx={{ display: "flex", gap: 0.5 }}>
                    {weather && (
                      <Box
                        sx={{
                          bgcolor: isDark
                            ? "rgba(255,255,255,0.1)"
                            : "transparent",
                          borderRadius: "50%",
                          width: 18,
                          height: 18,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        {getWeatherIcon(weather.code)}
                      </Box>
                    )}
                    {weather && getPressureIcon(weather.pressure)}
                  </Box>
                </Box>

                {/* シフト表示エリア */}
                <Box
                  sx={{
                    flexGrow: 1,
                    overflowY: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    gap: 0.2,
                  }}
                >
                  {dayShifts.slice(0, 4).map((shift) => {
                    const job = jobs.find((j) => j.id === shift.jobId);
                    let displayName = shift.customName || job?.name || "不明";
                    let displayColor = shift.color || job?.color || "#999";
                    let textDecor = "none";

                    if (shift.status === "paid_leave") {
                      displayName = "㊗️ " + displayName;
                      displayColor = "#ff9800";
                    } else if (shift.status === "absence") {
                      displayName = "❌ " + displayName;
                      displayColor = "#9e9e9e";
                      textDecor = "line-through";
                    }

                    return (
                      <Box
                        key={shift.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onShiftClick(shift, day);
                        }}
                        sx={{
                          bgcolor: displayColor,
                          color: "white",
                          fontSize: "0.6rem",
                          px: 0.5,
                          borderRadius: 1,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          lineHeight: 1.4,
                          cursor: "pointer",
                          textDecoration: textDecor,
                          opacity: shift.status === "absence" ? 0.7 : 1,
                        }}
                      >
                        {displayName}
                      </Box>
                    );
                  })}
                  {dayShifts.length > 4 && (
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.5rem",
                        color: "text.secondary",
                        textAlign: "center",
                      }}
                    >
                      他{dayShifts.length - 4}件
                    </Typography>
                  )}
                </Box>

                {/* 合計金額 */}
                {dayShifts.length > 0 && (
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.6rem",
                      textAlign: "right",
                      color: isDark ? "#69f0ae" : "#4caf50",
                      fontWeight: "bold",
                      mt: "auto",
                    }}
                  >
                    ¥
                    {dayShifts
                      .reduce((acc, s) => {
                        const j = jobs.find((x) => x.id === s.jobId);
                        if (!j && !s.amount) return acc;
                        if (s.amount) return acc + s.amount;
                        if (j && j.type === "hourly" && s.start && s.end) {
                          const st = new Date(`1970-01-01T${s.start}`);
                          const en = new Date(`1970-01-01T${s.end}`);
                          const brk =
                            s.breakTime !== undefined
                              ? parseInt(s.breakTime)
                              : j.breakTime || 0;
                          const min = (en - st) / (1000 * 60) - brk;
                          return (
                            acc + Math.floor((Math.max(0, min) / 60) * j.value)
                          );
                        }
                        return acc;
                      }, 0)
                      .toLocaleString()}
                  </Typography>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>

      {/* 天気データのクレジット */}
      <Box sx={{ p: 1, textAlign: "right", bgcolor: headerBg }}>
        <Typography
          variant="caption"
          sx={{ fontSize: "0.6rem", color: "text.secondary" }}
        >
          Weather data by{" "}
          <a
            href="https://open-meteo.com/"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: "inherit", textDecoration: "underline" }}
          >
            Open-Meteo.com
          </a>
        </Typography>
      </Box>

      <AdSenseBanner
        clientId="ca-pub-2913122779764758" // ★あなたのパブリッシャーIDを入れてください
        slotId="6796696768" // ★広告ユニットIDを入れてください
      />
    </Box>
  );
}
