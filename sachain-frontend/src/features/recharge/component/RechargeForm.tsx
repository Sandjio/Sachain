import React from "react";
import { Button } from "@/components/ui/button";
import { useRecharge } from "../hook/useRecharge";

// Define the mint fee constant (replace with the correct value if needed)
const MINT_FEE_HBAR = 5.0;


interface RechargeFormProps {
  walletAddress: string;
  onSuccess: () => void;
  onError: (msg: string) => void;
}

export function RechargeForm({ walletAddress, onSuccess, onError }: RechargeFormProps) {
  const {
    register,
    handleSubmit,
    onSubmit,
    errors,
    isSubmitting,
    error,
    response,
    hbarEquivalent,
    netHbar,
  } = useRecharge(walletAddress);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="max-w-md mx-auto p-4 border rounded-lg space-y-4">
      <label>
        Orange Money Phone Number
        <input type="tel" {...register("customerNumber")} className="w-full p-2 border rounded" />
        {errors.customerNumber && (
          <span className="text-red-600 text-xs">{errors.customerNumber.message}</span>
        )}
      </label>

      <label>
        Amount (FCFA)
        <input type="number" {...register("amount")} className="w-full p-2 border rounded" />
        {errors.amount && <span className="text-red-600 text-xs">{errors.amount.message}</span>}
      </label>

      <div className="text-gray-700 text-sm space-y-1">
        <p>Equivalent HBAR: <strong>{hbarEquivalent.toFixed(6)} ℏ</strong></p>
        <p>Mint fee deducted: <strong>{MINT_FEE_HBAR.toFixed(6)} ℏ</strong></p>
        <p>Net HBAR credited: <strong>{netHbar.toFixed(6)} ℏ</strong></p>
      </div>

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Processing..." : "Initiate Recharge"}
      </Button>

      {error && <p className="text-red-500">{error}</p>}
      {response && <p className="text-green-600">{response.result.data.inittxnmessage}</p>}
    </form>
  );
}
