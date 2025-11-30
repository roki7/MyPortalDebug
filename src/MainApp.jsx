// src/MainApp.jsx
import React, { useState, useEffect } from 'react';
import { 
  Box, Container, Paper, Typography, Tabs, Tab, LinearProgress, Chip, IconButton, 
  Dialog, DialogTitle, DialogContent, DialogActions, Button, TextField, Avatar, 
  Snackbar, Alert, Drawer, List, ListItem, ListItemIcon, ListItemText, Divider 
} from '@mui/material';

import { 
  CalendarMonth, AccountBalance, Settings, EmojiEvents, ArrowBack, ArrowForward, 
  AccessTime, Delete, BeachAccess, Close, LocationOn, ShoppingCart, Assessment, 
  Login, Logout, CloudDone, CloudOff, MoreHoriz 
} from '@mui/icons-material';
import { format, addMonths, subMonths, parse } from 'date-fns';

import { 
  INITIAL_JOBS, INITIAL_ACCOUNTS, INITIAL_RECURRING, INITIAL_SETTINGS, 
  INITIAL_PAYMENT_TEMPLATES, INITIAL_MEMBERS, INITIAL_SHOPPING, INITIAL_MY_LINKS, 
  LAT, LON 
} from './data';

import { 
  calculateMonthlyEarnings, calculateAnnualIncome, generateShiftsRange, 
  deleteShiftsRange, getAnnualSummary, generateShiftsForYear 
} from './logic';

import { saveData, loadData } from './storage';
import { useAuth } from './AuthContext';

import CalendarTab from './components/CalendarTab';
import FinanceTab from './components/FinanceTab';
import ShiftDrawer from './components/ShiftDrawer';
import MotivationTab from './components/MotivationTab';
import SettingsTab from './components/SettingsTab';
import ShoppingTab from './components/ShoppingTab';
import ReportTab from './components/ReportTab';
import ReloadPrompt from './components/ReloadPrompt';

