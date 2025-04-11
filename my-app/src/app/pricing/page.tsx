"use client";

import { Button } from "@/components/ui/button";
import { Rocket, Calendar, Mail, BellRing, ArrowRight, Construction } from "lucide-react";
import Link from 'next/link';
import { useState } from "react";
import { useRouter } from 'next/navigation';
import { motion } from "framer-motion";

export default function ComingSoonPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    // Simulate API call to add email to list
    setTimeout(() => {
      setIsSubmitting(false);
      setSubmitted(true);
      setEmail("");
      
      // Redirect to waitlist after successful submission
      setTimeout(() => {
        router.push('/waitlist');
      }, 1500);
    }, 1000);
  };

  const features = [
    {
      icon: <Rocket className="h-8 w-8 text-blue-500" />,
      title: "Free Launch Access",
      description: "Early subscribers will be the first to access our platform for free"
    },
    {
      icon: <Calendar className="h-8 w-8 text-blue-500" />,
      title: "Tiered Pricing",
      description: "Custom plans for developers, teams, and enterprises"
    },
    {
      icon: <BellRing className="h-8 w-8 text-blue-500" />,
      title: "Pricing Notifications",
      description: "Get notified when our pricing plans are available"
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 to-black text-white pb-20">
      {/* Hero Section */}
      <div className="pt-20 pb-10 px-4 text-center max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="inline-block mb-6 p-2 bg-blue-500/20 rounded-xl">
            <Construction className="h-8 w-8 text-blue-400" />
          </div>
          <h1 className="text-4xl md:text-6xl font-bold mb-6">
            Pricing Plans Coming Soon
          </h1>
          <p className="text-xl text-gray-400 max-w-2xl mx-auto mb-8">
            We're currently developing our pricing structure to provide the best value for developers and teams.
            Join our waitlist to be the first to know when our plans are available.
          </p>
        </motion.div>

        {/* CTA buttons */}
        <motion.div 
          className="flex flex-col sm:flex-row gap-4 justify-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <Button 
            onClick={() => router.push('/waitlist')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-6 text-lg rounded-xl"
          >
            Join Waitlist <ArrowRight className="ml-2 h-5 w-5" />
          </Button>
          <Button 
            variant="outline"
            onClick={() => router.push('/')}
            className="border-gray-700 hover:bg-gray-800 text-white px-8 py-6 text-lg rounded-xl"
          >
            Back to Home
          </Button>
        </motion.div>
      </div>

      {/* Features Section */}
      <div className="max-w-6xl mx-auto px-4 py-16">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-3 gap-8"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
        >
          {features.map((feature, index) => (
            <div 
              key={index}
              className="bg-gray-800/50 backdrop-blur-sm p-8 rounded-xl border border-gray-700 hover:border-blue-500/50 transition-all duration-300"
            >
              <div className="mb-4">{feature.icon}</div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-400">{feature.description}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* Contact Section */}
      <div className="max-w-2xl mx-auto px-4 py-10">
        <motion.div 
          className="bg-gray-800/20 backdrop-blur-sm p-8 rounded-xl border border-gray-700 text-center"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.8 }}
        >
          <h2 className="text-2xl font-bold mb-4">Need more information?</h2>
          <p className="text-gray-400 mb-6">
            If you have specific questions about our upcoming pricing plans or need information for your business, feel free to reach out.
          </p>
          <Button 
            onClick={() => router.push('/contact')}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2"
          >
            <Mail className="mr-2 h-4 w-4" /> Contact Us
          </Button>
        </motion.div>
      </div>
    </div>
  );
} 