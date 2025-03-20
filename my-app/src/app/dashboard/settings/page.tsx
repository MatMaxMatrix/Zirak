"use client";

import { useState } from "react";
import { toast } from "sonner";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
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
import { RoleGate } from "@/components/auth/role-gate";
import { UserRole } from "@/lib/roles";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useSession } from "next-auth/react";
import { MfaSetup } from "@/components/settings/mfa-setup";
import {
  Bell,
  Shield,
  User,
  Mail,
  Key,
  Lock,
  CreditCard,
  LogOut,
  AlertTriangle,
  Save,
  ShieldAlert,
  ShieldCheck,
  ShieldX
} from "lucide-react";
import { notification } from "@/lib/notification";

// Account form schema
const accountFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
});

// Notification settings schema
const notificationFormSchema = z.object({
  emailNotifications: z.boolean().default(true),
  pushNotifications: z.boolean().default(false),
  marketingEmails: z.boolean().default(false),
  activityEmails: z.boolean().default(true),
});

// Security settings schema
const securityFormSchema = z.object({
  twoFactorAuth: z.boolean().default(false),
  passwordChangeReminders: z.boolean().default(true),
  securityAlerts: z.boolean().default(true),
});

type AccountFormValues = z.infer<typeof accountFormSchema>;
type NotificationFormValues = z.infer<typeof notificationFormSchema>;
type SecurityFormValues = z.infer<typeof securityFormSchema>;