export default function MainApp() {
  const { currentUser, isPremium, login, logout } = useAuth();
  const [isLoaded, setIsLoaded] = useState(false);
  const [tabIndex, setTabIndex] = useState(0); 
  const [openDrawer, setOpenDrawer] = useState(false);

  // データState
  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [shifts, setShifts] = useState({});
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [recurring, setRecurring] = useState(INITIAL_RECURRING);
  const [payments, setPayments] = useState([]);
  const [templates, setTemplates] = useState(INITIAL_PAYMENT_TEMPLATES);
  const [shopping, setShopping] = useState(INITIAL_SHOPPING);
  const [myLinks, setMyLinks] = useState(INITIAL_MY_LINKS || []); 

  // UI State
  const [currentDate, setCurrentDate] = useState(new Date());
  const [earnings, setEarnings] = useState({ fixed: 0, projected: 0, workDays: 0 });
  const [annualIncome, setAnnualIncome] = useState(0);
  const [annualSummary, setAnnualSummary] = useState([]);
  const [weatherData, setWeatherData] = useState({});
  
  const [openMenu, setOpenMenu] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editShift, setEditShift] = useState(null);
  const [ccNotification, setCCNotification] = useState(null); 

  const today = new Date();
  const todayDay = today.getDate();

  // --- ロード・保存・計算ロジック ---
  useEffect(() => {
    const init = async () => {
      const savedData = await loadData(currentUser, isPremium);
      if (savedData) {
        if (savedData.settings) setSettings(savedData.settings);
        if (savedData.members) setMembers(savedData.members);
        if (savedData.jobs) setJobs(savedData.jobs);
        if (savedData.shifts) setShifts(savedData.shifts);
        if (savedData.accounts) setAccounts(savedData.accounts);
        if (savedData.recurring) setRecurring(savedData.recurring);
        if (savedData.payments) setPayments(savedData.payments);
        if (savedData.templates) setTemplates(savedData.templates);
        if (savedData.shopping) setShopping(savedData.shopping);
        if (savedData.myLinks) setMyLinks(savedData.myLinks);
        else setMyLinks(INITIAL_MY_LINKS || []);
      }
      setIsLoaded(true);
    };
    init();
  }, [currentUser, isPremium]);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      saveData(currentUser, { settings, members, jobs, shifts, accounts, recurring, payments, templates, shopping, myLinks }, isPremium);
    }, 1000);
    return () => clearTimeout(timer);
  }, [settings, members, jobs, shifts, accounts, recurring, payments, templates, shopping, myLinks, currentUser, isLoaded, isPremium]);

  useEffect(() => {
    const fetchWeather = async () => {
      const loc = settings.location || { lat: 35.6895, lon: 139.6917 };
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&daily=weathercode,surface_pressure_mean&timezone=Asia%2FTokyo`;
      try { const res = await fetch(url); const data = await res.json(); if(data.daily) { const w={}; data.daily.time.forEach((t,i)=>{w[t]={code:data.daily.weathercode[i],pressure:data.daily.surface_pressure_mean[i]}}); setWeatherData(w); } } catch(e){}
    }; fetchWeather();
  }, [settings.location]);

  useEffect(() => {
    const cm = format(currentDate, 'yyyy-MM');
    if(!payments.some(p=>p.month===cm) && recurring.length>0){
      setPayments(prev=>[...prev, ...recurring.map(r=>({...r, id:Date.now()+Math.random(), paid:false, month:cm, isRecurringInstance:true}))]);
    }
  }, [currentDate, recurring]);

  useEffect(() => {
    const r = calculateMonthlyEarnings(shifts, jobs, currentDate, settings.calcMode);
    setEarnings(r);
    const ann = calculateAnnualIncome(shifts, jobs, currentDate);
    setAnnualIncome(ann);
    const summary = getAnnualSummary(shifts, jobs, currentDate, settings.calcMode);
    setAnnualSummary(summary);
  }, [shifts, jobs, currentDate, settings]);

  useEffect(() => {
      const checkCreditCardBilling = () => {
          const creditCards = accounts.filter(a => a.type === 'credit');
          creditCards.forEach(card => {
              const checkDay = card.confirmationDay || card.billingDay;
              if (checkDay === todayDay) {
                  const unsettledAmount = payments
                      .filter(p => p.accountId === card.id && !p.isSettled)
                      .reduce((sum, p) => sum + p.amount, 0);
                  if (unsettledAmount > 0) {
                      setCCNotification({ cardName: card.name, amount: unsettledAmount, isBillingDay: true, paymentDay: card.paymentDay });
                  }
              }
          });
      };
      if (isLoaded) checkCreditCardBilling();
  }, [todayDay, accounts, payments, isLoaded]);

  const totalFixedCost = recurring.reduce((sum, item) => sum + item.amount, 0);

  // --- ハンドラー群 ---
  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleDateChange = (e) => { if(e.target.value) setCurrentDate(parse(e.target.value, 'yyyy-MM', new Date())); };

  const handleAddJob = (job) => setJobs([...jobs, job]);
  const handleUpdateJob = (updatedJob) => setJobs(jobs.map(j => j.id === updatedJob.id ? updatedJob : j));
  const handleDeleteJob = (id) => setJobs(jobs.filter(j => j.id !== id));
  const handleAddAccount = (acc) => setAccounts([...accounts, acc]);
  const handleAddMyLink = (link) => setMyLinks([...myLinks, link]);
  const handleDeleteMyLink = (id) => setMyLinks(myLinks.filter(a => a.id !== id));

  const handleGenerateAnnualShifts = (year) => {
    if (jobs.length === 0) { alert("仕事を登録してください"); return; }
    if (!window.confirm(`${year}年のシフトを一括生成しますか？`)) return;
    const newShifts = generateShiftsForYear(year, jobs);
    const mergedShifts = { ...shifts };
    Object.keys(newShifts).forEach(date => {
        if (mergedShifts[date]) mergedShifts[date] = [...mergedShifts[date], ...newShifts[date]];
        else mergedShifts[date] = newShifts[date];
    });
    setShifts(mergedShifts);
    alert("完了！");
  };

  const handleGenerateRange = (start, end, jobId) => {
    const targetJob = jobs.find(j => j.id === parseInt(jobId));
    if (!targetJob) return;
    const newShifts = generateShiftsRange(start, end, targetJob, targetJob.skipHolidays);
    const mergedShifts = { ...shifts };
    Object.keys(newShifts).forEach(date => {
        if (mergedShifts[date]) mergedShifts[date] = [...mergedShifts[date], ...newShifts[date]];
        else mergedShifts[date] = newShifts[date];
    });
    setShifts(mergedShifts);
    alert("一括登録完了！");
  };

  const handleDeleteRange = (start, end, jobId) => {
    if (!window.confirm("本当に削除していいですか？")) return;
    const cleanedShifts = deleteShiftsRange(shifts, start, end, parseInt(jobId));
    setShifts(cleanedShifts);
    alert("削除完了！");
  };

  const handleAddTemplate = (name) => setTemplates([...templates, { id: Date.now(), name, accountId: null }]);
  const handleDeleteTemplate = (id) => setTemplates(templates.filter(t => t.id !== id));
  const handleAddPayment = (payment) => setPayments([...payments, { ...payment, id: Date.now(), paid: false, month: format(currentDate, 'yyyy-MM'), day: new Date().getDate() }]);
  
  // ★修正: シフト追加ハンドラー (単発・手入力対応)
  const handleAddShift = (job, manualAmount = 0) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    
    let newShift = { 
        id: Date.now(), 
        jobId: job.id, 
        status: 'normal', 
        amount: manualAmount, 
        start: job.defaultStart || '09:00', 
        end: job.defaultEnd || '17:00' 
    };

    // 単発シフトの場合の特別処理
    if (job.id === 'custom') {
        newShift.customName = job.name;
        newShift.start = ''; 
        newShift.end = '';
    } else if (job.type === 'manual' && !manualAmount) { 
        const amt = prompt("金額", "0"); 
        if(amt) newShift.amount = parseInt(amt); 
    }
    
    const current = shifts[dateStr] || [];
    setShifts({ ...shifts, [dateStr]: [...current, newShift] });
    setOpenMenu(false);
  };

  const handleSaveShiftTime = () => {
    if (!editShift || !selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setShifts({ ...shifts, [dateStr]: shifts[dateStr].map(s => s.id === editShift.id ? editShift : s) });
    setEditShift(null);
  };

  const handleDeleteShift = () => {
    if (!editShift || !selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    setShifts({ ...shifts, [dateStr]: shifts[dateStr].filter(s => s.id !== editShift.id) });
    setEditShift(null);
  };

  const handleUpdateShiftStatus = (status) => {
    if (!editShift || !selectedDate) return;
    const dateStr = format(selectedDate, 'yyyy-MM-dd');
    const newStatus = editShift.status === status ? 'normal' : status;
    const updatedShift = { ...editShift, status: newStatus };
    setShifts({ ...shifts, [dateStr]: shifts[dateStr].map(s => s.id === editShift.id ? updatedShift : s) });
    setEditShift(updatedShift);
  };

  const handleUpdateStock = (newStockList) => { setShopping({ ...shopping, stock: newStockList }); };

  const LoginStatus = () => {
    if (currentUser) {
      return (<IconButton onClick={() => { if(window.confirm("ログアウトしますか？")) logout(); }} size="small"><Avatar sx={{ width: 24, height: 24, bgcolor: 'orange' }} src={currentUser.photoURL} alt={currentUser.displayName} /></IconButton>);
    }
    return (<Button onClick={login} size="small" variant="contained" color="secondary" startIcon={<Login />} sx={{ fontSize: 10, px: 1, minWidth: 0 }}>ログイン</Button>);
  };

  const mainTabs = [
    { icon: <CalendarMonth />, label: 'シフト' },
    { icon: <AccountBalance />, label: '口座' },
    { icon: <ShoppingCart />, label: '買い物' },
  ];
  const moreTabs = [
    { icon: <Assessment />, label: '分析', index: 3 },
    { icon: <EmojiEvents />, label: 'モチベ', index: 4 },
    { icon: <Settings />, label: '設定', index: 5 },
  ];

  return (
    <Container maxWidth="sm" sx={{ p: 0, bgcolor: '#f5f5f5', minHeight: '100vh', pb: 10, position: 'relative' }}>
        <Snackbar open={!!ccNotification} autoHideDuration={9000} onClose={() => setCCNotification(null)} anchorOrigin={{ vertical: 'top', horizontal: 'center' }}>
            <Alert onClose={() => setCCNotification(null)} severity="warning" sx={{ width: '100%' }} action={<Button color="inherit" size="small" onClick={() => setCCNotification(null)}>確認済</Button>}>
                **{ccNotification?.cardName}** の請求確定日です！<br/>
                現在のご利用額: **¥{ccNotification?.amount.toLocaleString()}**<br/>
                (引落日: {ccNotification?.paymentDay}日)
            </Alert>
        </Snackbar>

      <Paper elevation={3} sx={{ p: 2, bgcolor: '#212121', color: 'white', borderRadius: '0 0 16px 16px', position:'sticky', top:0, zIndex:10 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
           <IconButton onClick={handlePrevMonth} size="small"><ArrowBack sx={{ color: 'white' }} /></IconButton>
           <Box sx={{textAlign:'center', position:'relative'}}>
             <Typography variant="h6" sx={{ fontWeight: 'bold', pointerEvents:'none' }}>{format(currentDate, 'yyyy年 M月')}</Typography>
             <Box sx={{display:'flex', alignItems:'center', justifyContent:'center', opacity:0.7, fontSize:12, pointerEvents:'none'}}>
                <LocationOn sx={{fontSize:14, mr:0.5}}/>{settings.location?.name || '東京'}
             </Box>
             <input type="month" value={format(currentDate, 'yyyy-MM')} onChange={handleDateChange} style={{ position:'absolute', top:0, left:0, width:'100%', height:'100%', opacity:0, cursor:'pointer', zIndex:10 }} />
           </Box>
           <Box sx={{ display:'flex', alignItems:'center', gap: 1 }}>
             <Chip icon={currentUser && isPremium ? <CloudDone sx={{color:'white !important', fontSize:'16px !important'}}/> : <CloudOff sx={{color:'gray !important', fontSize:'16px !important'}}/>} label={settings.calcMode === 'realtime' ? '⏱' : '✅'} size="small" sx={{ bgcolor: 'rgba(255,255,255,0.2)', color: 'white', pl:0.5, height: 24 }} />
             <LoginStatus />
             <IconButton onClick={handleNextMonth} size="small" sx={{ ml: -0.5 }}><ArrowForward sx={{ color: 'white' }} /></IconButton>
           </Box>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, mb: 1 }}>
            <Typography variant="caption">📅 出勤: {earnings.workDays}日</Typography>
            <Typography variant="caption">💰 世帯年収: ¥{annualIncome.toLocaleString()}</Typography>
        </Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <Box><Typography variant="caption" sx={{ opacity: 0.7 }}>💰 今月の確定 (世帯計)</Typography><Typography variant="h4" fontWeight="bold">¥{earnings.fixed.toLocaleString()}</Typography></Box>
          <Box sx={{ textAlign: 'right' }}><Typography variant="caption" sx={{ opacity: 0.7 }}>着地見込み</Typography><Typography variant="h6">¥{earnings.projected.toLocaleString()}</Typography></Box>
        </Box>
        <LinearProgress variant="determinate" value={earnings.projected > 0 ? (earnings.fixed / earnings.projected) * 100 : 0} sx={{ mt: 1, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.1)', '& .MuiLinearProgress-bar': { bgcolor: '#00e676' } }} />
      </Paper>

      <Box sx={{ p: 2 }}>
        {tabIndex === 0 && <CalendarTab currentDate={currentDate} shifts={shifts} jobs={jobs} weatherData={weatherData} onDateClick={(d) => { setSelectedDate(d); setOpenMenu(true); }} onShiftClick={(s, d) => { setSelectedDate(d); setEditShift(s); }} onPrevMonth={handlePrevMonth} onNextMonth={handleNextMonth} />}
        {tabIndex === 1 && <FinanceTab accounts={accounts} payments={payments} templates={templates} myLinks={myLinks} currentDate={currentDate} onAddAccount={handleAddAccount} onAddPayment={handleAddPayment} onAddTemplate={handleAddTemplate} onDeleteTemplate={handleDeleteTemplate} onAddMyLink={handleAddMyLink} onDeleteMyLink={handleDeleteMyLink} onUpdateBalance={(id, val) => setAccounts(accounts.map(a => a.id===id ? {...a, balance: parseInt(val)}:a))} onTogglePaid={(id) => setPayments(payments.map(p => p.id===id ? {...p, paid: !p.paid}:p))} />}
        {tabIndex === 2 && <ShoppingTab shopping={shopping} onUpdateShopping={setShopping} onUpdateStock={handleUpdateStock} onAddPayment={handleAddPayment} accounts={accounts} />}
        {tabIndex === 3 && <ReportTab annualIncome={annualIncome} summary={annualSummary} targetLimit={settings.targetLimit} accounts={accounts} totalFixedCost={totalFixedCost} />}
        {tabIndex === 4 && MotivationTab && <MotivationTab currentEarnings={earnings.fixed} fixedCost={totalFixedCost} />}
        {tabIndex === 5 && <SettingsTab jobs={jobs} settings={settings} members={members} onAddJob={handleAddJob} onUpdateJob={handleUpdateJob} onDeleteJob={handleDeleteJob} onUpdateSettings={setSettings} onGenerateAnnualShifts={handleGenerateAnnualShifts} onGenerateRange={handleGenerateRange} onDeleteRange={handleDeleteRange} onUpdateMembers={setMembers} />}
      </Box>

      <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100, pb: 'env(safe-area-inset-bottom)' }} elevation={10}>
        <Tabs value={tabIndex < 3 ? tabIndex : false} onChange={(e, v) => v !== false && setTabIndex(v)} variant="fullWidth" centered>
          {mainTabs.map((tab, i) => (
            <Tab key={i} icon={tab.icon} label={tab.label} value={i} />
          ))}
          <Tab icon={<MoreHoriz />} label="その他" value={false} onClick={() => setOpenDrawer(true)} sx={{opacity: 0.7}} />
        </Tabs>
      </Paper>

      <Drawer anchor="bottom" open={openDrawer} onClose={() => setOpenDrawer(false)} PaperProps={{ sx: { borderRadius: '16px 16px 0 0', pb: 'env(safe-area-inset-bottom)' } }}>
        <Box sx={{ p: 2 }}>
          <Typography variant="subtitle1" fontWeight="bold" align="center" sx={{mb:2}}>その他メニュー</Typography>
          <List>
            {moreTabs.map(tab => (
              <React.Fragment key={tab.index}>
                <ListItem button onClick={() => { setTabIndex(tab.index); setOpenDrawer(false); }}>
                  <ListItemIcon>{tab.icon}</ListItemIcon>
                  <ListItemText primary={tab.label} />
                </ListItem>
                <Divider />
              </React.Fragment>
            ))}
          </List>
        </Box>
      </Drawer>

      <ShiftDrawer open={openMenu} onClose={() => setOpenMenu(false)} jobs={jobs} members={members} selectedDate={selectedDate} onAddShift={handleAddShift} />

      {/* ★修正: 編集用ダイアログ */}
      <Dialog open={!!editShift} onClose={() => setEditShift(null)} fullWidth maxWidth="xs">
        <DialogTitle>シフト操作</DialogTitle>
        <DialogContent sx={{pt: 2}}>
            {/* 単発シフト以外なら時間表示 */}
            {editShift?.jobId !== 'custom' && (
                <>
                    <Box sx={{ display: 'flex', gap: 2, mb: 3, mt: 1 }}>
                        <TextField label="開始" type="time" InputLabelProps={{shrink:true}} fullWidth value={editShift?.start || ''} onChange={(e)=>setEditShift({...editShift, start: e.target.value})} />
                        <TextField label="終了" type="time" InputLabelProps={{shrink:true}} fullWidth value={editShift?.end || ''} onChange={(e)=>setEditShift({...editShift, end: e.target.value})} />
                    </Box>
                    <TextField label="休憩 (分)" type="number" size="small" fullWidth sx={{mb:3}} value={editShift?.breakTime !== undefined ? editShift.breakTime : 60} onChange={(e)=>setEditShift({...editShift, breakTime: e.target.value})} />
                </>
            )}
            
            {/* 単発シフトなら金額変更 */}
            {editShift?.jobId === 'custom' && (
                <TextField label="金額" type="number" fullWidth sx={{mb:3, mt:1}} value={editShift?.amount} onChange={(e)=>setEditShift({...editShift, amount: parseInt(e.target.value)})} />
            )}

            <Typography variant="caption" color="textSecondary" sx={{mb:1, display:'block'}}>※変更したら必ず「保存」を押してください</Typography>
            
            <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
                <Chip icon={<BeachAccess />} label="有給" onClick={() => handleUpdateShiftStatus('paid_leave')} color={editShift?.status === 'paid_leave' ? "primary" : "default"} variant={editShift?.status === 'paid_leave' ? "filled" : "outlined"} />
                <Chip icon={<Close />} label="欠勤" onClick={() => handleUpdateShiftStatus('absence')} color={editShift?.status === 'absence' ? "error" : "default"} variant={editShift?.status === 'absence' ? "filled" : "outlined"} />
            </Box>
        </DialogContent>
        <DialogActions sx={{ display: 'flex', justifyContent: 'space-between', px: 3, pb: 2 }}>
            <Button onClick={handleDeleteShift} color="error">削除</Button>
            <Box>
                <Button onClick={() => setEditShift(null)} color="inherit" sx={{ mr: 2 }}>キャンセル</Button>
                <Button onClick={handleSaveShiftTime} variant="contained" size="large">保存</Button>
            </Box>
        </DialogActions>
      </Dialog>
      <ReloadPrompt />
    </Container>
  );
}