// src/MainApp.jsx
import React, { useState, useEffect, useMemo } from "react";
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
import ShiftEditModal from "./components/ShiftEditModal";
import JobEditDialog from "./components/JobEditDialog";
import {
  INITIAL_JOBS,
  INITIAL_ACCOUNTS,
  INITIAL_RECURRING,
  INITIAL_SETTINGS,
  INITIAL_PAYMENT_TEMPLATES,
  INITIAL_MEMBERS,
  INITIAL_SHOPPING,
  INITIAL_MY_LINKS,
  LINK_CATEGORIES,
} from "./data";

import {
  calculateMonthlyEarnings,
  calculateAnnualIncome,
  getAnnualSummary,
  generateShiftsForYear,
  generateShiftsRange,
  deleteShiftsRange,
  mergeSharedData,
  calculateCurrentEarnings,
  getDisplayLabel,
  filterShiftsForUser,
} from "./logic";

import { saveData, loadData, subscribeToSharedData } from "./storage";
import { useAuth } from "./AuthContext";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "./firebase";

import CalendarTab from "./components/CalendarTab";
import FinanceTab from "./components/FinanceTab";
import ShiftDrawer from "./components/ShiftDrawer";
import MotivationTab from "./components/MotivationTab";
import SettingsTab from "./components/SettingsTab";
import ShoppingTab from "./components/ShoppingTab";
import ReportTab from "./components/ReportTab";
import ReloadPrompt from "./components/ReloadPrompt";
import MyLinksTab from "./components/MyLinksTab";
import PointTab from "./components/PointTab";

