import React from 'react';
import { Box, Paper, Typography, Grid } from '@mui/material';
import { format, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isSameDay, getDay } from 'date-fns';
import { WbSunny, Cloud, Umbrella, AcUnit, Thunderstorm, TrendingDown } from '@mui/icons-material';
// holiday-jp ライブラリを使用
import { isHoliday } from 'holiday-jp';

const getWeatherIcon = (code) => {
  if (code === undefined) return null;
  if (code <= 1) return <WbSunny sx={{ fontSize: 16, color: 'orange' }} />;
  if (code <= 3) return <Cloud sx={{ fontSize: 16, color: 'gray' }} />;
  if (code <= 67) return <Umbrella sx={{ fontSize: 16, color: '#4fc3f7' }} />;
  if (code <= 77) return <AcUnit sx={{ fontSize: 16, color: 'cyan' }} />;
  return <Thunderstorm sx={{ fontSize: 16, color: 'purple' }} />;
};

// 気圧アイコン
const getPressureIcon = (pressure) => {
    if (!pressure) return null;
    if (pressure < 1005) return <TrendingDown sx={{ fontSize: 16, color: 'red' }} />;
    if (pressure < 1013) return <TrendingDown sx={{ fontSize: 16, color: '#1976d2' }} />;
    return null; 
};

export default function CalendarTab({ currentDate, shifts, jobs, weatherData, onDateClick, onShiftClick }) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);
  
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
  const weekDays = ['日', '月', '火', '水', '木', '金', '土'];

  return (
    <Box sx={{ border: '1px solid #e0e0e0', borderBottom: 'none' }}>
      {/* 曜日ヘッダー */}
      <Grid container spacing={0}>
        {weekDays.map((day, index) => (
          <Grid item xs={12 / 7} key={day} sx={{ textAlign: 'center', bgcolor: '#fafafa', borderBottom: '1px solid #e0e0e0', borderRight: index !== 6 ? '1px solid #e0e0e0' : 'none', py: 0.5 }}>
            <Typography variant="caption" sx={{ color: index === 0 ? 'red' : index === 6 ? 'blue' : 'text.secondary', fontWeight: 'bold' }}>
              {day}
            </Typography>
          </Grid>
        ))}
      </Grid>

      {/* カレンダー本体 */}
      <Grid container spacing={0}>
        {calendarDays.map((day, index) => {
          const dateStr = format(day, 'yyyy-MM-dd');
          const dayShifts = shifts[dateStr] || [];
          const isToday = isSameDay(day, new Date());
          const isCurrentMonth = isSameMonth(day, monthStart);
          const weather = weatherData[dateStr];
          
          const holiday = isHoliday(day); 
          const dayIndex = getDay(day);
          
          let dateColor = isCurrentMonth ? 'text.primary' : 'text.disabled';
          if (holiday) dateColor = 'red';
          else if (dayIndex === 0) dateColor = 'red';
          else if (dayIndex === 6) dateColor = 'blue';

          const bgColor = isToday ? '#e3f2fd' : (isCurrentMonth ? 'white' : '#f9f9f9');
          const isRightEdge = (index + 1) % 7 === 0;

          return (
            <Grid item xs={12 / 7} key={day.toString()} onClick={() => onDateClick(day)}>
              <Paper 
                square 
                elevation={0}
                sx={{ 
                  height: 100,
                  p: 0.5, 
                  bgcolor: bgColor,
                  borderBottom: '1px solid #e0e0e0',
                  borderRight: isRightEdge ? 'none' : '1px solid #e0e0e0',
                  display: 'flex', 
                  flexDirection: 'column',
                  cursor: 'pointer',
                  position: 'relative',
                  '&:hover': { bgcolor: '#f5f5f5' }
                }}
              >
                {/* 日付・祝日名・天気・気圧 */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                  <Box sx={{ display: 'flex', flexDirection: 'column' }}>
                      <Typography variant="caption" sx={{ fontWeight: isToday ? 'bold' : 'normal', color: dateColor, lineHeight: 1 }}>
                        {format(day, 'd')}
                      </Typography>
                      {holiday && (
                          <Typography variant="caption" sx={{ fontSize: '0.5rem', color: 'red', lineHeight: 1, mt: 0.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: '3em' }}>
                              {holiday.name}
                          </Typography>
                      )}
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                      {weather && getWeatherIcon(weather.code)}
                      {weather && getPressureIcon(weather.pressure)}
                  </Box>
                </Box>

                {/* シフト表示エリア */}
                <Box sx={{ flexGrow: 1, overflowY: 'hidden', display:'flex', flexDirection:'column', gap: 0.2 }}>
                  {dayShifts.slice(0, 4).map((shift) => { 
                    const job = jobs.find(j => j.id === shift.jobId);
                    
                    // ★ステータスによる表示切り替えロジック
                    let displayName = shift.customName || job?.name || '不明';
                    let displayColor = shift.color || job?.color || '#999';
                    let textDecor = 'none';

                    if (shift.status === 'paid_leave') {
                        displayName = "㊗️ " + displayName; // 名前の前にアイコン
                        displayColor = '#ff9800'; // オレンジ
                    } else if (shift.status === 'absence') {
                        displayName = "❌ " + displayName;
                        displayColor = '#9e9e9e'; // グレー
                        textDecor = 'line-through';
                    }

                    return (
                      <Box 
                        key={shift.id} 
                        onClick={(e) => { e.stopPropagation(); onShiftClick(shift, day); }}
                        sx={{ 
                          bgcolor: displayColor, 
                          color: 'white',
                          fontSize: '0.6rem',
                          px: 0.5,
                          borderRadius: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          lineHeight: 1.4,
                          cursor: 'pointer',
                          textDecoration: textDecor,
                          opacity: shift.status === 'absence' ? 0.7 : 1,
                        }}
                      >
                        {displayName}
                      </Box>
                    );
                  })}
                  {dayShifts.length > 4 && <Typography variant="caption" sx={{fontSize:'0.5rem', color:'gray', textAlign:'center'}}>他{dayShifts.length-4}件</Typography>}
                </Box>
                
                {/* 合計金額 */}
                {dayShifts.length > 0 && (
                   <Typography variant="caption" sx={{fontSize:'0.6rem', textAlign:'right', color:'#4caf50', fontWeight:'bold', mt:'auto'}}>
                     ¥{dayShifts.reduce((acc, s)=>{
                         const j = jobs.find(x=>x.id===s.jobId);
                         if(!j && !s.amount) return acc;
                         if(s.amount) return acc + s.amount;
                         if(j && j.type==='hourly' && s.start && s.end){
                             // 休憩時間の計算も考慮
                             const st = new Date(`1970-01-01T${s.start}`);
                             const en = new Date(`1970-01-01T${s.end}`);
                             const brk = s.breakTime !== undefined ? parseInt(s.breakTime) : (j.breakTime || 0);
                             const min = (en-st)/(1000*60) - brk;
                             return acc + Math.floor((Math.max(0,min)/60)*j.value);
                         }
                         return acc;
                     }, 0).toLocaleString()}
                   </Typography>
                )}
              </Paper>
            </Grid>
          );
        })}
      </Grid>
    </Box>
  );
}