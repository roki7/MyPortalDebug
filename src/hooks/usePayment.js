import { useState } from "react";
import { getFunctions, httpsCallable } from "firebase/functions";

export const usePayment = (isPremium) => {
  // ポータル遷移用（解約・変更）のローディング
  const [isProcessing, setIsProcessing] = useState(false);

  // 新規契約用のローディング（どのプランを選んだか管理）
  const [checkoutState, setCheckoutState] = useState({
    loading: false,
    priceId: null,
  });

  const handleManagePlan = async (priceId) => {
    // 1. プレミアム会員ならポータルへ (解約・確認画面)
    if (isPremium) {
      if (isProcessing) return;
      setIsProcessing(true);
      try {
        const functions = getFunctions(undefined, "asia-northeast1");
        const createPortalSession = httpsCallable(
          functions,
          "createPortalSession"
        );

        const { data } = await createPortalSession({
          returnUrl: window.location.origin,
        });

        if (data?.url) {
          window.location.href = data.url;
        } else {
          throw new Error("ポータルURL取得失敗");
        }
      } catch (error) {
        console.error("Portal Error:", error);
        alert("契約管理画面への移動に失敗しました");
        setIsProcessing(false);
      }
      return;
    }

    // 2. 未加入なら決済画面へ
    if (!priceId) {
      alert("プランを選択してください");
      return;
    }

    if (checkoutState.loading) return;
    setCheckoutState({ loading: true, priceId });

    try {
      const functions = getFunctions(undefined, "asia-northeast1");
      const createCheckoutSession = httpsCallable(
        functions,
        "createCheckoutSession"
      );

      const { data } = await createCheckoutSession({
        origin: window.location.origin,
        priceId: priceId, // 選んだプランIDを送信
      });

      if (data?.url) {
        window.location.href = data.url;
      } else {
        throw new Error("決済URL取得失敗");
      }
    } catch (error) {
      console.error("Checkout Error:", error);
      alert("決済画面への移動に失敗しました");
      setCheckoutState({ loading: false, priceId: null });
    }
  };

  return {
    handleManagePlan,
    isProcessing, // ポータル遷移中フラグ
    checkoutState, // 決済遷移中ステート { loading, priceId }
  };
};
