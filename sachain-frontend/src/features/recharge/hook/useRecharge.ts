// import { useState, useCallback } from "react";
// import { RechargeRequest, RechargeResponse } from "../core/rechargeTypes";
// import { initiateRecharge } from "@/features/recharge/core/api";

// const FCFA_TO_HBAR_RATE = 1 / 132.62; // Example: 1 FCFA ≈ 0.00754 HBAR
// const MINT_FEE_HBAR = 0.2;            // Example: static mint fee

// export function useRecharge(walletAddress: string) {
//   const [phone, setPhone] = useState("");
//   const [amountFcfa, setAmountFcfa] = useState("1000"); // Default to 1000 FCFA
//   const [loading, setLoading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [response, setResponse] = useState<RechargeResponse | null>(null);

//   // Calculated derived values
//   const fcfaValue = parseFloat(amountFcfa) || 0;
//   const hbarEquivalent = fcfaValue * FCFA_TO_HBAR_RATE;
//   const netHbar = Math.max(hbarEquivalent - MINT_FEE_HBAR, 0);

//   // Actual submit handler
//   const submitRecharge = useCallback(async () => {
//     setLoading(true);
//     setError(null);
//     setResponse(null);

//     const idempotencyKey = Date.now().toString();
//     const requestBody: RechargeRequest = {
//       customerNumber: phone,
//       amount: amountFcfa,
//       description: "Sachain Recharge",
//       idempotencyKey,
//       walletAddress,
//     };

//     try {
//       const result = await initiateRecharge(requestBody);
//       setResponse(result);
//     } catch (err: any) {
//       setError(err.message || "Recharge error");
//     } finally {
//       setLoading(false);
//     }
//   }, [phone, amountFcfa, walletAddress]);

//   return {
//     phone,
//     setPhone,
//     amountFcfa,
//     setAmountFcfa,
//     loading,
//     error,
//     response,
//     hbarEquivalent,
//     netHbar,
//     submitRecharge,
//   };
// }



import { useState, useCallback } from "react";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { RechargeRequest, RechargeResponse } from "../core/rechargeTypes";
import { initiateRecharge } from "@/features/recharge/core/api";

const FCFA_TO_HBAR_RATE = 1 / 132.62;
const MINT_FEE_HBAR = 0.2;

const rechargeSchema = z.object({
  customerNumber: z
    .string()
    .min(8, "Phone number too short")
    .max(15, "Phone number too long"),
  amount: z
    .string()
    .refine(val => Number(val) > 0, { message: "Amount must be greater than zero" }),
});

type RechargeFormInputs = z.infer<typeof rechargeSchema>;

export function useRecharge(walletAddress: string) {
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<RechargeFormInputs>({
    resolver: zodResolver(rechargeSchema),
    defaultValues: { customerNumber: "", amount: "1000" },
  });

  const [error, setError] = useState<string | null>(null);
  const [response, setResponse] = useState<RechargeResponse | null>(null);

  const amountFcfa = watch("amount") || "0";
  const hbarEquivalent = Number(amountFcfa) * FCFA_TO_HBAR_RATE;
  const netHbar = Math.max(hbarEquivalent - MINT_FEE_HBAR, 0);

  const onSubmit: SubmitHandler<RechargeFormInputs> = useCallback(
    async (values) => {
      setError(null);
      setResponse(null);

      const idempotencyKey = Date.now().toString();
      const requestBody: RechargeRequest = {
        customerNumber: values.customerNumber,
        amount: values.amount,
        description: "Sachain Recharge",
        idempotencyKey,
        walletAddress,
      };

      try {
        const result = await initiateRecharge(requestBody);
        setResponse(result);
        reset();
      } catch (err: any) {
        setError(err.message || "Recharge error");
      }
    },
    [walletAddress, reset]
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
  };
}
