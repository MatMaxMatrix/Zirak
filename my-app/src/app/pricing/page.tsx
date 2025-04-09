"use client";

import { Button } from "@/components/ui/button";
import { Check, X, Menu, ArrowRight } from "lucide-react";
import { useState, useEffect, useCallback, useRef } from "react";
import { ResizeHandle } from "@/components/ui/resize-handle";
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function PricingPage() {
  const router = useRouter();
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [sectionHeights, setSectionHeights] = useState({
    pricing: 400,
    enterprise: 300,
    faq: 300
  });
  const [isResizing, setIsResizing] = useState(false);
  const lastMousePos = useRef<number>(0);
  const rafId = useRef<number | undefined>(undefined);

  const handleResizeStart = useCallback((section: keyof typeof sectionHeights) => (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
    lastMousePos.current = e.pageY;

    const startHeight = sectionHeights[section];
    let currentHeight = startHeight;

    const handleMouseMove = (e: MouseEvent) => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }

      rafId.current = requestAnimationFrame(() => {
        const delta = e.pageY - lastMousePos.current;
        currentHeight = Math.max(200, currentHeight + delta);
        
        setSectionHeights(prev => ({
          ...prev,
          [section]: currentHeight
        }));
        
        lastMousePos.current = e.pageY;
      });
    };

    const handleMouseUp = () => {
      setIsResizing(false);
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [sectionHeights]);

  // Cleanup any pending animation frames
  useEffect(() => {
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, []);

  const handleEmailClick = () => {
    const subject = "Inquiry about Zirak Enterprise Solutions";
    const mailtoLink = `mailto:azimipanah.mobin@gmail.com?subject=${encodeURIComponent(subject)}`;
    window.location.href = mailtoLink;
  };

  const tiers = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for trying out Zirak",
      features: [
        "5 workflow completions per month",
        "Basic code generation",
        "Community support",
        "Basic file management",
        "Standard response time"
      ],
      nonFeatures: [
        "Priority support",
        "Advanced AI features",
        "Custom templates",
        "Team collaboration",
        "API access"
      ],
      buttonText: "Get Started",
      popular: false
    },
    {
      name: "Pro",
      price: "$19",
      period: "/month",
      description: "For professional developers",
      features: [
        "Up to 500 workflow completions per month",
        "Advanced code generation",
        "Priority support",
        "Advanced file management",
        "Faster response time",
        "Custom templates",
        "API access (100k requests/month)",
        "Basic team collaboration"
      ],
      buttonText: "Start Pro Trial",
      popular: true
    },
    {
      name: "Enterprise",
      price: "Custom",
      description: "For large teams and organizations",
      features: [
        "Everything in Pro",
        "Unlimited API access",
        "24/7 priority support",
        "Advanced team collaboration",
        "Custom AI model training",
        "SSO & advanced security",
        "Dedicated account manager",
        "Custom integrations"
      ],
      buttonText: "Contact Sales",
      popular: false
    }
  ];

  // Handle resize animation
  useEffect(() => {
    const sections = document.querySelectorAll('.resize-section');
    sections.forEach(section => {
      section.classList.add('transition-all', 'duration-300', 'ease-in-out');
    });
  }, []);

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Pricing Header */}
      <div className="py-16 text-center resize-section bg-black/50 backdrop-blur-sm">
        <h1 className="text-4xl md:text-5xl font-bold mb-3 text-white">Simple, transparent pricing</h1>
        <p className="text-lg text-yellow-400 max-w-2xl mx-auto">
          Choose the perfect plan for your needs. All plans include a 14-day free trial.
        </p>
      </div>

      {/* Pricing Tiers */}
      <div className="max-w-6xl mx-auto px-4 pb-16">
        <div 
          className={`grid grid-cols-1 md:grid-cols-3 gap-6 ${isResizing ? '' : 'transition-[height] duration-200 ease-in-out'}`}
          style={{ height: `${sectionHeights.pricing}px` }}
        >
          {tiers.map((tier) => (
            <div
              key={tier.name}
              className={`relative bg-[#111111] rounded-xl p-8 transition-all duration-300 ease-in-out hover:scale-[1.02] border border-gray-800/50 ${
                tier.popular ? 'ring-2 ring-red-500 bg-[#1a1a1a]' : ''
              }`}
              onMouseEnter={() => setActiveSection(tier.name)}
              onMouseLeave={() => setActiveSection(null)}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-red-500 text-white px-3 py-0.5 rounded-full text-xs font-bold">
                    Most Popular
                  </span>
                </div>
              )}

              <div className={`text-center mb-6 transition-all duration-300 ease-in-out ${
                activeSection === tier.name ? 'transform scale-105' : ''
              }`}>
                <h2 className="text-2xl font-bold mb-2 text-white">{tier.name}</h2>
                <div className="flex items-center justify-center mb-2">
                  <span className="text-4xl font-bold text-white">{tier.price}</span>
                  {tier.period && (
                    <span className="text-yellow-400 ml-1 text-sm">{tier.period}</span>
                  )}
                </div>
                <p className="text-sm text-yellow-400">{tier.description}</p>
              </div>

              <div className="space-y-3 mb-6">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-center text-sm transition-all duration-300 ease-in-out hover:translate-x-1">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span className="text-white">{feature}</span>
                  </div>
                ))}
                {tier.nonFeatures?.map((feature) => (
                  <div key={feature} className="flex items-center text-sm text-gray-500 transition-all duration-300 ease-in-out hover:translate-x-1">
                    <X className="h-4 w-4 text-red-500 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
                  </div>
                ))}
              </div>

              <Button
                className={`w-full text-sm transition-all duration-300 ease-in-out transform hover:scale-[1.02] ${
                  tier.popular
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-white text-black hover:bg-gray-200'
                }`}
              >
                {tier.buttonText}
              </Button>
            </div>
          ))}
        </div>

        <ResizeHandle 
          onMouseDown={handleResizeStart('pricing')}
          className="my-4"
        />

        {/* Enterprise Features */}
        <div 
          className={`mt-8 ${isResizing ? '' : 'transition-[height] duration-200 ease-in-out'}`}
          style={{ height: `${sectionHeights.enterprise}px` }}
        >
          <h2 className="text-2xl font-bold text-center mb-8 text-white">Enterprise Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Security & Compliance', 'Team Management', 'Support & Training'].map((title, index) => (
              <div
                key={title}
                className="bg-[#111111] p-6 rounded-xl transition-all duration-300 ease-in-out hover:scale-[1.02] border border-gray-800/50"
                onMouseEnter={() => setActiveSection(title)}
                onMouseLeave={() => setActiveSection(null)}
              >
                <h3 className="text-lg font-bold mb-3 text-white">{title}</h3>
                <ul className="space-y-2 text-sm text-yellow-400">
                  {/* Keep existing list items for each section */}
                </ul>
              </div>
            ))}
          </div>
        </div>

        <ResizeHandle 
          onMouseDown={handleResizeStart('enterprise')}
          className="my-4"
        />

        {/* FAQ Section */}
        <div className="mt-32">
          <h2 className="text-3xl font-bold text-center mb-8 text-white">Frequently Asked Questions</h2>
          <div className="grid gap-6 max-w-3xl mx-auto">
            <div className="bg-black/50 p-6 rounded-lg border border-white/20">
              <h3 className="text-lg font-semibold mb-2 text-white">What payment methods do you accept?</h3>
              <p className="text-gray-300">We accept all major credit cards, PayPal, and bank transfers for annual plans.</p>
            </div>
            <div className="bg-black/50 p-6 rounded-lg border border-white/20">
              <h3 className="text-lg font-semibold mb-2 text-white">Can I change my plan later?</h3>
              <p className="text-gray-300">Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle.</p>
            </div>
            <div className="bg-black/50 p-6 rounded-lg border border-white/20">
              <h3 className="text-lg font-semibold mb-2 text-white">Is there a free trial?</h3>
              <p className="text-gray-300">Yes, we offer a 7-day free trial for all plans. No credit card required.</p>
            </div>
            <div className="bg-black/50 p-6 rounded-lg border border-white/20">
              <h3 className="text-lg font-semibold mb-2 text-white">What happens if I exceed my plan limits?</h3>
              <p className="text-gray-300">You'll be notified when approaching your limits and can upgrade your plan or purchase additional credits as needed.</p>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="mt-16 mb-16 text-center bg-[#111111] p-10 rounded-xl border border-gray-800/50 max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold mb-4 text-white">Still have questions?</h2>
          <p className="text-md text-yellow-400 mb-8 max-w-2xl mx-auto">
            Contact our team for more information about our enterprise solutions or to discuss custom pricing options.
          </p>
          <Button 
            onClick={handleEmailClick}
            className="bg-red-500 hover:bg-red-600 text-white text-base px-8 py-6 transition-all duration-300 ease-in-out transform hover:scale-[1.02]"
          >
            Contact Sales <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
} 