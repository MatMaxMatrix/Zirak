import { toast, ToastT } from "sonner";

// Notification service
export const notification = {
  /**
   * Show a success notification
   * @param message The message to display
   * @param options Optional toast options
   */
  success: (message: string, options?: Partial<ToastT>) => {
    return toast.success(message, options);
  },

  /**
   * Show an error notification
   * @param message The message to display
   * @param options Optional toast options
   */
  error: (message: string, options?: Partial<ToastT>) => {
    return toast.error(message, options);
  },

  /**
   * Show a warning notification
   * @param message The message to display
   * @param options Optional toast options
   */
  warning: (message: string, options?: Partial<ToastT>) => {
    return toast.warning(message, options);
  },

  /**
   * Show an info notification
   * @param message The message to display
   * @param options Optional toast options
   */
  info: (message: string, options?: Partial<ToastT>) => {
    return toast.info(message, options);
  },

  /**
   * Show a loading notification that can be updated
   * @param message The loading message
   * @param promise The promise to wait for
   * @param options Success and error message options
   */
  promise: <T>(
    promise: Promise<T>,
    options: {
      loading: string;
      success: string | ((data: T) => string);
      error: string | ((error: unknown) => string);
    }
  ) => {
    return toast.promise(promise, options);
  },

  /**
   * Show a notification with custom component
   * @param component The React component to render
   * @param options Optional toast options
   */
  custom: (component: React.ReactNode, options?: Partial<ToastT>) => {
    return toast(component, options);
  },

  /**
   * Show a notification with action buttons
   * @param message The message to display
   * @param options Action buttons configuration
   */
  action: (
    message: string,
    options: {
      actionButtonText: string;
      onActionButtonClick: () => void;
      cancelButtonText?: string;
      onCancelButtonClick?: () => void;
    },
    toastOptions?: Partial<ToastT>
  ) => {
    return toast(message, {
      ...toastOptions,
      action: {
        label: options.actionButtonText,
        onClick: options.onActionButtonClick,
      },
      cancel: options.cancelButtonText ? {
        label: options.cancelButtonText,
        onClick: options.onCancelButtonClick || (() => {}),
      } : undefined,
    });
  },

  /**
   * Dismiss a specific toast by ID or all toasts
   * @param toastId Optional toast ID
   */
  dismiss: (toastId?: string | number) => {
    if (toastId) {
      toast.dismiss(toastId);
    } else {
      toast.dismiss();
    }
  },
};
