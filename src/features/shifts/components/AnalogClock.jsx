// src/components/AnalogClock.jsx
import React, { useState, useEffect } from "react";
// MUIのテーマカラーを取得するためにBoxコンポーネントは不要だが、デザイン調整のためにMUIのuseThemeを使用するのが一般的だが、ここではpropsで受け取る

const AnalogClock = ({ currentTheme, isNeon }) => {
  // propsを追加
  const [date, setDate] = useState(new Date());

  useEffect(() => {
    // 1秒ごとに更新
    const timerId = setInterval(() => setDate(new Date()), 1000);
    return () => clearInterval(timerId);
  }, []);

  // 角度計算
  const seconds = date.getSeconds();
  const minutes = date.getMinutes();
  const hours = date.getHours();

  const secondAngle = (seconds / 60) * 360;
  const minuteAngle = ((minutes + seconds / 60) / 60) * 360;
  const hourAngle = (((hours % 12) + minutes / 60) / 12) * 360;

  // 日付の取得
  const day = date.getDate();

  // ★テーマ連動色の定義
  const clockBgColor = isNeon
    ? currentTheme.palette.background.default
    : currentTheme.palette.background.paper;
  const clockBorderColor = isNeon ? "#00F5FF" : "#e5e7eb";
  const minuteHandColor = isNeon
    ? "#00F5FF"
    : currentTheme.palette.text.primary;
  const hourHandColor = isNeon ? "#6A00FF" : currentTheme.palette.text.primary;
  const secondHandColor = "#ef4444"; // 秒針は赤で固定

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <svg
        viewBox="0 0 100 100"
        style={{
          width: "100%",
          height: "100%",
          filter: "drop-shadow(0 2px 2px rgba(0, 0, 0, 0.2))",
        }}
      >
        {/* 時計の文字盤背景 */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill={clockBgColor} // ★テーマ連動
          stroke={clockBorderColor} // ★テーマ連動
          strokeWidth="2"
        />

        {/* 目盛り (12時間分) */}
        {[...Array(12)].map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="6"
            x2="50"
            y2={i % 3 === 0 ? "12" : "8"}
            stroke={currentTheme.palette.text.secondary} // 目盛りはテキストセカンダリに連動
            strokeWidth={i % 3 === 0 ? "2" : "1"}
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}

        {/* 日付表示 */}
        <rect x="60" y="44" width="18" height="12" fill="#f3f4f6" rx="2" />
        <text
          x="69"
          y="52"
          fontSize="7"
          textAnchor="middle"
          fill="#374151"
          fontWeight="bold"
          dominantBaseline="middle"
        >
          {day}
        </text>

        {/* 短針 (時) */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="25"
          stroke={hourHandColor} // ★テーマ連動
          strokeWidth="3"
          strokeLinecap="round"
          transform={`rotate(${hourAngle} 50 50)`}
        />

        {/* 長針 (分) */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="15"
          stroke={minuteHandColor} // ★テーマ連動
          strokeWidth="2"
          strokeLinecap="round"
          transform={`rotate(${minuteAngle} 50 50)`}
        />

        {/* 秒針 */}
        <line
          x1="50"
          y1="50"
          x2="50"
          y2="10"
          stroke={secondHandColor}
          strokeWidth="1"
          strokeLinecap="round"
          transform={`rotate(${secondAngle} 50 50)`}
        />

        {/* 中心点 */}
        <circle cx="50" cy="50" r="2" fill={secondHandColor} />
      </svg>
    </div>
  );
};

export default AnalogClock;
