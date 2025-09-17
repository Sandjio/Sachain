
import * as React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";

// Define Zod schema for private key validation
const privateKeySchema = z.object({
  privateKey: z.string().min(1, "Private key is required"),
});

type PrivateKeyFormValues = z.infer<typeof privateKeySchema>;

interface PrivateKeyInputProps {
  onSubmit: (privateKey: string) => void;
  loading?: boolean;
  error?: string | null;
}

export function PrivateKeyInput({ onSubmit, loading, error }: PrivateKeyInputProps) {
  const form = useForm<PrivateKeyFormValues>({
    resolver: zodResolver(privateKeySchema),
    defaultValues: { privateKey: "" },
  });

  function onFormSubmit(data: PrivateKeyFormValues) {
    onSubmit(data.privateKey.trim());
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onFormSubmit)} className="space-y-6 max-w-md mx-auto p-4 border rounded-lg shadow">
        <FormField
          control={form.control}
          name="privateKey"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Your Private Key</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Paste your private key here"
                  rows={4}
                  {...field}
                  disabled={loading}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        {error && <p className="text-red-600">{error}</p>}
        <Button type="submit" disabled={loading} className="w-full">
          {loading ? "Setting..." : "Proceed to Mint"}
        </Button>
        <p className="text-sm text-red-600 mt-2">
          Warning: Keep your private key safe! Do not share it.
        </p>
      </form>
    </Form>
  );
}
