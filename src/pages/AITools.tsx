import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
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
  Vault,
  Search,
  CheckCircle,
  Download,
  FileSpreadsheet,
  Key,
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
  const [reportLink, setReportLink] = useState('');
  const [reportFileName, setReportFileName] = useState('');
  const [sessionToken, setSessionToken] = useState<string | null>(null);

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
    setResult('');

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

      await streamSSEResponse(resp);
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
    } finally {
      setProcessing(false);
    }
  };

  // ─── VAULT SCAN: STEP 1 ───
  const handleVaultScan = async () => {
    if (!instruction.trim() || processing) return;

    setProcessing(true);
    setVaultStep('scanning');
    setResult('');
    setRelevantFiles([]);
    setReportContent('');
    setReportLink('');

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
          return;
        }
        if (err.error === 'NO_DOCUMENTS') {
          setResult('No documents found in your vault. Please upload documents first.');
          setVaultStep('input');
          setProcessing(false);
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
      setResult(`Error: ${err.message}`);
      setVaultStep('input');
    } finally {
      setProcessing(false);
    }
  };

  // ─── VAULT SCAN: STEP 2 — ANALYZE ───
  const handleVaultAnalyze = async () => {
    if (!relevantFiles.length || processing) return;

    setProcessing(true);
    setVaultStep('analyzing');
    setResult('');

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
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Analysis failed' }));
        throw new Error(err.error || 'Analysis failed');
      }

      const fullText = await streamSSEResponse(resp);
      setReportContent(fullText);
      setVaultStep('done');
    } catch (err: any) {
      setResult(`Error: ${err.message}`);
      setVaultStep('confirm');
    } finally {
      setProcessing(false);
    }
  };

  // ─── VAULT SCAN: STEP 3 — GENERATE REPORT ───
  const handleGenerateReport = async (format: 'excel' | 'pdf') => {
    if (!reportContent || generatingReport) return;

    setGeneratingReport(true);

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
          action: 'generate_report',
          reportContent,
          format,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({ error: 'Report generation failed' }));
        throw new Error(err.error || 'Report generation failed');
      }

      const data = await resp.json();
      setReportLink(data.downloadUrl || '');
      setReportFileName(data.fileName || '');
    } catch (err: any) {
      setResult((prev) => prev + `\n\nError generating report: ${err.message}`);
    } finally {
      setGeneratingReport(false);
    }
  };

  // ─── SSE STREAM HELPER ───
  const streamSSEResponse = async (resp: Response): Promise<string> => {
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

    return fullText;
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
    setVaultStep('input');
    setRelevantFiles([]);
    setReportContent('');
    setReportLink('');
    setReportFileName('');
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
          <span className="ai-tools-topbar-title">
            {sourceMode === 'upload' ? 'Multi-File Analysis' : 'Vault Tax Scanner'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <span className="ai-tools-plan-badge">
              <Sparkles className="h-3 w-3" />
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
              {vaultStep === 'done' && result && !reportLink && (
                <div className="ai-tools-report-actions">
                  <strong>Generate Report</strong>
                  <p>Save this analysis as a report in your vault:</p>
                  <div style={{ display: 'flex', gap: '0.75rem' }}>
                    <Button onClick={() => handleGenerateReport('pdf')} disabled={generatingReport}>
                      {generatingReport ? <div className="ai-tools-spinner" style={{ width: 16, height: 16 }} /> : <FileText className="h-4 w-4" />}
                      Download as PDF (Text)
                    </Button>
                    <Button variant="outline" onClick={() => handleGenerateReport('excel')} disabled={generatingReport}>
                      {generatingReport ? <div className="ai-tools-spinner" style={{ width: 16, height: 16 }} /> : <FileSpreadsheet className="h-4 w-4" />}
                      Download as Excel (CSV)
                    </Button>
                  </div>
                </div>
              )}

              {/* Report download link */}
              {reportLink && (
                <div className="ai-tools-report-download">
                  <CheckCircle className="h-5 w-5" style={{ color: 'hsl(var(--primary))' }} />
                  <div>
                    <strong>Report saved to your vault!</strong>
                    <p>{reportFileName}</p>
                  </div>
                  <a href={reportLink} target="_blank" rel="noopener noreferrer">
                    <Button size="sm">
                      <Download className="h-4 w-4" /> Download
                    </Button>
                  </a>
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

// Simple markdown to HTML converter
function markdownToHtml(md: string): string {
  let html = md
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>')
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.+?)\*/g, '<em>$1</em>')
    .replace(/^[*-] (.+)$/gm, '<li>$1</li>')
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  html = html.replace(/((?:<li>.*?<\/li>\s*)+)/g, '<ul>$1</ul>');

  return `<p>${html}</p>`;
}
