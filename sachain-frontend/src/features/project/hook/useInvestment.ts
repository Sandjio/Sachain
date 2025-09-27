// // src/features/investment/hooks/useInvestment.ts
// import { useState, useCallback } from 'react';

// interface InvestmentCalculation {
//   tokensDesired: number;
//   pricePerToken: number;
//   totalCost: number;
//   orangeMoneyFee: number;
//   finalTotal: number;
// }

// interface InvestmentState {
//   step: number;
//   projectId: string | null;
//   projectName: string | null;
//   calculation: InvestmentCalculation | null;
//   walletBalance: number;
//   orangeMoneyBalance: number;
//   loading: boolean;
//   error: string | null;
// }

// export function useInvestment() {
//   const [state, setState] = useState<InvestmentState>({
//     step: 1,
//     projectId: null,
//     projectName: null,
//     calculation: null,
//     walletBalance: 0,
//     orangeMoneyBalance: 0,
//     loading: false,
//     error: null,
//   });

//   const calculateInvestment = useCallback((
//     tokensDesired: number, 
//     pricePerToken: number
//   ): InvestmentCalculation => {
//     const totalCost = tokensDesired * pricePerToken;
//     const orangeMoneyFee = totalCost * 0.02;
//     const finalTotal = totalCost + orangeMoneyFee;

//     return {
//       tokensDesired,
//       pricePerToken,
//       totalCost,
//       orangeMoneyFee,
//       finalTotal
//     };
//   }, []);

//   const startInvestment = useCallback((projectId: string, projectName: string, pricePerToken: number) => {
//     setState(prev => ({
//       ...prev,
//       step: 1,
//       projectId,
//       projectName,
//       calculation: calculateInvestment(1, pricePerToken), // Default to 1 token
//       error: null
//     }));
//   }, [calculateInvestment]);

//   const updateTokenAmount = useCallback((tokensDesired: number) => {
//     setState(prev => {
//       if (!prev.calculation) return prev;
      
//       return {
//         ...prev,
//         calculation: calculateInvestment(tokensDesired, prev.calculation.pricePerToken)
//       };
//     });
//   }, [calculateInvestment]);

//   const nextStep = useCallback(() => {
//     setState(prev => ({ ...prev, step: Math.min(prev.step + 1, 5) }));
//   }, []);

//   const prevStep = useCallback(() => {
//     setState(prev => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
//   }, []);

//   const setError = useCallback((error: string | null) => {
//     setState(prev => ({ ...prev, error }));
//   }, []);

//   const setLoading = useCallback((loading: boolean) => {
//     setState(prev => ({ ...prev, loading }));
//   }, []);

//   const checkWalletBalance = useCallback(async () => {
//     // TODO: Implement actual wallet balance check using Hedera SDK
//     setLoading(true);
//     try {
//       // Simulate API call
//       await new Promise(resolve => setTimeout(resolve, 1000));
//       setState(prev => ({ ...prev, walletBalance: 1500 })); // Mock balance
//     } catch (error) {
//       setError('Failed to check wallet balance');
//     } finally {
//       setLoading(false);
//     }
//   }, [setError, setLoading]);

//   const checkOrangeMoneyBalance = useCallback(async () => {
//     // TODO: Implement Orange Money balance check
//     setLoading(true);
//     try {
//       // Simulate API call
//       await new Promise(resolve => setTimeout(resolve, 1000));
//       setState(prev => ({ ...prev, orangeMoneyBalance: 2000 })); // Mock balance
//     } catch (error) {
//       setError('Failed to check Orange Money balance');
//     } finally {
//       setLoading(false);
//     }
//   }, [setError, setLoading]);

//   const processOrangeMoneyPayment = useCallback(async (amount: number) => {
//     // TODO: Implement Orange Money payment processing
//     setLoading(true);
//     try {
//       // Simulate payment processing
//       await new Promise(resolve => setTimeout(resolve, 2000));
      
//       // Update balances after payment
//       setState(prev => ({
//         ...prev,
//         orangeMoneyBalance: prev.orangeMoneyBalance - amount,
//         walletBalance: prev.walletBalance + amount
//       }));
      
//       return { success: true, transactionId: 'OM_' + Date.now() };
//     } catch (error) {
//       setError('Orange Money payment failed');
//       throw error;
//     } finally {
//       setLoading(false);
//     }
//   }, [setError, setLoading]);

//   const purchaseTokens = useCallback(async () => {
//     if (!state.calculation || !state.projectId) {
//       throw new Error('Invalid investment state');
//     }

//     setLoading(true);
//     try {
//       // TODO: Implement actual token purchase via API
//       // This would call something like: await investInProject(projectId, tokensDesired, totalCost)
      
//       // Simulate token purchase
//       await new Promise(resolve => setTimeout(resolve, 2000));
      
