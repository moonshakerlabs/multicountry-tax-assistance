import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { APP_NAME } from '@/lib/appConfig';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useAuth } from '@/hooks/useAuth';
import { useSubscription } from '@/hooks/useSubscription';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import {
  Brain,
  Upload,
  X,
  FileText,
  Image,
  Table,
  Shield,
  Crown,
  LogOut,
  Calendar,
  ShieldCheck,
  LayoutDashboard,
  User,
  MessageSquare,
  CreditCard,
  Copy,
  Check,
  Vault,
  Search,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Key,
  Eye,
  ChevronDown,
  Save,
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

const VAULT_QUICK_PROMPTS = [
  'Calculate total income and tax payable for this year',
  'Summarize all salary slips and compute total earnings',
  'Find all tax deductions and savings opportunities',
  'Compare income across months and flag discrepancies',
  'Generate a complete tax filing summary',
  'List all sources of income with amounts',
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

type VaultScanStep = 'input' | 'scanning' | 'confirm' | 'analyzing' | 'done';
type RelevantFile = { id: string; file_name: string; reason: string };
type SourceMode = 'upload' | 'vault';

// ─── Helper: extract tables from markdown for PDF/CSV ───
function extractTablesFromMarkdown(md: string): { headers: string[]; rows: string[][] }[] {
  const tables: { headers: string[]; rows: string[][] }[] = [];
  const lines = md.split('\n');
  let i = 0;
  while (i < lines.length) {
    const line = lines[i].trim();
    if (line.startsWith('|') && line.endsWith('|')) {
      // potential table start
      const headerCells = line.split('|').filter(c => c.trim() !== '').map(c => c.trim());
      // next line should be separator
      if (i + 1 < lines.length && /^\|[\s\-:|]+\|$/.test(lines[i + 1].trim())) {
        const rows: string[][] = [];
        let j = i + 2;
        while (j < lines.length && lines[j].trim().startsWith('|') && lines[j].trim().endsWith('|')) {
          rows.push(lines[j].trim().split('|').filter(c => c.trim() !== '').map(c => c.trim()));
          j++;
        }
        tables.push({ headers: headerCells, rows });
        i = j;
        continue;
      }
    }
    i++;
  }
  return tables;
}

export default function AITools() {
  const { user, signOut } = useAuth();
  const { subscription, loading: subLoading } = useSubscription();
  const navigate = useNavigate();

  // Common state
  const [sourceMode, setSourceMode] = useState<SourceMode>('upload');
  const [instruction, setInstruction] = useState('');
  const [result, setResult] = useState('');
  const [processing, setProcessing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Refs for tab-switch persistence
  const fullTextRef = useRef('');
  const isProcessingRef = useRef(false);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Upload mode state
  const [files, setFiles] = useState<File[]>([]);
  const [dragging, setDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Vault scan state
  const [vaultStep, setVaultStep] = useState<VaultScanStep>('input');
  const [relevantFiles, setRelevantFiles] = useState<RelevantFile[]>([]);
  const [totalDocs, setTotalDocs] = useState(0);
  const [reportContent, setReportContent] = useState('');
  const [generatingReport, setGeneratingReport] = useState(false);
  const [savingToVault, setSavingToVault] = useState(false);
  const [savedToVault, setSavedToVault] = useState(false);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  // Dropdown state for report buttons
  const [pdfDropdownOpen, setPdfDropdownOpen] = useState(false);
  const [csvDropdownOpen, setCsvDropdownOpen] = useState(false);

  // Get user session token
  useEffect(() => {
    const getToken = async () => {
      const { data } = await supabase.auth.getSession();
      setSessionToken(data.session?.access_token || null);
    };
    getToken();
    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSessionToken(session?.access_token || null);
    });
    return () => authSub.unsubscribe();
  }, []);

  // Close dropdowns on outside click
  useEffect(() => {
    const handler = () => { setPdfDropdownOpen(false); setCsvDropdownOpen(false); };
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, []);

  // Restore state on tab visibility change
  useEffect(() => {
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        // Restore accumulated text from ref
        if (fullTextRef.current) {
          setResult(fullTextRef.current);
        }
        if (isProcessingRef.current) {
          setProcessing(true);
        }
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Cleanup abort controller on unmount only
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const getCustomHeaders = (): Record<string, string> => {
    return {};
  };

  const isTestEnv = window.location.hostname.includes('lovable.app') ||
                    window.location.hostname.includes('lovableproject.com') ||
                    window.location.hostname === 'localhost';

  const plan = isTestEnv ? 'SUPER_PRO' : subscription.subscription_plan;
  const isPaid = isTestEnv || ['FREEMIUM', 'PRO', 'SUPER_PRO'].includes(plan);
  const isProOrAbove = isTestEnv || ['PRO', 'SUPER_PRO'].includes(plan);
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

  // ─── UPLOAD MODE SUBMIT ───
  const handleUploadSubmit = async () => {
    if (!files.length || !instruction.trim() || processing) return;

    setProcessing(true);
    isProcessingRef.current = true;
    setResult('');
    fullTextRef.current = '';

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const formData = new FormData();
      formData.append('instruction', instruction);
      files.forEach((file, i) => formData.append(`file${i}`, file));

      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const token = sessionToken;
      if (!token) throw new Error('Not authenticated. Please log in again.');

      const resp = await fetch(`${supabaseUrl}/functions/v1/ai-multifile`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}`, ...getCustomHeaders() },
        body: formData,
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Processing failed' }));
        if (err.error === 'UPGRADE_REQUIRED') {
          setResult('');
          setProcessing(false);
          isProcessingRef.current = false;
          return;
        }
        throw new Error(err.error || 'Processing failed');
      }

      await streamSSEResponse(resp);
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setResult(`Error: ${err.message}`);
      }
    } finally {
      setProcessing(false);
      isProcessingRef.current = false;
    }
  };

  // ─── VAULT SCAN: STEP 1 ───
  const handleVaultScan = async () => {
    if (!instruction.trim() || processing) return;

    setProcessing(true);
    isProcessingRef.current = true;
    setVaultStep('scanning');
    setResult('');
    fullTextRef.current = '';
    setRelevantFiles([]);
    setReportContent('');
    setSavedToVault(false);

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const token = sessionToken;
      if (!token) throw new Error('Not authenticated. Please log in again.');

      const resp = await fetch(`${supabaseUrl}/functions/v1/ai-vault-scan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...getCustomHeaders(),
        },
        body: JSON.stringify({ action: 'scan', instruction }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Scan failed' }));
        if (err.error === 'UPGRADE_REQUIRED') {
          setResult('This feature requires a Pro or Super Pro plan.');
          setVaultStep('input');
          setProcessing(false);
          isProcessingRef.current = false;
          return;
        }
        if (err.error === 'NO_DOCUMENTS') {
          setResult('No documents found in your vault. Please upload documents first.');
          setVaultStep('input');
          setProcessing(false);
          isProcessingRef.current = false;
          return;
        }
        throw new Error(err.error || 'Scan failed');
      }

      const data = await resp.json();
      setTotalDocs(data.total_documents);
      setRelevantFiles(data.relevant_files || []);
      setVaultStep(data.relevant_files?.length > 0 ? 'confirm' : 'input');

      if (!data.relevant_files?.length) {
        setResult('No relevant documents were found for your query. Try a different instruction or upload specific files.');
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setResult(`Error: ${err.message}`);
      }
      setVaultStep('input');
    } finally {
      setProcessing(false);
      isProcessingRef.current = false;
    }
  };

  // ─── VAULT SCAN: STEP 2 — ANALYZE ───
  const handleVaultAnalyze = async () => {
    if (!relevantFiles.length || processing) return;

    setProcessing(true);
    isProcessingRef.current = true;
    setVaultStep('analyzing');
    setResult('');
    fullTextRef.current = '';

    const controller = new AbortController();
    abortControllerRef.current = controller;

    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const token = sessionToken;
      if (!token) throw new Error('Not authenticated. Please log in again.');

      const resp = await fetch(`${supabaseUrl}/functions/v1/ai-vault-scan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...getCustomHeaders(),
        },
        body: JSON.stringify({
          action: 'analyze',
          fileIds: relevantFiles.map((f) => f.id),
          instruction,
        }),
        signal: controller.signal,
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(err.error || 'Analysis failed');
      }

      const fullText = await streamSSEResponse(resp);
      setReportContent(fullText);
      setVaultStep('done');
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        setResult(`Error: ${err.message}`);
        setVaultStep('confirm');
      }
    } finally {
      setProcessing(false);
      isProcessingRef.current = false;
    }
  };

  // ─── CLIENT-SIDE PDF GENERATION ───
  const generatePDF = (content: string): jsPDF => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 14;
    const maxWidth = pageWidth - margin * 2;
    let y = 20;

    // Title
    doc.setFontSize(16);
    doc.setFont('helvetica', 'bold');
    doc.text('Tax Analysis Report', margin, y);
    y += 10;
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(`Generated: ${new Date().toLocaleString()}`, margin, y);
    y += 10;

    const tables = extractTablesFromMarkdown(content);
    // Remove table lines from content for text rendering
    const textLines = content.split('\n');
    let inTable = false;
    const textParts: string[] = [];

    for (const line of textLines) {
      const trimmed = line.trim();
      if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
        if (!inTable) {
          textParts.push('__TABLE__');
          inTable = true;
        }
      } else {
        inTable = false;
        // Clean markdown
        const clean = trimmed
          .replace(/^#{1,6}\s+/, '')
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1')
          .replace(/`(.+?)`/g, '$1');
        if (clean) textParts.push(clean);
      }
    }

    let tableIdx = 0;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');

    for (const part of textParts) {
      if (part === '__TABLE__' && tableIdx < tables.length) {
        const t = tables[tableIdx++];
        autoTable(doc, {
          startY: y,
          head: [t.headers],
          body: t.rows,
          margin: { left: margin, right: margin },
          styles: { fontSize: 8, cellPadding: 2 },
          headStyles: { fillColor: [41, 128, 185], textColor: 255 },
          theme: 'grid',
        });
        y = (doc as any).lastAutoTable.finalY + 8;
      } else if (part !== '__TABLE__') {
        if (y > doc.internal.pageSize.getHeight() - 20) {
          doc.addPage();
          y = 20;
        }
        const wrapped = doc.splitTextToSize(part, maxWidth);
        doc.text(wrapped, margin, y);
        y += wrapped.length * 5 + 2;
      }
    }

    return doc;
  };

  // ─── CLIENT-SIDE CSV GENERATION ───
  const generateCSV = (content: string): string => {
    const tables = extractTablesFromMarkdown(content);
    if (tables.length === 0) {
      // Fallback: export lines as single-column CSV
      const lines = content.split('\n').filter(l => l.trim());
      return lines.map(l => `"${l.replace(/"/g, '""')}"`).join('\n');
    }
    const csvParts: string[] = [];
    tables.forEach((t, i) => {
      if (i > 0) csvParts.push('');
      csvParts.push(t.headers.map(h => `"${h.replace(/"/g, '""')}"`).join(','));
      t.rows.forEach(r => {
        csvParts.push(r.map(c => `"${c.replace(/"/g, '""')}"`).join(','));
      });
    });
    return csvParts.join('\n');
  };

  const handlePreviewPDF = () => {
    const content = reportContent || result;
    if (!content) return;
    const doc = generatePDF(content);
    const blob = doc.output('blob');
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setPdfDropdownOpen(false);
  };

  const handleDownloadPDF = () => {
    const content = reportContent || result;
    if (!content) return;
    const doc = generatePDF(content);
    doc.save('tax-analysis-report.pdf');
    setPdfDropdownOpen(false);
  };

  const handlePreviewCSV = () => {
    const content = reportContent || result;
    if (!content) return;
    const csv = generateCSV(content);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank');
    setCsvDropdownOpen(false);
  };

  const handleDownloadCSV = () => {
    const content = reportContent || result;
    if (!content) return;
    const csv = generateCSV(content);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tax-analysis-report.csv';
    a.click();
    URL.revokeObjectURL(url);
    setCsvDropdownOpen(false);
  };

  // ─── SAVE TO VAULT ───
  const handleSaveToVault = async () => {
    const content = reportContent || result;
    if (!content || savingToVault) return;

    setSavingToVault(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const token = sessionToken;
      if (!token) throw new Error('Not authenticated.');

      const resp = await fetch(`${supabaseUrl}/functions/v1/ai-vault-scan`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
          ...getCustomHeaders(),
        },
        body: JSON.stringify({
          action: 'generate_report',
          reportContent: content,
          format: 'pdf',
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Save failed' }));
        throw new Error(err.error || 'Save failed');
      }

      setSavedToVault(true);
    } catch (err: any) {
      console.error('Save to vault error:', err);
    } finally {
      setSavingToVault(false);
    }
  };

  // ─── SSE STREAM HELPER (uses refs for tab-switch persistence) ───
  const streamSSEResponse = async (resp: Response): Promise<string> => {
    const reader = resp.body?.getReader();
    if (!reader) throw new Error('No response stream');

    const decoder = new TextDecoder();
    let buffer = '';

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
            fullTextRef.current += content;
            setResult(fullTextRef.current);
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
            fullTextRef.current += content;
            setResult(fullTextRef.current);
          }
        } catch {}
      }
    }

    return fullTextRef.current;
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
    fullTextRef.current = '';
    isProcessingRef.current = false;
    setVaultStep('input');
    setRelevantFiles([]);
    setReportContent('');
    setSavedToVault(false);
  };

  const switchMode = (mode: SourceMode) => {
    handleNewSession();
    setSourceMode(mode);
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
                <Crown className="ai-tools-upgrade-icon" />
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
          <span className="ai-tools-topbar-title">
            {sourceMode === 'upload' ? 'Multi-File Analysis' : 'Vault Tax Scanner'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="ai-tools-plan-badge">
              <Crown className="h-3 w-3" />
              {plan}
            </span>
            {sourceMode === 'upload' && (
              <span style={{ fontSize: '0.8rem', color: 'hsl(var(--muted-foreground))' }}>
                {limits.maxFiles} files · {limits.maxSizeMB}MB max
              </span>
            )}
          </div>
        </div>

        <div className="ai-tools-content">
          {/* Mode Toggle */}
          <div className="ai-tools-mode-toggle">
            <button
              className={`ai-tools-mode-btn ${sourceMode === 'upload' ? 'active' : ''}`}
              onClick={() => switchMode('upload')}
            >
              <Upload className="h-4 w-4" />
              Upload Files
            </button>
            <button
              className={`ai-tools-mode-btn ${sourceMode === 'vault' ? 'active' : ''}`}
              onClick={() => switchMode('vault')}
              disabled={!isProOrAbove}
              title={!isProOrAbove ? 'Requires Pro or Super Pro plan' : ''}
            >
              <Vault className="h-4 w-4" />
              Scan Vault
              {!isProOrAbove && (
                <span className="ai-tools-pro-badge">PRO</span>
              )}
            </button>
          </div>

          {/* Privacy Banner */}
          <div className="ai-tools-privacy-banner">
            <Shield className="h-4 w-4 flex-shrink-0" />
            <span>
              {sourceMode === 'upload'
                ? 'This feature processes files in-memory only. Nothing is stored or used for training.'
                : 'Vault scan reads your stored documents securely. Reports are saved to your vault.'}
            </span>
          </div>

          {/* ═══ UPLOAD MODE ═══ */}
          {sourceMode === 'upload' && (
            <>
              <div
                className={`ai-tools-upload-zone ${dragging ? 'dragging' : ''}`}
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
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

              {files.length > 0 && (
                <div className="ai-tools-file-list">
                  {files.map((file, i) => {
                    const Icon = getFileIcon(file.type);
                    return (
                      <div key={i} className="ai-tools-file-chip">
                        <Icon className="h-3.5 w-3.5" />
                        <span>{file.name}</span>
                        <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.7rem' }}>
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

              <div className="ai-tools-instruction-section">
                <label className="ai-tools-instruction-label">What would you like to do with these files?</label>
                <div className="ai-tools-quick-prompts">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button key={prompt} className="ai-tools-quick-prompt" onClick={() => setInstruction(prompt)}>
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

              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <Button onClick={handleUploadSubmit} disabled={!files.length || !instruction.trim() || processing} className="flex-1">
                  {processing ? (
                    <><div className="ai-tools-spinner" style={{ width: 16, height: 16 }} /> Processing...</>
                  ) : (
                    <><Brain className="h-4 w-4" /> Analyse Files</>
                  )}
                </Button>
                {(files.length > 0 || result) && (
                  <Button variant="outline" onClick={handleNewSession}>New Session</Button>
                )}
              </div>
            </>
          )}

          {/* ═══ VAULT SCAN MODE ═══ */}
          {sourceMode === 'vault' && (
            <>
              {/* Step: Input */}
              {vaultStep === 'input' && (
                <>
                  <div className="ai-tools-vault-intro">
                    <Search className="h-5 w-5" />
                    <div>
                      <strong>Smart Vault Scanner</strong>
                      <p>Enter your query and AI will scan your vault to find relevant documents, analyze them, and generate a comprehensive tax report.</p>
                    </div>
                  </div>

                  <div className="ai-tools-instruction-section">
                    <label className="ai-tools-instruction-label">What do you want to know from your vault?</label>
                    <div className="ai-tools-quick-prompts">
                      {VAULT_QUICK_PROMPTS.map((prompt) => (
                        <button key={prompt} className="ai-tools-quick-prompt" onClick={() => setInstruction(prompt)}>
                          {prompt}
                        </button>
                      ))}
                    </div>
                    <Textarea
                      value={instruction}
                      onChange={(e) => setInstruction(e.target.value)}
                      placeholder="e.g. 'Calculate my total income and tax payable for 2024 based on all salary slips and income statements'"
                      rows={3}
                    />
                  </div>

                  <Button onClick={handleVaultScan} disabled={!instruction.trim() || processing} className="w-full">
                    <Search className="h-4 w-4" /> Scan Vault
                  </Button>
                </>
              )}

              {/* Step: Scanning */}
              {vaultStep === 'scanning' && (
                <div className="ai-tools-processing">
                  <div className="ai-tools-spinner" />
                  Scanning your vault for relevant documents...
                </div>
              )}

              {/* Step: Confirm relevant files */}
              {vaultStep === 'confirm' && (
                <div className="ai-tools-vault-confirm">
                  <div className="ai-tools-vault-confirm-header">
                    <CheckCircle className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
                    <div>
                      <strong>Scanned {totalDocs} documents — {relevantFiles.length} seem relevant</strong>
                      <p>After scanning your vault, these files appear relevant to your query. Do you want to proceed with analysis?</p>
                    </div>
                  </div>

                  <div className="ai-tools-vault-file-list">
                    {relevantFiles.map((file) => (
                      <div key={file.id} className="ai-tools-vault-file-item">
                        <FileText className="h-4 w-4 flex-shrink-0" />
                        <div>
                          <strong>{file.file_name}</strong>
                          <p>{file.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Button onClick={handleVaultAnalyze} className="flex-1">
                      <Brain className="h-4 w-4" /> Yes, Proceed with Analysis
                    </Button>
                    <Button variant="outline" onClick={handleNewSession}>Cancel</Button>
                  </div>
                </div>
              )}

              {/* Step: Analyzing */}
              {vaultStep === 'analyzing' && !result && (
                <div className="ai-tools-processing">
                  <div className="ai-tools-spinner" />
                  Analyzing {relevantFiles.length} document{relevantFiles.length > 1 ? 's' : ''} with OCR...
                </div>
              )}

              {/* Step: Done — show report actions */}
              {vaultStep === 'done' && result && (
                <div className="ai-tools-report-actions">
                  <strong>Report Actions</strong>
                  <p>Preview, download, or save this report:</p>
                  <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    {/* View PDF Report Dropdown */}
                    <div className="ai-tools-dropdown-wrapper">
                      <Button
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); setPdfDropdownOpen(!pdfDropdownOpen); setCsvDropdownOpen(false); }}
                      >
                        <FileText className="h-4 w-4" />
                        View PDF Report
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      {pdfDropdownOpen && (
                        <div className="ai-tools-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                          <button className="ai-tools-dropdown-item" onClick={handlePreviewPDF}>
                            <Eye className="h-4 w-4" /> Show Preview
                          </button>
                          <button className="ai-tools-dropdown-item" onClick={handleDownloadPDF}>
                            <Download className="h-4 w-4" /> Download
                          </button>
                        </div>
                      )}
                    </div>

                    {/* View CSV Report Dropdown */}
                    <div className="ai-tools-dropdown-wrapper">
                      <Button
                        variant="outline"
                        onClick={(e) => { e.stopPropagation(); setCsvDropdownOpen(!csvDropdownOpen); setPdfDropdownOpen(false); }}
                      >
                        <FileSpreadsheet className="h-4 w-4" />
                        View CSV Report
                        <ChevronDown className="h-3 w-3" />
                      </Button>
                      {csvDropdownOpen && (
                        <div className="ai-tools-dropdown-menu" onClick={(e) => e.stopPropagation()}>
                          <button className="ai-tools-dropdown-item" onClick={handlePreviewCSV}>
                            <Eye className="h-4 w-4" /> Show Preview
                          </button>
                          <button className="ai-tools-dropdown-item" onClick={handleDownloadCSV}>
                            <Download className="h-4 w-4" /> Download
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Save to Vault */}
                    <Button
                      onClick={handleSaveToVault}
                      disabled={savingToVault || savedToVault}
                    >
                      {savedToVault ? (
                        <><Check className="h-4 w-4" /> Saved to Vault</>
                      ) : savingToVault ? (
                        <><div className="ai-tools-spinner" style={{ width: 16, height: 16 }} /> Saving...</>
                      ) : (
                        <><Save className="h-4 w-4" /> Save to Vault</>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Processing indicator (upload mode) */}
          {sourceMode === 'upload' && processing && !result && (
            <div className="ai-tools-processing">
              <div className="ai-tools-spinner" />
              Analysing {files.length} file{files.length > 1 ? 's' : ''}...
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="ai-tools-result">
              <div className="ai-tools-result-header">
                <span className="ai-tools-result-title">
                  {sourceMode === 'vault' ? 'Tax Analysis Report' : 'Analysis Result'}
                </span>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <Button variant="ghost" size="sm" onClick={handleCopy}>
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                    {copied ? 'Copied' : 'Copy'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={handleNewSession}>New Session</Button>
                </div>
              </div>
              <div className="ai-tools-result-content">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{result}</ReactMarkdown>
              </div>
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
          <img src="/images/taxbebo-logo.png" alt={APP_NAME} className="ai-tools-sidebar-logo-icon" />
          <span>{APP_NAME}</span>
        </Link>
      </div>
      <nav className="ai-tools-sidebar-nav">
        <Link to="/ai-tools" className="ai-tools-nav-item active">
          <Brain className="h-4 w-4" />
          Multi-File Analysis
        </Link>
        <div className="ai-tools-nav-item coming-soon">
          <Calendar className="h-4 w-4" />
          Tax Calendar AI
          <span style={{ fontSize: '0.65rem', marginLeft: 'auto', opacity: 0.6 }}>Soon</span>
        </div>
        <div className="ai-tools-nav-item coming-soon">
          <ShieldCheck className="h-4 w-4" />
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
