"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatMoney } from "@/lib/money";
import { Check, CreditCard, ExternalLink } from "lucide-react";

interface Subscription {
  id: string;
  plan: string;
  status: string;
  billing_status: string;
  current_period_start: string;
  current_period_end: string;
  trial_end: string | null;
  cancel_at_period_end: boolean;
  monthly_price_cents: number;
  yearly_price_cents: number;
  usage_limits: Record<string, number>;
}

interface Usage {
  orders: number;
  invoices: number;
  products: number;
  storage_mb: number;
}

const PLAN_FEATURES = {
  FREE: [
    "Up to 50 orders per month",
    "Up to 10 invoices per month", 
    "Up to 25 products",
    "100MB storage",
    "Basic M-Pesa integration",
    "Email support"
  ],
  STARTER: [
    "Up to 500 orders per month",
    "Up to 100 invoices per month",
    "Up to 100 products", 
    "1GB storage",
    "Advanced M-Pesa features",
    "Priority email support",
    "Basic reports"
  ],
  GROWTH: [
    "Up to 2,000 orders per month",
    "Up to 500 invoices per month",
    "Up to 500 products",
    "5GB storage", 
    "Advanced reports & analytics",
    "WhatsApp integration",
    "Phone support",
    "Multi-outlet support"
  ],
  SCALE: [
    "Unlimited orders",
    "Unlimited invoices", 
    "Unlimited products",
    "20GB storage",
    "Custom reports & exports",
    "API access",
    "Dedicated support",
    "Advanced integrations"
  ]
};

export default function BillingPage() {
  const params = useParams();
  const orgId = params.orgId as string;
  
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [usage, setUsage] = useState<Usage | null>(null);
  const [loading, setLoading] = useState(true);
  const [upgrading, setUpgrading] = useState<string | null>(null);

  useEffect(() => {
    fetchBillingData();
  }, [orgId]);

  const fetchBillingData = async () => {
    try {
      const [subRes, usageRes] = await Promise.all([
        fetch(`/api/orgs/${orgId}/subscription`),
        fetch(`/api/orgs/${orgId}/usage`)
      ]);
      
      if (subRes.ok) {
        const subData = await subRes.json();
        setSubscription(subData.data);
      }
      
      if (usageRes.ok) {
        const usageData = await usageRes.json();
        setUsage(usageData.data);
      }
    } catch (error) {
      console.error("Failed to fetch billing data:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleUpgrade = async (plan: string) => {
    setUpgrading(plan);
    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId, plan, interval: "monthly" }),
      });
      
      if (response.ok) {
        const data = await response.json();
        window.location.href = data.data.checkout_url;
      }
    } catch (error) {
      console.error("Failed to create checkout:", error);
    } finally {
      setUpgrading(null);
    }
  };

  const handleManageBilling = async () => {
    try {
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orgId }),
      });
      
      if (response.ok) {
        const data = await response.json();
        window.open(data.data.portal_url, "_blank");
      }
    } catch (error) {
      console.error("Failed to open billing portal:", error);
    }
  };

  const getUsagePercentage = (used: number, limit: number) => {
    if (limit === -1) return 0; // Unlimited
    return Math.min((used / limit) * 100, 100);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "ACTIVE": return "bg-green-100 text-green-800";
      case "TRIALING": return "bg-blue-100 text-blue-800";
      case "PAST_DUE": return "bg-red-100 text-red-800";
      case "CANCELED": return "bg-gray-100 text-gray-800";
      default: return "bg-gray-100 text-gray-800";
    }
  };

  if (loading) {
    return <div className="p-6">Loading billing information...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Billing & Subscription</h1>
        {subscription?.billing_status === "ACTIVE" && (
          <Button onClick={handleManageBilling} variant="outline">
            <CreditCard className="w-4 h-4 mr-2" />
            Manage Billing
          </Button>
        )}
      </div>

      {/* Current Plan */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Current Plan: {subscription?.plan || "FREE"}
            <Badge className={getStatusColor(subscription?.billing_status || "ACTIVE")}>
              {subscription?.billing_status || "ACTIVE"}
            </Badge>
          </CardTitle>
          <CardDescription>
            {subscription?.trial_end && new Date(subscription.trial_end) > new Date() && (
              <span className="text-blue-600">
                Trial ends {new Date(subscription.trial_end).toLocaleDateString()}
              </span>
            )}
            {subscription?.current_period_end && (
              <span>
                Next billing: {new Date(subscription.current_period_end).toLocaleDateString()}
              </span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {usage && subscription?.usage_limits && Object.entries(usage).map(([metric, value]) => {
              const limit = subscription.usage_limits[metric] || 0;
              const percentage = getUsagePercentage(value, limit);
              
              return (
                <div key={metric} className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="capitalize">{metric.replace('_', ' ')}</span>
                    <span>{value}{limit === -1 ? '' : ` / ${limit}`}</span>
                  </div>
                  {limit !== -1 && (
                    <Progress value={percentage} className="h-2" />
                  )}
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Available Plans */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {Object.entries(PLAN_FEATURES).map(([plan, features]) => {
          const isCurrentPlan = subscription?.plan === plan;
          const monthlyPrice = plan === 'FREE' ? 0 : 
            plan === 'STARTER' ? 99900 :
            plan === 'GROWTH' ? 299900 : 799900;
          
          return (
            <Card key={plan} className={isCurrentPlan ? "border-blue-500" : ""}>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  {plan}
                  {isCurrentPlan && (
                    <Badge variant="secondary">Current</Badge>
                  )}
                </CardTitle>
                <CardDescription>
                  <div className="text-2xl font-bold">
                    {formatMoney(monthlyPrice)}
                    <span className="text-sm font-normal">/month</span>
                  </div>
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <ul className="space-y-2">
                  {features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm">{feature}</span>
                    </li>
                  ))}
                </ul>
                
                {!isCurrentPlan && plan !== 'FREE' && (
                  <Button 
                    onClick={() => handleUpgrade(plan)}
                    disabled={upgrading === plan}
                    className="w-full"
                  >
                    {upgrading === plan ? "Processing..." : `Upgrade to ${plan}`}
                  </Button>
                )}
                
                {isCurrentPlan && plan !== 'FREE' && (
                  <Button 
                    onClick={handleManageBilling}
                    variant="outline"
                    className="w-full"
                  >
                    <ExternalLink className="w-4 h-4 mr-2" />
                    Manage Plan
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
