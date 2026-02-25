import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useSubscription } from "@/hooks/useSubscription";
import { supabase } from "@/integrations/supabase/client";
import { X, Download, Eye, Trash2, FileText, AlertTriangle, FileX, Plus, Lock } from "lucide-react";
import { getMainCategoriesForCountry, getSubCategoriesForCountry, getCategoryLabelBilingual } from "@/lib/categories";
import { getFiscalYearOptions } from "@/lib/fiscalYearData";
import "./DocumentActions.css";

interface Document {
  id: string;
  user_id: string;
  country: string | null;
  tax_year: string | null;
  main_category: string | null;
  sub_category: string | null;
  custom_sub_category: string | null;
  file_name: string | null;
  file_path: string | null;
  created_at: string;
  share_enabled: boolean;
}

interface CustomCategory {
  id: string;
  country: string;
  main_category: string;
  sub_category: string;
}

interface DocumentActionsProps {
  document: Document;
  isDE: boolean;
  profileLang?: string;
  onClose: () => void;
  onDocumentUpdated: () => void;
  onDocumentDeleted: () => void;
}

// Tax years are now dynamically generated per country using fiscal year data

export default function DocumentActions({
  document,
  isDE,
  profileLang,
  onClose,
  onDocumentUpdated,
  onDocumentDeleted,
}: DocumentActionsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const { subscription } = useSubscription();

  const [showPreview, setShowPreview] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Edit metadata state
  const [taxYear, setTaxYear] = useState(document.tax_year || "");
  const [mainCategory, setMainCategory] = useState(document.main_category || "");
  const [subCategory, setSubCategory] = useState(document.sub_category || "");
  const [shareEnabled, setShareEnabled] = useState(document.share_enabled);
  const [isSaving, setIsSaving] = useState(false);

  // Track original values for GDrive move detection
  const [originalTaxYear] = useState(document.tax_year || "");
  const [originalCountry] = useState(document.country || "");

  // Custom category state
  const [customCategories, setCustomCategories] = useState<CustomCategory[]>([]);
  const [showCustomMainInput, setShowCustomMainInput] = useState(false);
  const [customMainCategory, setCustomMainCategory] = useState('');
  const [showCustomSubInput, setShowCustomSubInput] = useState(false);
  const [customSubCategory, setCustomSubCategory] = useState('');

  const planKey = subscription.subscription_plan || 'FREE';
  const canAddCustom = planKey !== 'FREE';
  const lang = profileLang || (isDE ? 'DE' : 'EN');

  // Dynamic fiscal year options based on document's country
  const fiscalYearOptions = getFiscalYearOptions(document.country || 'GERMANY');

  const isGoogleDriveFile = (path: string | null) => {
    return path?.startsWith("gdrive://");
  };

  // Fetch custom categories
  useEffect(() => {
    async function fetchCustomCategories() {
      if (user && document.country) {
        const { data } = await supabase
          .from('custom_categories')
          .select('*')
          .eq('user_id', user.id)
          .eq('country', document.country);
        setCustomCategories(data || []);
      }
    }
    fetchCustomCategories();
  }, [document.country, user]);

  // Get categories from local data files + custom
  const systemMainCategories = document.country ? getMainCategoriesForCountry(document.country) : [];
  const customMainCats = customCategories
    .filter(c => c.main_category && !systemMainCategories.some(s => s.code === c.main_category))
    .reduce((acc, c) => {
      if (!acc.find(a => a.code === c.main_category)) {
        acc.push({ code: c.main_category, labelEn: c.main_category.replace(/_/g, ' '), isCustom: true });
      }
      return acc;
    }, [] as Array<{ code: string; labelEn: string; isCustom: boolean }>);

  const allMainCategories = [
    ...systemMainCategories.map(c => ({ ...c, isCustom: false })),
    ...customMainCats,
  ];

  const getSubCatsForMain = (mainCat: string) => {
    const localSubs = mainCat && document.country ? getSubCategoriesForCountry(document.country, mainCat) : [];
    const customSubs = customCategories
      .filter(c => c.main_category === mainCat)
      .map(c => ({ code: c.sub_category, labelEn: c.sub_category.replace(/_/g, ' '), isCustom: true }));
    return [
      ...localSubs.map(c => ({ ...c, isCustom: false })),
      ...customSubs,
    ];
  };

  const subCategories = getSubCatsForMain(mainCategory);

  const getCatLabel = (item: { code: string; labelEn: string; labelLocal?: string; isCustom?: boolean }) => {
    if (item.isCustom) return item.labelEn;
    return getCategoryLabelBilingual(item as any, lang, document.country || '');
  };

  // Add custom main category
  const handleAddCustomMain = async () => {
    if (!customMainCategory.trim() || !user || !document.country) return;
    const code = customMainCategory.trim().toUpperCase().replace(/\s+/g, '_');
    const { error } = await supabase.from('custom_categories').insert({
      user_id: user.id,
      country: document.country,
      main_category: code,
      sub_category: 'GENERAL',
    });
    if (!error) {
      setCustomCategories(prev => [...prev, { id: '', country: document.country!, main_category: code, sub_category: 'GENERAL' }]);
      setMainCategory(code);
      setSubCategory('GENERAL');
      setShowCustomMainInput(false);
      setCustomMainCategory('');
    }
  };

  // Add custom sub category
  const handleAddCustomSub = async () => {
    if (!customSubCategory.trim() || !user || !document.country || !mainCategory) return;
    const code = customSubCategory.trim().toUpperCase().replace(/\s+/g, '_');
    const { error } = await supabase.from('custom_categories').insert({
      user_id: user.id,
      country: document.country,
      main_category: mainCategory,
      sub_category: code,
    });
    if (!error) {
      setCustomCategories(prev => [...prev, { id: '', country: document.country!, main_category: mainCategory, sub_category: code }]);
      setSubCategory(code);
      setShowCustomSubInput(false);
      setCustomSubCategory('');
    }
  };

  const getFileType = (): "image" | "pdf" | "other" => {
    const fileName = document.file_name?.toLowerCase() || "";
    if (fileName.match(/\.(jpg|jpeg|png|gif|webp)$/)) return "image";
    if (fileName.endsWith(".pdf")) return "pdf";
    return "other";
  };

  const handlePreview = async () => {
    if (!document.file_path) return;
    setIsLoading(true);
    try {
      if (isGoogleDriveFile(document.file_path)) {
        const fileId = document.file_path.replace("gdrive://", "");
        setPreviewUrl(`https://drive.google.com/file/d/${fileId}/preview`);
        setShowPreview(true);
        return;
      }
      const { data, error } = await supabase.storage.from("user-documents").createSignedUrl(document.file_path, 300);
      if (error) throw error;
      setPreviewUrl(data.signedUrl);
      setShowPreview(true);
    } catch (error) {
      console.error("Error getting preview URL:", error);
      toast({ title: isDE ? "Fehler" : "Error", description: isDE ? "Vorschau konnte nicht geladen werden." : "Could not load preview.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownload = async () => {
    if (!document.file_path) return;
    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage.from("user-documents").createSignedUrl(document.file_path, 60);
      if (error) throw error;
      const link = window.document.createElement("a");
      link.href = data.signedUrl;
      link.download = document.file_name || "document";
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      toast({ title: isDE ? "Download gestartet" : "Download started", description: document.file_name });
    } catch (error) {
      console.error("Error downloading:", error);
      toast({ title: isDE ? "Download fehlgeschlagen" : "Download failed", description: isDE ? "Das Dokument konnte nicht heruntergeladen werden." : "Could not download the document.", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!document.file_path || !user) return;
    setIsLoading(true);
    try {
      const { error: storageError } = await supabase.storage.from("user-documents").remove([document.file_path]);
      if (storageError) throw storageError;
      const { error: dbError } = await supabase.from("documents").delete().eq("id", document.id).eq("user_id", user.id);
      if (dbError) throw dbError;
      toast({ title: isDE ? "Dokument gelöscht" : "Document deleted", description: document.file_name });
      onDocumentDeleted();
    } catch (error) {
      console.error("Error deleting:", error);
      toast({ title: isDE ? "Löschen fehlgeschlagen" : "Delete failed", description: isDE ? "Das Dokument konnte nicht gelöscht werden." : "Could not delete the document.", variant: "destructive" });
    } finally {
      setIsLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  const handleSaveMetadata = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from("documents")
        .update({
          tax_year: taxYear,
          main_category: mainCategory,
          sub_category: subCategory,
          share_enabled: shareEnabled,
        })
        .eq("id", document.id)
        .eq("user_id", user.id);

      if (error) throw error;

      // If Google Drive file and year or country changed, move file
      if (isGoogleDriveFile(document.file_path) && (taxYear !== originalTaxYear || document.country !== originalCountry)) {
        const fileId = document.file_path!.replace("gdrive://", "");
        const { data: session } = await supabase.auth.getSession();
        const token = session.session?.access_token;
        if (token) {
          const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
          const moveResp = await fetch(`${supabaseUrl}/functions/v1/google-drive-move`, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              fileId,
              newCountry: document.country,
              newYear: taxYear,
            }),
          });
          if (!moveResp.ok) {
            const err = await moveResp.json().catch(() => ({ error: 'Move failed' }));
            console.error('Google Drive move failed:', err);
            toast({
              title: isDE ? "Warnung" : "Warning",
              description: isDE ? "Metadaten gespeichert, aber die Datei konnte nicht verschoben werden." : "Metadata saved, but the file could not be moved on Google Drive.",
              variant: "destructive",
            });
            onDocumentUpdated();
            return;
          }
        }
      }

      toast({
        title: isDE ? "Gespeichert" : "Saved",
        description: isDE ? "Metadaten wurden aktualisiert." : "Metadata has been updated.",
      });
      onDocumentUpdated();
    } catch (error) {
      console.error("Error updating metadata:", error);
      toast({ title: isDE ? "Fehler" : "Error", description: isDE ? "Metadaten konnten nicht gespeichert werden." : "Could not save metadata.", variant: "destructive" });
    } finally {
      setIsSaving(false);
    }
  };

  // Preview Modal
  if (showPreview && previewUrl) {
    const fileType = getFileType();
    return (
      <div className="doc-preview-overlay" onClick={() => setShowPreview(false)}>
        <div className="doc-preview-modal" onClick={(e) => e.stopPropagation()}>
          <div className="doc-preview-header">
            <span className="doc-preview-title">{document.file_name}</span>
            <button className="doc-actions-close" onClick={() => setShowPreview(false)}>
              <X className="doc-actions-close-icon" />
            </button>
          </div>
          <div className="doc-preview-content">
            {fileType === "image" ? (
              <img src={previewUrl} alt={document.file_name || "Document"} className="doc-preview-image" />
            ) : fileType === "pdf" ? (
              <iframe src={previewUrl} title={document.file_name || "Document"} className="doc-preview-iframe" />
            ) : (
              <div className="doc-preview-unsupported">
                <FileX className="doc-preview-unsupported-icon" />
                <p>{isDE ? "Vorschau für diesen Dateityp nicht verfügbar." : "Preview not available for this file type."}</p>
                <Button onClick={handleDownload} className="mt-4">
                  <Download className="doc-action-icon mr-2" />
                  {isDE ? "Herunterladen" : "Download"}
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Delete Confirmation
  if (showDeleteConfirm) {
    return (
      <div className="doc-actions-overlay" onClick={() => setShowDeleteConfirm(false)}>
        <div className="doc-actions-modal" onClick={(e) => e.stopPropagation()}>
          <div className="doc-delete-confirmation">
            <AlertTriangle className="doc-delete-icon" />
            <p className="doc-delete-message">
              {isDE ? "Sind Sie sicher, dass Sie dieses Dokument löschen möchten?" : "Are you sure you want to delete this document?"}
            </p>
            <p className="doc-delete-warning">
              {document.file_name}<br />
              {isDE ? "Diese Aktion kann nicht rückgängig gemacht werden." : "This action cannot be undone."}
            </p>
            <div className="doc-delete-actions">
              <Button variant="outline" onClick={() => setShowDeleteConfirm(false)} disabled={isLoading}>
                {isDE ? "Abbrechen" : "Cancel"}
              </Button>
              <Button variant="destructive" onClick={handleDelete} disabled={isLoading}>
                {isLoading ? (isDE ? "Löschen..." : "Deleting...") : isDE ? "Löschen" : "Delete"}
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="doc-actions-overlay" onClick={onClose}>
      <div className="doc-actions-modal" onClick={(e) => e.stopPropagation()}>
        <div className="doc-actions-header">
          <h2 className="doc-actions-title">{isDE ? "Dokumentaktionen" : "Document Actions"}</h2>
          <button className="doc-actions-close" onClick={onClose}>
            <X className="doc-actions-close-icon" />
          </button>
        </div>

        <div className="doc-actions-content">
          {/* File Info */}
          <div className="doc-actions-file-info">
            <FileText className="doc-actions-file-icon" />
            <div className="doc-actions-file-details">
              <p className="doc-actions-file-name">{document.file_name}</p>
              <p className="doc-actions-file-meta">
                {document.main_category?.replace(/_/g, " ")} • {document.tax_year}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="doc-actions-buttons">
            <button className="doc-action-btn" onClick={handlePreview} disabled={isLoading}>
              <Eye className="doc-action-icon" />
              {isDE ? "Vorschau" : "Preview"}
            </button>
            <button className="doc-action-btn" onClick={handleDownload} disabled={isLoading}>
              <Download className="doc-action-icon" />
              {isDE ? "Herunterladen" : "Download"}
            </button>
            <button className="doc-action-btn doc-action-btn-destructive" onClick={() => setShowDeleteConfirm(true)} disabled={isLoading}>
              <Trash2 className="doc-action-icon" />
              {isDE ? "Löschen" : "Delete"}
            </button>
          </div>

          {/* Edit Metadata */}
          <div className="doc-edit-section">
            <h3 className="doc-edit-title">{isDE ? "Metadaten bearbeiten" : "Edit Metadata"}</h3>
            <div className="doc-edit-form">
              <div className="doc-edit-field">
                <label className="doc-edit-label">{isDE ? "Steuerjahr" : "Tax Year"}</label>
                <select value={taxYear} onChange={(e) => setTaxYear(e.target.value)} className="doc-edit-select">
                  {fiscalYearOptions.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                  {/* Keep current value if not in options */}
                  {taxYear && !fiscalYearOptions.some(o => o.value === taxYear) && (
                    <option value={taxYear}>{taxYear}</option>
                  )}
                </select>
              </div>

              {/* Main Category */}
              <div className="doc-edit-field">
                <label className="doc-edit-label">{isDE ? "Hauptkategorie" : "Main Category"}</label>
                <select
                  value={mainCategory}
                  onChange={(e) => { setMainCategory(e.target.value); setSubCategory(""); }}
                  className="doc-edit-select"
                >
                  <option value="">{isDE ? "Auswählen" : "Select"}</option>
                  {allMainCategories.map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {getCatLabel(cat)}
                    </option>
                  ))}
                </select>
                {/* Add custom main category */}
                {!showCustomMainInput ? (
                  <button
                    type="button"
                    onClick={() => canAddCustom ? setShowCustomMainInput(true) : null}
                    className="doc-edit-custom-btn"
                    style={{ opacity: canAddCustom ? 1 : 0.5, cursor: canAddCustom ? 'pointer' : 'not-allowed' }}
                  >
                    {canAddCustom ? <Plus className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                    {isDE ? 'Eigene Hauptkategorie' : 'Add custom main category'}
                  </button>
                ) : (
                  <div className="doc-edit-custom-input-row">
                    <Input
                      value={customMainCategory}
                      onChange={e => setCustomMainCategory(e.target.value)}
                      placeholder={isDE ? 'Kategoriename' : 'Category name'}
                      className="doc-edit-custom-input"
                      onKeyDown={e => e.key === 'Enter' && handleAddCustomMain()}
                    />
                    <Button size="sm" onClick={handleAddCustomMain} disabled={!customMainCategory.trim()}>
                      {isDE ? 'Hinzufügen' : 'Add'}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={() => { setShowCustomMainInput(false); setCustomMainCategory(''); }}>
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Sub Category */}
              <div className="doc-edit-field">
                <label className="doc-edit-label">{isDE ? "Unterkategorie" : "Sub Category"}</label>
                <select
                  value={subCategory}
                  onChange={(e) => setSubCategory(e.target.value)}
                  className="doc-edit-select"
                  disabled={!mainCategory}
                >
                  <option value="">{!mainCategory ? (isDE ? 'Zuerst Hauptkategorie auswählen' : 'Select main category first') : (isDE ? "Auswählen" : "Select")}</option>
                  {subCategories.map((cat) => (
                    <option key={cat.code} value={cat.code}>
                      {getCatLabel(cat)}
                    </option>
                  ))}
                </select>
                {/* Add custom sub category */}
                {mainCategory && (
                  !showCustomSubInput ? (
                    <button
                      type="button"
                      onClick={() => canAddCustom ? setShowCustomSubInput(true) : null}
                      className="doc-edit-custom-btn"
                      style={{ opacity: canAddCustom ? 1 : 0.5, cursor: canAddCustom ? 'pointer' : 'not-allowed' }}
                    >
                      {canAddCustom ? <Plus className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}
                      {isDE ? 'Eigene Unterkategorie' : 'Add custom sub category'}
                    </button>
                  ) : (
                    <div className="doc-edit-custom-input-row">
                      <Input
                        value={customSubCategory}
                        onChange={e => setCustomSubCategory(e.target.value)}
                        placeholder={isDE ? 'Unterkategoriename' : 'Sub category name'}
                        className="doc-edit-custom-input"
                        onKeyDown={e => e.key === 'Enter' && handleAddCustomSub()}
                      />
                      <Button size="sm" onClick={handleAddCustomSub} disabled={!customSubCategory.trim()}>
                        {isDE ? 'Hinzufügen' : 'Add'}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => { setShowCustomSubInput(false); setCustomSubCategory(''); }}>
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  )
                )}
              </div>

              {/* Share Enabled Toggle */}
              <div className="doc-edit-field" style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
                <label className="doc-edit-label">{shareEnabled ? (isDE ? "Freigabe aktiviert" : "Sharing Enabled") : (isDE ? "Freigabe deaktiviert" : "Sharing Disabled")}</label>
                <button
                  type="button"
                  onClick={() => setShareEnabled(!shareEnabled)}
                  style={{
                    width: 44, height: 24, borderRadius: 12, border: "none", cursor: "pointer",
                    background: shareEnabled ? "hsl(var(--primary))" : "hsl(var(--muted))",
                    position: "relative", transition: "background 0.2s",
                  }}
                >
                  <span style={{
                    position: "absolute", top: 2, left: shareEnabled ? 22 : 2,
                    width: 20, height: 20, borderRadius: "50%", background: "white", transition: "left 0.2s",
                  }} />
                </button>
              </div>

              <div className="doc-edit-actions">
                <Button onClick={handleSaveMetadata} disabled={isSaving} size="sm">
                  {isSaving ? (isDE ? "Speichern..." : "Saving...") : isDE ? "Speichern" : "Save Changes"}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
