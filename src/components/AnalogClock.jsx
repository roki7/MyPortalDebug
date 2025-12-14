import React, { useState, useEffect } from "react";

const AnalogClock = ({ className = "" }) => {
  const [date, setDate] = useState(new Date());

  useEffect(() => {
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
  const dayOfWeek = ["日", "月", "火", "水", "木", "金", "土"][date.getDay()];

  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <svg viewBox="0 0 100 100" className="w-full h-full drop-shadow-md">
        {/* 時計の文字盤背景 */}
        <circle
          cx="50"
          cy="50"
          r="48"
          fill="white"
          stroke="#e5e7eb"
          strokeWidth="2"
        />

        {/* 目盛り (12時間分) */}
        {[...Array(12)].map((_, i) => (
          <line
            key={i}
            x1="50"
            y1="6"
            x2="50"
            y2={i % 3 === 0 ? "12" : "8"} // 3, 6, 9, 12時は少し長く
            stroke="#9ca3af"
            strokeWidth={i % 3 === 0 ? "2" : "1"}
            transform={`rotate(${i * 30} 50 50)`}
          />
        ))}

        {/* 日付表示 (時計の右側または下部に配置) */}
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
          stroke="#1f2937"
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
          stroke="#4b5563"
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
          stroke="#ef4444"
          strokeWidth="1"
          strokeLinecap="round"
          transform={`rotate(${secondAngle} 50 50)`}
        />

        {/* 中心点 */}
        <circle cx="50" cy="50" r="2" fill="#ef4444" />
      </svg>
    </div>
  );
};

export default AnalogClock;
