// src/components/ReloadPrompt.jsx
import React from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { Button, Snackbar, Alert } from "@mui/material";

export default function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegistered(r) {
      console.log("SW Registered: " + r);
    },
    onRegisterError(error) {
      console.log("SW registration error", error);
    },
  });

  const handleRefresh = () => {
    updateServiceWorker(true);
  };

  const handleClose = () => {
    setNeedRefresh(false);
  };

  return (
    <Snackbar
      open={needRefresh}
      anchorOrigin={{ vertical: "top", horizontal: "center" }}
      sx={{ mt: 8 }} // ヘッダーとかぶらないように少し下げる
    >
      <Alert
        severity="info"
        action={
          <Button color="inherit" size="small" onClick={handleRefresh}>
            更新する
          </Button>
        }
        onClose={handleClose}
        sx={{ width: "100%", boxShadow: 3 }}
      >
        新しいバージョンが利用可能です
      </Alert>
    </Snackbar>
  );
}
