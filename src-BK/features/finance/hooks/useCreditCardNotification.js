import { useEffect, useState } from "react";

/**
 * Detects credit card billing/confirmation day and calculates unsettled amount.
 * Returns null when no notification should be shown.
 */
export const useCreditCardNotification = (accounts, payments, isLoaded) => {
  const [notification, setNotification] = useState(null);

  useEffect(() => {
    if (!isLoaded || !Array.isArray(accounts)) {
      setNotification(null);
      return;
    }

    const todayDay = new Date().getDate();
    const creditCards = accounts.filter((a) => a?.type === "credit");

    let found = null;

    creditCards.forEach((card) => {
      const checkDay = card.confirmationDay || card.billingDay;
      if (!checkDay || checkDay !== todayDay) return;

      const unsettledAmount = (Array.isArray(payments) ? payments : [])
        .filter((p) => p?.accountId === card.id && !p?.isSettled)
        .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

      if (unsettledAmount > 0) {
        found = {
          title: `${card.name}の請求確定日`,
          msg: `未確定額: ¥${unsettledAmount.toLocaleString()}`,
        };
      }
    });

    setNotification(found);
  }, [accounts, payments, isLoaded]);

  return notification;
};
