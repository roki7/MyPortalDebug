import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../AuthContext";
import { saveData, loadData, subscribeToSharedData } from "../storage";
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
} from "../data";

/**
 * App data source of truth (personal + shared).
 * - Loads data (cloud/local merge)
 * - Subscribes shared data (optional)
 * - Auto-saves with debounce
 *
 * @param {{ subscribeShared?: boolean }=} options
 */
export const useAppData = (options = {}) => {
  const { subscribeShared = true } = options;

  const { currentUser, userProfile, canSaveCloud } = useAuth();

  const [isLoaded, setIsLoaded] = useState(false);

  // --- State Definitions (Source of Truth) ---
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

  // --- Data Loading & Merging ---
  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      try {
        // 1. ローカルの最新状態を取得（ログアウト中に編集したデータ）
        const localRaw = localStorage.getItem("shift_app_v1");
        const localData = localRaw ? JSON.parse(localRaw) : {};

        // 2. クラウドからデータを取得
        const data = await loadData(currentUser, canSaveCloud);
        const d = data?.personal || {};

        if (!isMounted) return;

        // 3. マージ用ヘルパー関数（IDベースで重複除外）
        const mergeArrays = (cloudArr, localArr) => {
          if (!cloudArr && !localArr) return [];
          if (!cloudArr) return localArr || [];
          if (!localArr) return cloudArr;

          const cloudIds = new Set(cloudArr.map((i) => i.id));
          const merged = [...cloudArr];

          // ローカルにあってクラウドにないもの（新規追加分）を追加
          localArr.forEach((item) => {
            if (!cloudIds.has(item.id)) merged.push(item);
          });

          return merged;
        };

        // 4. Stateセット（クラウド優先だが、クラウドが空ならローカルを使う）
        setSettings(d.settings || localData.settings || INITIAL_SETTINGS);
        setMembers(d.members || localData.members || INITIAL_MEMBERS);
        setJobs(d.jobs || localData.jobs || INITIAL_JOBS);
        setShifts(d.shifts || localData.shifts || {});
        setAccounts(d.accounts || localData.accounts || INITIAL_ACCOUNTS);
        setRecurring(d.recurring || localData.recurring || INITIAL_RECURRING);
        setPayments(d.payments || localData.payments || []);
        setTemplates(d.templates || localData.templates || INITIAL_PAYMENT_TEMPLATES);
        setShopping(d.shopping || localData.shopping || INITIAL_SHOPPING);

        // 配列データはマージする（ログアウト中の追加分が復活）
        const mergedMyLinks = mergeArrays(d.myLinks, localData.myLinks);
        setMyLinks(mergedMyLinks.length > 0 ? mergedMyLinks : INITIAL_MY_LINKS);

        const mergedWishlist = mergeArrays(d.wishlist, localData.wishlist);
        setWishlist(mergedWishlist);

        // カテゴリは設定系なのでクラウド優先
        setLinkCategories(d.linkCategories || localData.linkCategories || LINK_CATEGORIES);

        // ポイント：クラウドが未定義ならローカル
        const cloudPoints = d.points;
        const localPoints = localData.points || 0;
        if (cloudPoints !== undefined && cloudPoints !== null) setPoints(cloudPoints);
        else setPoints(localPoints);

        setIsLoaded(true);
        if (userProfile?.kickedFrom) setKickDialog(true);
      } catch (e) {
        console.error(e);
        if (isMounted) setIsLoaded(true);
      }
    };

    init();
    return () => {
      isMounted = false;
    };
  }, [currentUser, userProfile, canSaveCloud]);

  // --- Shared Data Subscription ---
  useEffect(() => {
    const groupId = userProfile?.groupId;
    if (!subscribeShared || !groupId) {
      setSharedDocs([]);
      return;
    }

    const unsub = subscribeToSharedData(groupId, (docs) => setSharedDocs(docs));
    return () => unsub?.();
  }, [subscribeShared, userProfile?.groupId]);

  // --- Auto Save (Debounce) ---
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
    userProfile?.groupId,
    canSaveCloud,
    isLoaded,
  ]);

  const actions = useMemo(
    () => ({
      setSettings,
      setMembers,
      setJobs,
      setShifts,
      setAccounts,
      setRecurring,
      setPayments,
      setTemplates,
      setShopping,
      setMyLinks,
      setLinkCategories,
      setPoints,
      setWishlist,
      setKickDialog,

      addJob: (job) => setJobs((prev) => [...prev, job]),
      updateJob: (updatedJob) =>
        setJobs((prev) => prev.map((j) => (j.id === updatedJob.id ? updatedJob : j))),
      deleteJob: (id) => setJobs((prev) => prev.filter((j) => j.id !== id)),

      addShift: (newShift, dateStr) =>
        setShifts((prev) => ({
          ...prev,
          [dateStr]: [...(prev[dateStr] || []), newShift],
        })),
      updateShiftsForDate: (dateStr, newShifts) =>
        setShifts((prev) => ({ ...prev, [dateStr]: newShifts })),

      restoreData: (importedData) => {
        if (!importedData) return;
        setSettings(importedData.settings || INITIAL_SETTINGS);
        setMembers(importedData.members || INITIAL_MEMBERS);
        setJobs(importedData.jobs || INITIAL_JOBS);
        setShifts(importedData.shifts || {});
        setAccounts(importedData.accounts || INITIAL_ACCOUNTS);
        setRecurring(importedData.recurring || INITIAL_RECURRING);
        setPayments(importedData.payments || []);
        setTemplates(importedData.templates || INITIAL_PAYMENT_TEMPLATES);
        setShopping(importedData.shopping || INITIAL_SHOPPING);
        setMyLinks(importedData.myLinks || INITIAL_MY_LINKS);
        setLinkCategories(importedData.linkCategories || LINK_CATEGORIES);
        setPoints(importedData.points || 0);
        setWishlist(importedData.wishlist || []);
      },
    }),
    []
  );

  return {
    isLoaded,
    data: {
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
      sharedDocs,
      kickDialog,
    },
    actions,
  };
};
