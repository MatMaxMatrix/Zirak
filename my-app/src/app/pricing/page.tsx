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

  const tiers = [
    {
      name: "Free",
      price: "$0",
      description: "Perfect for trying out Zirak",
      features: [
        "5 projects per month",
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
        "Unlimited projects",
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
      <div className="py-16 text-center resize-section">
        <h1 className="text-4xl font-bold mb-3">Simple, transparent pricing</h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto">
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
              className={`relative bg-[#111111] rounded-xl p-6 transition-all duration-300 ease-in-out hover:scale-[1.02] ${
                tier.popular ? 'ring-2 ring-blue-500' : ''
              }`}
              onMouseEnter={() => setActiveSection(tier.name)}
              onMouseLeave={() => setActiveSection(null)}
            >
              {tier.popular && (
                <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                  <span className="bg-blue-500 text-white px-3 py-0.5 rounded-full text-xs">
                    Most Popular
                  </span>
                </div>
              )}

              <div className={`text-center mb-6 transition-all duration-300 ease-in-out ${
                activeSection === tier.name ? 'transform scale-105' : ''
              }`}>
                <h2 className="text-xl font-bold mb-2">{tier.name}</h2>
                <div className="flex items-center justify-center mb-2">
                  <span className="text-3xl font-bold">{tier.price}</span>
                  {tier.period && (
                    <span className="text-gray-400 ml-1 text-sm">{tier.period}</span>
                  )}
                </div>
                <p className="text-sm text-gray-400">{tier.description}</p>
              </div>

              <div className="space-y-3 mb-6">
                {tier.features.map((feature) => (
                  <div key={feature} className="flex items-center text-sm transition-all duration-300 ease-in-out hover:translate-x-1">
                    <Check className="h-4 w-4 text-green-500 mr-2 flex-shrink-0" />
                    <span>{feature}</span>
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
                    ? 'bg-blue-500 hover:bg-blue-600'
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
          <h2 className="text-2xl font-bold text-center mb-8">Enterprise Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {['Security & Compliance', 'Team Management', 'Support & Training'].map((title, index) => (
              <div
                key={title}
                className="bg-[#111111] p-5 rounded-xl transition-all duration-300 ease-in-out hover:scale-[1.02]"
                onMouseEnter={() => setActiveSection(title)}
                onMouseLeave={() => setActiveSection(null)}
              >
                <h3 className="text-lg font-bold mb-3">{title}</h3>
                <ul className="space-y-2 text-sm text-gray-400">
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
        <div 
          className={`mt-8 ${isResizing ? '' : 'transition-[height] duration-200 ease-in-out'}`}
          style={{ height: `${sectionHeights.faq}px` }}
        >
          <h2 className="text-2xl font-bold text-center mb-8">Frequently Asked Questions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
            {/* FAQ items with hover effects */}
            <div className="space-y-6">
              {[
                {
                  question: "Can I switch plans later?",
                  answer: "Yes, you can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle."
                },
                {
                  question: "What payment methods do you accept?",
                  answer: "We accept all major credit cards, PayPal, and wire transfers for Enterprise plans."
                },
                {
                  question: "Do you offer refunds?",
                  answer: "Yes, we offer a 30-day money-back guarantee if you're not satisfied with our service."
                },
                {
                  question: "What kind of support do you offer?",
                  answer: "We offer email support for all plans, with priority support and dedicated account managers for Pro and Enterprise plans."
                }
              ].map((faq, index) => (
                <div
                  key={index}
                  className="transition-all duration-300 ease-in-out hover:scale-[1.02]"
                  onMouseEnter={() => setActiveSection(`faq-${index}`)}
                  onMouseLeave={() => setActiveSection(null)}
                >
                  <h3 className="text-lg font-bold mb-2">{faq.question}</h3>
                  <p className="text-sm text-gray-400">{faq.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <ResizeHandle 
          onMouseDown={handleResizeStart('faq')}
          className="my-4"
        />

        {/* CTA Section */}
        <div className="mt-8 text-center">
          <h2 className="text-2xl font-bold mb-3">Still have questions?</h2>
          <p className="text-sm text-gray-400 mb-6">
            Contact our team for more information about our enterprise solutions.
          </p>
          <Button 
            className="bg-blue-500 hover:bg-blue-600 text-sm transition-all duration-300 ease-in-out transform hover:scale-[1.02]"
          >
            Contact Sales
          </Button>
        </div>
      </div>
    </div>
  );
} 