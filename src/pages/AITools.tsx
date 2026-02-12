import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import {
  Brain,
  Upload,
  X,
  FileText,
  Image,
  Table,
  Shield,
  Sparkles,
  LogOut,
  LayoutDashboard,
  User,
  MessageSquare,
  CreditCard,
  Copy,
  Check,
} from 'lucide-react';
import './AITools.css';

const QUICK_PROMPTS = [
  'Summarize all documents',
  'Compare and find differences',
  'Extract all tables to markdown',
  'Generate a structured JSON report',
  'Validate and flag issues',
  'List all key dates and amounts',
];

const PLAN_LIMITS: Record<string, { maxFiles: number; maxSizeMB: number }> = {
  FREEMIUM: { maxFiles: 5, maxSizeMB: 25 },
  PRO: { maxFiles: 25, maxSizeMB: 200 },
  SUPER_PRO: { maxFiles: 100, maxSizeMB: 1024 },
};

const ACCEPTED_TYPES = [
  'application/pdf',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/csv',
  'text/plain',
  'application/json',
  'image/png',
  'image/jpeg',
  'image/webp',
].join(',');

function getFileIcon(type: string) {
  if (type.startsWith('image/')) return Image;
  if (type.includes('spreadsheet') || type === 'text/csv') return Table;
  return FileText;
}

