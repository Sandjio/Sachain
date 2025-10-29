import { useState, useCallback } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RechargeRequest, RechargeResponse } from '../core/rechargeTypes';
import { initiateRecharge } from '@/features/recharge/core/api';

const FCFA_TO_HBAR_RATE = 1 / 132.62;
const MINT_FEE_HBAR = 0.2;

const rechargeSchema = z.object({
  customerNumber: z
    .string()
    .min(8, 'Phone number too short')
    .max(15, 'Phone number too long'),
  amount: z.string().refine((val) => Number(val) > 0, {
    message: 'Amount must be greater than zero',
  }),
});

type RechargeFormInputs = z.infer<typeof rechargeSchema>;

export function useRecharge(
  walletAddress: string,
  onPaymentSuccess?: () => void
) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RechargeFormInputs>({
    resolver: zodResolver(rechargeSchema),
    defaultValues: { customerNumber: '', amount: '1000' },
  });

  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<RechargeResponse | null>(null);
  const [isPaymentSuccessful, setIsPaymentSuccessful] = useState(false);

  const amountFcfa = watch('amount') || '0';
  const hbarEquivalent = Number(amountFcfa) * FCFA_TO_HBAR_RATE;
  const netHbar = Math.max(hbarEquivalent - MINT_FEE_HBAR, 0);

  const onSubmit: SubmitHandler<RechargeFormInputs> = useCallback(
    async (values) => {
      setError(null);
      setResponse(null);
      setIsPaymentSuccessful(false);

      const idempotencyKey = Date.now().toString();
      const requestBody: RechargeRequest = {
        customerNumber: values.customerNumber,
        amount: values.amount,
        description: 'Sachain Recharge',
        idempotencyKey,
        walletAddress,
      };

      try {
        const result = await initiateRecharge(requestBody);
        setResponse(result);

        console.log('Payment response:', result);

        // Check if payment was successfully initiated (HTTP 200 + PENDING status)
        if (
          result.result?.data?.inittxnstatus === '200' ||
          result.result?.data?.status === 'PENDING'
        ) {
          setIsPaymentSuccessful(true);

          // Wait 3 seconds to show success message, then proceed
          setTimeout(() => {
            if (onPaymentSuccess) {
              onPaymentSuccess();
            }
          }, 10000);
        } else {
          // Payment initiation failed
          setError(
            result.result?.data?.inittxnmessage ||
              'Payment initiation failed. Please try again.'
          );
        }

        reset();
      } catch (err: any) {
        setError(err.message || 'Recharge error');
      }
    },
    [walletAddress, reset, onPaymentSuccess]
  );

  return {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    error,
    response,
    hbarEquivalent,
    netHbar,
    isPaymentSuccessful,
  };
}
