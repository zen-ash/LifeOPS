import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ThemeToggle } from '@/components/ThemeToggle'
import { CheckCircle, Zap, Target, BookOpen, Timer, TrendingUp } from 'lucide-react'

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-background">
      {/* Navbar */}
      <nav className="border-b sticky top-0 bg-background/95 backdrop-blur z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold">LifeOPS</span>
          </div>
          <div className="flex items-center gap-3">
            <ThemeToggle />
            <Link href="/auth/login">
              <Button variant="ghost">Log in</Button>
            </Link>
            <Link href="/auth/register">
              <Button>Get started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-4 py-28 text-center">
        <div className="inline-flex items-center gap-2 bg-primary/10 text-primary text-sm font-medium px-3 py-1 rounded-full mb-6">
          <Zap className="h-3.5 w-3.5" />
          Built for students
        </div>
        <h1 className="text-5xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
          Your student life,{' '}
          <span className="text-primary">finally organized.</span>
        </h1>
        <p className="text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
          LifeOPS combines tasks, habits, focus mode, notes, and AI planning in
          one clean app. Stop juggling tools. Start shipping work.
        </p>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Link href="/auth/register">
            <Button size="lg" className="w-full sm:w-auto">
              Start for free
            </Button>
          </Link>
          <Link href="/auth/login">
            <Button size="lg" variant="outline" className="w-full sm:w-auto">
              Log in
            </Button>
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-6xl mx-auto px-4 pb-20">
        <h2 className="text-2xl font-bold text-center mb-10">
          Everything you need to stay on top
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: Target,
              title: 'Tasks & Projects',
              desc: 'Organize assignments, group projects, and personal goals with priorities and due dates.',
            },
            {
              icon: Timer,
              title: 'Focus Mode',
              desc: 'Built-in Pomodoro timer and time tracker to keep you in deep work flow.',
            },
            {
              icon: BookOpen,
              title: 'Notes & Journal',
              desc: 'Capture lecture notes, ideas, and daily reflections in one searchable place.',
            },
            {
              icon: TrendingUp,
              title: 'Habit Tracker',
              desc: 'Build streaks on the habits that matter. Protect them with recovery shields.',
            },
            {
              icon: CheckCircle,
              title: 'AI Weekly Planner',
              desc: 'Let AI draft your weekly plan based on your tasks, deadlines, and goals.',
            },
            {
              icon: Zap,
              title: 'Study Buddy',
              desc: 'Compete with friends on a focus leaderboard to stay accountable.',
            },
          ].map(({ icon: Icon, title, desc }) => (
            <div
              key={title}
              className="flex flex-col items-start p-6 rounded-xl border bg-card hover:shadow-sm transition-shadow"
            >
              <div className="p-2 rounded-lg bg-primary/10 mb-4">
                <Icon className="h-5 w-5 text-primary" />
              </div>
              <h3 className="text-base font-semibold mb-1">{title}</h3>
              <p className="text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t">
        <div className="max-w-6xl mx-auto px-4 py-8 text-center text-sm text-muted-foreground">
          © {new Date().getFullYear()} LifeOPS · An undergraduate project
        </div>
      </footer>
    </div>
  )
}
