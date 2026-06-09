import { Button } from "@/components/ui/button";
import { onBoardUser } from "@/modules/auth/actions";
import { db } from "@/lib/db";
import { ChevronRight, Code2, Play, Star, Trophy, Users, Zap } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export const dynamic = "force-dynamic";

async function getPlatformStats() {
  try {
    const [visibleProblems, totalUsers, totalSubmissions, languages] =
      await Promise.all([
        db.problem.count({ where: { isVisible: true } }),
        db.user.count(),
        db.submission.count({ where: { verdict: "ACCEPTED" } }),
        db.submission.findMany({
          select: { language: true },
          distinct: ["language"],
        }),
      ]);

    const hasData =
      visibleProblems > 0 || totalUsers > 0 || totalSubmissions > 0;

    return {
      hasData,
      stats: hasData
        ? [
            { number: String(totalSubmissions), label: "Solutions Accepted" },
            { number: String(totalUsers), label: "Registered Developers" },
            { number: String(languages.length), label: "Languages Used" },
            { number: String(visibleProblems), label: "Public Problems" },
          ]
        : [],
    };
  } catch {
    return { hasData: false, stats: [] };
  }
}

export default async function Home() {
  await onBoardUser();
  const { hasData, stats } = await getPlatformStats();

  const features = [
    {
      icon: <Code2 className="w-6 h-6" />,
      title: "Interactive Coding",
      description:
        "Practice with real-world coding challenges and get instant feedback on your solutions.",
    },
    {
      icon: <Trophy className="w-6 h-6" />,
      title: "Live Contests",
      description:
        "Compete in real-time contests with live leaderboards, synchronized timers, and rank tracking.",
    },
    {
      icon: <Users className="w-6 h-6" />,
      title: "Global Community",
      description:
        "Learn from developers worldwide and share your knowledge on GFGCodeBox.",
    },
    {
      icon: <Zap className="w-6 h-6" />,
      title: "Real-time Feedback",
      description:
        "Get instant feedback on your solutions with detailed explanations.",
    },
  ];

  const problemCategories = [
    {
      level: "Beginner",
      title: "Easy Problems",
      description:
        "Perfect for getting started with basic programming concepts and syntax.",
      color: "primary",
    },
    {
      level: "Intermediate",
      title: "Medium Problems",
      description:
        "Challenge yourself with data structures and algorithm problems.",
      color: "accent",
    },
    {
      level: "Advanced",
      title: "Hard Problems",
      description:
        "Master complex algorithms and compete in programming contests.",
      color: "primary",
    },
  ];

  return (
    <div className="min-h-screen transition-colors mt-24">
      <section className="min-h-screen flex flex-col justify-center items-center px-4 pt-16">
        <div className="max-w-6xl mx-auto text-center">
          <Badge variant="secondary" className="mb-8">
            <Star className="w-4 h-4 mr-2" />
            Welcome to GFGCodeBox
          </Badge>

          <h1 className="text-2xl md:text-5xl lg:text-6xl font-black text-foreground leading-tight mb-8">
            Master{" "}
            <span className="relative inline-block">
              <span className="px-6 py-3 bg-primary text-primary-foreground rounded-2xl transform -rotate-1 inline-block shadow-lg">
                Problem
              </span>
            </span>{" "}
            Solving
            <br />
            with{" "}
            <span className="relative inline-block">
              <span className="px-6 py-3 bg-accent text-accent-foreground rounded-2xl transform rotate-1 inline-block shadow-lg">
                Code
              </span>
            </span>
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground max-w-3xl mx-auto mb-12 leading-relaxed">
            Challenge yourself with coding problems, compete in live contests on
            GFGCodeBox, and accelerate your programming journey with real-time
            feedback.
          </p>

          <div className="grid w-full max-w-2xl grid-cols-1 gap-4 mx-auto mb-16 sm:grid-cols-2">
            <Button
              size="lg"
              className="h-16 text-lg font-bold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5 transition-all"
              asChild
            >
              <Link href="/problems">
                <Play className="w-6 h-6 mr-2" />
                Problems
                <ChevronRight className="w-6 h-6 ml-2" />
              </Link>
            </Button>
            <Button
              variant="outline"
              size="lg"
              className="h-16 text-lg font-bold border-2 shadow-sm hover:shadow-lg"
              asChild
            >
              <Link href="/contests">
                <Trophy className="w-6 h-6 mr-2" />
                Contests
              </Link>
            </Button>
          </div>

          {hasData && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-4xl mx-auto">
              {stats.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-foreground mb-2">
                    {stat.number}
                  </div>
                  <div className="text-muted-foreground font-medium">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      <section id="features" className="py-24 bg-muted/50">
        <div className="max-w-6xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold text-foreground mb-6">
              Everything you need to{" "}
              <span className="text-primary">excel</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              GFGCodeBox provides comprehensive tools and resources to help you
              become a better programmer
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center text-primary mb-4">
                    {feature.icon}
                  </div>
                  <CardTitle>{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

     

    </div>
  );
}
