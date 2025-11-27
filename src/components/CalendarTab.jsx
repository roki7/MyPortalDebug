// src/components/CalendarTab.jsx
import React from 'react';
import { Grid, Typography, Box, Paper } from '@mui/material';
import { WbSunny, Cloud, Umbrella, AcUnit } from '@mui/icons-material';
import { format, startOfMonth, endOfMonth, set, isSameDay } from 'date-fns';
import JapaneseHolidays from 'japanese-holidays';

const WeatherIcon = ({ code }) => {
  if (code === undefined) return null;
  if (code <= 1) return <WbSunny sx={{ fontSize: 14, color: 'orange' }} />;
  if (code <= 3) return <Cloud sx={{ fontSize: 14, color: 'gray' }} />;
  if (code >= 51) return <Umbrella sx={{ fontSize: 14, color: 'blue' }} />;
  if (code >= 71) return <AcUnit sx={{ fontSize: 14, color: 'cyan' }} />;
  return <Cloud sx={{ fontSize: 14, color: 'gray' }} />;
};

export default function CalendarTab({ currentDate, shifts, jobs, weatherData, onDateClick, onShiftClick }) {
  const startDay = startOfMonth(currentDate);
  const endDay = endOfMonth(currentDate);
  const days = [];

  // 空白埋め
  for (let i = 0; i < startDay.getDay(); i++) {
    days.push(<Grid item xs={1.7} key={`empty-${i}`} sx={{border: '1px solid #eee', bgcolor: '#fafafa'}} />);
  }

  // 日付埋め
  for (let i = 1; i <= endDay.getDate(); i++) {
    const d = set(startDay, { date: i });
    const dateStr = format(d, 'yyyy-MM-dd');
    const dayShifts = shifts[dateStr] || [];
    const isToday = isSameDay(d, new Date());
    
    // 天気・気圧・祝日
    const weather = weatherData[dateStr];
    const isLowPressure = weather && weather.pressure < 1008;
    const holidayName = JapaneseHolidays.isHoliday(d);

    days.push(
      <Grid item xs={1.7} key={i} 
        onClick={() => onDateClick(d)}
        sx={{ 
          border: isToday ? '2px solid #1976d2' : '1px solid #eee', 
          height: 90, 
          bgcolor: holidayName ? '#fff0f0' : 'white', // 祝日は薄い赤背景
          position: 'relative', cursor: 'pointer', overflow: 'hidden' 
        }}>
        
        {/* 日付ヘッダー */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', p: 0.5 }}>
           <Typography variant="caption" sx={{ 
               fontWeight: isToday?'bold':'normal', 
               color: holidayName || startDay.getDay() === 0 ? 'red' : 'inherit', // 祝日は赤文字
               fontSize: '0.7rem'
           }}>
             {i}
           </Typography>
           <Box sx={{ display: 'flex', flexDirection:'column', alignItems:'flex-end' }}>
             {/* 祝日名があれば表示 */}
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
            
            // ★修正: jobが見つからなくても表示する（削除された仕事対策）
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
                 job?.type === 'hourly' ? `${shift.start?.replace(':00','')}-${shift.end?.replace(':00','')}` : // 分を省略してスッキリ表示
                 job?.type === 'manual' ? `¥${shift.amount?.toLocaleString()}` : jobName}
              </Box>
            )
          })}
        </Box>
      </Grid>
    );
  }

  return (
    <Paper sx={{ p: 1 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-around', mb: 1 }}>
        {['日', '月', '火', '水', '木', '金', '土'].map((d, i) => (
          <Typography key={d} variant="caption" color={i===0?'error':i===6?'primary':'textSecondary'} sx={{ width: '14%', textAlign: 'center' }}>{d}</Typography>
        ))}
      </Box>
      <Grid container spacing={0.5}>
        {days}
      </Grid>
    </Paper>
  );
}