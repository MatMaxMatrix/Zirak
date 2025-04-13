'use client';

import { Alert, AlertDescription } from "@/components/ui/alert";
import { useSearchParams } from "next/navigation";

export type Message = {
  type: "error" | "success";
  message: string;
} | null;

export function FormMessage({ message }: { message: Message }) {
  const searchParams = useSearchParams();
  const error = searchParams.get("error");
  const success = searchParams.get("success");

  if (message) {
    return (
      <Alert variant={message.type === "error" ? "destructive" : "default"}>
        <AlertDescription>{message.message}</AlertDescription>
      </Alert>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  if (success) {
    return (
      <Alert>
        <AlertDescription>{success}</AlertDescription>
      </Alert>
    );
  }

  return null;
} 