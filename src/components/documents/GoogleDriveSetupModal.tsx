import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { HardDrive, AlertCircle, CheckCircle2, Loader2, RefreshCw, ShieldAlert } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import "./GoogleDriveSetupModal.css";

type SetupStep = "loading" | "intro" | "connecting" | "complete" | "error" | "email_mismatch" | "insufficient_storage";

interface GoogleDriveSetupModalProps {
  isDE: boolean;
  onComplete: (folderId: string) => void;
  onCancel: () => void;
  userEmail?: string;
  pendingOAuthCode?: string | null;
}

const GOOGLE_AUTH_URL = "https://accounts.google.com/o/oauth2/v2/auth";
//const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.file';
const DRIVE_SCOPE = "https://www.googleapis.com/auth/drive.file https://www.googleapis.com/auth/userinfo.email";
export default function GoogleDriveSetupModal({
  isDE,
  onComplete,
  onCancel,
  userEmail,
  pendingOAuthCode,
}: GoogleDriveSetupModalProps) {
  const [step, setStep] = useState<SetupStep>("loading");
  const [errorMessage, setErrorMessage] = useState("");
  const [availableMB, setAvailableMB] = useState(0);
  const [googleClientId, setGoogleClientId] = useState("");

  // Fetch Google Client ID from config endpoint
  useEffect(() => {
    async function fetchConfig() {
      try {
        const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-config`);
        const data = await response.json();
        if (data.client_id) {
          setGoogleClientId(data.client_id);
          setStep("intro");
        } else {
          setErrorMessage(
            isDE ? "Google Drive Integration ist nicht konfiguriert." : "Google Drive integration is not configured.",
          );
          setStep("error");
        }
      } catch {
        setErrorMessage(isDE ? "Konfiguration konnte nicht geladen werden." : "Could not load configuration.");
        setStep("error");
      }
    }
    fetchConfig();
  }, [isDE]);

  // Auto-process pending OAuth code passed from parent
  useEffect(() => {
    if (pendingOAuthCode && step === "intro") {
      handleOAuthCallback(pendingOAuthCode);
    }
  }, [pendingOAuthCode, step]);

  const handleConnect = () => {
    if (!googleClientId) {
      setErrorMessage(isDE ? "Google Client ID fehlt." : "Google Client ID is missing.");
      setStep("error");
      return;
    }

    const state = crypto.randomUUID();
    sessionStorage.setItem("gdrive_oauth_state", state);

    // Always use /profile as the redirect path for Google Drive OAuth
    const redirectUri = `${window.location.origin}/profile`;
    sessionStorage.setItem("gdrive_redirect_uri", redirectUri);

    const params = new URLSearchParams({
      client_id: googleClientId,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: DRIVE_SCOPE,
      access_type: "offline",
      prompt: "consent",
      state,
      login_hint: userEmail || "",
    });

    window.location.href = `${GOOGLE_AUTH_URL}?${params.toString()}`;
  };

  // Handle OAuth callback (called from parent when URL has code param)
  const handleOAuthCallback = async (code: string) => {
    setStep("connecting");

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) {
        setErrorMessage(isDE ? "Nicht eingeloggt." : "Not logged in.");
        setStep("error");
        return;
      }

      const redirectUri = sessionStorage.getItem("gdrive_redirect_uri") || `${window.location.origin}/vault`;

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-auth`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({
          action: "exchange",
          code,
          redirect_uri: redirectUri,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        if (result.error === "email_mismatch") {
          setErrorMessage(result.message);
          setStep("email_mismatch");
          return;
        }
        if (result.error === "insufficient_storage") {
          setAvailableMB(result.available_mb || 0);
          setErrorMessage(result.message);
          setStep("insufficient_storage");
          return;
        }
        setErrorMessage(result.message || result.details || result.error || "Connection failed");
        setStep("error");
        return;
      }

      // Clean up
      sessionStorage.removeItem("gdrive_oauth_state");
      sessionStorage.removeItem("gdrive_redirect_uri");

      setStep("complete");
      setTimeout(() => onComplete(result.root_folder_id), 1500);
    } catch (error: any) {
      console.error("OAuth exchange error:", error);
      setErrorMessage(isDE ? "Verbindung fehlgeschlagen." : "Connection failed.");
      setStep("error");
    }
  };

  const renderContent = () => {
    switch (step) {
      case "loading":
        return (
          <div className="gdrive-setup-content gdrive-setup-loading">
            <Loader2 className="w-12 h-12 animate-spin" />
            <h3>{isDE ? "Wird geladen..." : "Loading..."}</h3>
          </div>
        );
      case "intro":
        return (
          <div className="gdrive-setup-content">
            <div className="gdrive-setup-icon">
              <HardDrive className="w-12 h-12" />
            </div>
            <h3>{isDE ? "Mit Google Drive verbinden" : "Connect to Google Drive"}</h3>
            <p>
              {isDE
                ? "Ihr Google-Konto muss die gleiche E-Mail verwenden wie Ihr Anmeldekonto."
                : "Your Google account must use the same email as your signup account."}
            </p>
            {userEmail && (
              <p className="gdrive-email-hint">
                {isDE ? "Ihre E-Mail:" : "Your email:"} <strong>{userEmail}</strong>
              </p>
            )}
            <Button onClick={handleConnect} className="gdrive-connect-btn">
              <HardDrive className="w-5 h-5 mr-2" />
              {isDE ? "Mit Google Drive verbinden" : "Connect to Google Drive"}
            </Button>
          </div>
        );

      case "connecting":
        return (
          <div className="gdrive-setup-content gdrive-setup-loading">
            <Loader2 className="w-12 h-12 animate-spin" />
            <h3>{isDE ? "Verbindung wird hergestellt..." : "Connecting..."}</h3>
            <p>{isDE ? "Speicher wird geprüft und Ordner erstellt." : "Checking storage and creating folders."}</p>
          </div>
        );

      case "complete":
        return (
          <div className="gdrive-setup-content gdrive-setup-success">
            <CheckCircle2 className="w-12 h-12" />
            <h3>{isDE ? "Erfolgreich verbunden!" : "Successfully connected!"}</h3>
            <p>
              {isDE
                ? 'Ordner "TAXBEBO" wurde in Ihrem Google Drive erstellt.'
                : '"TAXBEBO" folder has been created in your Google Drive.'}
            </p>
          </div>
        );

      case "email_mismatch":
        return (
          <div className="gdrive-setup-content gdrive-setup-error">
            <ShieldAlert className="w-12 h-12" />
            <h3>{isDE ? "E-Mail stimmt nicht überein" : "Email Mismatch"}</h3>
            <p>{errorMessage}</p>
            <Button variant="outline" onClick={handleConnect}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {isDE ? "Erneut versuchen" : "Try again"}
            </Button>
          </div>
        );

      case "insufficient_storage":
        return (
          <div className="gdrive-setup-content gdrive-setup-warning">
            <AlertCircle className="w-12 h-12" />
            <h3>{isDE ? "Unzureichender Speicherplatz" : "Insufficient Storage"}</h3>
            <p>
              {isDE
                ? `Ihr Google Drive hat nur ${availableMB} MB frei. Mindestens 500 MB werden benötigt.`
                : `Your Google Drive only has ${availableMB} MB available. Minimum 500 MB required.`}
            </p>
            <Button variant="outline" onClick={handleConnect}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {isDE ? "Erneut prüfen" : "Check again"}
            </Button>
          </div>
        );

      case "error":
        return (
          <div className="gdrive-setup-content gdrive-setup-error">
            <AlertCircle className="w-12 h-12" />
            <h3>{isDE ? "Verbindungsfehler" : "Connection Error"}</h3>
            <p>{errorMessage}</p>
            <Button variant="outline" onClick={() => setStep("intro")}>
              <RefreshCw className="w-4 h-4 mr-2" />
              {isDE ? "Erneut versuchen" : "Try again"}
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="gdrive-modal-overlay" onClick={onCancel}>
      <div className="gdrive-modal" onClick={(e) => e.stopPropagation()}>
        <div className="gdrive-modal-header">
          <h2>{isDE ? "Google Drive einrichten" : "Set Up Google Drive"}</h2>
        </div>

        {renderContent()}

        <div className="gdrive-modal-footer">
          <div className="gdrive-storage-note">
            <AlertCircle className="w-4 h-4" />
            <span>
              {isDE ? "Mindestens 500 MB freier Speicher erforderlich" : "Minimum 500 MB free space required"}
            </span>
          </div>
          {(step === "intro" || step === "insufficient_storage" || step === "error" || step === "email_mismatch") && (
            <Button variant="ghost" onClick={onCancel}>
              {isDE ? "Abbrechen" : "Cancel"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
