import React, { useState, useEffect } from "react";
import {
  Box,
  Container,
  Paper,
  Typography,
  Tabs,
  Tab,
  LinearProgress,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Avatar,
  Fab,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Switch,
  FormControlLabel,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  CssBaseline,
} from "@mui/material";
import { ThemeProvider } from "@mui/material/styles";
import { themeMap } from "./theme";
import {
  CalendarMonth,
  AccountBalance,
  Settings,
  EmojiEvents,
  ArrowBack,
  ArrowForward,
  ShoppingCart,
  Assessment,
  Login,
  CloudDone,
  CloudOff,
  MoreHoriz,
  Apps,
  Groups,
  Person,
  CardGiftcard,
  ExpandMore,
  ExpandLess,
} from "@mui/icons-material";
import { format, addMonths, subMonths } from "date-fns";
import { doc, updateDoc } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";

// Components
import ShiftEditModal from "./features/shifts/components/ShiftEditModal";
import JobEditDialog from "./features/shifts/components/JobEditDialog";
import CalendarTab from "./features/shifts/components/CalendarTab";
import FinanceTab from "./features/finance/components/FinanceTab";
import ShiftDrawer from "./features/shifts/components/ShiftDrawer";
import MotivationTab from "./features/motivation/components/MotivationTab";
import SettingsTab from "./features/settings/components/SettingsTab";
import ShoppingTab from "./features/shopping/components/ShoppingTab";
import ReportTab from "./features/report/components/ReportTab";
import ReloadPrompt from "./components/common/ReloadPrompt"; // Step 7.1で移動済みの場合
import MyLinksTab from "./features/mylinks/components/MyLinksTab";
import PointTab from "./features/point/components/PointTab";
import AnalogClock from "./features/shifts/components/AnalogClock";

import {
  generateShiftsForYear,
  generateShiftsRange,
  deleteShiftsRange,
  calculateAnnualIncome,
  getAnnualSummary,
  getAnnualMonthlyIncome,
} from "./logic";

import { useAuth } from "./AuthContext";
import { db } from "./firebase";
import { useAppData } from "./hooks/useAppData";
import { useShiftAggregations } from "./features/shifts/hooks/useShiftAggregations";
import { useRealtimeStatus } from "./features/shifts/hooks/useRealtimeStatus";
import { useWeather } from "./features/weather/hooks/useWeather";
import { useCreditCardNotification } from "./features/finance/hooks/useCreditCardNotification";

// Helper: 扶養チャート用フィルタ
function filterShiftsByTargetMember(shifts, targetMemberId) {
  if (!shifts || typeof shifts !== "object") return {};
  // targetMemberId:
  // - "me": memberId が未設定(null/undefined)のシフトも「本人」として扱う
  // - それ以外: memberId が一致するものだけを対象（未設定は除外）
  const target = targetMemberId ?? "me";
  const filtered = {};
  for (const [dateStr, dayShifts] of Object.entries(shifts)) {
    if (!Array.isArray(dayShifts)) {
      filtered[dateStr] = dayShifts;
      continue;
    }
    filtered[dateStr] = dayShifts.filter((s) => {
      const mid = s?.memberId;
      if (target === "me") {
        return mid == null || String(mid) === "me";
      }
      return mid != null && String(mid) === String(target);
    });
  }
  return filtered;
}

function filterMyShifts(shifts) {
  return filterShiftsByTargetMember(shifts, "me");
}


