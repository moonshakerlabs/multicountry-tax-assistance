import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft, BookOpen } from 'lucide-react';
import './Blog.css';

export default function Blog() {
  return (
    <div className="blog-container">
      <header className="blog-header">
        <div className="blog-header-content">
          <Link to="/" className="blog-back-link">
            <ArrowLeft className="blog-back-icon" />
            Back to Home
          </Link>
          <div className="blog-logo">
            <div className="blog-logo-icon" />
            <span className="blog-logo-text">WorTaF</span>
          </div>
        </div>
      </header>

      <main className="blog-main">
        <BookOpen className="blog-coming-icon" />
        <h1 className="blog-coming-title">Blog</h1>
        <p className="blog-coming-text">Coming Soon</p>
        <p className="blog-coming-description">
          We're working on insightful articles about cross-border taxation, compliance tips, and financial planning for global taxpayers.
        </p>
        <Button asChild variant="outline" size="lg">
          <Link to="/">Back to Home</Link>
        </Button>
      </main>
    </div>
  );
}
