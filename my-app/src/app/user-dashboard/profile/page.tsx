"use client";

import { useState, useEffect } from "react";
import { useUser } from "@auth0/nextjs-auth0/client";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { getSupabase } from "@/utils/supabase";

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
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Separator } from "@/components/ui/separator";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Upload,
  Save,
  Loader2
} from "lucide-react";

// Profile form schema
const profileFormSchema = z.object({
  name: z.string().min(2, {
    message: "Name must be at least 2 characters.",
  }),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }).optional(),
  phone: z.string().optional(),
  location: z.string().optional(),
  bio: z.string().max(160, {
    message: "Bio must not be longer than 160 characters.",
  }).optional(),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

// Add Auth0 user type definition with accessToken
interface Auth0User {
  sub: string;
  name?: string;
  email?: string;
  picture?: string;
  accessToken?: string;
}

export default function ProfilePage() {
  const { user } = useUser();
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [profileData, setProfileData] = useState<any>(null);
  
  // Type cast user to include accessToken
  const auth0User = user as Auth0User;
  
  useEffect(() => {
    async function fetchProfileData() {
      if (!auth0User) return;
      
      try {
        const supabase = getSupabase(auth0User.accessToken);
        
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', auth0User.sub)
          .single();
          
        if (error) throw error;
        
        if (data) {
          setProfileData(data);
          form.reset({
            name: data.full_name || auth0User.name || "",
            email: auth0User.email || "",
            phone: data.phone_number || "",
            location: data.location || "",
            bio: data.metadata?.bio || "",
          });
        }
      } catch (error) {
        console.error('Error fetching profile:', error);
        toast.error("Failed to load profile data");
      }
    }
    
    fetchProfileData();
  }, [auth0User]);

  // Set default form values from Auth0 user profile
  const defaultValues: Partial<ProfileFormValues> = {
    name: auth0User?.name || "",
    email: auth0User?.email || "",
    phone: "",
    location: "",
    bio: "",
  };

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues,
    mode: "onChange",
  });

  async function onSubmit(data: ProfileFormValues) {
    if (!auth0User) return;
    
    setIsSubmitting(true);
    
    try {
      const supabase = getSupabase(auth0User.accessToken);
      
      // Create a metadata object to store bio since it's not a direct column
      const metadata = {
        ...(profileData?.metadata || {}),
        bio: data.bio
      };
      
      const { error } = await supabase
        .from('profiles')
        .update({
          full_name: data.name,
          phone_number: data.phone,
          location: data.location,
          metadata: metadata,
          updated_at: new Date().toISOString(),
        })
        .eq('id', auth0User.sub);
        
      if (error) throw error;
      
      toast.success("Profile updated successfully!");
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error("Failed to update profile");
    } finally {
      setIsSubmitting(false);
    }
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
        <h1 className="text-3xl font-bold">Your Profile</h1>
        <p className="text-muted-foreground">
          Manage your personal information
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-[1fr_3fr]">
        {/* Profile Summary Card */}
        <Card>
          <CardHeader>
            <CardTitle>Profile Summary</CardTitle>
            <CardDescription>How others see you</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center space-y-4">
            <div className="relative">
              <Avatar className="h-32 w-32">
                <AvatarImage src={auth0User?.picture || ""} alt={auth0User?.name || "Profile"} />
                <AvatarFallback className="text-4xl">{auth0User?.name?.charAt(0) || "U"}</AvatarFallback>
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
              <p className="text-sm text-muted-foreground">{form.watch("bio") || "No bio added yet"}</p>
            </div>

            <div className="w-full space-y-2 text-sm">
              <div className="flex items-center">
                <Mail className="mr-2 h-4 w-4 text-muted-foreground" />
                <span>{auth0User?.email}</span>
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
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
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
                          <FormLabel>Email Address</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Your email" 
                              {...field} 
                              disabled 
                              value={auth0User?.email || ""}
                            />
                          </FormControl>
                          <FormDescription>
                            Your email is managed by Auth0
                          </FormDescription>
                        </FormItem>
                      )}
                    />
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
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
                            <Input placeholder="Your location" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <Separator />

                {/* About */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">About You</h3>
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
                          Brief description for your profile. Maximum 160 characters.
                        </FormDescription>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
              <CardFooter className="flex justify-end">
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Save Changes
                    </>
                  )}
                </Button>
              </CardFooter>
            </form>
          </Form>
        </Card>
      </div>
    </div>
  );
} 