export default function SettingsPage() {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showMfaSetup, setShowMfaSetup] = useState(false);
  const { data: session } = useSession();

  const accountForm = useForm<AccountFormValues>({
    resolver: zodResolver(accountFormSchema),
    defaultValues: {
      name: session?.user?.name || "Admin User",
      email: session?.user?.email || "admin@example.com",
    },
  });

  const notificationForm = useForm<NotificationFormValues>({
    resolver: zodResolver(notificationFormSchema),
    defaultValues: {
      emailNotifications: true,
      pushNotifications: false,
      marketingEmails: false,
      activityEmails: true,
    },
  });

  const securityForm = useForm<SecurityFormValues>({
    resolver: zodResolver(securityFormSchema),
    defaultValues: {
      twoFactorAuth: false,
      passwordChangeReminders: true,
      securityAlerts: true,
    },
  });

  function onAccountSubmit(data: AccountFormValues) {
    notification.success("Account settings updated!");
  }

  function onNotificationSubmit(data: NotificationFormValues) {
    notification.success("Notification preferences updated!");
  }

  function onSecuritySubmit(data: SecurityFormValues) {
    notification.success("Security settings updated!");
  }

  function handleAccountDeletion() {
    setIsDeleting(true);
    setTimeout(() => {
      setIsDeleting(false);
      notification.success("Your account has been deleted.");
    }, 2000);
  }

  function handleMfaComplete() {
    setShowMfaSetup(false);
    securityForm.setValue("twoFactorAuth", true);
    notification.success("MFA has been set up successfully!");
  }

  const handleToggleMfa = (checked: boolean) => {
    if (checked) {
      // Show the MFA setup component
      setShowMfaSetup(true);
      return;
    }

    // Disable MFA
    securityForm.setValue("twoFactorAuth", false);
    notification.warning("Multi-factor authentication has been disabled.");
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Manage your account settings and preferences.
        </p>
      </div>

      <Tabs defaultValue="account" className="w-full">
        <TabsList className="grid w-full grid-cols-3 mb-8">
          <TabsTrigger value="account" className="text-center">
            <User className="h-4 w-4 mr-2" />
            Account
          </TabsTrigger>
          <TabsTrigger value="notifications" className="text-center">
            <Bell className="h-4 w-4 mr-2" />
            Notifications
          </TabsTrigger>
          <TabsTrigger value="security" className="text-center">
            <Shield className="h-4 w-4 mr-2" />
            Security
          </TabsTrigger>
        </TabsList>

        {/* Account Settings */}
        <TabsContent value="account">
          <Card>
            <CardHeader>
              <CardTitle>Account Settings</CardTitle>
              <CardDescription>
                Update your personal information and profile settings.
              </CardDescription>
            </CardHeader>
            <Form {...accountForm}>
              <form onSubmit={accountForm.handleSubmit(onAccountSubmit)}>
                <CardContent className="space-y-6">
                  <div className="space-y-4">
                    <FormField
                      control={accountForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={accountForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Your email" {...field} />
                          </FormControl>
                          <FormDescription>
                            This is the email others will see.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium">Danger Zone</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Permanently delete your account and all of your data.
                    </p>
                    <Button
                      variant="destructive"
                      onClick={handleAccountDeletion}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <>Deleting Account...</>
                      ) : (
                        <>
                          <AlertTriangle className="h-4 w-4 mr-2" />
                          Delete Account
                        </>
                      )}
                    </Button>
                  </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Save Changes
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>

        {/* Notification Settings */}
        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>Notification Settings</CardTitle>
              <CardDescription>
                Configure how and when you want to be notified.
              </CardDescription>
            </CardHeader>
            <Form {...notificationForm}>
              <form onSubmit={notificationForm.handleSubmit(onNotificationSubmit)}>
                <CardContent className="space-y-6">
                  <FormField
                    control={notificationForm.control}
                    name="emailNotifications"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Email Notifications
                          </FormLabel>
                          <FormDescription>
                            Receive email notifications for important updates.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={notificationForm.control}
                    name="pushNotifications"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Push Notifications
                          </FormLabel>
                          <FormDescription>
                            Receive push notifications in your browser.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={notificationForm.control}
                    name="marketingEmails"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Marketing Emails
                          </FormLabel>
                          <FormDescription>
                            Receive emails about new features and offers.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={notificationForm.control}
                    name="activityEmails"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between rounded-lg border p-4">
                        <div className="space-y-0.5">
                          <FormLabel className="text-base">
                            Activity Emails
                          </FormLabel>
                          <FormDescription>
                            Receive emails about your account activity.
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </CardContent>
                <CardFooter className="flex justify-end">
                  <Button type="submit">
                    <Save className="h-4 w-4 mr-2" />
                    Save Preferences
                  </Button>
                </CardFooter>
              </form>
            </Form>
          </Card>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security">
          {showMfaSetup ? (
            <MfaSetup
              userId={session?.user?.id || "1"}
              userEmail={session?.user?.email || "admin@example.com"}
              onComplete={handleMfaComplete}
            />
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>
                  Manage your account security and authentication methods.
                </CardDescription>
              </CardHeader>
              <Form {...securityForm}>
                <form onSubmit={securityForm.handleSubmit(onSecuritySubmit)}>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="rounded-lg border p-4">
                        <h3 className="font-medium flex items-center">
                          <Key className="h-4 w-4 mr-2" />
                          Change Password
                        </h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Update your password to keep your account secure.
                        </p>
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <label htmlFor="current-password" className="text-sm font-medium">
                              Current Password
                            </label>
                            <Input
                              id="current-password"
                              type="password"
                              placeholder="••••••••"
                            />
                          </div>
                          <div className="grid gap-2">
                            <label htmlFor="new-password" className="text-sm font-medium">
                              New Password
                            </label>
                            <Input
                              id="new-password"
                              type="password"
                              placeholder="••••••••"
                            />
                          </div>
                          <div className="grid gap-2">
                            <label htmlFor="confirm-password" className="text-sm font-medium">
                              Confirm Password
                            </label>
                            <Input
                              id="confirm-password"
                              type="password"
                              placeholder="••••••••"
                            />
                          </div>
                          <Button className="w-full sm:w-auto" variant="outline">
                            <Lock className="h-4 w-4 mr-2" />
                            Update Password
                          </Button>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div className="space-y-4">
                      <FormField
                        control={securityForm.control}
                        name="twoFactorAuth"
                        render={({ field }) => (
                          <FormItem className="flex flex-col rounded-lg border p-4">
                            <div className="flex items-center justify-between">
                              <div className="space-y-0.5">
                                <div className="flex items-center">
                                  <ShieldCheck className="h-4 w-4 mr-2 text-primary" />
                                  <FormLabel className="text-base font-medium">
                                    Two-Factor Authentication
                                  </FormLabel>
                                </div>
                                <FormDescription>
                                  Add an extra layer of security to your account.
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={handleToggleMfa}
                                />
                              </FormControl>
                            </div>

                            {field.value && (
                              <div className="mt-4 pt-4 border-t">
                                <div className="flex items-start gap-2">
                                  <ShieldAlert className="h-4 w-4 mt-1 text-green-500" />
                                  <div>
                                    <p className="font-medium">MFA is enabled</p>
                                    <p className="text-sm text-muted-foreground">
                                      Your account is protected with multi-factor authentication. You will need to provide a verification code when signing in.
                                    </p>
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      className="mt-2"
                                      onClick={() => setShowMfaSetup(true)}
                                    >
                                      Reconfigure MFA
                                    </Button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={securityForm.control}
                        name="passwordChangeReminders"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Password Change Reminders
                              </FormLabel>
                              <FormDescription>
                                Receive reminders to change your password periodically.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={securityForm.control}
                        name="securityAlerts"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                              <FormLabel className="text-base">
                                Security Alerts
                              </FormLabel>
                              <FormDescription>
                                Receive alerts for suspicious account activity.
                              </FormDescription>
                            </div>
                            <FormControl>
                              <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                              />
                            </FormControl>
                          </FormItem>
                        )}
                      />
                    </div>

                    <Separator />

                    <div className="rounded-lg border p-4">
                      <h3 className="font-medium flex items-center">
                        <LogOut className="h-4 w-4 mr-2" />
                        Active Sessions
                      </h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        These are the devices that are currently logged into your account.
                      </p>
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Current Browser</p>
                            <p className="text-xs text-muted-foreground">
                              Chrome on Windows • Active now
                            </p>
                          </div>
                          <Button variant="outline" size="sm" disabled>
                            Current
                          </Button>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">Mobile Device</p>
                            <p className="text-xs text-muted-foreground">
                              Safari on iPhone • Last active: 2 days ago
                            </p>
                          </div>
                          <Button variant="outline" size="sm">
                            Log Out
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter className="flex justify-end">
                    <Button type="submit">
                      <Save className="h-4 w-4 mr-2" />
                      Save Security Settings
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>
          )}

          {/* Display different security recommendations based on role */}
          <RoleGate allowedRoles={[UserRole.ADMIN]}>
            <Card className="mt-6">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ShieldAlert className="h-5 w-5 mr-2 text-amber-500" />
                  Admin Security Recommendations
                </CardTitle>
                <CardDescription>
                  As an administrator, your account has elevated privileges. Consider these additional security steps.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-lg border p-4">
                  <h3 className="font-medium">Enable Advanced Authentication</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    Administrators should use the strongest authentication methods available.
                  </p>
                  <Button size="sm" variant="outline">
                    Configure Advanced Settings
                  </Button>
                </div>

                <div className="rounded-lg border p-4">
                  <h3 className="font-medium">Regular Security Audits</h3>
                  <p className="text-sm text-muted-foreground mt-1 mb-3">
                    We recommend running regular security audits on your administrative privileges.
                  </p>
                  <Button size="sm" variant="outline">
                    Run Security Audit
                  </Button>
                </div>
              </CardContent>
            </Card>
          </RoleGate>
        </TabsContent>
      </Tabs>
    </div>
  );
}
