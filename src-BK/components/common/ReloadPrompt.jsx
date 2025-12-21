import React from "react";
import { Button, Snackbar, Alert } from "@mui/material";
import { useRegisterSW } from "virtual:pwa-register/react";

/**
 * VitePWA(registerType: "prompt") と組み合わせて、
 * 新しい Service Worker が来た時に「更新」ボタンを表示する。
 */
export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
    offlineReady: [offlineReady, setOfflineReady],
  } = useRegisterSW({
    immediate: true,
    onRegisteredSW(_swUrl, _registration) {
      // no-op
    },
    onRegisterError(error) {
      console.error("SW registration error", error);
    },
  });

  const close = () => {
    setOfflineReady(false);
    setNeedRefresh(false);
  };

  if (!needRefresh && !offlineReady) return null;

  return (
    <Snackbar
      open
      anchorOrigin={{ vertical: "bottom", horizontal: "center" }}
      onClose={close}
    >
      <Alert
        severity={needRefresh ? "info" : "success"}
        onClose={close}
        action={
          needRefresh ? (
            <Button
              color="inherit"
              size="small"
              onClick={() => updateServiceWorker(true)}
            >
              更新
            </Button>
          ) : null
        }
        sx={{ width: "100%" }}
      >
        {needRefresh
          ? "新しいバージョンがあります。更新しますか？"
          : "オフラインで使用できます"}
      </Alert>
    </Snackbar>
  );
}