import AnalogClock from "./components/AnalogClock";

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

  const [isLoaded, setIsLoaded] = useState(false);
  const [tabIndex, setTabIndex] = useState(0);
  const [openDrawer, setOpenDrawer] = useState(false);
  const [viewMode, setViewMode] = useState("personal");
  const [isHousehold, setIsHousehold] = useState(false);

  const [jobDialogOpen, setJobDialogOpen] = useState(false);
  const [editingJob, setEditingJob] = useState(null);

  const [expandedHeader, setExpandedHeader] = useState(true);

  const [settings, setSettings] = useState(INITIAL_SETTINGS);
  const [members, setMembers] = useState(INITIAL_MEMBERS);
  const [jobs, setJobs] = useState(INITIAL_JOBS);
  const [shifts, setShifts] = useState({});
  const [accounts, setAccounts] = useState(INITIAL_ACCOUNTS);
  const [recurring, setRecurring] = useState(INITIAL_RECURRING);
  const [payments, setPayments] = useState([]);
  const [templates, setTemplates] = useState(INITIAL_PAYMENT_TEMPLATES);
  const [shopping, setShopping] = useState(INITIAL_SHOPPING);
  const [myLinks, setMyLinks] = useState(INITIAL_MY_LINKS);
  const [linkCategories, setLinkCategories] = useState(LINK_CATEGORIES);

  const [points, setPoints] = useState(0);
  const [wishlist, setWishlist] = useState([]);

  const [sharedDocs, setSharedDocs] = useState([]);
  const [kickDialog, setKickDialog] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const [earnings, setEarnings] = useState({
    personalFixed: 0,
    personalProjected: 0,
    householdFixed: 0,
    householdProjected: 0,
    workDays: 0,
  });
  const [annualIncome, setAnnualIncome] = useState({
    personal: 0,
    household: 0,
  });
  const [annualSummary, setAnnualSummary] = useState([]);
  const [weatherData, setWeatherData] = useState({});
  const [openMenu, setOpenMenu] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  const [editShift, setEditShift] = useState(null);
  const [ccNotification, setCCNotification] = useState(null);

  const [currentRealtimeEarnings, setCurrentRealtimeEarnings] = useState(0);
  const [realtimeLabel, setRealtimeLabel] = useState("");
  const [now, setNow] = useState(new Date());

  const currentThemeMode = settings.theme || "light";
  const currentTheme = themeMap[currentThemeMode];
  const isNeon = currentThemeMode === "neon";

  // データ読み込みとマージのロジック
  useEffect(() => {
    const init = async () => {
      try {
        // 1. まずローカルの最新状態を取得（ログアウト中に編集したデータ）
        const localRaw = localStorage.getItem("shift_app_v1");
        const localData = localRaw ? JSON.parse(localRaw) : {};

        // 2. クラウドからデータを取得
        const data = await loadData(currentUser, canSaveCloud);
        const d = data?.personal || {};

        // 3. マージ用ヘルパー関数（IDベースで重複除外）
        const mergeArrays = (cloudArr, localArr) => {
          if (!cloudArr && !localArr) return [];
          if (!cloudArr) return localArr || []; // クラウドになければローカルを採用
          if (!localArr) return cloudArr;

          const cloudIds = new Set(cloudArr.map((i) => i.id));
          const merged = [...cloudArr];

          // ローカルにあってクラウドにないもの（新規追加分）を追加
          localArr.forEach((item) => {
            if (!cloudIds.has(item.id)) {
              merged.push(item);
            }
          });
          return merged;
        };

        // 4. ステートにセット（クラウド優先だが、クラウドが空ならローカルを使う）
        setSettings(d.settings || localData.settings || INITIAL_SETTINGS);
        setMembers(d.members || localData.members || INITIAL_MEMBERS);
        setJobs(d.jobs || localData.jobs || INITIAL_JOBS);
        setShifts(d.shifts || localData.shifts || {});
        setAccounts(d.accounts || localData.accounts || INITIAL_ACCOUNTS);
        setRecurring(d.recurring || localData.recurring || INITIAL_RECURRING);
        setPayments(d.payments || localData.payments || []);
        setTemplates(
          d.templates || localData.templates || INITIAL_PAYMENT_TEMPLATES
        );
        setShopping(d.shopping || localData.shopping || INITIAL_SHOPPING);

        // 配列データはマージする（これでログアウト中の追加分が復活します）
        const mergedMyLinks = mergeArrays(d.myLinks, localData.myLinks);
        // マージ結果が空の場合はINITIAL_MY_LINKSを使用
        setMyLinks(mergedMyLinks.length > 0 ? mergedMyLinks : INITIAL_MY_LINKS);

        const mergedWishlist = mergeArrays(d.wishlist, localData.wishlist);
        setWishlist(mergedWishlist);

        // カテゴリは設定系なのでクラウド優先
        setLinkCategories(
          d.linkCategories || localData.linkCategories || LINK_CATEGORIES
        );

        // ポイントは大きい方を採用、またはクラウドが未定義ならローカル
        const cloudPoints = d.points;
        const localPoints = localData.points || 0;
        if (cloudPoints !== undefined && cloudPoints !== null) {
          setPoints(cloudPoints);
        } else {
          setPoints(localPoints);
        }

        setIsLoaded(true);
        if (userProfile?.kickedFrom) setKickDialog(true);
      } catch (e) {
        console.error(e);
        setIsLoaded(true);
      }
    };
    init();
  }, [currentUser, userProfile, canSaveCloud]);

  useEffect(() => {
    if (userProfile?.groupId && (viewMode === "shared" || isHousehold)) {
      const unsub = subscribeToSharedData(userProfile.groupId, (docs) =>
        setSharedDocs(docs)
      );
      return () => unsub();
    }
  }, [userProfile, viewMode, isHousehold]);

  useEffect(() => {
    if (!isLoaded) return;
    const timer = setTimeout(() => {
      saveData(
        currentUser,
        {
          settings,
          members,
          jobs,
          shifts,
          accounts,
          recurring,
          payments,
          templates,
          shopping,
          myLinks,
          linkCategories,
          points,
          wishlist,
        },
        userProfile?.groupId,
        canSaveCloud
      );
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    settings,
    members,
    jobs,
    shifts,
    accounts,
    recurring,
    payments,
    templates,
    shopping,
    myLinks,
    linkCategories,
    points,
    wishlist,
    currentUser,
    isLoaded,
    userProfile,
    canSaveCloud,
  ]);

  const fullMergedData = useMemo(() => {
    return mergeSharedData({ uid: currentUser?.uid, shifts, jobs }, sharedDocs);
  }, [currentUser, shifts, jobs, sharedDocs]);

  const displayShifts = viewMode === "shared" ? fullMergedData.shifts : shifts;
  const displayJobs = viewMode === "shared" ? fullMergedData.jobs : jobs;

  const calculationShifts = fullMergedData.shifts;
  const calculationJobs = fullMergedData.jobs;

  const totalFixedCost = recurring
    ? recurring.reduce((sum, item) => sum + (parseInt(item.amount) || 0), 0)
    : 0;

  const handleKickConfirm = async () => {
    if (currentUser)
      await updateDoc(doc(db, "users", currentUser.uid), {
        kickedFrom: null,
        kickedAt: null,
      });
    setKickDialog(false);
  };

  useEffect(() => {
    if (!settings?.location) return;
    const loc = settings.location;
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${loc.lat}&longitude=${loc.lon}&daily=weathercode,surface_pressure_mean&timezone=Asia%2FTokyo`;
    fetch(url)
      .then((r) => r.json())
      .then((d) => {
        if (d.daily) {
          const w = {};
          d.daily.time.forEach((t, i) => {
            w[t] = {
              code: d.daily.weathercode[i],
              pressure: d.daily.surface_pressure_mean[i],
            };
          });
          setWeatherData(w);
        }
      })
      .catch(() => {});
  }, [settings.location]);

  useEffect(() => {
    const todayDay = new Date().getDate();
    const creditCards = accounts.filter((a) => a.type === "credit");
    creditCards.forEach((card) => {
      const checkDay = card.confirmationDay || card.billingDay;
      if (checkDay === todayDay) {
        const unsettledAmount = payments
          .filter((p) => p.accountId === card.id && !p.isSettled)
          .reduce((sum, p) => sum + p.amount, 0);
        if (unsettledAmount > 0) {
          setCCNotification({
            title: `${card.name}の請求確定日`,
            msg: `未確定額: ¥${unsettledAmount.toLocaleString()}`,
          });
        }
      }
    });
  }, [accounts, payments, isLoaded]);

  useEffect(() => {
    const r = calculateMonthlyEarnings(
      calculationShifts,
      calculationJobs,
      currentDate,
      settings
    );
    setEarnings(r);

    const ann = calculateAnnualIncome(
      calculationShifts,
      calculationJobs,
      currentDate
    );
    setAnnualIncome(ann);

    const summary = getAnnualSummary(
      calculationShifts,
      calculationJobs,
      currentDate
    );
    setAnnualSummary(summary);
  }, [calculationShifts, calculationJobs, currentDate, settings]);

  useEffect(() => {
    const interval = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const targetShifts = isHousehold
      ? fullMergedData.shifts
      : filterShiftsForUser(fullMergedData.shifts, fullMergedData.jobs, "me");

    const val = calculateCurrentEarnings(
      targetShifts,
      fullMergedData.jobs,
      currentDate,
      now,
      settings
    );
    const label = getDisplayLabel(settings);

    setCurrentRealtimeEarnings(val);
    setRealtimeLabel(label);
  }, [fullMergedData, currentDate, now, settings, isHousehold]);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));

  // ヘッダー展開トグル関数
  const handleToggleHeader = () => setExpandedHeader((prev) => !prev);

  const handleOpenJobAdd = () => {
    setEditingJob(null);
    setJobDialogOpen(true);
  };
  const handleOpenJobEdit = (job) => {
    setEditingJob(job);
    setJobDialogOpen(true);
  };
  const handleSaveJob = (jobData) => {
    if (jobData.id) handleUpdateJob(jobData);
    else handleAddJob({ ...jobData, id: Date.now() });
  };
  const handleUpdateShiftFull = (updatedShift) => {
    if (!selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    setShifts({
      ...shifts,
      [dateStr]: shifts[dateStr].map((s) =>
        s.id === updatedShift.id ? updatedShift : s
      ),
    });
    setEditShift(null);
  };

  const handleAddJob = (job) => setJobs([...jobs, job]);
  const handleUpdateJob = (updatedJob) =>
    setJobs(jobs.map((j) => (j.id === updatedJob.id ? updatedJob : j)));
  const handleDeleteJob = (id) => setJobs(jobs.filter((j) => j.id !== id));

  const handleAddAccount = (acc) => setAccounts([...accounts, acc]);
  const handleUpdateAccount = (updatedAcc) =>
    setAccounts(accounts.map((a) => (a.id === updatedAcc.id ? updatedAcc : a)));

  const handleAddMyLink = (link) => setMyLinks([...myLinks, link]);
  const handleUpdateMyLink = (updatedLink) =>
    setMyLinks(
      myLinks.map((link) => (link.id === updatedLink.id ? updatedLink : link))
    );
  const handleDeleteMyLink = (id) =>
    setMyLinks(myLinks.filter((a) => a.id !== id));

  const handleAddCategory = (cat) =>
    setLinkCategories([...linkCategories, cat]);
  const handleDeleteCategory = (id) =>
    setLinkCategories(linkCategories.filter((c) => c.id !== id));
  const handleEditCategory = (id, newName) =>
    setLinkCategories(
      linkCategories.map((c) => (c.id === id ? { ...c, name: newName } : c))
    );

  const handleAddRecurring = (rec) => setRecurring([...recurring, rec]);
  const handleUpdateRecurring = (updatedRec) =>
    setRecurring(
      recurring.map((r) => (r.id === updatedRec.id ? updatedRec : r))
    );
  const handleDeleteRecurring = (id) =>
    setRecurring(recurring.filter((r) => r.id !== id));

  const handleAddTemplate = (name) =>
    setTemplates([...templates, { id: Date.now(), name, accountId: null }]);
  const handleDeleteTemplate = (id) =>
    setTemplates(templates.filter((t) => t.id !== id));

  const handleAddPayment = (payment) =>
    setPayments([
      ...payments,
      {
        ...payment,
        id: Date.now(),
        paid: false,
        month: format(currentDate, "yyyy-MM"),
        day: new Date().getDate(),
        isShared: viewMode === "shared",
      },
    ]);
  const handleUpdatePayment = (updatedPay) =>
    setPayments(payments.map((p) => (p.id === updatedPay.id ? updatedPay : p)));

  const handleUpdateStock = (newStockList) =>
    setShopping({ ...shopping, stock: newStockList });

  const handleAddPoints = (amount) => setPoints((prev) => prev + amount);
  const handleAddWishlist = (item) => setWishlist((prev) => [...prev, item]);
  const handleDeleteWishlist = (id) =>
    setWishlist((prev) => prev.filter((i) => i.id !== id));
  const handleUpdateWishlist = (updatedItem) => {
    setWishlist((prev) =>
      prev.map((item) => (item.id === updatedItem.id ? updatedItem : item))
    );
  };

  const handleGenerateAnnualShifts = (year) => {
    if (jobs.length === 0) {
      alert("仕事を登録してください");
      return;
    }
    if (!window.confirm(`${year}年のシフトを一括生成しますか？`)) return;
    const newShifts = generateShiftsForYear(year, jobs);
    const merged = { ...shifts };
    Object.keys(newShifts).forEach(
      (d) => (merged[d] = [...(merged[d] || []), ...newShifts[d]])
    );
    setShifts(merged);
    alert("完了");
  };
  const handleGenerateRange = (start, end, jobId) => {
    const targetJob = jobs.find((j) => String(j.id) === String(jobId));
    if (!targetJob) {
      alert("仕事が見つかりません");
      return;
    }
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
    setShifts(merged);
    alert("完了しました");
  };
  const handleDeleteRange = (start, end, jobId) => {
    setShifts(deleteShiftsRange(shifts, start, end, parseInt(jobId)));
    alert("削除");
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
    const current = shifts[dateStr] || [];
    setShifts({ ...shifts, [dateStr]: [...current, newShift] });
    setOpenMenu(false);
  };
  const handleDeleteShift = () => {
    if (!editShift || !selectedDate) return;
    const dateStr = format(selectedDate, "yyyy-MM-dd");
    setShifts({
      ...shifts,
      [dateStr]: shifts[dateStr].filter((s) => s.id !== editShift.id),
    });
    setEditShift(null);
  };
  const handleFullImport = (importedData) => {
    if (!importedData) return;
    if (window.confirm("データを復元しますか？")) {
      setSettings(importedData.settings || settings);
      setMembers(importedData.members || members);
      setJobs(importedData.jobs || jobs);
      setShifts(importedData.shifts || shifts);
      setAccounts(importedData.accounts || accounts);
      setRecurring(importedData.recurring || recurring);
      setPayments(importedData.payments || payments);
      setTemplates(importedData.templates || templates);
      setShopping(importedData.shopping || shopping);
      setMyLinks(importedData.myLinks || myLinks);
      setLinkCategories(importedData.linkCategories || linkCategories);
      setPoints(importedData.points || 0);
      setWishlist(importedData.wishlist || []);

      alert("復元しました");
    }
  };

  // ログアウト処理
  const handleLogout = async () => {
    if (window.confirm("ログアウトしますか？")) {
      try {
        await logout();
        window.location.reload();
      } catch (error) {
        console.error("Logout failed", error);
        alert("ログアウトに失敗しました");
      }
    }
  };

  // ログイン画面への誘導
  const handleLoginRequest = () => {
    login();
  };

  // プラン変更画面への誘導
  const handleManagePlan = () => {
    if (userProfile?.stripePortalUrl) {
      window.location.href = userProfile.stripePortalUrl;
    } else {
      alert("プラン変更画面へ移動します（Stripe連携準備中）");
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
        onClick={() => {
          console.log("[UI] login clicked");
          login();
        }}
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

  const currentAnnualIncome = isHousehold
    ? annualIncome.household
    : annualIncome.personal;
  const currentProjected = isHousehold
    ? earnings.householdProjected
    : earnings.personalProjected;

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
          transition: "background-color 0.3s",
        }}
      >
        <Dialog open={kickDialog}>
          <DialogTitle>通知</DialogTitle>
          <DialogContent>グループから削除されました。</DialogContent>
          <DialogActions>
            <Button onClick={handleKickConfirm}>OK</Button>
          </DialogActions>
        </Dialog>

        <Paper
          elevation={3}
          sx={{
            p: 2,
            bgcolor: viewMode === "shared" ? "#1565c0" : "background.paper",
            color: "text.primary",
            borderRadius: "0 0 16px 16px",
            position: "sticky",
            top: 0,
            zIndex: 10,
            transition: "background-color 0.3s",
            borderBottom: 1,
            borderColor: "divider",
          }}
        >
          {canShareGroup && userProfile?.groupId && (
            <Box sx={{ display: "flex", justifyContent: "center", mb: 1 }}>
              <Button
                variant={viewMode === "personal" ? "contained" : "text"}
                onClick={() => setViewMode("personal")}
                size="small"
                startIcon={<Person />}
                sx={{
                  color: "inherit",
                  bgcolor:
                    viewMode === "personal"
                      ? "rgba(255,255,255,0.2)"
                      : "transparent",
                  borderRadius: "20px 0 0 20px",
                }}
              >
                個人
              </Button>
              <Button
                variant={viewMode === "shared" ? "contained" : "text"}
                onClick={() => setViewMode("shared")}
                size="small"
                startIcon={<Groups />}
                sx={{
                  color: "inherit",
                  bgcolor:
                    viewMode === "shared"
                      ? "rgba(255,255,255,0.2)"
                      : "transparent",
                  borderRadius: "0 20px 20px 0",
                }}
              >
                共有
              </Button>
            </Box>
          )}
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              mb: 1,
            }}
          >
            {/* 1. Prev Button - 左端 */}
            <Box
              sx={{
                flexGrow: 1,
                display: "flex",
                justifyContent: "flex-start",
                minWidth: "auto",
              }}
            >
              <IconButton onClick={handlePrevMonth} size="small">
                <ArrowBack sx={{ color: "text.primary" }} />
              </IconButton>
            </Box>

            {/* 2. 年月表示 - 中央に配置 */}
            <Box
              sx={{
                flexShrink: 0, // 縮まない
                cursor: "pointer",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
              onClick={handleToggleHeader} // クリックで展開をトグル
            >
              <Typography
                variant="h6"
                sx={{ fontWeight: "bold", whiteSpace: "nowrap" }}
              >
                {format(currentDate, "yyyy年 M月")}
              </Typography>
              <IconButton size="small" sx={{ color: "text.primary", ml: 0.5 }}>
                {expandedHeader ? <ExpandLess /> : <ExpandMore />}{" "}
                {/* アイコン切り替え */}
              </IconButton>
            </Box>

            {/* 3. Right Icons - 右端 */}
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                flexGrow: 1,
                justifyContent: "flex-end",
                minWidth: "auto",
              }}
            >
              <Chip
                icon={
                  canSaveCloud ? (
                    <CloudDone sx={{ color: "inherit !important" }} />
                  ) : (
                    <CloudOff sx={{ color: "gray !important" }} />
                  )
                }
                label={settings.calcMode === "realtime" ? "⏱" : "✅"}
                size="small"
                sx={{
                  bgcolor: "rgba(128,128,128,0.2)",
                  color: "text.primary",
                  pl: 0.5,
                }}
              />
              <LoginStatus />
              <IconButton
                onClick={handleNextMonth}
                size="small"
                sx={{ ml: -0.5 }}
              >
                <ArrowForward sx={{ color: "text.primary" }} />
              </IconButton>
            </Box>
          </Box>

          {/* expandedHeaderがtrueの場合にのみ表示するアコーディオンエリア */}
          {expandedHeader && (
            <Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mt: 1,
                }}
              >
                {/* 左側: 日数・年収 */}
                <Box
                  sx={{
                    display: "flex",
                    flexDirection: "column",
                    minWidth: "30%",
                    mr: 1,
                  }}
                >
                  <Typography variant="caption">
                    📅 出勤: {earnings.workDays}日
                  </Typography>
                  <Typography variant="caption">
                    💰 {isHousehold ? "世帯" : "個人"}年収: ¥
                    {currentAnnualIncome.toLocaleString()}
                  </Typography>
                </Box>

                {/* 右側: 世帯合算スイッチ */}
                <FormControlLabel
                  control={
                    <Switch
                      checked={isHousehold}
                      onChange={(e) => setIsHousehold(e.target.checked)}
                      size="small"
                      color="warning"
                    />
                  }
                  label={
                    <Typography
                      variant="caption"
                      sx={{ color: "text.primary" }}
                    >
                      世帯合算
                    </Typography>
                  }
                  sx={{
                    mr: 0,
                    minWidth: "30%",
                    justifyContent: "flex-end",
                    ml: 1,
                  }} // 右寄せに調整
                />
              </Box>

              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center", // 中央寄せ
                  mt: 1,
                }}
              >
                <Box>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    {realtimeLabel}
                  </Typography>
                  {/* ★修正: リアルタイム収支 (確定) の金額を h6 に統一 */}
                  <Typography variant="h6" fontWeight="bold">
                    ¥{currentRealtimeEarnings.toLocaleString()}
                  </Typography>
                </Box>

                {/* アナログ時計 */}
                <Box
                  sx={{
                    flexShrink: 0,
                    width: 100,
                    height: 100,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: "50%",
                  }}
                >
                  <AnalogClock currentTheme={currentTheme} isNeon={isNeon} />
                </Box>

                <Box sx={{ textAlign: "right" }}>
                  <Typography variant="caption" sx={{ opacity: 0.7 }}>
                    着地見込み
                  </Typography>
                  {/* 着地見込みの金額は元から h6 */}
                  <Typography variant="h6">
                    ¥{currentProjected?.toLocaleString() || 0}
                  </Typography>
                </Box>
              </Box>
              <LinearProgress
                variant="determinate"
                value={
                  currentProjected > 0
                    ? (currentRealtimeEarnings / currentProjected) * 100
                    : 0
                }
                sx={{
                  mt: 1,
                  height: 6,
                  borderRadius: 3,
                  bgcolor: "rgba(128,128,128,0.2)",
                  "& .MuiLinearProgress-bar": {
                    background: isNeon
                      ? "linear-gradient(90deg, #00F5FF, #6A00FF)"
                      : "#00e676",
                  },
                }}
              />
            </Box>
          )}
          {/* アコーディオンエリア終了 */}
        </Paper>

        <Box sx={{ p: 2 }}>
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
                let initBreak = s.breakTime;
                if (
                  initBreak === undefined ||
                  initBreak === null ||
                  initBreak === ""
                ) {
                  initBreak = job?.breakTime || 0;
                }
                setEditShift({ ...s, breakTime: initBreak });
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
              onAddAccount={handleAddAccount}
              onUpdateAccount={handleUpdateAccount}
              onAddPayment={handleAddPayment}
              onUpdatePayment={handleUpdatePayment}
              onAddTemplate={handleAddTemplate}
              onDeleteTemplate={handleDeleteTemplate}
              onAddMyLink={handleAddMyLink}
              onDeleteMyLink={handleDeleteMyLink}
              recurring={recurring}
              onAddRecurring={handleAddRecurring}
              onUpdateRecurring={handleUpdateRecurring}
              onDeleteRecurring={handleDeleteRecurring}
              onUpdateBalance={(id, val) =>
                setAccounts(
                  accounts.map((a) =>
                    a.id === id ? { ...a, balance: parseInt(val) } : a
                  )
                )
              }
              onTogglePaid={(id) =>
                setPayments(
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
              onUpdateShopping={setShopping}
              onUpdateStock={handleUpdateStock}
              onAddPayment={handleAddPayment}
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
              onAddMyLink={handleAddMyLink}
              onUpdateMyLink={handleUpdateMyLink}
              onDeleteMyLink={handleDeleteMyLink}
              onAddCategory={handleAddCategory}
              onDeleteCategory={handleDeleteCategory}
              onEditCategory={handleEditCategory}
            />
          )}
          {tabIndex === 4 && (
            <ReportTab
              annualIncome={currentAnnualIncome}
              summary={annualSummary}
              targetLimit={settings.targetLimit}
              accounts={accounts}
              totalFixedCost={totalFixedCost}
            />
          )}

          {tabIndex === 5 && (
            <MotivationTab
              currentEarnings={
                isHousehold
                  ? earnings.householdProjected
                  : earnings.personalProjected
              }
              fixedCost={totalFixedCost}
              settings={settings}
              onUpdateSettings={setSettings}
              isPremium={isPremium}
              wishlist={wishlist}
              onAddWishlist={handleAddWishlist}
              onDeleteWishlist={handleDeleteWishlist}
              onUpdateWishlist={handleUpdateWishlist}
            />
          )}

          {tabIndex === 7 && (
            <PointTab
              points={points}
              onAddPoints={handleAddPoints}
              isPremium={isPremium}
            />
          )}

          {tabIndex === 6 && (
            <SettingsTab
              jobs={jobs}
              settings={settings}
              members={members}
              onAddJob={handleAddJob}
              onUpdateJob={handleUpdateJob}
              onDeleteJob={handleDeleteJob}
              onUpdateSettings={setSettings}
              onGenerateAnnualShifts={handleGenerateAnnualShifts}
              onGenerateRange={handleGenerateRange}
              onDeleteRange={handleDeleteRange}
              onUpdateMembers={setMembers}
              fullData={{
                settings,
                members,
                jobs,
                shifts,
                accounts,
                recurring,
                payments,
                templates,
                shopping,
                myLinks,
                linkCategories,
                points,
                wishlist,
              }}
              onImportData={handleFullImport}
              onEditJobRequest={handleOpenJobEdit}
              onAddJobRequest={handleOpenJobAdd}
              sharedDocs={sharedDocs}
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
            bgcolor: "background.paper",
            color: "text.primary",
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
            background: isNeon
              ? "linear-gradient(90deg, #00F5FF, #6A00FF)"
              : undefined,
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
