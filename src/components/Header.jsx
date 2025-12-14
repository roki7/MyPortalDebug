import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import AnalogClock from "./AnalogClock";

const Header = ({
  currentDate,
  prevMonth,
  nextMonth,
  totalIncome, // 確定合計 (summary.totalAmount)
  estimatedIncome, // 見込み合計 (summary.estimatedAmount)
  confirmedDays, // 確定出勤日数
  estimatedDays, // 見込み出勤日数
  progress, // 進捗率
  annualIncome, // 年収 (currentYearTotal)
  householdTotal, // 世帯合計 (ご自身で計算ロジックをお持ちの場合)
}) => {
  const [isExpanded, setIsExpanded] = useState(true);

  return (
    <header className="bg-white shadow-md sticky top-0 z-50">
      {/* 年月ナビゲーション */}
      <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 text-white">
        <button onClick={prevMonth} className="p-1 hover:bg-indigo-500 rounded">
          <ChevronLeft size={24} />
        </button>
        <div
          className="flex items-center gap-2 cursor-pointer"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <h2 className="text-lg font-bold">
            {currentDate.getFullYear()}年 {currentDate.getMonth() + 1}月
          </h2>
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
        <button onClick={nextMonth} className="p-1 hover:bg-indigo-500 rounded">
          <ChevronRight size={24} />
        </button>
      </div>

      {/* 詳細情報エリア（アコーディオン） */}
      <div
        className={`overflow-hidden transition-all duration-300 bg-gray-50 ${
          isExpanded ? "max-h-48 border-b" : "max-h-0"
        }`}
      >
        <div className="p-2 space-y-2">
          {/* 進捗バー */}
          <div className="px-1">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>目標達成率</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-1.5">
              <div
                className="bg-indigo-500 h-1.5 rounded-full transition-all duration-500"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* 3カラムレイアウト */}
          <div className="flex items-center justify-between px-1">
            {/* 左：出勤・年収・確定 */}
            <div className="flex-1 space-y-1">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">確定日数</span>
                <span className="text-sm font-bold text-gray-800">
                  {confirmedDays}日
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">現在の年収</span>
                <span className="text-sm font-bold text-indigo-700">
                  ¥{annualIncome.toLocaleString()}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-500">今月確定</span>
                <span className="text-sm font-bold text-green-600">
                  ¥{totalIncome.toLocaleString()}
                </span>
              </div>
            </div>

            {/* 中央：アナログ時計 */}
            <div className="flex-shrink-0 px-2 flex justify-center">
              <AnalogClock className="w-16 h-16" />
            </div>

            {/* 右：世帯・見込み（右寄せ） */}
            <div className="flex-1 space-y-1 text-right">
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-500">見込み日数</span>
                <span className="text-sm font-bold text-gray-800">
                  {estimatedDays}日
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-500">世帯合計</span>
                {/* 世帯合計データがない場合は一旦仮置き、あれば渡す */}
                <span className="text-sm font-bold text-purple-700">
                  ¥{householdTotal ? householdTotal.toLocaleString() : "-"}
                </span>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[10px] text-gray-500">今月見込</span>
                <span className="text-sm font-bold text-gray-600">
                  ¥{estimatedIncome.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
