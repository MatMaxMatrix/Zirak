import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AboutPage() {
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-3xl mx-auto">
        <Link href="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary mb-6">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Home
        </Link>
        
        <h1 className="text-4xl font-bold mb-6">About Us</h1>
        
        <div className="prose prose-lg dark:prose-invert">
          <p className="text-lg mb-4">
            Welcome to our dashboard demo application. This project showcases a modern web application built with Next.js, React, and Tailwind CSS.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Our Mission</h2>
          <p>
            To demonstrate the power and flexibility of modern web development tools and frameworks. This application serves as a template and learning resource for developers looking to build robust, responsive, and user-friendly web applications.
          </p>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Technologies Used</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li><strong>Next.js</strong> - The React framework for production</li>
            <li><strong>React</strong> - A JavaScript library for building user interfaces</li>
            <li><strong>Tailwind CSS</strong> - A utility-first CSS framework</li>
            <li><strong>shadcn/ui</strong> - Reusable components built with Radix UI and Tailwind CSS</li>
            <li><strong>TypeScript</strong> - JavaScript with syntax for types</li>
          </ul>
          
          <h2 className="text-2xl font-semibold mt-8 mb-4">Features</h2>
          <ul className="list-disc pl-6 space-y-2">
            <li>Responsive design that works on all devices</li>
            <li>Dark mode support</li>
            <li>Authentication system</li>
            <li>Dashboard with analytics</li>
            <li>User management</li>
            <li>Settings and preferences</li>
          </ul>
          
          <div className="bg-primary/5 p-6 rounded-lg mt-8 border border-primary/10">
            <h3 className="text-xl font-semibold mb-2">Get Started</h3>
            <p className="mb-4">Ready to explore? Log in with one of our demo accounts:</p>
            <p><strong>Admin:</strong> admin@example.com / password123</p>
            <p><strong>User:</strong> user@example.com / password123</p>
          </div>
        </div>
      </div>
    </div>
  );
} 