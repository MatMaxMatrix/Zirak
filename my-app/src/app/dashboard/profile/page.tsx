"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Briefcase,
  Calendar,
  Globe,
  Twitter,
  Linkedin,
  Github,
  Save,
  Upload
} from "lucide-react";

// Profile form schema
const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().max(160, {
    message: "Bio must not be longer than 160 characters.",
  }),
  jobTitle: z.string().optional(),
  department: z.string().optional(),
  website: z.string().url({ message: "Please enter a valid URL." }).optional().or(z.literal("")),
  twitter: z.string().optional(),
  linkedin: z.string().optional(),
  github: z.string().optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Pre-filled profile data (simulate data from API/database)
const defaultValues: Partial<ProfileFormValues> = {
  name: "Admin User",
  email: "admin@example.com",
  phone: "+1 (555) 123-4567",
  location: "San Francisco, CA",
  bio: "Full-stack developer with a passion for creating intuitive user interfaces.",
  jobTitle: "Senior Developer",
  department: "Engineering",
  website: "https://example.com",
  twitter: "adminuser",
  linkedin: "adminuser",
  github: "adminuser",
};

export default function ProfilePage() {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange",
  });

  function onSubmit(data: ProfileFormValues) {
    toast.success("Profile updated successfully!");
  }

  function simulateImageUpload() {
    setIsUploading(true);

    setTimeout(() => {
      setIsUploading(false);
      toast.success("Profile picture updated!");
    }, 1500);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information and how it appears across the platform.
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_3fr]">
        {/* Profile Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Your Profile</CardTitle>
            <CardDescription>How others see you on the platform</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src="https://github.com/shadcn.png" alt="Profile" />
                <AvatarFallback className="text-4xl">AU</AvatarFallback>
              </Avatar>
              <Button
                variant="secondary"
                size="icon"
                className="absolute -bottom-2 -right-2 h-8 w-8 rounded-full"
                onClick={simulateImageUpload}
                disabled={isUploading}
              >
                <Upload className="h-4 w-4" />
                <span className="sr-only">Upload new photo</span>
              </Button>
            </div>

            <div className="text-center">
              <h3 className="text-xl font-semibold">{form.watch("name")}</h3>
              <p className="text-sm text-muted-foreground">{form.watch("jobTitle")}</p>
            </div>

            <div className="w-full space-y-2 text-sm">
              <div className="flex items-center">
                <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{form.watch("email")}</span>
              </div>
              {form.watch("phone") && (
                <div className="flex items-center">
                  <Phone className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{form.watch("phone")}</span>
                </div>
              )}
              {form.watch("location") && (
                <div className="flex items-center">
                  <MapPin className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{form.watch("location")}</span>
                </div>
              )}
              {form.watch("department") && (
                <div className="flex items-center">
                  <Briefcase className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span>{form.watch("department")}</span>
                </div>
              )}
            </div>

            <div className="flex space-x-2">
              {form.watch("twitter") && (
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={`https://twitter.com/${form.watch("twitter")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Twitter className="h-4 w-4" />
                    <span className="sr-only">Twitter</span>
                  </a>
                </Button>
              )}
              {form.watch("github") && (
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={`https://github.com/${form.watch("github")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Github className="h-4 w-4" />
                    <span className="sr-only">GitHub</span>
                  </a>
                </Button>
              )}
              {form.watch("linkedin") && (
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={`https://linkedin.com/in/${form.watch("linkedin")}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Linkedin className="h-4 w-4" />
                    <span className="sr-only">LinkedIn</span>
                  </a>
                </Button>
              )}
              {form.watch("website") && (
                <Button variant="outline" size="icon" asChild>
                  <a
                    href={form.watch("website") || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Globe className="h-4 w-4" />
                    <span className="sr-only">Website</span>
                  </a>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Form Card */}
        <Card>
          <CardHeader>
            <CardTitle>Edit Profile</CardTitle>
            <CardDescription>Update your profile information</CardDescription>
          </CardHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)}>
              <CardContent className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Basic Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your full name" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input placeholder="Your email" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="phone"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Phone Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Your phone number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="location"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Location</FormLabel>
                          <FormControl>
                            <Input placeholder="City, Country" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="bio"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Bio</FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Tell us a little about yourself"
                            className="resize-none"
                            {...field}
                          />
                        </FormControl>
                        <FormDescription>
                          Brief description for your profile. Max 160 characters.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <Separator />

                {/* Work Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Work Information</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="jobTitle"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Job Title</FormLabel>
                          <FormControl>
                            <Input placeholder="Your job title" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="department"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Department</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select department" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="Engineering">Engineering</SelectItem>
                              <SelectItem value="Marketing">Marketing</SelectItem>
                              <SelectItem value="Sales">Sales</SelectItem>
                              <SelectItem value="Product">Product</SelectItem>
                              <SelectItem value="Design">Design</SelectItem>
                              <SelectItem value="Operations">Operations</SelectItem>
                              <SelectItem value="Finance">Finance</SelectItem>
                              <SelectItem value="HR">HR</SelectItem>
                              <SelectItem value="Other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* Social Links */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Social Links</h3>
                  <div className="grid gap-4 md:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="website"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Website</FormLabel>
                          <FormControl>
                            <Input placeholder="https://yourwebsite.com" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="twitter"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Twitter</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="linkedin"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>LinkedIn</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="github"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>GitHub</FormLabel>
                          <FormControl>
                            <Input placeholder="username" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit">
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
}
