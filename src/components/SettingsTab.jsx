// src/components/SettingsTab.jsx
import React, { useState } from "react";
import {
  Box,
  Typography,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction,
  IconButton,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Divider,
  Grid,
  Switch,
  FormControlLabel,
  InputAdornment,
  useTheme,
  RadioGroup,
  Radio,
  CircularProgress,
  Alert,
} from "@mui/material";
import {
  Edit,
  Delete,
  Add,
  ContentCopy,
  PersonRemove,
  Group,
  PersonAdd,
  MyLocation,
  Map,
} from "@mui/icons-material";
import { useAuth } from "../AuthContext";
import { PREFECTURES } from "../data";

export default function SettingsTab({
  jobs,
  settings,
  members,
  onAddJob,
  onUpdateJob,
  onDeleteJob,
  onUpdateSettings,
  onGenerateRange,
  onDeleteRange,
  onUpdateMembers,
  onEditJobRequest,
  onAddJobRequest,
  sharedDocs,
}) {
  // isPremium を忘れずに取得
  const {
    userProfile,
    kickMember,
    canShareGroup,
    isOwner,
    createGroup,
    isPremium,
  } = useAuth();

  const theme = useTheme();
  const isDark = theme.palette.mode === "dark";

  const [rangeStart, setRangeStart] = useState("");
  const [rangeEnd, setRangeEnd] = useState("");
  const [selectedRangeJob, setSelectedRangeJob] = useState("");
  const [newMemberName, setNewMemberName] = useState("");

  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(null);

  const handleRangeSubmit = () => {
    if (!rangeStart || !rangeEnd || !selectedRangeJob) {
      alert("期間と仕事を選択してください");
      return;
    }
    onGenerateRange(rangeStart, rangeEnd, selectedRangeJob);
  };

  const handleRangeDelete = () => {
    if (!rangeStart || !rangeEnd || !selectedRangeJob) return;
    if (window.confirm("本当に削除しますか？"))
      onDeleteRange(rangeStart, rangeEnd, selectedRangeJob);
  };

  const handleAddMember = () => {
    if (!newMemberName) return;
    const newMember = {
      id: Date.now().toString(),
      name: newMemberName,
      color: "#" + Math.floor(Math.random() * 16777215).toString(16),
    };
    onUpdateMembers([...members, newMember]);
    setNewMemberName("");
  };

  const handleEditMember = (member) => {
    const newName = prompt("メンバー名を変更", member.name);
    if (newName && newName !== member.name) {
      onUpdateMembers(
        members.map((m) => (m.id === member.id ? { ...m, name: newName } : m))
      );
    }
  };

  const handleDeleteMember = (id) => {
    if (id === "me") {
      alert("「自分」は削除できません。");
      return;
    }
    if (window.confirm("削除しますか？")) {
      onUpdateMembers(members.filter((m) => m.id !== id));
    }
  };

  const handlePrivacyChange = (key) => {
    const currentPrivacy = settings.privacy || {
      shifts: false,
      finance: false,
      shopping: false,
    };
    onUpdateSettings({
      ...settings,
      privacy: { ...currentPrivacy, [key]: !currentPrivacy[key] },
    });
  };

  const handleCopyInvite = () => {
    if (!userProfile?.groupId) return;
    const url = `${window.location.origin}?invite=${userProfile.groupId}`;
    navigator.clipboard.writeText(url);
    alert("招待リンクをコピーしました");
  };

  const handleCreateGroup = async () => {
    if (window.confirm("新しい共有グループを作成しますか？")) {
      await createGroup();
      alert("グループを作成しました。招待リンクをパートナーに送ってください。");
    }
  };

  const handleWeatherModeChange = (e) => {
    const mode = e.target.value;
    if (mode === "gps" && !isPremium) {
      alert("GPS機能はプレミアム会員限定です");
      return;
    }
    onUpdateSettings({ ...settings, weatherMode: mode });
  };

  const handlePrefectureChange = (e) => {
    const prefName = e.target.value;
    const pref = PREFECTURES.find((p) => p.name === prefName);
    if (pref) {
      onUpdateSettings({
        ...settings,
        weatherMode: "manual",
        location: { name: pref.name, lat: pref.lat, lon: pref.lon },
      });
    }
  };

  const handleGetGps = () => {
    if (!navigator.geolocation) {
      setGpsError("この端末ではGPSが使えません");
      return;
    }
    setGpsLoading(true);
    setGpsError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        onUpdateSettings({
          ...settings,
          weatherMode: "gps",
          location: { name: "現在地周辺", lat: latitude, lon: longitude },
        });
        setGpsLoading(false);
      },
      (err) => {
        console.error(err);
        setGpsError("位置情報の取得に失敗しました");
        setGpsLoading(false);
      },
      { timeout: 10000 }
    );
  };

  const planName =
    userProfile?.plan === "family"
      ? "ファミリー"
      : userProfile?.plan === "couple"
      ? "カップル"
      : "無料";
  const maxMembers =
    userProfile?.plan === "family" ? 4 : userProfile?.plan === "couple" ? 2 : 1;
  const currentMemberCount = (sharedDocs?.length || 0) + 1;

  const sharedCardBg = isDark ? "rgba(255, 255, 255, 0.05)" : "#f0f4ff";

  const currentMode = settings.weatherMode || "manual";
  const currentLocationName = settings.location?.name || "未設定";

  return (
    <Box sx={{ pb: 4 }}>
      {/* 1. 一括登録 (頻度: 高) */}
      <Typography variant="h6" gutterBottom>
        📅 シフト一括登録/削除
      </Typography>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <Grid container spacing={2} sx={{ mt: 1 }}>
            <Grid item xs={6}>
              <TextField
                label="開始"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                autoComplete="off"
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="終了"
                type="date"
                fullWidth
                InputLabelProps={{ shrink: true }}
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                autoComplete="off"
              />
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>対象の仕事</InputLabel>
                <Select
                  value={selectedRangeJob}
                  label="対象の仕事"
                  onChange={(e) => setSelectedRangeJob(e.target.value)}
                >
                  {jobs.map((j) => (
                    <MenuItem key={j.id} value={j.id}>
                      {j.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <Button variant="contained" fullWidth onClick={handleRangeSubmit}>
                一括登録
              </Button>
            </Grid>
            <Grid item xs={6}>
              <Button
                variant="outlined"
                color="error"
                fullWidth
                onClick={handleRangeDelete}
              >
                一括削除
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 2. 仕事の設定 (頻度: 中) */}
      <Typography variant="h6" gutterBottom>
        ⚙️ 仕事の設定
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <List>
            {jobs.map((job) => {
              const ownerName =
                members.find((m) => m.id === job.memberId)?.name || "自分";
              return (
                <React.Fragment key={job.id}>
                  <ListItem>
                    <ListItemText
                      primary={
                        <Box
                          sx={{ display: "flex", alignItems: "center", gap: 1 }}
                        >
                          <Box
                            sx={{
                              width: 12,
                              height: 12,
                              borderRadius: "50%",
                              bgcolor: job.color,
                            }}
                          />
                          <Typography fontWeight="bold">{job.name}</Typography>
                          <Chip
                            label={ownerName}
                            size="small"
                            variant="outlined"
                            sx={{ height: 20, fontSize: "0.6rem" }}
                          />
                        </Box>
                      }
                      secondary={
                        job.type === "monthly"
                          ? `月給 ¥${(job.monthlySalary || 0).toLocaleString()}`
                          : `${job.type === "hourly" ? "時給" : "日給"}: ¥${
                              job.value
                            }`
                      }
                    />
                    <ListItemSecondaryAction>
                      <IconButton onClick={() => onEditJobRequest(job)}>
                        <Edit />
                      </IconButton>
                      <IconButton onClick={() => onDeleteJob(job.id)}>
                        <Delete />
                      </IconButton>
                    </ListItemSecondaryAction>
                  </ListItem>
                  <Divider />
                </React.Fragment>
              );
            })}
          </List>
          <Button
            startIcon={<Add />}
            fullWidth
            variant="outlined"
            onClick={() => onAddJobRequest()}
          >
            新しい仕事を追加
          </Button>
        </CardContent>
      </Card>

      {/* 3. メンバー設定 */}
      <Typography variant="h6" gutterBottom>
        👥 メンバー設定
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <List dense>
            {members.map((member) => (
              <ListItem key={member.id}>
                <Box
                  sx={{
                    mr: 2,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    width: 30,
                    height: 30,
                    borderRadius: "50%",
                    bgcolor: member.color || "#ccc",
                    color: "#fff",
                    fontWeight: "bold",
                  }}
                >
                  {member.name.charAt(0)}
                </Box>
                <ListItemText
                  primary={member.name}
                  secondary={member.id === "me" ? "デフォルト" : ""}
                />
                <ListItemSecondaryAction>
                  <IconButton onClick={() => handleEditMember(member)}>
                    <Edit />
                  </IconButton>
                  <IconButton
                    onClick={() => handleDeleteMember(member.id)}
                    disabled={member.id === "me"}
                  >
                    <Delete />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
          <Divider sx={{ my: 2 }} />
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              label="新しいメンバー名"
              size="small"
              fullWidth
              value={newMemberName}
              onChange={(e) => setNewMemberName(e.target.value)}
            />
            <Button
              variant="contained"
              onClick={handleAddMember}
              disabled={!newMemberName}
            >
              追加
            </Button>
          </Box>
        </CardContent>
      </Card>

      {/* 4. 扶養・目標設定 */}
      <Typography variant="h6" gutterBottom>
        🎯 扶養・目標設定
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <Typography variant="body2" color="textSecondary" gutterBottom>
                年収の計算対象とするメンバーと目標額（扶養上限など）を設定します。
              </Typography>
            </Grid>
            <Grid item xs={6}>
              <FormControl fullWidth size="small">
                <InputLabel>対象メンバー</InputLabel>
                <Select
                  value={settings.targetMemberId || "me"}
                  label="対象メンバー"
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      targetMemberId: e.target.value,
                    })
                  }
                >
                  {members.map((m) => (
                    <MenuItem key={m.id} value={m.id}>
                      {m.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6}>
              <TextField
                label="目標金額"
                type="number"
                size="small"
                fullWidth
                value={settings.targetLimit || ""}
                onChange={(e) =>
                  onUpdateSettings({
                    ...settings,
                    targetLimit: parseInt(e.target.value),
                  })
                }
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">¥</InputAdornment>
                  ),
                }}
              />
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* ★ここに移動: 天気予報の地域 */}
      <Typography variant="h6" gutterBottom>
        🌤️ 天気予報の地域
      </Typography>
      <Card sx={{ mb: 4 }}>
        <CardContent>
          <FormControl component="fieldset">
            <RadioGroup
              row
              value={currentMode}
              onChange={handleWeatherModeChange}
            >
              <FormControlLabel
                value="manual"
                control={<Radio />}
                label="都道府県を選択"
              />
              <FormControlLabel
                value="gps"
                disabled={!isPremium}
                control={<Radio />}
                label={
                  <Box sx={{ display: "flex", alignItems: "center" }}>
                    GPS (現在地)
                    {!isPremium && (
                      <Chip
                        label="Premium"
                        size="small"
                        color="warning"
                        sx={{ ml: 1, height: 16, fontSize: "0.6rem" }}
                      />
                    )}
                  </Box>
                }
              />
            </RadioGroup>
          </FormControl>

          <Divider sx={{ my: 2 }} />

          {currentMode === "manual" ? (
            <FormControl fullWidth>
              <InputLabel>都道府県</InputLabel>
              <Select
                value={
                  PREFECTURES.some((p) => p.name === currentLocationName)
                    ? currentLocationName
                    : ""
                }
                label="都道府県"
                onChange={handlePrefectureChange}
                startAdornment={
                  <InputAdornment position="start">
                    <Map color="action" />
                  </InputAdornment>
                }
              >
                {PREFECTURES.map((pref) => (
                  <MenuItem key={pref.name} value={pref.name}>
                    {pref.name}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          ) : (
            <Box>
              <Typography variant="body2" gutterBottom>
                現在の設定: <b>{currentLocationName}</b>
              </Typography>
              <Button
                variant="contained"
                fullWidth
                startIcon={
                  gpsLoading ? (
                    <CircularProgress size={20} color="inherit" />
                  ) : (
                    <MyLocation />
                  )
                }
                onClick={handleGetGps}
                disabled={gpsLoading}
              >
                現在地を取得して更新
              </Button>
              {gpsError && (
                <Alert severity="error" sx={{ mt: 1 }}>
                  {gpsError}
                </Alert>
              )}
              <Typography
                variant="caption"
                color="textSecondary"
                sx={{ mt: 1, display: "block" }}
              >
                ※半径約10km圏内の天気予報エリアに自動設定されます。
              </Typography>
            </Box>
          )}
        </CardContent>
      </Card>

      {/* 6. テーマ設定 */}
      <Typography variant="h6" gutterBottom>
        🎨 デザインテーマ
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <FormControl fullWidth size="small">
            <InputLabel>アプリの見た目</InputLabel>
            <Select
              value={settings.theme || "light"}
              label="アプリの見た目"
              onChange={(e) =>
                onUpdateSettings({
                  ...settings,
                  theme: e.target.value,
                })
              }
            >
              <MenuItem value="light">☀️ 標準 (ライト)</MenuItem>
              <MenuItem value="dark">🌙 ダークモード</MenuItem>
              <MenuItem value="neon">🚀 Unif1 Neon (サイバー)</MenuItem>
            </Select>
          </FormControl>
          {settings.theme === "neon" && (
            <Typography
              variant="caption"
              sx={{ mt: 1, display: "block", color: "#00e676" }}
            >
              Welcome to Unif1 World. 視認性を確保しつつ、没入感を提供します。
            </Typography>
          )}
        </CardContent>
      </Card>

      {/* 7. 計算・表示設定 */}
      <Typography variant="h6" gutterBottom>
        🧮 計算・表示設定
      </Typography>
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>現在の金額のカウント方法</InputLabel>
                <Select
                  value={settings.calcTiming || "realtime"}
                  label="現在の金額のカウント方法"
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      calcTiming: e.target.value,
                    })
                  }
                >
                  <MenuItem value="realtime">リアルタイム (分単位)</MenuItem>
                  <MenuItem value="end_of_work">
                    仕事が終わったらカウント
                  </MenuItem>
                  <MenuItem value="start_of_day">
                    日付が変わったらカウント
                  </MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12}>
              <FormControl fullWidth size="small">
                <InputLabel>確定金額の基準月</InputLabel>
                <Select
                  value={settings.transferBase || "next_month"}
                  label="確定金額の基準月"
                  onChange={(e) =>
                    onUpdateSettings({
                      ...settings,
                      transferBase: e.target.value,
                    })
                  }
                >
                  <MenuItem value="next_month">翌月振込ベース (推奨)</MenuItem>
                  <MenuItem value="current_month">当月振込ベース</MenuItem>
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* 8. 共有管理 */}
      {canShareGroup && (
        <>
          <Typography variant="h6" gutterBottom>
            🔗 共有管理 ({planName})
          </Typography>
          <Card sx={{ mb: 4, bgcolor: sharedCardBg }}>
            <CardContent>
              {/* 人数表示 */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  mb: 2,
                }}
              >
                <Box sx={{ display: "flex", alignItems: "center" }}>
                  <Group color="primary" sx={{ mr: 1 }} />
                  <Typography fontWeight="bold">共有メンバー</Typography>
                </Box>
                <Chip
                  label={
                    userProfile?.groupId
                      ? `${currentMemberCount} / ${maxMembers}`
                      : "未作成"
                  }
                  color={currentMemberCount > maxMembers ? "error" : "primary"}
                  variant="outlined"
                />
              </Box>

              {userProfile?.groupId ? (
                <Box sx={{ mb: 3 }}>
                  <Typography variant="caption" color="textSecondary">
                    招待リンクを共有してパートナーを追加
                  </Typography>
                  <Button
                    startIcon={<ContentCopy />}
                    fullWidth
                    variant="contained"
                    onClick={handleCopyInvite}
                    sx={{ mt: 1 }}
                  >
                    招待リンクをコピー
                  </Button>
                </Box>
              ) : (
                <Box sx={{ mb: 3, textAlign: "center" }}>
                  <Typography variant="body2" gutterBottom>
                    まずは共有グループを作成しましょう
                  </Typography>
                  <Button
                    startIcon={<PersonAdd />}
                    variant="contained"
                    color="secondary"
                    onClick={handleCreateGroup}
                    fullWidth
                  >
                    共有グループを作成
                  </Button>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              {/* プライバシー設定 */}
              <Typography variant="subtitle2" gutterBottom>
                プライバシー設定 (共有するデータ)
              </Typography>
              <Box
                sx={{ display: "flex", flexDirection: "column", gap: 1, mb: 2 }}
              >
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.privacy?.shifts || false}
                      onChange={() => handlePrivacyChange("shifts")}
                    />
                  }
                  label="シフト表を共有"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.privacy?.finance || false}
                      onChange={() => handlePrivacyChange("finance")}
                    />
                  }
                  label="家計簿(収支)を共有"
                />
                <FormControlLabel
                  control={
                    <Switch
                      checked={settings.privacy?.shopping || false}
                      onChange={() => handlePrivacyChange("shopping")}
                    />
                  }
                  label="買い物リストを共有"
                />
              </Box>
              <Typography variant="caption" color="error">
                ※OFFにすると、相手の画面にあなたのデータは表示されません。
                <br />
                ※全員OFFにすることが推奨されます（初期設定）。
              </Typography>

              {/* メンバーリスト */}
              {userProfile?.groupId && (
                <>
                  <Divider sx={{ my: 2 }} />
                  {sharedDocs && sharedDocs.length > 0 ? (
                    <List dense>
                      <Typography variant="subtitle2" sx={{ px: 2 }}>
                        参加中のメンバー
                      </Typography>
                      {sharedDocs.map((doc) => (
                        <ListItem key={doc.uid}>
                          <ListItemText
                            primary={doc.userName || "名無し"}
                            secondary={
                              doc.uid === userProfile.uid
                                ? "あなた"
                                : "パートナー"
                            }
                          />
                          {isOwner && doc.uid !== userProfile.uid && (
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => kickMember(doc.uid)}
                            >
                              <PersonRemove fontSize="small" />
                            </IconButton>
                          )}
                        </ListItem>
                      ))}
                    </List>
                  ) : (
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      align="center"
                      display="block"
                    >
                      まだパートナーはいません
                    </Typography>
                  )}
                </>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </Box>
  );
}
