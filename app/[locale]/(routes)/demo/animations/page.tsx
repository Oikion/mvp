"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { AnimatedSpinner } from "@/components/ui/animated-spinner";
import {
  ShimmerSkeleton,
  ShimmerCard,
  ShimmerTable,
} from "@/components/ui/shimmer-skeleton";
import {
  StaggerContainer,
  StaggerItem,
  FadeIn,
  HoverCard,
  PulseIndicator,
  FloatingContainer,
} from "@/components/ui/animated-container";
import {
  AnimatedCard,
  AnimatedCardHeader,
  AnimatedCardTitle,
  AnimatedCardDescription,
  AnimatedCardContent,
  AnimatedStatCard,
} from "@/components/ui/animated-card";
import { HouseIcon } from "@/components/ui/HouseIcon";
import { DashboardIcon } from "@/components/ui/DashboardIcon";
import { CalendarIcon } from "@/components/ui/CalendarIcon";
import { FileTextIcon } from "@/components/ui/FileTextIcon";
import { SettingsIcon } from "@/components/ui/SettingsIcon";
import { SparklesIcon } from "@/components/ui/SparklesIcon";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, TrendingUp, DollarSign, Activity } from "lucide-react";

export default function AnimationsDemo() {
  const [spinnerVariant, setSpinnerVariant] = useState<
    "dots" | "pulse" | "orbit" | "wave" | "bars"
  >("dots");
  const [key, setKey] = useState(0);

  const spinnerVariants = ["dots", "pulse", "orbit", "wave", "bars"] as const;

  const refreshAnimations = () => setKey((k) => k + 1);

  return (
    <div className="container mx-auto py-8 space-y-12">
      {/* Page Header */}
      <FadeIn>
        <div className="space-y-2">
          <h1 className="text-4xl font-bold tracking-tight">
            Animation System Demo
          </h1>
          <p className="text-muted-foreground text-lg">
            Explore the beautiful microinteractions and loading animations
          </p>
        </div>
      </FadeIn>

      <Tabs defaultValue="spinners" className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="spinners">Spinners</TabsTrigger>
          <TabsTrigger value="skeletons">Skeletons</TabsTrigger>
          <TabsTrigger value="icons">Icons</TabsTrigger>
          <TabsTrigger value="cards">Cards</TabsTrigger>
          <TabsTrigger value="utilities">Utilities</TabsTrigger>
        </TabsList>

        {/* Spinners Tab */}
        <TabsContent value="spinners" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Animated Spinners</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* Variant selector */}
                <div className="flex flex-wrap gap-2">
                  {spinnerVariants.map((variant) => (
                    <Button
                      key={variant}
                      variant={spinnerVariant === variant ? "default" : "outline"}
                      size="sm"
                      onClick={() => setSpinnerVariant(variant)}
                    >
                      {variant}
                    </Button>
                  ))}
                </div>

                {/* Size showcase */}
                <div className="flex items-end gap-8 p-6 bg-muted/30 rounded-xl">
                  <div className="text-center space-y-2">
                    <AnimatedSpinner size="sm" variant={spinnerVariant} />
                    <p className="text-xs text-muted-foreground">Small</p>
                  </div>
                  <div className="text-center space-y-2">
                    <AnimatedSpinner size="md" variant={spinnerVariant} />
                    <p className="text-xs text-muted-foreground">Medium</p>
                  </div>
                  <div className="text-center space-y-2">
                    <AnimatedSpinner size="lg" variant={spinnerVariant} />
                    <p className="text-xs text-muted-foreground">Large</p>
                  </div>
                  <div className="text-center space-y-2">
                    <AnimatedSpinner size="xl" variant={spinnerVariant} />
                    <p className="text-xs text-muted-foreground">XL</p>
                  </div>
                </div>

                {/* All variants in a grid */}
                <div className="grid grid-cols-5 gap-4">
                  {spinnerVariants.map((variant) => (
                    <div
                      key={variant}
                      className="flex flex-col items-center gap-3 p-4 border rounded-lg"
                    >
                      <AnimatedSpinner size="lg" variant={variant} />
                      <span className="text-sm font-medium capitalize">
                        {variant}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Skeletons Tab */}
        <TabsContent value="skeletons" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Shimmer Skeletons</CardTitle>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Basic shapes */}
              <div className="space-y-4">
                <h3 className="font-semibold">Basic Shapes</h3>
                <div className="flex items-center gap-4">
                  <ShimmerSkeleton className="h-12 w-12" variant="circular" />
                  <div className="flex-1 space-y-2">
                    <ShimmerSkeleton className="h-4 w-3/4" />
                    <ShimmerSkeleton className="h-4 w-1/2" />
                  </div>
                  <ShimmerSkeleton className="h-10 w-24" />
                </div>
              </div>

              {/* Card skeleton */}
              <div className="space-y-4">
                <h3 className="font-semibold">Card Skeleton</h3>
                <div className="grid grid-cols-3 gap-4">
                  <ShimmerCard />
                  <ShimmerCard />
                  <ShimmerCard />
                </div>
              </div>

              {/* Table skeleton */}
              <div className="space-y-4">
                <h3 className="font-semibold">Table Skeleton</h3>
                <ShimmerTable rows={3} columns={4} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Icons Tab */}
        <TabsContent value="icons" className="space-y-8">
          <Card>
            <CardHeader>
              <CardTitle>Animated Icons</CardTitle>
              <p className="text-sm text-muted-foreground">
                Hover over the icons to see animations
              </p>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 md:grid-cols-6 gap-6">
                {[
                  { Icon: DashboardIcon, name: "Dashboard" },
                  { Icon: HouseIcon, name: "House" },
                  { Icon: CalendarIcon, name: "Calendar" },
                  { Icon: FileTextIcon, name: "Document" },
                  { Icon: SettingsIcon, name: "Settings" },
                  { Icon: SparklesIcon, name: "AI/Sparkles" },
                ].map(({ Icon, name }) => (
                  <div
                    key={name}
                    className="flex flex-col items-center gap-3 p-4 border rounded-xl hover:bg-accent/50 transition-colors cursor-pointer"
                  >
                    <Icon size={32} />
                    <span className="text-sm">{name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Cards Tab */}
        <TabsContent value="cards" className="space-y-8" key={key}>
          <div className="flex justify-end">
            <Button onClick={refreshAnimations} variant="outline" size="sm">
              Replay Animations
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Animated Cards with Hover Effects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {(["lift", "glow", "border", "scale"] as const).map(
                  (variant, i) => (
                    <AnimatedCard
                      key={variant}
                      variant={variant}
                      delay={i * 0.1}
                      className="p-4"
                    >
                      <AnimatedCardHeader className="p-0 pb-2">
                        <AnimatedCardTitle className="text-sm">
                          {variant.charAt(0).toUpperCase() + variant.slice(1)}{" "}
                          Effect
                        </AnimatedCardTitle>
                        <AnimatedCardDescription>
                          Hover to see the effect
                        </AnimatedCardDescription>
                      </AnimatedCardHeader>
                    </AnimatedCard>
                  )
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Stat Cards with Animations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <AnimatedStatCard
                  title="Total Users"
                  value="12,543"
                  trend="up"
                  trendValue="+12.5%"
                  icon={<Users className="h-5 w-5 text-primary" />}
                  delay={0}
                />
                <AnimatedStatCard
                  title="Revenue"
                  value="€54,234"
                  trend="up"
                  trendValue="+8.2%"
                  icon={<DollarSign className="h-5 w-5 text-primary" />}
                  delay={0.1}
                />
                <AnimatedStatCard
                  title="Growth"
                  value="+23%"
                  trend="up"
                  trendValue="+4.3%"
                  icon={<TrendingUp className="h-5 w-5 text-primary" />}
                  delay={0.2}
                />
                <AnimatedStatCard
                  title="Active Now"
                  value="1,234"
                  description="Users online"
                  icon={<Activity className="h-5 w-5 text-primary" />}
                  delay={0.3}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Utilities Tab */}
        <TabsContent value="utilities" className="space-y-8" key={`utils-${key}`}>
          <div className="flex justify-end">
            <Button onClick={refreshAnimations} variant="outline" size="sm">
              Replay Animations
            </Button>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Staggered Animations</CardTitle>
            </CardHeader>
            <CardContent>
              <StaggerContainer className="grid grid-cols-4 gap-4" staggerDelay={0.1}>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
                  <StaggerItem key={i} variant="slideUp">
                    <div className="p-4 bg-muted/50 rounded-lg text-center">
                      Item {i}
                    </div>
                  </StaggerItem>
                ))}
              </StaggerContainer>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Hover Effects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-4">
                <HoverCard className="p-6 bg-muted/50 rounded-xl text-center">
                  <p className="font-medium">Hover Card (Lift)</p>
                </HoverCard>
                <div className="p-6 bg-muted/50 rounded-xl text-center hover-scale cursor-pointer">
                  <p className="font-medium">CSS hover-scale</p>
                </div>
                <div className="p-6 bg-muted/50 rounded-xl text-center shine-effect cursor-pointer">
                  <p className="font-medium">Shine Effect</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Special Effects</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <span className="text-sm">Pulse Indicator:</span>
                  <PulseIndicator />
                </div>
                <FloatingContainer>
                  <div className="p-4 bg-primary/10 rounded-full">
                    <SparklesIcon size={24} />
                  </div>
                </FloatingContainer>
                <div className="relative">
                  <Button variant="outline">Notifications</Button>
                  <span className="absolute -top-1 -right-1 badge-pulse">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">
                      3
                    </span>
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Button Microinteractions</CardTitle>
              <p className="text-sm text-muted-foreground">
                Hover and click to see effects
              </p>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                <Button>Default (Lift)</Button>
                <Button variant="secondary">Secondary</Button>
                <Button variant="destructive">Destructive</Button>
                <Button variant="success">Success</Button>
                <Button variant="outline">Outline</Button>
                <Button variant="ghost">Ghost</Button>
                <Button variant="link">Link Style</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}







