// src/components/CalendarTab.jsx
import React from 'react';
import { Grid, Typography, Box, Paper } from '@mui/material';
import { WbSunny, Cloud, Umbrella, AcUnit } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, isSameDay, eachDayOfInterval, getDay, isSunday, isSaturday } from 'date-fns'; // isSunday, isSaturday追加
import JapaneseHolidays from 'japanese-holidays';
import { useSwipeable } from 'react-swipeable'; // ★追加

const WeatherIcon = ({ code }) => {
  if (code === undefined) return null;
  if (code <= 1) return <WbSunny sx={{ fontSize: 14, color: 'orange' }} />;
  if (code <= 3) return <Cloud sx={{ fontSize: 14, color: 'gray' }} />;
  if (code >= 51) return <Umbrella sx={{ fontSize: 14, color: 'blue' }} />;
  if (code >= 71) return <AcUnit sx={{ fontSize: 14, color: 'cyan' }} />;
  return <Cloud sx={{ fontSize: 14, color: 'gray' }} />;
};

export default function CalendarTab({ currentDate, shifts, jobs, weatherData, onDateClick, onShiftClick, onPrevMonth, onNextMonth }) {
  
  // ★スワイプ設定
  const handlers = useSwipeable({
    onSwipedLeft: () => onNextMonth(),
    onSwipedRight: () => onPrevMonth(),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true
  });

  const start = startOfMonth(currentDate);
  const end = endOfMonth(currentDate);
  
  // その月の日付を全て取得（これでループのバグを防ぐ）
  const daysInMonth = eachDayOfInterval({ start, end });
  
  // 最初の空白（曜日合わせ）
  const emptyDays = [];
  for (let i = 0; i < getDay(start); i++) {
    emptyDays.push(<Grid item xs={1.7} key={`empty-${i}`} sx={{border: '1px solid #eee', bgcolor: '#fafafa'}} />);
  }

  return (
    <div {...handlers}> {/* スワイプエリアで囲む */}
        <Paper sx={{ p: 1, minHeight: 400 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 1 }}>
            {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
            <Typography key={d} variant="caption" color={i===0?'error':i===6?'primary':'textSecondary'} sx={{ width: '14%', textAlign: 'center', fontWeight:'bold' }}>{d}</Typography>
            ))}
        </Box>
        <Grid container spacing={0.5}>
            {emptyDays}
            {daysInMonth.map((d) => {
                const dateStr = format(d, 'yyyy-MM-dd');
                const dayNum = d.getDate();
                const dayShifts = shifts[dateStr] || [];
                const isTodayDate = isSameDay(d, new Date());
                
                // 天気・気圧・祝日
                const weather = weatherData[dateStr];
                const isLowPressure = weather && weather.pressure < 1008;
                const holidayName = JapaneseHolidays.isHoliday(d);
                
                // ★修正: 曜日判定を date-fns の関数で行う（確実）
                const isSun = isSunday(d);
                const isSat = isSaturday(d);

                // 文字色の決定
                let dateColor = 'inherit';
                if (holidayName || isSun) dateColor = 'red';
                else if (isSat) dateColor = 'blue';

                return (
                    <Grid item xs={1.7} key={dateStr} 
                        onClick={() => onDateClick(d)}
                        sx={{ 
                        border: isTodayDate ? '2px solid #1976d2' : '1px solid #eee', 
                        height: 90, 
                        bgcolor: holidayName ? '#fff0f0' : 'white', 
                        position: 'relative', cursor: 'pointer', overflow: 'hidden' 
                        }}>
                        
                        {/* 日付ヘッダー */}
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', p: 0.5 }}>
                        <Typography variant="caption" sx={{ 
                            fontWeight: isTodayDate ? 'bold' : 'normal', 
                            color: dateColor, 
                            fontSize: '0.7rem'
                        }}>
                            {dayNum}
                        </Typography>
                        <Box sx={{ display: 'flex', flexDirection:'column', alignItems:'flex-end' }}>
                            {holidayName && <Typography variant="caption" sx={{fontSize:8, color:'red', lineHeight:1}}>{holidayName}</Typography>}
                            <Box sx={{ display: 'flex', gap: 0.5 }}>
                                {isLowPressure && <Typography variant="caption" title="気圧低下注意">📉</Typography>}
                                {weather && <WeatherIcon code={weather.code} />}
                            </Box>
                        </Box>
                        </Box>
                        
                        {/* シフトリスト */}
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, px: 0.5, overflowY: 'hidden' }}>
                        {dayShifts.map((shift, idx) => {
                            const job = jobs.find(j => j.id === shift.jobId);
                            const bgColor = shift.status === 'absence' ? '#e0e0e0' : (job?.color || '#999');
                            const jobName = job ? job.name : '(不明)';
                            
                            return (
                            <Box key={idx} 
                                onClick={(e) => { e.stopPropagation(); onShiftClick(shift, d); }}
                                sx={{ 
                                bgcolor: bgColor, 
                                color: shift.status === 'absence' ? '#999' : '#fff',
                                borderLeft: `3px solid ${bgColor}`,
                                borderRadius: 1, p: 0.3, fontSize: '0.6rem', whiteSpace: 'nowrap',
                                textShadow: '0 0 2px rgba(0,0,0,0.3)',
                                opacity: shift.status === 'absence' ? 0.7 : 1
                                }}
                            >
                                {shift.status === 'absence' ? <span style={{textDecoration:'line-through'}}>欠勤</span> : 
                                shift.status === 'paid_leave' ? `㊗ ${jobName}` :
                                job?.type === 'hourly' ? `${shift.start?.replace(':00','')}-${shift.end?.replace(':00','')}` :
                                job?.type === 'manual' ? `¥${shift.amount?.toLocaleString()}` : jobName}
                            </Box>
                            )
                        })}
                        </Box>
                    </Grid>
                );
            })}
        </Grid>
        </Paper>
    </div>
  );
}