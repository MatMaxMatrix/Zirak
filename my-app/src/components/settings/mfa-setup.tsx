"use client";

import { useState } from "react";
import Image from "next/image";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { notification } from "@/lib/notification";
import {
  Smartphone,
  QrCode,
  Copy,
  Check,
  ShieldCheck,
  Mail,
  Key,
} from "lucide-react";

// QR code generation mock - in a real app, use a QR code generation library
const generateQrCode = (secret: string): string => {
  return `data:image/png;base64,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`;
};

// Generate a random secret key - in a real app, this would use a secure generator
const generateSecret = (): string => {
  return 'ABCDEFGHJKLMNPQRSTUVWXYZ234567';
};

interface MfaSetupProps {
  userId: string;
  userEmail: string;
  onComplete?: () => void;
}

export function MfaSetup({ userId, userEmail, onComplete }: MfaSetupProps) {
  const [step, setStep] = useState<'intro' | 'qrcode' | 'verify' | 'complete'>('intro');
  const [secret, setSecret] = useState('');
  const [qrCode, setQrCode] = useState('');
  const [mfaOptions, setMfaOptions] = useState({
    authenticator: true,
    email: false,
    sms: false,
  });

  const verifyForm = useForm<{ code: string }>({
    resolver: zodResolver(
      z.object({
        code: z
          .string()
          .min(6, { message: "Verification code must be 6 digits." })
          .max(6, { message: "Verification code must be 6 digits." })
          .regex(/^\d+$/, { message: "Verification code must contain only digits." }),
      })
    ),
    defaultValues: {
      code: '',
    },
  });

  const startSetup = (): void => {
    // Generate a new secret and QR code for the user
    const newSecret = generateSecret();
    setSecret(newSecret);
    const newQrCode = generateQrCode(newSecret);
    setQrCode(newQrCode);
    setStep('qrcode');
  };

  const verifyCode = (data: { code: string }): void => {
    // In a real application, you would verify the code with the secret
    // For this demo, we'll accept any 6-digit code

    // Simulate verification
    notification.success("Verification successful! MFA is now enabled.");
    setStep('complete');

    if (onComplete) {
      onComplete();
    }
  };

  const copyToClipboard = (): void => {
    navigator.clipboard.writeText(secret);
    notification.info("Secret key copied to clipboard.");
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Multi-Factor Authentication</CardTitle>
        <CardDescription>
          {step === 'intro' && "Add an extra layer of security to your account"}
          {step === 'qrcode' && "Scan the QR code with your authenticator app"}
          {step === 'verify' && "Enter the verification code from your authenticator app"}
          {step === 'complete' && "MFA setup complete"}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {step === 'intro' && (
          <div className="space-y-4">
            <Alert>
              <ShieldCheck className="h-4 w-4" />
              <AlertTitle>Enhanced Security</AlertTitle>
              <AlertDescription>
                Multi-factor authentication adds an extra layer of security to your account by requiring a second verification step when you log in.
              </AlertDescription>
            </Alert>

            <div className="space-y-4 mt-6">
              <h3 className="text-lg font-medium">MFA Options</h3>

              <div className="space-y-4">
                <div className="flex items-center justify-between space-x-2">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Authenticator App</p>
                      <p className="text-sm text-muted-foreground">
                        Use an app like Google Authenticator or Authy
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={mfaOptions.authenticator}
                    onCheckedChange={(checked) =>
                      setMfaOptions({ ...mfaOptions, authenticator: checked })
                    }
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="flex items-center space-x-2">
                    <Mail className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">Email</p>
                      <p className="text-sm text-muted-foreground">
                        Receive verification codes via email
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={mfaOptions.email}
                    onCheckedChange={(checked) =>
                      setMfaOptions({ ...mfaOptions, email: checked })
                    }
                    disabled={true}
                  />
                </div>

                <div className="flex items-center justify-between space-x-2">
                  <div className="flex items-center space-x-2">
                    <Smartphone className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <p className="font-medium">SMS</p>
                      <p className="text-sm text-muted-foreground">
                        Receive verification codes via text message
                      </p>
                    </div>
                  </div>
                  <Switch
                    checked={mfaOptions.sms}
                    onCheckedChange={(checked) =>
                      setMfaOptions({ ...mfaOptions, sms: checked })
                    }
                    disabled={true}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 'qrcode' && (
          <div className="space-y-6">
            <div className="flex flex-col items-center justify-center space-y-4">
              <div className="border p-2 rounded-lg">
                <Image
                  src={qrCode}
                  alt="QR Code"
                  width={224}
                  height={224}
                  style={{width: '224px', height: '224px'}}
                />
              </div>
              <p className="text-sm text-center text-muted-foreground">
                Scan this QR code with your authenticator app
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium">Or enter this code manually:</p>
              <div className="flex items-center space-x-2">
                <code className="bg-muted p-2 rounded text-sm font-mono w-full text-center">
                  {secret}
                </code>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={copyToClipboard}
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Alert>
              <Key className="h-4 w-4" />
              <AlertTitle>Important:</AlertTitle>
              <AlertDescription>
                If you lose access to your authenticator app, you'll need to use recovery codes to regain access to your account. Make sure to store these securely.
              </AlertDescription>
            </Alert>
          </div>
        )}

        {step === 'verify' && (
          <Form {...verifyForm}>
            <form onSubmit={verifyForm.handleSubmit(verifyCode)} className="space-y-4">
              <FormField
                control={verifyForm.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Verification Code</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="Enter 6-digit code"
                        {...field}
                        maxLength={6}
                        className="text-center font-mono text-lg tracking-widest"
                      />
                    </FormControl>
                    <FormDescription>
                      Enter the 6-digit code from your authenticator app
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </form>
          </Form>
        )}

        {step === 'complete' && (
          <div className="py-6 text-center">
            <div className="mx-auto bg-green-100 dark:bg-green-900/20 w-12 h-12 rounded-full flex items-center justify-center mb-4">
              <Check className="h-6 w-6 text-green-600 dark:text-green-400" />
            </div>
            <h3 className="text-lg font-medium mb-2">MFA Successfully Enabled</h3>
            <p className="text-muted-foreground">
              Your account is now secured with multi-factor authentication.
            </p>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {step === 'intro' && (
          <>
            <Button variant="outline" onClick={() => onComplete && onComplete()}>
              Cancel
            </Button>
            <Button onClick={startSetup} disabled={!mfaOptions.authenticator}>
              Continue
            </Button>
          </>
        )}

        {step === 'qrcode' && (
          <>
            <Button variant="outline" onClick={() => setStep('intro')}>
              Back
            </Button>
            <Button onClick={() => setStep('verify')}>
              Continue
            </Button>
          </>
        )}

        {step === 'verify' && (
          <>
            <Button variant="outline" onClick={() => setStep('qrcode')}>
              Back
            </Button>
            <Button onClick={verifyForm.handleSubmit(verifyCode)}>
              Verify
            </Button>
          </>
        )}

        {step === 'complete' && (
          <Button className="w-full" onClick={() => onComplete && onComplete()}>
            Done
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
