'use client';

import { Button } from "@/components/ui/button";
import { useFormStatus } from "react-dom";

export function SubmitButton({
  children,
  pendingText,
  formAction,
}: {
  children: React.ReactNode;
  pendingText: string;
  formAction: (formData: FormData) => Promise<void>;
}) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      formAction={formAction}
      disabled={pending}
      className="w-full"
    >
      {pending ? pendingText : children}
    </Button>
  );
} 