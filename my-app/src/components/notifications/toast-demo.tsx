"use client";

import { useState } from "react";
import { notification } from "@/lib/notification";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Info,
  Loader2,
  BellRing
} from "lucide-react";

// Simulated async operation
const simulateAsyncOperation = async (): Promise<string> => {
  return new Promise((resolve, reject) => {
    // Randomly succeed or fail
    const willSucceed = Math.random() > 0.3;

    setTimeout(() => {
      if (willSucceed) {
        resolve("Operation completed successfully!");
      } else {
        reject(new Error("Operation failed with an error"));
      }
    }, 2000);
  });
};

export function ToastDemo() {
  const [customMessage, setCustomMessage] = useState("This is a custom notification");

  const showSuccessToast = () => {
    notification.success("Success! Your action was completed successfully.");
  };

  const showErrorToast = () => {
    notification.error("Error! Something went wrong.");
  };

  const showWarningToast = () => {
    notification.warning("Warning! This action may have consequences.");
  };

  const showInfoToast = () => {
    notification.info("Information: Your session will expire in 5 minutes.");
  };

  const showPromiseToast = () => {
    notification.promise(simulateAsyncOperation(), {
      loading: "Processing your request...",
      success: (data) => data,
      error: (error) => `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
    });
  };

  const showCustomToast = () => {
    notification.custom(
      <div className="flex items-center gap-2">
        <BellRing className="h-5 w-5 text-blue-500" />
        <span>{customMessage}</span>
      </div>
    );
  };

  const showActionToast = () => {
    notification.action(
      "Would you like to enable notifications?",
      {
        actionButtonText: "Enable",
        onActionButtonClick: () => notification.success("Notifications enabled!"),
        cancelButtonText: "Not now",
        onCancelButtonClick: () => notification.info("Maybe next time!"),
      }
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Notification System Demo</CardTitle>
        <CardDescription>
          Try out different types of notifications using our notification system
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={showSuccessToast} className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4" />
            Show Success Toast
          </Button>

          <Button onClick={showErrorToast} variant="destructive" className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4" />
            Show Error Toast
          </Button>

          <Button onClick={showWarningToast} variant="outline" className="flex items-center gap-2 border-yellow-500 text-yellow-500 hover:bg-yellow-500/10">
            <AlertTriangle className="h-4 w-4" />
            Show Warning Toast
          </Button>

          <Button onClick={showInfoToast} variant="outline" className="flex items-center gap-2">
            <Info className="h-4 w-4" />
            Show Info Toast
          </Button>

          <Button onClick={showPromiseToast} variant="outline" className="flex items-center gap-2">
            <Loader2 className="h-4 w-4" />
            Show Promise Toast
          </Button>

          <Button onClick={showActionToast} variant="secondary" className="flex items-center gap-2">
            <BellRing className="h-4 w-4" />
            Show Action Toast
          </Button>
        </div>

        <div className="space-y-2">
          <h3 className="text-sm font-medium">Custom Toast</h3>
          <div className="flex gap-2">
            <Input
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              placeholder="Enter a custom message"
              className="flex-1"
            />
            <Button onClick={showCustomToast}>Show Custom Toast</Button>
          </div>
        </div>
      </CardContent>
      <CardFooter className="text-sm text-muted-foreground">
        All notifications can be customized and configured for various use cases.
      </CardFooter>
    </Card>
  );
}
