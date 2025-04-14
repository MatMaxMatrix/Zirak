import { Card } from "@/components/ui/card";

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-x-hidden bg-grid-pattern py-12 px-4 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md p-8 bg-background/80 backdrop-blur-sm">
        {children}
      </Card>
    </div>
  );
} 