//       return {
//         success: true,
//         transactionId: 'INV_' + Date.now(),
//         tokensReceived: state.calculation.tokensDesired,
//         projectId: state.projectId
//       };
//     } catch (error) {
//       setError('Token purchase failed');
//       throw error;
//     } finally {
//       setLoading(false);
//     }
//   }, [state.calculation, state.projectId, setError, setLoading]);

//   const resetInvestment = useCallback(() => {
//     setState({
//       step: 1,
//       projectId: null,
//       projectName: null,
//       calculation: null,
//       walletBalance: 0,
//       orangeMoneyBalance: 0,
//       loading: false,
//       error: null,
//     });
//   }, []);

//   return {
//     // State
//     step: state.step,
//     projectId: state.projectId,
//     projectName: state.projectName,
//     calculation: state.calculation,
//     // walletBalance: state.walletBalance,
//     // orangeMoneyBalance: state.orangeMoneyBalance,
//     loading: state.loading,
//     error: state.error,
    
//     // Actions
//     startInvestment,
//     updateTokenAmount,
//     nextStep,
//     prevStep,
//     setError,
//     // checkWalletBalance,
//     // checkOrangeMoneyBalance,
//     processOrangeMoneyPayment,
//     purchaseTokens,
//     resetInvestment,
//   };
// }




// import { useState, useCallback } from 'react';
// import { buyProjectShares } from '../core/api'; 

// interface InvestmentCalculation {
//   tokensDesired: number;
//   pricePerToken: number;
//   totalCost: number;
//   orangeMoneyFee: number;
//   finalTotal: number;
// }

// interface InvestmentState {
//   step: number;
//   projectId: string | null;
//   projectName: string | null;
//   calculation: InvestmentCalculation | null;
//   walletBalance: number;
//   loading: boolean;
//   error: string | null;
// }

// export function useInvestment() {
//   const [state, setState] = useState<InvestmentState>({
//     step: 1,
//     projectId: null,
//     projectName: null,
//     calculation: null,
//     walletBalance: 0,
//     loading: false,
//     error: null,
//   });

//   const calculateInvestment = useCallback((
//     tokensDesired: number,
//     pricePerToken: number
//   ): InvestmentCalculation => {
//     const totalCost = tokensDesired * pricePerToken;
//     const orangeMoneyFee = totalCost * 0.02; // kept for fee calc; remove if unnecessary
//     const finalTotal = totalCost + orangeMoneyFee;

//     return {
//       tokensDesired,
//       pricePerToken,
//       totalCost,
//       orangeMoneyFee,
//       finalTotal,
//     };
//   }, []);

//   const startInvestment = useCallback((projectId: string, projectName: string, pricePerToken: number) => {
//     setState(prev => ({
//       ...prev,
//       step: 1,
//       projectId,
//       projectName,
//       calculation: calculateInvestment(1, pricePerToken),
//       error: null,
//     }));
//   }, [calculateInvestment]);

//   const updateTokenAmount = useCallback((tokensDesired: number) => {
//     setState(prev => {
//       if (!prev.calculation) return prev;
//       return {
//         ...prev,
//         calculation: calculateInvestment(tokensDesired, prev.calculation.pricePerToken),
//       };
//     });
//   }, [calculateInvestment]);

//   const nextStep = useCallback(() => {
//     setState(prev => ({ ...prev, step: Math.min(prev.step + 1, 5) }));
//   }, []);

//   const prevStep = useCallback(() => {
//     setState(prev => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
//   }, []);

//   const setError = useCallback((error: string | null) => {
//     setState(prev => ({ ...prev, error }));
//   }, []);

//   const setLoading = useCallback((loading: boolean) => {
//     setState(prev => ({ ...prev, loading }));
//   }, []);

//   // Removed checkWalletBalance and Orange Money payment processing

//   const purchaseTokens = useCallback(async (
//     investorPrivateKey: string,
//     investorWalletAddress: string
//   ) => {
//     if (!state.calculation || !state.projectId) {
//       throw new Error('Invalid investment state');
//     }

//     setLoading(true);
//     setError(null);

//     try {
//       const response = await buyProjectShares(
//         state.projectId,
//         investorPrivateKey,
//         state.calculation.tokensDesired,
//         investorWalletAddress
//       );

//       // Optionally save Schedule ID or related data into local state here

//       return response;
//     } catch (error: any) {
//       setError(error.message ?? 'Token purchase failed');
//       throw error;
//     } finally {
//       setLoading(false);
//     }
//   }, [state.calculation, state.projectId, setError, setLoading]);

//   const resetInvestment = useCallback(() => {
//     setState({
//       step: 1,
//       projectId: null,
//       projectName: null,
//       calculation: null,
//       walletBalance: 0,
//       loading: false,
//       error: null,
//     });
//   }, []);

//   return {
//     step: state.step,
//     projectId: state.projectId,
//     projectName: state.projectName,
//     calculation: state.calculation,
//     walletBalance: state.walletBalance,
//     loading: state.loading,
//     error: state.error,

