// src/components/ads/AdSenseBanner.jsx
import React, { useEffect, useRef } from "react";
// NOTE: This component lives in src/components/ads, so AuthContext is two levels up.
import { useAuth } from "../../AuthContext";

export default function AdSenseBanner({
  slotId,
  clientId,
  format = "auto",
  responsive = "true",
  style,
}) {
  // プレミアム会員かどうかチェック
  const { isPremium } = useAuth();

  const adPushedRef = useRef(false);

  useEffect(() => {
    // プレミアムでなく、かつ「まだリクエストを送っていない」場合のみ実行
    if (!isPremium && !adPushedRef.current) {
      try {
        (window.adsbygoogle = window.adsbygoogle || []).push({});

        // ★実行したらフラグを「済み(true)」にする
        adPushedRef.current = true;
      } catch (e) {
        console.error("AdSense error:", e);
      }
    }
  }, [isPremium]);

  // ★重要: プレミアム会員なら「何も表示しない」
  if (isPremium) return null;

  return (
    <div
      style={{
        margin: "40px 0",
        textAlign: "center",
        minHeight: "100px",
        ...style,
      }}
    >
      <p style={{ fontSize: "10px", color: "#ccc", margin: 0 }}>
        スポンサーリンク
      </p>
      <ins
        className="adsbygoogle"
        style={{ display: "block" }}
        data-ad-client={clientId}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive}
      />
    </div>
  );
}