export default function AITools() {
  const { user, signOut } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  const [files, setFiles] = useState<File[]>([]);
  const [instruction, setInstruction] = useState('');
  const [result, setResult] = useState('');
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const plan = subscription.subscription_plan;
  const isPaid = ['FREEMIUM', 'PRO', 'SUPER_PRO'].includes(plan);
  const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.FREEMIUM;

  const addFiles = useCallback(
    (newFiles: FileList | File[]) => {
      const arr = Array.from(newFiles);
      setFiles((prev) => {
        const combined = [...prev, ...arr].slice(0, limits.maxFiles);
        return combined;
      });
    },
    [limits.maxFiles]
  );

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
  };

  const handleSubmit = async () => {
    if (!files.length || !instruction.trim() || processing) return;

    setProcessing(true);
    setResult('');

    try {
      const formData = new FormData();
      formData.append('instruction', instruction);
      files.forEach((file, i) => formData.append(`file${i}`, file));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

      const resp = await fetch(`${supabaseUrl}/functions/v1/ai-multifile`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${supabaseKey}`,
        },
        body: formData,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Processing failed' }));
        if (err.error === 'UPGRADE_REQUIRED') {
          setResult('');
          setProcessing(false);
          return;
        }
        throw new Error(err.error || 'Processing failed');
      }

      // Stream SSE response
      const reader = resp.body?.getReader();
      if (!reader) throw new Error('No response stream');

      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        let newlineIndex: number;

        while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
          let line = buffer.slice(0, newlineIndex);
          buffer = buffer.slice(newlineIndex + 1);

          if (line.endsWith('\r')) line = line.slice(0, -1);
          if (line.startsWith(':') || line.trim() === '') continue;
          if (!line.startsWith('data: ')) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === '[DONE]') break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setResult(fullText);
            }
          } catch {
            buffer = line + '\n' + buffer;
            break;
          }
        }
      }

      // Final flush
      if (buffer.trim()) {
        for (let raw of buffer.split('\n')) {
          if (!raw) continue;
          if (raw.endsWith('\r')) raw = raw.slice(0, -1);
          if (!raw.startsWith('data: ')) continue;
          const jsonStr = raw.slice(6).trim();
          if (jsonStr === '[DONE]') continue;
          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content;
            if (content) {
              fullText += content;
              setResult(fullText);
            }
          } catch {}
        }
      }
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(result);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleNewSession = () => {
    setFiles([]);
    setInstruction('');
    setResult('');
  };

  // Show upgrade modal for free users
  if (!subLoading && !isPaid) {
    return (
      <div className="ai-tools-layout">
        <Sidebar onSignOut={signOut} />
        <div className="ai-tools-main">
          <div className="ai-tools-topbar">
            <span className="ai-tools-topbar-title">AI Multi-File Intelligence</span>
          </div>
          <div className="ai-tools-content">
            <div className="ai-tools-upgrade-overlay" style={{ position: 'relative', background: 'none' }}>
              <div className="ai-tools-upgrade-modal">
                <Sparkles className="ai-tools-upgrade-icon" />
                <h2 className="ai-tools-upgrade-title">Premium Feature</h2>
                <p className="ai-tools-upgrade-text">
                  AI Multi-File Intelligence is available for Freemium, Pro, and Super Pro plans.
                  Upload, analyse, and get results — nothing stored.
                </p>
                <div className="ai-tools-upgrade-actions">
                  <Button asChild>
                    <Link to="/pricing">View Plans</Link>
                  </Button>
                  <Button variant="outline" asChild>
                    <Link to="/dashboard">Back to Dashboard</Link>
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-tools-layout">
      <Sidebar onSignOut={signOut} />
      <div className="ai-tools-main">
        <div className="ai-tools-topbar">
          <span className="ai-tools-topbar-title">Multi-File Analysis</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="ai-tools-plan-badge">
              <Sparkles className="h-3 w-3" />
              {plan}
            </span>
            <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted))' }}>
              {limits.maxFiles} files · {limits.maxSizeMB}MB max
            </span>
          </div>
        </div>

        <div className="ai-tools-content">
          {/* Privacy Banner */}
          <div className="ai-tools-privacy-banner">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span>
              This feature processes files in-memory only. Nothing is stored or used for training.
            </span>
          </div>

          {/* Upload Zone */}
          <div
            className={`ai-tools-upload-zone ${dragging ? 'dragging' : ''}`}
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="ai-tools-upload-icon" />
            <p className="ai-tools-upload-text">
              Drop files here or <strong>click to browse</strong>
            </p>
            <p className="ai-tools-upload-hint">
              PDF, DOCX, XLSX, CSV, TXT, JSON, Images · Up to {limits.maxFiles} files · {limits.maxSizeMB}MB total
            </p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept={ACCEPTED_TYPES}
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && addFiles(e.target.files)}
            />
          </div>

          {/* File Chips */}
          {files.length > 0 && (
            <div className="ai-tools-file-list">
              {files.map((file, i) => {
                const Icon = getFileIcon(file.type);
                return (
                  <div key={i} className="ai-tools-file-chip">
                    <Icon className="h-3.5 w-3.5" />
                    <span>{file.name}</span>
                    <span style={{ color: 'hsl(var(--muted))', fontSize: '0.7rem' }}>
                      ({(file.size / 1024).toFixed(0)}KB)
                    </span>
                    <button onClick={() => removeFile(i)}>
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* Instruction */}
          <div className="ai-tools-instruction-section">
            <label className="ai-tools-instruction-label">What would you like to do with these files?</label>
            <div className="ai-tools-quick-prompts">
              {QUICK_PROMPTS.map((prompt) => (
                <button
                  key={prompt}
                  className="ai-tools-quick-prompt"
                  onClick={() => setInstruction(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
            <Textarea
              value={instruction}
              onChange={(e) => setInstruction(e.target.value)}
              placeholder="Type your instruction... e.g. 'Compare all invoices and flag mismatches'"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <Button
              onClick={handleSubmit}
              disabled={!files.length || !instruction.trim() || processing}
              className="flex-1"
            >
              {processing ? (
                <>
                  <div className="ai-tools-spinner" style={{ width: 16, height: 16 }} />
                  Processing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4" />
                  Analyse Files
                </>
              )}
            </Button>
            {(files.length > 0 || result) && (
              <Button variant="outline" onClick={handleNewSession}>
                New Session
              </Button>
            )}
          </div>

          {/* Processing */}
          {processing && !result && (
            <div className="ai-tools-processing">
              <div className="ai-tools-spinner" />
              Analysing {files.length} file{files.length > 1 ? 's' : ''}...
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="ai-tools-result">
              <div className="ai-tools-result-header">
                <span className="ai-tools-result-title">Analysis Result</span>
                <Button variant="ghost" size="sm" onClick={handleCopy}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
              <div
                className="ai-tools-result-content"
                dangerouslySetInnerHTML={{ __html: markdownToHtml(result) }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Sidebar component
function Sidebar({ onSignOut }: { onSignOut: () => void }) {
  return (
    <aside className="ai-tools-sidebar">
      <div className="ai-tools-sidebar-header">
        <Link to="/" className="ai-tools-sidebar-logo">
          <div className="ai-tools-sidebar-logo-icon" />
          <span>WorTaF</span>
        </Link>
      </div>
      <nav className="ai-tools-sidebar-nav">
        <Link to="/ai-tools" className="ai-tools-nav-item active">
          <Brain className="h-4 w-4" />
          Multi-File Analysis
        </Link>
        <div className="ai-tools-nav-item coming-soon">
          <Sparkles className="h-4 w-4" />
          Tax Calendar AI
          <span style={{ fontSize: '0.65rem', marginLeft: 'auto', opacity: 0.6 }}>Soon</span>
        </div>
        <div className="ai-tools-nav-item coming-soon">
          <Sparkles className="h-4 w-4" />
          Compliance Check
          <span style={{ fontSize: '0.65rem', marginLeft: 'auto', opacity: 0.6 }}>Soon</span>
        </div>
      </nav>
      <div className="ai-tools-sidebar-footer">
        <Link to="/dashboard" className="ai-tools-nav-item">
          <LayoutDashboard className="h-4 w-4" />
          Dashboard
        </Link>
        <Link to="/profile" className="ai-tools-nav-item">
          <User className="h-4 w-4" />
          Profile
        </Link>
        <Link to="/taxoverflow" className="ai-tools-nav-item">
          <MessageSquare className="h-4 w-4" />
          TaxOverFlow
        </Link>
        <Link to="/pricing" className="ai-tools-nav-item">
          <CreditCard className="h-4 w-4" />
          Upgrade
        </Link>
        <button className="ai-tools-nav-item" onClick={onSignOut}>
          <LogOut className="h-4 w-4" />
          Sign out
        </button>
      </div>
    </aside>
  );
}

// Simple markdown to HTML converter (no external dep)
function markdownToHtml(md: string): string {
  let html = md
    // Code blocks
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^[*-] (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  // Wrap consecutive <li> in <ul>
  html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

  return `<p>${html}</p>`;
}
