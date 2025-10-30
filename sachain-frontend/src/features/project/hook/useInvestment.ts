import { useState, useCallback, useEffect } from 'react';
import { buyProjectShares } from '../core/api';

interface InvestmentCalculation {
  tokensDesired: number;
  pricePerToken: number;
  totalCost: number;
  orangeMoneyFee: number;
  finalTotal: number;
}

interface InvestmentState {
  step: number;
  projectId: string | null;
  projectName: string | null;
  calculation: InvestmentCalculation | null;
  walletBalance: number;
  loading: boolean;
  error: string | null;
}

interface NotificationData {
  type: string;
  timestamp: string;
  projectId?: string;
}

export function useInvestment(notifications: NotificationData[] = []) {
  const [state, setState] = useState<InvestmentState>({
    step: 1,
    projectId: null,
    projectName: null,
    calculation: null,
    walletBalance: 0,
    loading: false,
    error: null,
  });

  const [purchaseTimestamp, setPurchaseTimestamp] = useState<string | null>(
    null
  );

  const calculateInvestment = useCallback(
    (tokensDesired: number, pricePerToken: number): InvestmentCalculation => {
      const totalCost = tokensDesired * pricePerToken;
      const orangeMoneyFee = totalCost * 0.02;
      const finalTotal = totalCost + orangeMoneyFee;

      return {
        tokensDesired,
        pricePerToken,
        totalCost,
        orangeMoneyFee,
        finalTotal,
      };
    },
    []
  );

  const startInvestment = useCallback(
    (projectId: string, projectName: string, pricePerToken: number) => {
      setState((prev) => ({
        ...prev,
        step: 1,
        projectId,
        projectName,
        calculation: calculateInvestment(1, pricePerToken),
        error: null,
      }));
    },
    [calculateInvestment]
  );

  const updateTokenAmount = useCallback(
    (tokensDesired: number) => {
      setState((prev) => {
        if (!prev.calculation) return prev;
        return {
          ...prev,
          calculation: calculateInvestment(
            tokensDesired,
            prev.calculation.pricePerToken
          ),
        };
      });
    },
    [calculateInvestment]
  );

  const nextStep = useCallback(() => {
    setState((prev) => ({ ...prev, step: Math.min(prev.step + 1, 5) }));
  }, []);

  const prevStep = useCallback(() => {
    setState((prev) => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState((prev) => ({ ...prev, error }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState((prev) => ({ ...prev, loading }));
  }, []);

  const purchaseTokens = useCallback(
    async (investorPrivateKey: string, investorWalletAddress: string) => {
      if (!state.calculation || !state.projectId) {
        throw new Error('Invalid investment state');
      }

      setLoading(true);
      setError(null);

      try {
        const response = await buyProjectShares(
          state.projectId,
          investorPrivateKey,
          state.calculation.tokensDesired,
          investorWalletAddress
        );

        // Record purchase time to correlate with approval notifications
        setPurchaseTimestamp(new Date().toISOString());

        return response;
      } catch (error: any) {
        setError(error.message ?? 'Token purchase failed');
        throw error;
      } finally {
        setLoading(false);
      }
    },
    [state.calculation, state.projectId, setError, setLoading]
  );

  useEffect(() => {
    if (!purchaseTimestamp || notifications.length === 0) return;

    const approvedNotification = notifications.find((notification) => {
      if (notification.type !== 'purchase_approved') return false;

      if (
        state.projectId &&
        notification.projectId &&
        notification.projectId !== state.projectId
      )
        return false;

      return new Date(notification.timestamp) >= new Date(purchaseTimestamp);
    });

    if (approvedNotification) {
      nextStep();
      setPurchaseTimestamp(null);
    }
  }, [notifications, purchaseTimestamp, nextStep, state.projectId]);

  const resetInvestment = useCallback(() => {
    setState({
      step: 1,
      projectId: null,
      projectName: null,
      calculation: null,
      walletBalance: 0,
      loading: false,
      error: null,
    });
    setPurchaseTimestamp(null);
  }, []);

  return {
    step: state.step,
    projectId: state.projectId,
    projectName: state.projectName,
    calculation: state.calculation,
    walletBalance: state.walletBalance,
    loading: state.loading,
    error: state.error,

    startInvestment,
    updateTokenAmount,
    nextStep,
    prevStep,
    setError,
    purchaseTokens,
    resetInvestment,
  };
}
