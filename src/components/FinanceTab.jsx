// src/components/FinanceTab.jsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  CardActions,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  ListItemIcon,
  IconButton,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Select,
  MenuItem,
  InputLabel,
  FormControl,
  Tabs,
  Tab,
  Checkbox,
  FormControlLabel,
  Chip,
  Divider,
  Grid,
} from "@mui/material";
import {
  Add,
  Edit,
  Delete,
  AccountBalance,
  CheckCircle,
  RadioButtonUnchecked,
  Loop,
  CreditCard,
  CalendarToday,
  Link as LinkIcon,
  HelpOutline,
  ListAlt,
  AccountBalanceWallet,
} from "@mui/icons-material";
import { format, subDays, setDate, parseISO } from "date-fns";
import AdSenseBanner from "./AdSenseBanner";

export default function FinanceTab({
  accounts,
  payments,
  templates,
  myLinks,
  currentDate,
  onAddAccount,
  onUpdateAccount,
  onAddPayment,
  onUpdatePayment,
  onAddTemplate,
  onDeleteTemplate,
  recurring,
  onAddRecurring,
  onUpdateRecurring,
  onDeleteRecurring,
  onUpdateBalance,
  onTogglePaid,
  onPrevMonth,
  onNextMonth,
}) {
  const [subTab, setSubTab] = useState(0);

  // モーダル
  const [openPaymentDialog, setOpenPaymentDialog] = useState(false);
  const [openCashDialog, setOpenCashDialog] = useState(false);
  const [openCreditDialog, setOpenCreditDialog] = useState(false);

  const [openRecurringDialog, setOpenRecurringDialog] = useState(false);

  // 編集用State
  const [editPayment, setEditPayment] = useState({
    id: null,
    name: "",
    amount: "",
    accountId: "",
    isRecurring: false,
    date: "",
  });
  const [editAccount, setEditAccount] = useState({
    name: "",
    type: "cash",
    balance: 0,
    billingDay: "",
    confirmationDay: "",
    paymentDay: "",
    linkId: "",
  });
  // 固定費編集用: targetPaymentId は、リストから編集した場合にその「今月の支払いデータID」を保持する
  const [editRecurring, setEditRecurring] = useState({
    id: null,
    name: "",
    amount: "",
    accountId: "",
    day: 25,
    isVariable: false,
    cycle: "every",
    linkId: "",
    targetPaymentId: null,
  });

  // スワイプ処理
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };
  const onTouchMove = (e) => setTouchEnd(e.targetTouches[0].clientX);
  const onTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    if (distance > minSwipeDistance) onNextMonth();
    if (distance < -minSwipeDistance) onPrevMonth();
  };

  // Helpers
  const currentMonthStr = format(currentDate, "yyyy-MM");
  const monthPayments = payments.filter(
    (p) => p.month === currentMonthStr && !p.isRecurring
  );
  const monthFixedCosts = payments.filter(
    (p) => p.month === currentMonthStr && p.isRecurring
  );

  const cashAccounts = accounts.filter((a) => a.type !== "credit");
  const creditAccounts = accounts.filter((a) => a.type === "credit");

  const getAccountIcon = (accId) => {
    const acc = accounts.find((a) => a.id === accId);
    if (!acc) return <HelpOutline fontSize="small" color="disabled" />;
    return acc.type === "credit" ? (
      <CreditCard fontSize="small" color="primary" />
    ) : (
      <AccountBalanceWallet fontSize="small" color="success" />
    );
  };

  // Handlers
  const handleOpenAddPayment = () => {
    // ★修正: 初期値として今日の日付を設定
    setEditPayment({
      id: null,
      name: "",
      amount: "",
      accountId: accounts[0]?.id || "",
      isRecurring: false,
      date: format(new Date(), "yyyy-MM-dd"),
    });
    setOpenPaymentDialog(true);
  };

  const handleSavePayment = () => {
    if (editPayment.name && editPayment.amount && editPayment.accountId) {
      // 日付が空欄の場合は今日を入れる（念のため）
      const paymentDate = editPayment.date || format(new Date(), "yyyy-MM-dd");
      const payData = {
        ...editPayment,
        amount: parseInt(editPayment.amount),
        date: paymentDate,
        month: paymentDate.slice(0, 7),
      };
      if (editPayment.id) onUpdatePayment(payData);
      else onAddPayment(payData);
      setOpenPaymentDialog(false);
    }
  };

  // 固定費リストから編集ボタンを押した時の処理
  const handleEditFixedCost = (paymentItem) => {
    // 親の固定費設定を探す
    const recDef = recurring.find((r) => r.id === paymentItem.recurringId);
    if (!recDef) {
      alert("元の設定が見つかりませんでした");
      return;
    }
    // 固定費設定の内容でダイアログを開く
    setEditRecurring({
      ...recDef,
      amount: recDef.amount || paymentItem.amount, // 設定に金額がなければ今の金額
      targetPaymentId: paymentItem.id, // ★今月のこの支払いを更新するためにIDを控える
    });
    setOpenRecurringDialog(true);
  };

  const handleSaveRecurring = () => {
    if (editRecurring.name && editRecurring.accountId) {
      const amountVal = editRecurring.amount
        ? parseInt(editRecurring.amount)
        : 0;
      const recId = editRecurring.id || Date.now().toString();

      const recData = {
        id: recId,
        name: editRecurring.name,
        amount: amountVal,
        accountId: editRecurring.accountId,
        day: parseInt(editRecurring.day),
        isVariable: editRecurring.isVariable,
        cycle: editRecurring.cycle,
        linkId: editRecurring.linkId,
      };

      if (editRecurring.id) {
        // --- 更新 ---
        onUpdateRecurring(recData);

        // ★リストから編集した場合(targetPaymentIdあり)、今月の支払いデータも更新する
        if (editRecurring.targetPaymentId) {
          const targetPayment = payments.find(
            (p) => p.id === editRecurring.targetPaymentId
          );
          if (targetPayment) {
            // 新しい支払日を計算 (今月の年・月 + 新しい設定日)
            // ※日付が無効(例えば2月30日)の場合の厳密な処理は date-fns/setDate がよしなに処理する(翌月1日等)が、ここでは簡易的に設定
            const currentPaymentDate = new Date(targetPayment.date);
            const newDate = setDate(currentPaymentDate, recData.day);

            const updatedPayment = {
              ...targetPayment,
              name: recData.name,
              amount: amountVal, // 設定金額で上書き
              accountId: recData.accountId,
              date: format(newDate, "yyyy-MM-dd"),
              // monthは変えない
            };
            onUpdatePayment(updatedPayment);
          }
        }
      } else {
        // --- 新規追加 ---
        onAddRecurring(recData);

        // 新規追加時も即座に今月分のリストに表示させる
        const targetDate = setDate(currentDate, recData.day);
        const paymentData = {
          id: Date.now() + Math.random(),
          recurringId: recId,
          name: recData.name,
          amount: recData.amount,
          accountId: recData.accountId,
          isRecurring: true,
          date: format(targetDate, "yyyy-MM-dd"),
          month: format(currentDate, "yyyy-MM"),
          paid: false,
        };
        onAddPayment(paymentData);
      }
      setOpenRecurringDialog(false);
    }
  };

  const handleSaveAccount = (closeFunc) => {
    if (editAccount.name) {
      const accData = {
        ...editAccount,
        id: editAccount.id || Date.now(),
        balance: parseInt(editAccount.balance || 0),
        billingDay: parseInt(editAccount.billingDay || 0),
        confirmationDay: parseInt(editAccount.confirmationDay || 0),
        paymentDay: parseInt(editAccount.paymentDay || 0),
      };
      if (editAccount.id) onUpdateAccount(accData);
      else onAddAccount(accData);
      closeFunc(false);
    }
  };

  const handleOpenLink = (linkId) => {
    const link = myLinks.find((l) => l.id === linkId);
    if (link) window.open(link.url, "_blank");
  };

  return (
    <Box
      sx={{ pb: 15 }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
    >
      <Tabs
        value={subTab}
        onChange={(e, v) => setSubTab(v)}
        variant="fullWidth"
        sx={{ mb: 2, borderBottom: 1, borderColor: "divider" }}
      >
        <Tab icon={<ListAlt />} label="収支" />
        <Tab icon={<Loop />} label="固定費" />
        <Tab icon={<AccountBalance />} label="資産" />
        <Tab icon={<CreditCard />} label="カード" />
      </Tabs>

      {/* 1. 収支タブ */}
      {subTab === 0 && (
        <Box>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                }}
              >
                <Typography variant="h6">
                  {format(currentDate, "M月")}の出費
                </Typography>
                <Button
                  startIcon={<Add />}
                  variant="contained"
                  size="small"
                  onClick={handleOpenAddPayment}
                >
                  記録
                </Button>
              </Box>
              <Divider sx={{ my: 1 }} />
              <List dense>
                {monthPayments.map((p) => (
                  <ListItem
                    key={p.id}
                    secondaryAction={
                      <IconButton edge="end" onClick={() => onTogglePaid(p.id)}>
                        {p.paid ? (
                          <CheckCircle color="success" />
                        ) : (
                          <RadioButtonUnchecked />
                        )}
                      </IconButton>
                    }
                  >
                    <ListItemIcon sx={{ minWidth: 36 }}>
                      {getAccountIcon(p.accountId)}
                    </ListItemIcon>
                    <ListItemText
                      primary={p.name}
                      secondary={
                        <>
                          {p.date && (
                            <Typography
                              variant="caption"
                              component="span"
                              sx={{ mr: 1 }}
                            >
                              {format(new Date(p.date), "M/d")}
                            </Typography>
                          )}
                          {`¥${p.amount.toLocaleString()}`}
                        </>
                      }
                    />
                  </ListItem>
                ))}
                {monthPayments.length === 0 && (
                  <Typography
                    variant="body2"
                    color="textSecondary"
                    align="center"
                    sx={{ py: 2 }}
                  >
                    記録がありません
                  </Typography>
                )}
              </List>
            </CardContent>
          </Card>
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {templates.map((t) => (
              <Chip
                key={t.id}
                label={t.name}
                onClick={() => {
                  setEditPayment({
                    id: null,
                    name: t.name,
                    amount: "",
                    accountId: t.accountId || accounts[0]?.id || "",
                    isRecurring: false,
                    date: format(new Date(), "yyyy-MM-dd"),
                  });
                  setOpenPaymentDialog(true);
                }}
                onDelete={() => onDeleteTemplate(t.id)}
              />
            ))}
            <Chip
              icon={<Add />}
              label="テンプレ登録"
              variant="outlined"
              onClick={() => {
                const name = prompt("テンプレート名");
                if (name) onAddTemplate(name);
              }}
            />
          </Box>
        </Box>
      )}

      {/* 2. 固定費タブ */}
      {subTab === 1 && (
        <Box>
          <Box sx={{ display: "flex", justifyContent: "space-between", mb: 2 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: "bold" }}>
              {format(currentDate, "M月")}の固定費
            </Typography>
            <Button
              startIcon={<Add />}
              size="small"
              variant="outlined"
              onClick={() => {
                setEditRecurring({
                  id: null,
                  name: "",
                  amount: "",
                  accountId: accounts[0]?.id,
                  day: 25,
                  isVariable: false,
                  cycle: "every",
                  linkId: "",
                  targetPaymentId: null,
                });
                setOpenRecurringDialog(true);
              }}
            >
              設定追加
            </Button>
          </Box>
          <List>
            {monthFixedCosts.map((item) => {
              const recDef = recurring.find((r) => r.id === item.recurringId);
              const linkId = recDef?.linkId;
              return (
                <ListItem
                  key={item.id}
                  sx={{
                    bgcolor: "white",
                    mb: 1,
                    borderRadius: 1,
                    boxShadow: 1,
                  }}
                  // ★修正: 編集ボタンで詳細な編集ダイアログを開くように変更
                  secondaryAction={
                    <IconButton
                      size="small"
                      onClick={() => handleEditFixedCost(item)}
                    >
                      <Edit fontSize="small" />
                    </IconButton>
                  }
                >
                  <ListItemIcon>{getAccountIcon(item.accountId)}</ListItemIcon>
                  <ListItemText
                    primary={
                      <Box sx={{ display: "flex", alignItems: "center" }}>
                        {item.name}
                        {linkId && (
                          <IconButton
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenLink(linkId);
                            }}
                          >
                            <LinkIcon fontSize="inherit" />
                          </IconButton>
                        )}
                      </Box>
                    }
                    secondary={
                      item.amount === 0 ? (
                        <Typography color="error" variant="caption">
                          金額未入力
                        </Typography>
                      ) : (
                        `¥${item.amount.toLocaleString()}`
                      )
                    }
                  />
                </ListItem>
              );
            })}
            {monthFixedCosts.length === 0 && (
              <Typography variant="body2" align="center" color="textSecondary">
                この月の固定費はありません
              </Typography>
            )}
          </List>
          <Typography
            variant="caption"
            display="block"
            align="center"
            sx={{ mt: 2, color: "gray" }}
          >
            ※鉛筆マークを押すと、設定（金額・支払元・日付・Link）を変更できます。
            <br />
            変更は当月分および今後の自動生成分に反映されます。
          </Typography>
        </Box>
      )}

      {/* 3. 資産タブ */}
      {subTab === 2 && (
        <Box>
          <Button
            fullWidth
            startIcon={<Add />}
            variant="outlined"
            sx={{ mb: 2 }}
            onClick={() => {
              setEditAccount({
                name: "",
                type: "cash",
                balance: 0,
                linkId: "",
              });
              setOpenCashDialog(true);
            }}
          >
            銀行口座・財布を追加
          </Button>
          <Grid container spacing={2}>
            {cashAccounts.map((acc) => {
              const accPayments = [...monthPayments, ...monthFixedCosts].filter(
                (p) => p.accountId === acc.id
              );
              const totalOut = accPayments.reduce(
                (sum, p) => sum + p.amount,
                0
              );
              return (
                <Grid item xs={12} key={acc.id}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <AccountBalanceWallet
                            sx={{ mr: 1, color: "green" }}
                          />
                          <Box ml={1}>
                            <Typography variant="subtitle1">
                              {acc.name}
                            </Typography>
                            {acc.linkId && (
                              <Button
                                size="small"
                                startIcon={<LinkIcon />}
                                onClick={() => handleOpenLink(acc.linkId)}
                                sx={{ p: 0, minWidth: 0 }}
                              >
                                サイトを開く
                              </Button>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="h6">
                            ¥{acc.balance.toLocaleString()}
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditAccount(acc);
                              setOpenCashDialog(true);
                            }}
                          >
                            編集
                          </Button>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          mt: 1,
                          bgcolor: "#f9f9f9",
                          p: 1,
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="caption" display="block">
                          {format(currentDate, "M月")}の利用: ¥
                          {totalOut.toLocaleString()}
                        </Typography>
                        {accPayments.length > 0 && (
                          <List dense disablePadding>
                            {accPayments.map((p) => (
                              <ListItem
                                key={p.id}
                                disablePadding
                                sx={{ pl: 1 }}
                              >
                                <ListItemText
                                  primary={p.name}
                                  secondary={`¥${p.amount}`}
                                  primaryTypographyProps={{ fontSize: 12 }}
                                  secondaryTypographyProps={{ fontSize: 11 }}
                                />
                              </ListItem>
                            ))}
                          </List>
                        )}
                      </Box>
                    </CardContent>
                    <CardActions sx={{ justifyContent: "flex-end", pt: 0 }}>
                      <Button
                        size="small"
                        onClick={() => {
                          const val = prompt("現在の残高を入力", acc.balance);
                          if (val !== null) onUpdateBalance(acc.id, val);
                        }}
                      >
                        残高修正
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* 4. カードタブ */}
      {subTab === 3 && (
        <Box>
          <Button
            fullWidth
            startIcon={<Add />}
            variant="outlined"
            sx={{ mb: 2 }}
            onClick={() => {
              setEditAccount({
                name: "",
                type: "credit",
                balance: 0,
                linkId: "",
                billingDay: "",
                confirmationDay: "",
                paymentDay: "",
              });
              setOpenCreditDialog(true);
            }}
          >
            クレジットカードを追加
          </Button>
          <Grid container spacing={2}>
            {creditAccounts.map((acc) => {
              const accPayments = [...monthPayments, ...monthFixedCosts].filter(
                (p) => p.accountId === acc.id
              );
              const totalOut = accPayments.reduce(
                (sum, p) => sum + p.amount,
                0
              );
              return (
                <Grid item xs={12} key={acc.id}>
                  <Card>
                    <CardContent>
                      <Box
                        sx={{
                          display: "flex",
                          justifyContent: "space-between",
                          alignItems: "center",
                          mb: 1,
                        }}
                      >
                        <Box sx={{ display: "flex", alignItems: "center" }}>
                          <CreditCard sx={{ mr: 1, color: "blue" }} />
                          <Box ml={1}>
                            <Typography variant="subtitle1">
                              {acc.name}
                            </Typography>
                            {acc.linkId && (
                              <Button
                                size="small"
                                startIcon={<LinkIcon />}
                                onClick={() => handleOpenLink(acc.linkId)}
                                sx={{ p: 0, minWidth: 0 }}
                              >
                                明細を開く
                              </Button>
                            )}
                          </Box>
                        </Box>
                        <Box sx={{ textAlign: "right" }}>
                          <Typography variant="h6" color="error">
                            ¥{acc.balance.toLocaleString()}
                          </Typography>
                          <Button
                            size="small"
                            onClick={() => {
                              setEditAccount(acc);
                              setOpenCreditDialog(true);
                            }}
                          >
                            編集
                          </Button>
                        </Box>
                      </Box>
                      <Box
                        sx={{
                          display: "flex",
                          gap: 1,
                          fontSize: 12,
                          color: "text.secondary",
                          bgcolor: "#f5f5f5",
                          p: 1,
                          borderRadius: 1,
                          mb: 1,
                        }}
                      >
                        <Box>〆日:{acc.billingDay || "-"}</Box>
                        <Box>確定:{acc.confirmationDay || "-"}</Box>
                        <Box>引落:{acc.paymentDay || "-"}</Box>
                      </Box>
                      <Box
                        sx={{
                          bgcolor: "#fff",
                          border: "1px solid #eee",
                          p: 1,
                          borderRadius: 1,
                        }}
                      >
                        <Typography variant="caption" fontWeight="bold">
                          {format(currentDate, "M月")}の利用 (¥
                          {totalOut.toLocaleString()})
                        </Typography>
                        <List dense disablePadding>
                          {accPayments.map((p) => (
                            <ListItem key={p.id} disablePadding>
                              <ListItemText
                                primary={p.name}
                                secondary={`¥${p.amount}`}
                                sx={{ m: 0 }}
                                primaryTypographyProps={{ fontSize: 12 }}
                              />
                            </ListItem>
                          ))}
                          {accPayments.length === 0 && (
                            <Typography variant="caption" display="block">
                              利用なし
                            </Typography>
                          )}
                        </List>
                      </Box>
                    </CardContent>
                    <CardActions sx={{ justifyContent: "flex-end", pt: 0 }}>
                      <Button
                        size="small"
                        color="primary"
                        variant="contained"
                        onClick={() => {
                          const val = prompt(
                            `${acc.name}の確定した請求額を入力してください`,
                            acc.balance
                          );
                          if (val !== null) onUpdateBalance(acc.id, val);
                        }}
                      >
                        確定額を入力
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              );
            })}
          </Grid>
        </Box>
      )}

      {/* 支払いダイアログ */}
      <Dialog
        open={openPaymentDialog}
        onClose={() => setOpenPaymentDialog(false)}
      >
        <DialogTitle>出費を記録</DialogTitle>
        <DialogContent>
          <Box sx={{ display: "flex", gap: 1, mb: 2 }}>
            <Button
              variant="outlined"
              size="small"
              onClick={() =>
                setEditPayment({
                  ...editPayment,
                  date: format(new Date(), "yyyy-MM-dd"),
                })
              }
            >
              今日
            </Button>
            <Button
              variant="outlined"
              size="small"
              onClickÍÍ={() =>
                setEditPayment({
                  ...editPayment,
                  date: format(subDays(new Date(), 1), "yyyy-MM-dd"),
                })
              }
            >
              昨日
            </Button>
            <TextField
              type="date"
              size="small"
              value={editPayment.date}
              onChange={(e) =>
                setEditPayment({ ...editPayment, date: e.target.value })
              }
            />
          </Box>
          <TextField
            label="項目名"
            fullWidth
            margin="dense"
            value={editPayment.name}
            onChange={(e) =>
              setEditPayment({ ...editPayment, name: e.target.value })
            }
          />
          <TextField
            label="金額"
            type="number"
            fullWidth
            margin="dense"
            value={editPayment.amount}
            onChange={(e) =>
              setEditPayment({ ...editPayment, amount: e.target.value })
            }
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>支払元</InputLabel>
            <Select
              value={editPayment.accountId}
              label="支払元"
              onChange={(e) =>
                setEditPayment({ ...editPayment, accountId: e.target.value })
              }
            >
              {accounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenPaymentDialog(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSavePayment} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      {/* 固定費編集ダイアログ */}
      <Dialog
        open={openRecurringDialog}
        onClose={() => setOpenRecurringDialog(false)}
      >
        <DialogTitle>
          {editRecurring.id ? "固定費を編集" : "固定費を追加"}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="項目名"
            fullWidth
            margin="dense"
            value={editRecurring.name}
            onChange={(e) =>
              setEditRecurring({ ...editRecurring, name: e.target.value })
            }
          />
          <FormControlLabel
            control={
              <Checkbox
                checked={editRecurring.isVariable}
                onChange={(e) =>
                  setEditRecurring({
                    ...editRecurring,
                    isVariable: e.target.checked,
                  })
                }
              />
            }
            label="金額は毎月変動する"
            sx={{ mt: 1, mb: 1, display: "block" }}
          />
          <TextField
            label="設定金額"
            type="number"
            fullWidth
            margin="dense"
            value={editRecurring.amount}
            onChange={(e) =>
              setEditRecurring({ ...editRecurring, amount: e.target.value })
            }
            helperText={
              editRecurring.targetPaymentId
                ? "※今月分と将来の自動生成分に反映されます"
                : ""
            }
          />
          <Grid container spacing={2} sx={{ mt: 0 }}>
            <Grid item xs={6}>
              <TextField
                label="支払日"
                type="number"
                fullWidth
                value={editRecurring.day}
                onChange={(e) =>
                  setEditRecurring({
                    ...editRecurring,
                    day: parseInt(e.target.value),
                  })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth>
                <InputLabel>サイクル</InputLabel>
                <Select
                  value={editRecurring.cycle}
                  label="サイクル"
                  onChange={(e) =>
                    setEditRecurring({
                      ...editRecurring,
                      cycle: e.target.value,
                    })
                  }
                >
                  <MenuItem value="every">毎月</MenuItem>
                  <MenuItem value="odd">奇数月</MenuItem>
                  <MenuItem value="even">偶数月</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
          <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
            <InputLabel>支払元</InputLabel>
            <Select
              value={editRecurring.accountId}
              label="支払元"
              onChange={(e) =>
                setEditRecurring({
                  ...editRecurring,
                  accountId: e.target.value,
                })
              }
            >
              {accounts.map((a) => (
                <MenuItem key={a.id} value={a.id}>
                  {a.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
            <InputLabel>My Link (明細確認用)</InputLabel>
            <Select
              value={editRecurring.linkId || ""}
              label="My Link (明細確認用)"
              onChange={(e) =>
                setEditRecurring({ ...editRecurring, linkId: e.target.value })
              }
            >
              <MenuItem value="">
                <em>なし</em>
              </MenuItem>
              {myLinks.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenRecurringDialog(false)}>
            キャンセル
          </Button>
          <Button onClick={handleSaveRecurring} variant="contained">
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog open={openCashDialog} onClose={() => setOpenCashDialog(false)}>
        <DialogTitle>
          {editAccount.id ? "編集" : "銀行口座・財布を追加"}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="名称"
            fullWidth
            margin="dense"
            value={editAccount.name}
            onChange={(e) =>
              setEditAccount({ ...editAccount, name: e.target.value })
            }
          />
          <TextField
            label="現在の残高"
            type="number"
            fullWidth
            margin="dense"
            value={editAccount.balance}
            onChange={(e) =>
              setEditAccount({ ...editAccount, balance: e.target.value })
            }
          />
          <FormControl fullWidth margin="dense">
            <InputLabel>My Link</InputLabel>
            <Select
              value={editAccount.linkId || ""}
              label="My Link"
              onChange={(e) =>
                setEditAccount({ ...editAccount, linkId: e.target.value })
              }
            >
              <MenuItem value="">
                <em>なし</em>
              </MenuItem>
              {myLinks.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCashDialog(false)}>キャンセル</Button>
          <Button
            onClick={() => handleSaveAccount(setOpenCashDialog)}
            variant="contained"
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>

      <Dialog
        open={openCreditDialog}
        onClose={() => setOpenCreditDialog(false)}
      >
        <DialogTitle>
          {editAccount.id ? "編集" : "クレジットカードを追加"}
        </DialogTitle>
        <DialogContent>
          <TextField
            label="名称"
            fullWidth
            margin="dense"
            value={editAccount.name}
            onChange={(e) =>
              setEditAccount({ ...editAccount, name: e.target.value })
            }
          />
          <TextField
            label="現在の利用残高 (マイナス入力)"
            type="number"
            fullWidth
            margin="dense"
            value={editAccount.balance}
            onChange={(e) =>
              setEditAccount({ ...editAccount, balance: e.target.value })
            }
            helperText="支払うべき金額を入力してください"
          />
          <Box sx={{ display: "flex", gap: 2, mt: 1, flexWrap: "wrap" }}>
            <TextField
              label="締め日"
              type="number"
              sx={{ width: "30%" }}
              value={editAccount.billingDay}
              onChange={(e) =>
                setEditAccount({ ...editAccount, billingDay: e.target.value })
              }
            />
            <TextField
              label="確定日"
              type="number"
              sx={{ width: "30%" }}
              value={editAccount.confirmationDay}
              onChange={(e) =>
                setEditAccount({
                  ...editAccount,
                  confirmationDay: e.target.value,
                })
              }
            />
            <TextField
              label="引落日"
              type="number"
              sx={{ width: "30%" }}
              value={editAccount.paymentDay}
              onChange={(e) =>
                setEditAccount({ ...editAccount, paymentDay: e.target.value })
              }
            />
          </Box>
          <FormControl fullWidth margin="dense" sx={{ mt: 2 }}>
            <InputLabel>My Link</InputLabel>
            <Select
              value={editAccount.linkId || ""}
              label="My Link"
              onChange={(e) =>
                setEditAccount({ ...editAccount, linkId: e.target.value })
              }
            >
              <MenuItem value="">
                <em>なし</em>
              </MenuItem>
              {myLinks.map((l) => (
                <MenuItem key={l.id} value={l.id}>
                  {l.title}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenCreditDialog(false)}>キャンセル</Button>
          <Button
            onClick={() => handleSaveAccount(setOpenCreditDialog)}
            variant="contained"
          >
            保存
          </Button>
        </DialogActions>
      </Dialog>
      <AdSenseBanner
        clientId="ca-pub-2913122779764758" // ★あなたのパブリッシャーIDを入れてください
        slotId="5440394824" // ★広告ユニットIDを入れてください
      />
    </Box>
  );
}
