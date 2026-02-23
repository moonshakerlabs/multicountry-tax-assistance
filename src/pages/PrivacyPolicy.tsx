import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { privacyPolicyPageData, PolicySection } from '@/lib/privacyPolicyData';
import { APP_NAME } from '@/lib/appConfig';
import { supabase } from '@/integrations/supabase/client';

function renderSection(section: PolicySection, index: number) {
  switch (section.type) {
    case 'heading':
      return (
        <h2 key={index} className="text-xl font-bold text-foreground mt-10 mb-3 first:mt-0 border-b border-border pb-2">
          {section.content as string}
        </h2>
      );
    case 'subheading':
      return (
        <h3 key={index} className="text-base font-semibold text-foreground mt-6 mb-2">
          {section.content as string}
        </h3>
      );
    case 'paragraph':
      return (
        <p key={index} className="text-sm leading-7 text-foreground/80 mb-4">
          {section.content as string}
        </p>
      );
    case 'bullets':
      return (
        <ul key={index} className="space-y-2 mb-6 ml-1">
          {(section.content as string[]).map((item, i) => (
            <li key={i} className="flex gap-3 text-sm leading-7 text-foreground/80">
              <span className="mt-2.5 h-1.5 w-1.5 rounded-full bg-primary shrink-0" />
              <span>{item}</span>
            </li>
          ))}
        </ul>
      );
    default:
      return null;
  }
}

export default function PrivacyPolicy() {
  const [sections, setSections] = useState<PolicySection[]>(privacyPolicyPageData.sections);
  const [lastUpdated, setLastUpdated] = useState(privacyPolicyPageData.lastUpdated);

  useEffect(() => {
    // Try to load from DB
    const loadFromDb = async () => {
      const { data } = await supabase
        .from('privacy_policy_versions' as any)
        .select('content, published_at')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (data && (data as any).content) {
        setSections((data as any).content as PolicySection[]);
        if ((data as any).published_at) {
          setLastUpdated(new Date((data as any).published_at).toISOString().split('T')[0]);
        }
      }
    };
    loadFromDb();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Minimal header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <Button asChild variant="ghost" size="sm" className="text-muted-foreground">
            <Link to="/">
              <ArrowLeft className="h-4 w-4 mr-1.5" /> Back
            </Link>
          </Button>
          <Link to="/" className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-md bg-primary" />
            <span className="text-sm font-semibold text-foreground">{APP_NAME}</span>
          </Link>
          <div className="w-20" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 sm:px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-foreground tracking-tight">Privacy Policy</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Last updated: {lastUpdated}
          </p>
        </div>

        <article className="prose-policy">
          {sections.map((section, index) => renderSection(section, index))}
        </article>
      </main>

      {/* Footer */}
      <footer className="border-t border-border mt-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 flex items-center justify-between text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} {APP_NAME}</span>
          <Link to="/terms" className="hover:text-foreground transition-colors">Terms & Conditions</Link>
        </div>
      </footer>
    </div>
  );
}
