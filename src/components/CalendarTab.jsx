// src/components/CalendarTab.jsx
import React, { useState, useRef } from "react";
import { Box, Paper, Typography, useTheme } from "@mui/material";
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
  onPrevMonth,
  onNextMonth,
}) {
  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";
  const { isPremium } = useAuth();

  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ["日", "月", "火", "水", "木", "金", "土"];

  const headerBg = isDark ? "#1c1f2e" : "#fafafa";
  const cellBgCurrent = isDark ? "#171a23" : "white";
  const cellBgOther = isDark ? "#0f1118" : "#f9f9f9";
  const cellBgToday = isDark ? "rgba(0, 229, 255, 0.15)" : "#e3f2fd";
  const borderColor = isDark ? "rgba(255,255,255,0.1)" : "#e0e0e0";

  // --- スワイプ判定ロジック ---
  const touchStartRef = useRef(null);
  const minSwipeDistance = 30; // 感度を上げました(50→30)

  const onTouchStart = (e) => {
    touchStartRef.current = {
      x: e.touches[0].clientX,
      y: e.touches[0].clientY,
    };
  };

  const onTouchEnd = (e) => {
    if (!touchStartRef.current) return;

    const touchEnd = {
      x: e.changedTouches[0].clientX,
      y: e.changedTouches[0].clientY,
    };

    const distanceX = touchStartRef.current.x - touchEnd.x;
    const distanceY = touchStartRef.current.y - touchEnd.y;

    // 斜めスクロール対策: 縦移動より横移動が明らかに大きい場合のみ反応
    if (
      Math.abs(distanceX) > minSwipeDistance &&
      Math.abs(distanceX) > Math.abs(distanceY)
    ) {
      if (distanceX > 0) {
        // 右から左へ（来月へ）
        if (onNextMonth) onNextMonth();
      } else {
        // 左から右へ（先月へ）
        if (onPrevMonth) onPrevMonth();
      }
    }
    touchStartRef.current = null;
  };
  // -------------------------

  return (
    <Box
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      sx={{
        height: isPremium ? "calc(100dvh - 120px)" : "calc(100dvh - 200px)",
        overflowY: "auto",
        overflowX: "hidden", // 横スクロールを物理的に禁止
        overscrollBehaviorX: "none", // ブラウザの戻る進む挙動を禁止
        width: "100%",
        pb: isPremium ? 4 : 10,
        scrollbarWidth: "none",
        "&::-webkit-scrollbar": { display: "none" },
        border: "none",
      }}
    >
      {/* 曜日ヘッダー (CSS Gridに変更) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)", // 完全な7等分
          width: "100%",
          bgcolor: headerBg,
          borderBottom: `1px solid ${borderColor}`,
        }}
      >
        {weekDays.map((day, index) => (
          <Box
            key={day}
            sx={{
              textAlign: "center",
              py: 0.5,
              borderLeft: index === 0 ? "none" : `1px solid ${borderColor}`,
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
          </Box>
        ))}
      </Box>

      {/* カレンダー本体 (CSS Gridに変更) */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)", // 完全な7等分
          width: "100%",
        }}
      >
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

          // 左端判定
          const isLeftEdge = index % 7 === 0;

          return (
            <Paper
              key={day.toString()}
              square
              elevation={0}
              onClick={() => onDateClick(day)}
              sx={{
                height: 100, // マスの高さ
                p: 0.5,
                bgcolor: bgColor,
                borderBottom: `1px solid ${borderColor}`,
                borderLeft: isLeftEdge ? "none" : `1px solid ${borderColor}`,
                display: "flex",
                flexDirection: "column",
                cursor: "pointer",
                overflow: "hidden", // コンテンツがはみ出ても枠を広げない
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
          );
        })}
      </Box>

      {/* 天気クレジット */}
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
