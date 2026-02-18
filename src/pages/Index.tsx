import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Shield, Globe, Share2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { APP_NAME, APP_TAGLINE } from '@/lib/appConfig';

const features = [
  {
    icon: Shield,
    title: 'Privacy-first & GDPR aligned',
    description: 'Your documents are encrypted and protected. We never share your data with third parties.'
  },
  {
    icon: Globe,
    title: 'Built for cross-border tax complexity',
    description: 'Designed specifically for people managing income across multiple countries.'
  },
  {
    icon: Share2,
    title: 'Share securely with your tax advisor',
    description: 'Generate secure, time-limited access for your trusted professionals.'
  }
];

export default function Index() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container-wide flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-primary" />
            <span className="text-lg font-semibold text-foreground">{APP_NAME}</span>
          </div>
          <nav>
            {user ? (
              <Button asChild variant="default">
                <Link to="/dashboard">Dashboard</Link>
              </Button>
            ) : (
              <Button asChild variant="default">
                <Link to="/login">Login</Link>
              </Button>
            )}
          </nav>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 lg:py-28">
        <div className="container-tight text-center">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
            Organise tax documents.
            <br />
            <span className="text-muted-foreground">Align income across years.</span>
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-lg text-muted-foreground">
            A private tax helper for cross-border income clarity. Built for Indians in Germany and anyone managing multi-country finances.
          </p>
          <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button asChild variant="hero" size="xl">
              <Link to="/login">Get started – Free Early Access</Link>
            </Button>
            <Button asChild variant="hero-outline" size="xl">
              <a href="#how-it-works">How it works</a>
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="how-it-works" className="border-t border-border bg-muted/50 py-20">
        <div className="container-wide">
          <div className="grid gap-8 md:grid-cols-3">
            {features.map((feature) => (
              <div key={feature.title} className="card-elevated p-6">
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <feature.icon className="h-6 w-6 text-accent" />
                </div>
                <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                <p className="text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-12">
        <div className="container-wide flex flex-col items-center justify-between gap-4 sm:flex-row">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded bg-primary" />
            <span className="font-medium text-foreground">{APP_NAME}</span>
          </div>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <a href="#" className="hover:text-foreground transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-foreground transition-colors">Terms</a>
            <a href="#" className="hover:text-foreground transition-colors">Contact</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}
