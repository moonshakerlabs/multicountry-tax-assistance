import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Send, Ticket, ChevronRight, Clock, MessageSquare } from 'lucide-react';
import { SUPPORT_TICKET_CATEGORIES } from '@/lib/appConfig';
import { format } from 'date-fns';
import './Support.css';

interface SupportTicket {
  id: string;
  ticket_number: string;
  category: string;
  subject: string;
  content: string;
  status: string;
  priority: string;
  created_at: string;
  updated_at: string;
}

interface TicketReply {
  id: string;
  sender_type: string;
  sender_email: string;
  content: string;
  created_at: string;
}

export default function Support() {
  const { user, profile } = useAuth();
  const { toast } = useToast();

  const [view, setView] = useState<'list' | 'new' | 'detail'>('list');
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form state
  const [category, setCategory] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [replyContent, setReplyContent] = useState('');

  const meaningfulUserId = (profile as any)?.meaningful_user_id || '—';
  const userEmail = profile?.email || user?.email || '';

  const fetchTickets = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setTickets((data as SupportTicket[]) || []);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchReplies = async (ticketId: string) => {
    const { data, error } = await supabase
      .from('support_ticket_replies')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: true });
    if (!error) setReplies((data as TicketReply[]) || []);
  };

  useEffect(() => { fetchTickets(); }, [user]);

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !category || !subject.trim() || !content.trim()) return;
    setIsSubmitting(true);
    try {
      const { data, error } = await supabase
        .from('support_tickets')
        .insert({
          user_id: user.id,
          meaningful_user_id: meaningfulUserId,
          email: userEmail,
          category,
          subject: subject.trim(),
          content: content.trim(),
          ticket_number: '',
        })
        .select()
        .single();
      if (error) throw error;

      // Send email via edge function
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-support-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            ticketNumber: (data as any).ticket_number,
            category,
            subject,
            content,
            userId: meaningfulUserId,
            userEmail,
          }),
        });
      } catch (_) {
        // Non-critical: ticket saved even if email fails
      }

      toast({ title: 'Ticket submitted!', description: `Your ticket ${(data as any).ticket_number} has been submitted.` });
      setCategory('');
      setSubject('');
      setContent('');
      await fetchTickets();
      setView('list');
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenTicket = async (ticket: SupportTicket) => {
    setSelectedTicket(ticket);
    await fetchReplies(ticket.id);
    setView('detail');
  };

  const handleSendReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !selectedTicket || !replyContent.trim()) return;
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from('support_ticket_replies')
        .insert({
          ticket_id: selectedTicket.id,
          user_id: user.id,
          sender_type: 'customer',
          sender_email: userEmail,
          content: replyContent.trim(),
        });
      if (error) throw error;

      // Send notification email to support
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/send-support-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session?.access_token}`,
          },
          body: JSON.stringify({
            ticketNumber: selectedTicket.ticket_number,
            category: selectedTicket.category,
            subject: `Re: ${selectedTicket.subject}`,
            content: replyContent.trim(),
            userId: meaningfulUserId,
            userEmail,
            isReply: true,
          }),
        });
      } catch (_) { /* non-critical */ }

      setReplyContent('');
      await fetchReplies(selectedTicket.id);
      toast({ title: 'Reply sent!' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPriorityClass = (priority: string) => {
    if (priority === 'HIGH') return 'support-priority-high';
    return 'support-priority-minor';
  };

  const getStatusClass = (status: string) => {
    if (status === 'CLOSED') return 'support-status-closed';
    if (status === 'IN_PROGRESS') return 'support-status-progress';
    return 'support-status-open';
  };

  // Auto-escalate: if created > 24h ago and no reply, show as High Priority
  const getEffectivePriority = (ticket: SupportTicket) => {
    const hoursSinceCreation = (Date.now() - new Date(ticket.created_at).getTime()) / (1000 * 60 * 60);
    if (hoursSinceCreation > 24 && ticket.status === 'OPEN') return 'HIGH';
    return ticket.priority;
  };

  return (
    <div className="support-container">
      <header className="support-header">
        <div className="support-header-content">
          <Link to="/dashboard" className="support-back-link">
            <ArrowLeft className="support-back-icon" />
            Back to Dashboard
          </Link>
        </div>
      </header>

      <main className="support-main">
        <div className="support-content">
          {/* ── List View ── */}
          {view === 'list' && (
            <>
              <div className="support-title-section">
                <div className="support-title-row">
                  <div>
                    <h1 className="support-title">Support</h1>
                    <p className="support-subtitle">View your tickets or raise a new support request.</p>
                  </div>
                  <Button onClick={() => setView('new')}>
                    <Ticket className="h-4 w-4 mr-2" /> New Ticket
                  </Button>
                </div>
              </div>

              {isLoading ? (
                <p className="support-loading">Loading tickets...</p>
              ) : tickets.length === 0 ? (
                <div className="support-empty">
                  <MessageSquare className="support-empty-icon" />
                  <h3 className="support-empty-title">No support tickets yet</h3>
                  <p className="support-empty-text">Have a question or issue? Raise a ticket and we'll get back to you.</p>
                  <Button onClick={() => setView('new')}>Raise a Support Ticket</Button>
                </div>
              ) : (
                <div className="support-ticket-list">
                  {tickets.map(ticket => {
                    const priority = getEffectivePriority(ticket);
                    return (
                      <div key={ticket.id} className="support-ticket-card" onClick={() => handleOpenTicket(ticket)}>
                        <div className="support-ticket-card-header">
                          <span className="support-ticket-number">{ticket.ticket_number}</span>
                          <div className="support-ticket-badges">
                            <span className={`support-priority-badge ${getPriorityClass(priority)}`}>{priority}</span>
                            <span className={`support-status-badge ${getStatusClass(ticket.status)}`}>{ticket.status.replace('_', ' ')}</span>
                          </div>
                        </div>
                        <p className="support-ticket-subject">{ticket.subject}</p>
                        <div className="support-ticket-meta">
                          <span className="support-ticket-category">{ticket.category}</span>
                          <span className="support-ticket-date">
                            <Clock className="h-3 w-3" />
                            {format(new Date(ticket.created_at), 'MMM d, yyyy HH:mm')}
                          </span>
                        </div>
                        <ChevronRight className="support-ticket-arrow" />
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}

          {/* ── New Ticket View ── */}
          {view === 'new' && (
            <>
              <div className="support-title-section">
                <button className="support-back-btn" onClick={() => setView('list')}>
                  <ArrowLeft className="h-4 w-4" /> Back to Tickets
                </button>
                <h1 className="support-title">New Support Ticket</h1>
              </div>

              <div className="support-card">
                {/* Auto-populated fields */}
                <div className="support-auto-fields">
                  <div className="support-auto-field">
                    <span className="support-auto-label">User ID</span>
                    <span className="support-auto-value">{meaningfulUserId}</span>
                  </div>
                  <div className="support-auto-field">
                    <span className="support-auto-label">Email</span>
                    <span className="support-auto-value">{userEmail}</span>
                  </div>
                </div>

                <form onSubmit={handleSubmitTicket} className="support-form">
                  <div className="support-form-field">
                    <label className="support-label">Category *</label>
                    <select
                      value={category}
                      onChange={e => setCategory(e.target.value)}
                      required
                      className="support-select"
                    >
                      <option value="">Select a category...</option>
                      {SUPPORT_TICKET_CATEGORIES.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                    </select>
                  </div>

                  <div className="support-form-field">
                    <label className="support-label">Subject *</label>
                    <input
                      type="text"
                      value={subject}
                      onChange={e => setSubject(e.target.value)}
                      placeholder="Brief description of your issue"
                      required
                      maxLength={200}
                      className="support-input"
                    />
                  </div>

                  <div className="support-form-field">
                    <label className="support-label">
                      Description *
                      <span className="support-char-count">{content.length}/4000</span>
                    </label>
                    <textarea
                      value={content}
                      onChange={e => setContent(e.target.value)}
                      placeholder="Describe your issue in detail..."
                      required
                      maxLength={4000}
                      rows={8}
                      className="support-textarea"
                    />
                  </div>

                  <div className="support-form-actions">
                    <Button type="submit" disabled={isSubmitting || !category || !subject.trim() || !content.trim()}>
                      <Send className="h-4 w-4 mr-2" />
                      {isSubmitting ? 'Submitting...' : 'Submit Ticket'}
                    </Button>
                    <Button type="button" variant="outline" onClick={() => setView('list')}>Cancel</Button>
                  </div>
                </form>
              </div>
            </>
          )}

          {/* ── Detail View ── */}
          {view === 'detail' && selectedTicket && (
            <>
              <div className="support-title-section">
                <button className="support-back-btn" onClick={() => setView('list')}>
                  <ArrowLeft className="h-4 w-4" /> Back to Tickets
                </button>
                <div className="support-detail-header">
                  <div>
                    <h1 className="support-title">{selectedTicket.subject}</h1>
                    <p className="support-subtitle">{selectedTicket.ticket_number} · {selectedTicket.category}</p>
                  </div>
                  <div className="support-ticket-badges">
                    <span className={`support-priority-badge ${getPriorityClass(getEffectivePriority(selectedTicket))}`}>
                      {getEffectivePriority(selectedTicket)}
                    </span>
                    <span className={`support-status-badge ${getStatusClass(selectedTicket.status)}`}>
                      {selectedTicket.status.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>

              {/* Original ticket */}
              <div className="support-message support-message-customer">
                <div className="support-message-header">
                  <span className="support-message-sender">{userEmail}</span>
                  <span className="support-message-date">{format(new Date(selectedTicket.created_at), 'MMM d, yyyy HH:mm')}</span>
                </div>
                <p className="support-message-content">{selectedTicket.content}</p>
              </div>

              {/* Replies */}
              {replies.map(reply => (
                <div key={reply.id} className={`support-message ${reply.sender_type === 'employee' ? 'support-message-employee' : 'support-message-customer'}`}>
                  <div className="support-message-header">
                    <span className="support-message-sender">
                      {reply.sender_type === 'employee' ? '🛡️ Support Team' : reply.sender_email}
                    </span>
                    <span className="support-message-date">{format(new Date(reply.created_at), 'MMM d, yyyy HH:mm')}</span>
                  </div>
                  <p className="support-message-content">{reply.content}</p>
                </div>
              ))}

              {/* Reply form */}
              {selectedTicket.status !== 'CLOSED' && (
                <form onSubmit={handleSendReply} className="support-reply-form">
                  <textarea
                    value={replyContent}
                    onChange={e => setReplyContent(e.target.value)}
                    placeholder="Write your reply..."
                    rows={4}
                    className="support-textarea"
                    required
                  />
                  <Button type="submit" disabled={isSubmitting || !replyContent.trim()}>
                    <Send className="h-4 w-4 mr-2" />
                    {isSubmitting ? 'Sending...' : 'Send Reply'}
                  </Button>
                </form>
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
