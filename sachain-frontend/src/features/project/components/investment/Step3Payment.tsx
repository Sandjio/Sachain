import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface Step3Props {
  calculation: {
    finalTotal: number;
    tokensDesired: number;
    pricePerToken: number;
  } | null;
  project: {
    name: string;
    category: string;
    stockSupply: number;
    pricePerStock: number;
    coverImageUrl?: string;
    description: string;
  };
  onNext: (privateKey: string) => void;
  onBack: () => void;
  formatCurrency: (amount: number) => string;
}

export default function Step3Payment({
  calculation,
  project,
  onNext,
  onBack,
  formatCurrency,
}: Step3Props) {
  const [infoConfirmed, setInfoConfirmed] = useState(false);
  const [privateKey, setPrivateKey] = useState('');
  const [privateKeyError, setPrivateKeyError] = useState<string | null>(null);

  if (!calculation) return null;

  const handleProceedClick = () => {
    if (!privateKey.trim()) {
      setPrivateKeyError('Private key is required to proceed.');
      return;
    }
    setPrivateKeyError(null);
    onNext(privateKey.trim());
  };

  const handleCheckboxChange = () => {
    setInfoConfirmed((prev) => {
      if (prev) {
        setPrivateKey('');
        setPrivateKeyError(null);
      }
      return !prev;
    });
  };

  return (
    <div className="space-y-6" aria-live="polite">
      <div className="text-center">
        <h2 className="text-2xl font-semibold mb-2">
          Confirm Your Investment Details
        </h2>
        <p className="text-gray-600 mb-4">
          Please review the information below before proceeding.
        </p>
      </div>

      <Card>
        <CardContent>
          <div className="mb-4 flex justify-center">
            {project?.coverImageUrl && (
              <img
                src={project.coverImageUrl}
                alt={project.name}
                className="h-32 w-32 object-cover rounded-md"
              />
            )}
          </div>
          <h3 className="text-xl font-bold text-center mb-2">
            {project?.name}
          </h3>
          <p className="text-center text-gray-700 mb-4">{project?.category}</p>
          <p className="text-center text-gray-700 mb-4">
            {project?.description}
          </p>

          <div className="space-y-2 text-center">
            <p>
              <strong>Number of Tokens:</strong> {calculation.tokensDesired}
            </p>
            <p>
              <strong>Price per Token:</strong>{' '}
              {formatCurrency(calculation.pricePerToken)}
            </p>
            <p className="text-lg font-semibold">
              <strong>Total Amount to Pay:</strong>{' '}
              {formatCurrency(calculation.finalTotal)}
            </p>
          </div>
        </CardContent>
      </Card>

      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={infoConfirmed}
          onChange={handleCheckboxChange}
          className="cursor-pointer"
        />
        <span className="text-sm select-none">
          I have reviewed and confirm that the above information is correct.
        </span>
      </label>

      {infoConfirmed && (
        <div className="mt-4">
          <label
            htmlFor="privateKeyInput"
            className="block text-sm font-medium mb-1"
          >
            Enter your private key to proceed with payment
          </label>
          <input
            id="privateKeyInput"
            type="password"
            value={privateKey}
            onChange={(e) => {
              setPrivateKey(e.target.value);
              if (privateKeyError) setPrivateKeyError(null);
            }}
            placeholder="Private Key"
            className="w-full border border-gray-300 rounded px-3 py-2 mb-2"
            autoFocus
          />
          {privateKeyError && (
            <p className="text-red-600 text-sm mb-2">{privateKeyError}</p>
          )}
          <Button
            type="submit"
            onClick={handleProceedClick}
            className="bg-[#123962] hover:bg-[#90A5FB] text-white w-full"
          >
            Proceed to Payment
          </Button>
        </div>
      )}

      <div className="flex gap-3 mt-6">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
      </div>
    </div>
  );
}