export default function MainApp() {
  const {
    currentUser,
    userProfile,
    login,
    isLoggingIn,
    logout,
    canSaveCloud,
    canShareGroup,
    isPremium,
  } = useAuth();
  const { isLoaded, data, actions } = useAppData();

  const {
    settings = {
      theme: "light",
      calcMode: "realtime",
      targetLimit: 0,
      location: null,
    },
    members = [],
    jobs = [],
    shifts = {},
    accounts = [],
    recurring = [],
    payments = [],
    templates = [],
    shopping = {},
    myLinks = [],
    linkCategories = [],
    points = 0,
    wishlist = [],
    sharedDocs = [],
    kickDialog = false,
  } = data || {};

  const [tabIndex, setTabIndex] = useState(0);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [viewMode, setViewMode] = useState("personal");
  const [isHousehold, setIsHousehold] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [expandedHeader, setExpandedHeader] = useState(true);

  // Report (年間収入推移) はヘッダーの月表示とは独立して年を切り替える
  const [reportYear, setReportYear] = useState(new Date().getFullYear());

  // Month Picker
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [pickerYear, setPickerYear] = useState(new Date().getFullYear());
  const [pickerMonth, setPickerMonth] = useState(new Date().getMonth() + 1);

  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);
  const [openMenu, setOpenMenu] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editShift, setEditShift] = useState(null);
  const [kickDialogLocal, setKickDialogLocal] = useState(false);
  const [planCheckoutState, setPlanCheckoutState] = useState({
    loading: false,
    priceId: null,
  });
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const weatherData = useWeather(settings?.location);
  const ccNotification = useCreditCardNotification(
    accounts,
    payments,
    isLoaded
  );

  const currentThemeMode = settings.theme || "light";
  const currentTheme = themeMap[currentThemeMode];
  const isNeon = currentThemeMode === "neon";

  const {
    fullMergedData,
    displayShifts,
    displayJobs,
    annualSummary,
    uiValues,
  } = useShiftAggregations(
    currentUser,
    shifts,
    jobs,
    sharedDocs,
    currentDate,
    settings,
    viewMode,
    isHousehold
  );

  const { currentRealtimeEarnings, realtimeLabel } = useRealtimeStatus(
    fullMergedData,
    currentDate,
    settings,
    isHousehold
  );

  const totalFixedCost = recurring
    ? recurring.reduce((sum, item) => sum + (parseInt(item.amount) || 0), 0)
    : 0;

  // 扶養（制限）チャート用: 設定の「扶養対象メンバー」だけを算出（世帯合算スイッチとは独立）
  const targetMemberId = settings?.targetMemberId ?? "me";
  const targetShifts = filterShiftsByTargetMember(shifts, targetMemberId);
  const fuyoAnnualIncome =
    calculateAnnualIncome(targetShifts, jobs, reportYear)?.personal || 0;

  // 年間収入推移（グラフ）用: 世帯合算スイッチに連動
  const trendShifts = isHousehold ? shifts : filterMyShifts(shifts);
  const trendMonthlyIncomeData = getAnnualMonthlyIncome(
    trendShifts,
    jobs,
    reportYear
  );
  const trendPrevYearMonthlyIncomeData = getAnnualMonthlyIncome(
    trendShifts,
    jobs,
    reportYear - 1
  );

  useEffect(() => {
    if (kickDialog) setKickDialogLocal(true);
  }, [kickDialog]);

  if (!isLoaded) {
    return (
      <ThemeProvider theme={themeMap.light}>
        <CssBaseline />
        <Container
          maxWidth="sm"
          sx={{
            height: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Box sx={{ textAlign: "center" }}>
            <LinearProgress sx={{ width: 200, mb: 2, borderRadius: 2 }} />
            <Typography variant="body2" color="text.secondary">
              データを読み込んでいます...
            </Typography>
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  const handleKickConfirm = async () => {
    if (currentUser)
      await updateDoc(doc(db, "users", currentUser.uid), {
        kickedFrom: null,
        kickedAt: null,
      });
    actions.setKickDialog(false);
    setKickDialogLocal(false);
  };

  const handleToggleHeader = () => setExpandedHeader((prev) => !prev);
  const handlePrevMonth = () => {
    const d = subMonths(currentDate, 1);
    const min = new Date(new Date().getFullYear() - (isPremium ? 7 : 1), 0, 1);
    setCurrentDate(d < min ? min : d);
  };
  const handleNextMonth = () => {
    const d = addMonths(currentDate, 1);
    const max = new Date(new Date().getFullYear(), 11, 1);
    setCurrentDate(d > max ? max : d);
  };

  const handleOpenMonthPicker = () => {
    setPickerYear(currentDate.getFullYear());
    setPickerMonth(currentDate.getMonth() + 1);
    setMonthPickerOpen(true);
  };
  const handleJumpToMonth = () => {
    const nowY = new Date().getFullYear();
    const minY = nowY - (isPremium ? 7 : 1);
    const y = Math.min(nowY, Math.max(minY, Number(pickerYear) || nowY));
    const m = Math.min(12, Math.max(1, Number(pickerMonth) || 1));
    setCurrentDate(new Date(y, m - 1, 1));
    setMonthPickerOpen(false);
  };
  const handleApplyMonthPicker = () => handleJumpToMonth();

  const handleOpenJobAdd = () => {
    setEditingJob(null);
    setJobDialogOpen(true);
  };
  const handleOpenJobEdit = (job) => {
    setEditingJob(job);
    setJobDialogOpen(true);
  };

  const handleSaveJob = (jobData) => {
    const incomingId = jobData?.id;
    const exists =
      incomingId != null &&
      jobs.some((j) => String(j.id) === String(incomingId));
    if (exists) actions.updateJob(jobData);
    else actions.addJob({ ...jobData, id: incomingId ?? Date.now() });
  };

  const handleUpdateShiftFull = (updatedShift) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    const current = shifts[dateStr] || [];
    actions.updateShiftsForDate(
      dateStr,
      current.map((s) => (s.id === updatedShift.id ? updatedShift : s))
    );
    setEditShift(null);
  };
  const handleDeleteShift = () => {
    if (!editShift || !selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    actions.updateShiftsForDate(
      dateStr,
      (shifts[dateStr] || []).filter((s) => s.id !== editShift.id)
    );
    setEditShift(null);
  };
  const handleAddShift = (
    job,
    manualAmount = 0,
    customPayDate = "",
    start = "",
    end = ""
  ) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    let newShift = {
      id: Date.now(),
      jobId: job.id,
      status: "normal",
      amount: manualAmount,
      start: start || job.defaultStart || "09:00",
      end: end || job.defaultEnd || "17:00",
      breakTime: job.breakTime || 0,
      isShared: viewMode === "shared",
      customPayDate: customPayDate,
    };
    if (job.id === "custom") newShift.customName = job.name;
    else if (job.type === "manual" && !manualAmount) {
      const amt = prompt("金額", "0");
      if (amt) newShift.amount = parseInt(amt);
    }
    actions.addShift(newShift, dateStr);
    setOpenMenu(false);
  };

  const handleGenerateAnnualShifts = (year) => {
    if (jobs.length === 0) return alert("仕事を登録してください");
    if (!window.confirm(`${year}年のシフトを一括生成しますか？`)) return;
    const newShifts = generateShiftsForYear(year, jobs);
    const merged = { ...shifts };
    Object.keys(newShifts).forEach(
      (d) => (merged[d] = [...(merged[d] || []), ...newShifts[d]])
    );
    actions.setShifts(merged);
    alert("完了");
  };
  const handleGenerateRange = (start, end, jobId) => {
    const targetJob = jobs.find((j) => String(j.id) === String(jobId));
    if (!targetJob) return alert("仕事が見つかりません");
    const newShifts = generateShiftsRange(
      start,
      end,
      targetJob,
      targetJob.skipHolidays
    );
    const merged = { ...shifts };
    Object.keys(newShifts).forEach(
      (d) => (merged[d] = [...(merged[d] || []), ...newShifts[d]])
    );
    actions.setShifts(merged);
    alert("完了しました");
  };
  const handleDeleteRange = (start, end, jobId) => {
    actions.setShifts(deleteShiftsRange(shifts, start, end, jobId));
    alert("削除");
  };
  const handleFullImport = (importedData) => {
    if (window.confirm("データを復元しますか？")) {
      actions.restoreData(importedData);
      alert("復元しました");
    }
  };
  const handleLogout = async () => {
    if (window.confirm("ログアウトしますか？")) {
      try {
        await logout();
        window.location.reload();
      } catch (error) {
        console.error(error);
        alert("ログアウトに失敗しました");
      }
    }
  };
  const handleManagePlan = async (priceId) => {
    if (isPremium) {
      if (isProcessingPayment) return;
      try {
        setIsProcessingPayment(true);
        const functions = getFunctions(undefined, "asia-northeast1");
        const createPortalSession = httpsCallable(
          functions,
          "createPortalSession"
        );
        const { data } = await createPortalSession({
          returnUrl: window.location.origin,
        });
        if (data?.url) window.location.href = data.url;
      } catch (e) {
        console.error(e);
        alert("失敗");
        setIsProcessingPayment(false);
      }
      return;
    }
    if (!priceId) return alert("プランを選択してください");
    if (planCheckoutState.loading) return;
    try {
      setPlanCheckoutState({ loading: true, priceId });
      const functions = getFunctions(undefined, "asia-northeast1");
      const createSession = httpsCallable(functions, "createCheckoutSession");
      const { data } = await createSession({
        origin: window.location.origin,
        priceId,
      });
      if (data.url) window.location.href = data.url;
    } catch (e) {
      console.error(e);
      alert("失敗");
      setPlanCheckoutState({ loading: false, priceId: null });
    }
  };

  const LoginStatus = () => {
    if (currentUser) {
      return (
        <IconButton
          onClick={() => {
            if (window.confirm("ログアウト？")) logout();
          }}
          size="small"
        >
          <Avatar
            sx={{ width: 24, height: 24, bgcolor: "orange" }}
            src={currentUser.photoURL}
          />
        </IconButton>
      );
    }
    return (
      <Button
        onClick={login}
        disabled={isLoggingIn}
        size="small"
        variant="contained"
        color="secondary"
        startIcon={<Login />}
        sx={{ fontSize: 10 }}
      >
        {isLoggingIn ? "ログイン中..." : "ログイン"}
      </Button>
    );
  };

  const mainTabs = [
    { icon: <CalendarMonth />, label: "シフト" },
    { icon: <AccountBalance />, label: "口座" },
    { icon: <ShoppingCart />, label: "買い物" },
    { icon: <Apps />, label: "MyLinks" },
  ];
  const moreTabs = [
    { icon: <Assessment />, label: "分析", index: 4 },
    { icon: <EmojiEvents />, label: "モチベ", index: 5 },
    ...(isPremium
      ? [{ icon: <CardGiftcard />, label: "ポイ活", index: 7 }]
      : []),
    { icon: <Settings />, label: "設定", index: 6 },
  ];

  return (
    <ThemeProvider theme={currentTheme}>
      <CssBaseline />
      <Container
        maxWidth="sm"
        sx={{
          p: 0,
          bgcolor: "background.default",
          minHeight: "100vh",
          pb: 10,
          position: "relative",
        }}
      >
        <Dialog open={kickDialogLocal}>
          <DialogTitle>通知</DialogTitle>
          <DialogContent>グループから削除されました。</DialogContent>
          <DialogActions>
            <Button onClick={handleKickConfirm}>OK</Button>
          </DialogActions>
        </Dialog>
        <Dialog
          open={monthPickerOpen}
          onClose={() => setMonthPickerOpen(false)}
          fullWidth
          maxWidth="xs"
        >
          <DialogTitle>月へ移動</DialogTitle>
          <DialogContent sx={{ display: "flex", gap: 2, pt: 2, flexWrap: "wrap", minWidth: 320 }}>
            <FormControl fullWidth>
              <InputLabel>年</InputLabel>
              <Select
                label="年"
                value={pickerYear}
                onChange={(e) => setPickerYear(Number(e.target.value))}
              >
                {Array.from({ length: 11 }, (_, i) => {
                  const y = new Date().getFullYear() - 5 + i;
                  return (
                    <MenuItem key={y} value={y}>
                      {y}年
                    </MenuItem>
                  );
                })}
              </Select>
            </FormControl>
            <FormControl fullWidth>
              <InputLabel>月</InputLabel>
              <Select
                label="月"
                value={pickerMonth}
                onChange={(e) => setPickerMonth(Number(e.target.value))}
              >
                {Array.from({ length: 12 }, (_, i) => (
                  <MenuItem key={i + 1} value={i + 1}>
                    {i + 1}月
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setMonthPickerOpen(false)}>
              キャンセル
            </Button>
            <Button variant="contained" onClick={handleApplyMonthPicker}>
              移動
            </Button>
          </DialogActions>
        </Dialog>

        <Paper
          elevation={3}
          sx={{
            p: 2,
            bgcolor: viewMode === "shared" ? "#1565c0" : "background.paper",
            borderRadius: "0 0 16px 16px",
            position: "sticky",
            top: 0,
            zIndex: 10,
          }}
        >
          {canShareGroup && userProfile?.groupId && (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
              <Button
                variant={viewMode === "personal" ? "contained" : "text"}
                onClick={() => setViewMode("personal")}
                size="small"
                startIcon={<Person />}
              >
                個人
              </Button>
              <Button
                variant={viewMode === "shared" ? "contained" : "text"}
                onClick={() => setViewMode("shared")}
                size="small"
                startIcon={<Groups />}
              >
                共有
              </Button>
            </Box>
          )}
          <Box sx={{ display: "flex", alignItems: "center", mb: 1 }}>
            <Box sx={{ flexGrow: 1 }}>
              <IconButton onClick={handlePrevMonth}>
                <ArrowBack />
              </IconButton>
            </Box>
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <Button
                onClick={handleOpenMonthPicker}
                variant="text"
                sx={{ minWidth: 0, p: 0.5, color: "inherit" }}
              >
                <Typography variant="h6" fontWeight="bold">
                  {format(currentDate, "yyyy年 M月")}
                </Typography>
              </Button>
              <IconButton size="small" onClick={handleToggleHeader}>
                {expandedHeader ? <ExpandLess /> : <ExpandMore />}
              </IconButton>
            </Box>
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                justifyContent: "flex-end",
                gap: 1,
              }}
            >
              <Chip
                icon={canSaveCloud ? <CloudDone /> : <CloudOff />}
                label={settings.calcMode === "realtime" ? "⏱" : "✅"}
                size="small"
              />
              <LoginStatus />
              <IconButton onClick={handleNextMonth}>
                <ArrowForward />
              </IconButton>
            </Box>
          </Box>
          {expandedHeader && (
            <Box>
              <Box
                sx={{ display: "flex", justifyContent: "space-between", mt: 1 }}
              >
                <Box sx={{ display: "flex", flexDirection: "column" }}>
                  <Typography variant="caption">
                    📅 出勤: {uiValues.workDays}日
                  </Typography>
                  <Typography variant="caption">
                    💰 {isHousehold ? "世帯" : "個人"}年収: ¥
                    {uiValues.currentAnnualIncome.toLocaleString()}
                  </Typography>
                </Box>
                <FormControlLabel
                  control={
                    <Switch
                      checked={isHousehold}
                      onChange={(e) => setIsHousehold(e.target.checked)}
                      size="small"
                      color="warning"
                    />
                  }
                  label={<Typography variant="caption">世帯合算</Typography>}
                />
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  mt: 1,
                }}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography variant="caption">{realtimeLabel}</Typography>
                  <Typography variant="h6" fontWeight="bold">
                    ¥{currentRealtimeEarnings.toLocaleString()}
                  </Typography>
                </Box>
                <Box sx={{ width: 100, height: 100 }}>
                  <AnalogClock currentTheme={currentTheme} isNeon={isNeon} />
                </Box>
                <Box sx={{ flex: 1, textAlign: "right" }}>
                  <Typography variant="caption">着地見込み</Typography>
                  <Typography variant="h6">
                    ¥{uiValues.currentProjected?.toLocaleString() || 0}
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={
                  uiValues.currentProjected > 0
                    ? (currentRealtimeEarnings / uiValues.currentProjected) *
                      100
                    : 0
                }
                sx={{ mt: 1, height: 6, borderRadius: 3 }}
              />
            </Box>
          )}
        </Paper>
        <Box sx={{ p: 2 }}>
          {ccNotification && (
            <Paper
              elevation={0}
              sx={{
                p: 2,
                mb: 2,
                bgcolor: "#fff3e0",
                borderLeft: "4px solid #ff9800",
                borderRadius: 1,
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight="bold"
                color="warning.dark"
                sx={{ display: "flex", alignItems: "center", gap: 1 }}
              >
                ⚠️ {ccNotification.title}
              </Typography>
              <Typography
                variant="body2"
                color="text.secondary"
                sx={{ mt: 0.5 }}
              >
                {ccNotification.msg}
              </Typography>
            </Paper>
          )}
          {tabIndex === 0 && (
            <CalendarTab
              currentDate={currentDate}
              shifts={displayShifts}
              jobs={displayJobs}
              weatherData={weatherData}
              onDateClick={(d) => {
                setSelectedDate(d);
                setOpenMenu(true);
              }}
              onShiftClick={(s, d) => {
                setSelectedDate(d);
                const job = jobs.find((j) => String(j.id) === String(s.jobId));
                setEditShift({
                  ...s,
                  breakTime: s.breakTime ?? job?.breakTime ?? 0,
                });
              }}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />
          )}
          {tabIndex === 1 && (
            <FinanceTab
              accounts={accounts}
              payments={payments}
              templates={templates}
              myLinks={myLinks}
              currentDate={currentDate}
              onAddAccount={(acc) => actions.setAccounts([...accounts, acc])}
              onUpdateAccount={(u) =>
                actions.setAccounts(
                  accounts.map((a) => (a.id === u.id ? u : a))
                )
              }
              onAddPayment={(p) =>
                actions.setPayments([
                  ...payments,
                  {
                    ...p,
                    id: Date.now(),
                    paid: false,
                    month: format(currentDate, "yyyy-MM"),
                    day: new Date().getDate(),
                    isShared: viewMode === "shared",
                  },
                ])
              }
              onUpdatePayment={(u) =>
                actions.setPayments(
                  payments.map((p) => (p.id === u.id ? u : p))
                )
              }
              onAddTemplate={(name) =>
                actions.setTemplates([
                  ...templates,
                  { id: Date.now(), name, accountId: null },
                ])
              }
              onDeleteTemplate={(id) =>
                actions.setTemplates(templates.filter((t) => t.id !== id))
              }
              onAddMyLink={(l) => actions.setMyLinks([...myLinks, l])}
              onDeleteMyLink={(id) =>
                actions.setMyLinks(myLinks.filter((l) => l.id !== id))
              }
              recurring={recurring}
              onAddRecurring={(r) => actions.setRecurring([...recurring, r])}
              onUpdateRecurring={(u) =>
                actions.setRecurring(
                  recurring.map((r) => (r.id === u.id ? u : r))
                )
              }
              onDeleteRecurring={(id) =>
                actions.setRecurring(recurring.filter((r) => r.id !== id))
              }
              onUpdateBalance={(id, val) =>
                actions.setAccounts(
                  accounts.map((a) =>
                    a.id === id ? { ...a, balance: parseInt(val) } : a
                  )
                )
              }
              onTogglePaid={(id) =>
                actions.setPayments(
                  payments.map((p) =>
                    p.id === id ? { ...p, paid: !p.paid } : p
                  )
                )
              }
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />
          )}
          {tabIndex === 2 && (
            <ShoppingTab
              shopping={shopping}
              onUpdateShopping={actions.setShopping}
              onUpdateStock={(s) =>
                actions.setShopping({ ...shopping, stock: s })
              }
              onAddPayment={(p) =>
                actions.setPayments([
                  ...payments,
                  {
                    ...p,
                    id: Date.now(),
                    paid: false,
                    month: format(currentDate, "yyyy-MM"),
                    day: new Date().getDate(),
                    isShared: viewMode === "shared",
                  },
                ])
              }
              accounts={accounts}
              currentDate={currentDate}
              onPrevMonth={handlePrevMonth}
              onNextMonth={handleNextMonth}
            />
          )}
          {tabIndex === 3 && (
            <MyLinksTab
              myLinks={myLinks}
              linkCategories={linkCategories}
              onAddMyLink={(l) => actions.setMyLinks([...myLinks, l])}
              onUpdateMyLink={(u) =>
                actions.setMyLinks(myLinks.map((l) => (l.id === u.id ? u : l)))
              }
              onDeleteMyLink={(id) =>
                actions.setMyLinks(myLinks.filter((l) => l.id !== id))
              }
              onAddCategory={(c) =>
                actions.setLinkCategories([...linkCategories, c])
              }
              onDeleteCategory={(id) =>
                actions.setLinkCategories(
                  linkCategories.filter((c) => c.id !== id)
                )
              }
              onEditCategory={(id, n) =>
                actions.setLinkCategories(
                  linkCategories.map((c) =>
                    c.id === id ? { ...c, name: n } : c
                  )
                )
              }
            />
          )}
          {tabIndex === 4 && (
            <ReportTab shifts={shifts} jobs={jobs} settings={settings} accounts={accounts} totalFixedCost={totalFixedCost} isHousehold={isHousehold} isPremium={isPremium} />
          )}
          {tabIndex === 5 && (
            <MotivationTab
              currentEarnings={uiValues.currentProjected}
              fixedCost={totalFixedCost}
              settings={settings}
              onUpdateSettings={actions.setSettings}
              isPremium={isPremium}
              wishlist={wishlist}
              onAddWishlist={(i) => actions.setWishlist((prev) => [...prev, i])}
              onDeleteWishlist={(id) =>
                actions.setWishlist((prev) => prev.filter((i) => i.id !== id))
              }
              onUpdateWishlist={(u) =>
                actions.setWishlist((prev) =>
                  prev.map((i) => (i.id === u.id ? u : i))
                )
              }
            />
          )}
          {tabIndex === 7 && (
            <PointTab
              points={points}
              onAddPoints={(a) => actions.setPoints((prev) => prev + a)}
              isPremium={isPremium}
            />
          )}
          {tabIndex === 6 && (
            <SettingsTab
              jobs={jobs}
              settings={settings}
              members={members}
              onAddJob={(j) => actions.addJob({ ...j, id: Date.now() })}
              onUpdateJob={actions.updateJob}
              onDeleteJob={actions.deleteJob}
              onUpdateSettings={actions.setSettings}
              onGenerateAnnualShifts={handleGenerateAnnualShifts}
              onGenerateRange={handleGenerateRange}
              onDeleteRange={handleDeleteRange}
              onUpdateMembers={actions.setMembers}
              onImportData={handleFullImport}
              onEditJobRequest={handleOpenJobEdit}
              onAddJobRequest={handleOpenJobAdd}
              sharedDocs={sharedDocs}
              shifts={shifts}
              wishlist={wishlist}
              onRestoreData={handleFullImport}
              onLogout={handleLogout}
              onLoginRequest={() => login()}
              onManagePlan={handleManagePlan}
              planCheckoutState={planCheckoutState}
              isProcessingPayment={isProcessingPayment}
            />
          )}
        </Box>
        <Paper
          sx={{
            position: "fixed",
            bottom: 0,
            left: 0,
            right: 0,
            zIndex: 100,
            pb: "env(safe-area-inset-bottom)",
            borderTop: 1,
            borderColor: "divider",
          }}
          elevation={10}
        >
          <Tabs
            value={tabIndex < 4 ? tabIndex : false}
            onChange={(e, v) => v !== false && setTabIndex(v)}
            variant="fullWidth"
            centered
            textColor="inherit"
            indicatorColor="secondary"
          >
            {mainTabs.map((tab, i) => (
              <Tab key={i} icon={tab.icon} label={tab.label} value={i} />
            ))}
          </Tabs>
        </Paper>
        <Fab
          color={isNeon ? "primary" : "secondary"}
          sx={{
            position: "fixed",
            bottom: "calc(120px + env(safe-area-inset-bottom))",
            right: 16,
            zIndex: 100,
          }}
          onClick={() => setOpenDrawer(true)}
        >
          <MoreHoriz />
        </Fab>
        <Drawer
          anchor="bottom"
          open={openDrawer}
          onClose={() => setOpenDrawer(false)}
          PaperProps={{
            sx: {
              borderRadius: "16px 16px 0 0",
              pb: "env(safe-area-inset-bottom)",
            },
          }}
        >
          <Box sx={{ p: 2 }}>
            <List>
              {moreTabs.map((tab) => (
                <React.Fragment key={tab.index}>
                  <ListItem
                    button
                    onClick={() => {
                      setTabIndex(tab.index);
                      setOpenDrawer(false);
                    }}
                  >
                    <ListItemIcon>{tab.icon}</ListItemIcon>
                    <ListItemText primary={tab.label} />
                  </ListItem>
                  <Divider />
                </React.Fragment>
              ))}
            </List>
          </Box>
        </Drawer>
        <ShiftDrawer
          open={openMenu}
          onClose={() => setOpenMenu(false)}
          jobs={jobs}
          members={members}
          selectedDate={selectedDate}
          onAddShift={handleAddShift}
          onEditJobRequest={handleOpenJobEdit}
          onAddJobRequest={handleOpenJobAdd}
        />
        {editShift && (
          <ShiftEditModal
            open={!!editShift}
            onClose={() => setEditShift(null)}
            shift={editShift}
            job={jobs.find((j) => String(j.id) === String(editShift.jobId))}
            onUpdate={handleUpdateShiftFull}
            onDelete={handleDeleteShift}
          />
        )}
        <JobEditDialog
          open={jobDialogOpen}
          onClose={() => setJobDialogOpen(false)}
          job={editingJob}
          members={members}
          onSave={handleSaveJob}
        />
        <ReloadPrompt />
      </Container>
    </ThemeProvider>
  );
}