//     startInvestment,
//     updateTokenAmount,
//     nextStep,
//     prevStep,
//     setError,
//     purchaseTokens,
//     resetInvestment,
//   };
// }






import { useState, useCallback, useEffect, useRef } from 'react';
import { buyProjectShares } from '../core/api';
import { Client, ScheduleInfoQuery } from '@hashgraph/sdk';


const OPERATOR_ID = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_ID || '';
const PRIVATEKEY = process.env.NEXT_PUBLIC_HEDERA_OPERATOR_KEY || '';

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

export function useInvestment() {
  const [state, setState] = useState<InvestmentState>({
    step: 1,
    projectId: null,
    projectName: null,
    calculation: null,
    walletBalance: 0,
    loading: false,
    error: null,
  });

  const [scheduleId, setScheduleId] = useState<string | null>(null);
  const pollingInterval = useRef<NodeJS.Timeout | null>(null);// To manage polling interval



  const operatorId = OPERATOR_ID; 
  const operatorKey = PRIVATEKEY; 
  const client = Client.forTestnet();
  client.setOperator(operatorId, operatorKey);

  const calculateInvestment = useCallback((
    tokensDesired: number,
    pricePerToken: number
  ): InvestmentCalculation => {
    const totalCost = tokensDesired * pricePerToken;
    const orangeMoneyFee = totalCost * 0.02; // 2% fee, remove if unnecessary
    const finalTotal = totalCost + orangeMoneyFee;

    return {
      tokensDesired,
      pricePerToken,
      totalCost,
      orangeMoneyFee,
      finalTotal,
    };
  }, []);

  const startInvestment = useCallback((projectId: string, projectName: string, pricePerToken: number) => {
    setState(prev => ({
      ...prev,
      step: 1,
      projectId,
      projectName,
      calculation: calculateInvestment(1, pricePerToken),
      error: null,
    }));
  }, [calculateInvestment]);

  const updateTokenAmount = useCallback((tokensDesired: number) => {
    setState(prev => {
      if (!prev.calculation) return prev;
      return {
        ...prev,
        calculation: calculateInvestment(tokensDesired, prev.calculation.pricePerToken),
      };
    });
  }, [calculateInvestment]);

  const nextStep = useCallback(() => {
    setState(prev => ({ ...prev, step: Math.min(prev.step + 1, 5) }));
  }, []);

  const prevStep = useCallback(() => {
    setState(prev => ({ ...prev, step: Math.max(prev.step - 1, 1) }));
  }, []);

  const setError = useCallback((error: string | null) => {
    setState(prev => ({ ...prev, error }));
  }, []);

  const setLoading = useCallback((loading: boolean) => {
    setState(prev => ({ ...prev, loading }));
  }, []);

  // Poll schedule status every 10s using Hedera SDK ScheduleInfoQuery
  const pollScheduleStatus = useCallback((scheduleIdToCheck: string) => {
  if (pollingInterval.current) clearInterval(pollingInterval.current);

  console.log(`Starting to poll schedule status for Schedule ID: ${scheduleIdToCheck}`);

  pollingInterval.current = setInterval(async () => {
    try {
      console.log(`Polling schedule at ${new Date().toLocaleTimeString()} for ID: ${scheduleIdToCheck}`);

      const info = await new ScheduleInfoQuery()
        .setScheduleId(scheduleIdToCheck)
        .execute(client);

      console.log('ScheduleInfoQuery response:', info);

      const executed = info.executed;

      console.log(`Is schedule executed? ${executed}`);

      if (executed) {
        clearInterval(pollingInterval.current!);
        pollingInterval.current = null;
        console.log('Schedule executed, stopping polling and advancing step');
        nextStep();
      }
    } catch (error:any) {
      clearInterval(pollingInterval.current!);
      pollingInterval.current = null;
      console.error('Error during schedule status polling:', error);
      setError(error.message || 'Failed to verify schedule status');
    }
  }, 30000); // poll every 10 seconds
}, [client, nextStep, setError]);


  useEffect(() => {
    if (scheduleId) {
      pollScheduleStatus(scheduleId);
    }
    // Cleanup polling on unmount or scheduleId change
    return () => {
      if (pollingInterval.current) {
        clearInterval(pollingInterval.current);
        pollingInterval.current = null;
      }
    }
  }, [scheduleId, pollScheduleStatus]);

  const purchaseTokens = useCallback(async (
    investorPrivateKey: string,
    investorWalletAddress: string
  ) => {
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

      // Save scheduleId for polling
      if (response?.scheduleId) {
        setScheduleId(response.scheduleId);
      }

      return response;
    } catch (error: any) {
      setError(error.message ?? 'Token purchase failed');
      throw error;
    } finally {
      setLoading(false);
    }
  }, [state.calculation, state.projectId, setError, setLoading]);

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
    setScheduleId(null);
    if (pollingInterval.current) {
      clearInterval(pollingInterval.current);
      pollingInterval.current = null;
    }
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
