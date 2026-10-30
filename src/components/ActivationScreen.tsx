import React, { useState, useEffect } from 'react';
import { 
  ShieldCheck, 
  Key, 
  RefreshCw, 
  AlertTriangle, 
  CheckCircle2, 
  RotateCw, 
  Lock, 
  Server, 
  ClipboardPaste
} from 'lucide-react';
import appLogo from '../assets/app-logo.png';

interface ActivationScreenProps {
  onActivated?: (info: any) => void;
  isModal?: boolean;
  onClose?: () => void;
}

export default function ActivationScreen({ onActivated, isModal = false, onClose }: ActivationScreenProps) {
  const [licenseKey, setLicenseKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ client?: string; software?: string; token?: string } | null>(null);
  const [countdown, setCountdown] = useState<number | null>(null);

  // Auto-countdown to restart upon success
  useEffect(() => {
    if (countdown === null) return;
    if (countdown <= 0) {
      handleRelaunch();
      return;
    }
    const timer = setTimeout(() => {
      setCountdown(countdown - 1);
    }, 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setLicenseKey(text.trim());
        setError(null);
      }
    } catch (e) {
      // Clipboard fallback
    }
  };

  const handleActivate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const cleanKey = licenseKey.trim();
    if (!cleanKey) {
      setError('Veuillez saisir votre clé d\'activation.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      if (window.electronAPI?.verifyActivationKey) {
        const res = await window.electronAPI.verifyActivationKey(cleanKey);
        if (res.success) {
          setSuccessInfo({
            client: res.client || 'Client Dominosoft',
            software: (res as any).software || 'imatechx / Salle des Jeux',
            token: (res as any).token || ''
          });
          setCountdown(3);
          if (onActivated) {
            onActivated(res);
          }
        } else {
          setError(res.error || 'Clé d\'activation invalide ou rejetée par le serveur .');
        }
      } else {
        // Fallback demo mode if running in browser outside Electron
        setTimeout(() => {
          setSuccessInfo({
            client: 'Utilisateur Démo',
            software: 'imatechx',
            token: 'tok_demo_dev_test'
          });
          setCountdown(3);
        }, 1200);
      }
    } catch (err: any) {
      setError(err?.message || 'Erreur inattendue lors de la vérification de la clé.');
    } finally {
      setLoading(false);
    }
  };

  const handleRelaunch = () => {
    if (window.electronAPI?.relaunchApp) {
      window.electronAPI.relaunchApp();
    } else {
      window.location.reload();
    }
  };

  const content = (
    <div style={{
      width: '100%',
      maxWidth: '520px',
      background: '#ffffff',
      borderRadius: '16px',
      boxShadow: '0 20px 40px -15px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.06)',
      padding: '36px 32px',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Top ambient color bar */}
      <div style={{
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        height: '5px',
        background: successInfo ? 'linear-gradient(90deg, #10b981, #059669)' : 'linear-gradient(90deg, #2563eb, #3b82f6, #06b6d4)'
      }} />

      {/* Close button if modal */}
      {isModal && onClose && (
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '16px',
            right: '16px',
            background: 'transparent',
            border: 'none',
            fontSize: '18px',
            color: '#64748b',
            cursor: 'pointer',
            padding: '4px 8px',
            borderRadius: '6px'
          }}
        >
          ✕
        </button>
      )}

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '28px' }}>
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '74px',
          height: '74px',
          borderRadius: '20px',
          background: successInfo ? '#dcfce7' : '#eff6ff',
          marginBottom: '16px',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)',
          position: 'relative'
        }}>
          {successInfo ? (
            <CheckCircle2 size={42} color="#16a34a" />
          ) : (
            <>
              <img 
                src={appLogo} 
                alt="Logo" 
                onError={(e) => {
                  const target = e.currentTarget;
                  target.style.display = 'none';
                }}
                style={{ width: '48px', height: '48px', objectFit: 'contain' }} 
              />
              <div style={{
                position: 'absolute',
                bottom: '-4px',
                right: '-4px',
                background: '#2563eb',
                borderRadius: '50%',
                padding: '4px',
                color: '#fff',
                display: 'flex'
              }}>
                <Key size={13} />
              </div>
            </>
          )}
        </div>

        <h1 style={{
          fontSize: '22px',
          fontWeight: 800,
          color: '#0f172a',
          marginBottom: '6px',
          letterSpacing: '-0.02em'
        }}>
          {successInfo ? 'Licence Activée avec Succès' : 'Activation du Logiciel'}
        </h1>
        <p style={{ fontSize: '13px', color: '#64748b', margin: 0 }}>
          {successInfo 
            ? 'Votre copie du logiciel est validée et prête à l\'utilisation.'
            : 'Saisissez votre clé de licence pour activer et sécuriser votre application.'}
        </p>
      </div>

      {/* Success State */}
      {successInfo ? (
        <div style={{ animation: 'fadeIn 0.25s ease' }}>
          <div style={{
            background: '#f0fdf4',
            border: '1px solid #bbf7d0',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '24px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '14px', color: '#15803d', fontWeight: 700, fontSize: '14px' }}>
              <ShieldCheck size={20} />
              <span>Licence Dominosoft Authentifiée</span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '8px 16px', fontSize: '13px' }}>
              <span style={{ color: '#64748b', fontWeight: 600 }}>Client :</span>
              <span style={{ color: '#0f172a', fontWeight: 700 }}>{successInfo.client || 'Client Enregistré'}</span>

              {successInfo.software && (
                <>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Logiciel :</span>
                  <span style={{ color: '#0f172a', fontWeight: 600 }}>{successInfo.software}</span>
                </>
              )}

              {successInfo.token && (
                <>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Jeton Sécurisé :</span>
                  <span style={{ color: '#0f172a', fontFamily: 'monospace', fontSize: '11px' }}>
                    {successInfo.token}
                  </span>
                </>
              )}

              <span style={{ color: '#64748b', fontWeight: 600 }}>Fichier Flag :</span>
              <span style={{ color: '#16a34a', fontSize: '11px', fontFamily: 'monospace' }}>
                %LOCALAPPDATA%/elc-app/activator.flag
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              onClick={handleRelaunch}
              style={{
                width: '100%',
                padding: '12px',
                borderRadius: '10px',
                background: '#16a34a',
                color: '#ffffff',
                border: 'none',
                fontSize: '14px',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                transition: 'all 0.15s ease'
              }}
            >
              <RotateCw size={17} />
              <span>Redémarrer l'application {countdown !== null ? `(${countdown}s)` : ''}</span>
            </button>

            {isModal && onClose && (
              <button
                type="button"
                onClick={onClose}
                style={{
                  width: '100%',
                  padding: '10px',
                  borderRadius: '10px',
                  background: '#f1f5f9',
                  color: '#334155',
                  border: 'none',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer'
                }}
              >
                Fermer la fenêtre
              </button>
            )}
          </div>
        </div>
      ) : (
        /* Form State */
        <form onSubmit={handleActivate}>
          {error && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '12px 14px',
              borderRadius: '10px',
              fontSize: '13px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '10px',
              animation: 'shake 0.3s ease'
            }}>
              <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong style={{ display: 'block', marginBottom: '2px' }}>Erreur d'activation :</strong>
                <span>{error}</span>
              </div>
            </div>
          )}

          <div style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <label style={{ fontSize: '13px', fontWeight: 700, color: '#334155' }}>
                Clé de Licence Dominosoft
              </label>
              <button
                type="button"
                onClick={handlePaste}
                style={{
                  background: 'none',
                  border: 'none',
                  color: '#2563eb',
                  fontSize: '12px',
                  fontWeight: 600,
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '2px 6px',
                  borderRadius: '4px'
                }}
              >
                <ClipboardPaste size={13} />
                Coller
              </button>
            </div>

            <div style={{ position: 'relative' }}>
              <input
                type="text"
                value={licenseKey}
                onChange={(e) => {
                  setLicenseKey(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Ex: DOMINO-XXXX-XXXX-XXXX"
                disabled={loading}
                autoFocus
                style={{
                  width: '100%',
                  padding: '12px 14px',
                  fontSize: '14px',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                  borderRadius: '10px',
                  border: error ? '1.5px solid #ef4444' : '1.5px solid #cbd5e1',
                  outline: 'none',
                  background: loading ? '#f8fafc' : '#ffffff',
                  boxSizing: 'border-box',
                  transition: 'border-color 0.15s ease, box-shadow 0.15s ease'
                }}
              />
            </div>
           
          </div>

          {/* Action button */}
          <button
            type="submit"
            disabled={loading || !licenseKey.trim()}
            style={{
              width: '100%',
              padding: '12px',
              borderRadius: '10px',
              background: loading || !licenseKey.trim() ? '#94a3b8' : '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '14px',
              fontWeight: 700,
              cursor: loading || !licenseKey.trim() ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              boxShadow: loading || !licenseKey.trim() ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.3)',
              transition: 'all 0.15s ease'
            }}
          >
            {loading ? (
              <>
                <RefreshCw className="animate-spin" size={17} />
                <span>Vérification sécurisée auprès du serveur...</span>
              </>
            ) : (
              <>
                <ShieldCheck size={18} />
                <span>Activer le Logiciel</span>
              </>
            )}
          </button>

          {/* Security Features Info Box */}
          <div style={{
            marginTop: '24px',
            paddingTop: '18px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            flexWrap: 'wrap',
            fontSize: '11px',
            color: '#64748b'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Lock size={12} color="#059669" />
              <span>HMAC-SHA256</span>
            </div>
            <span>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <Server size={12} color="#2563eb" />
             
            </div>
            <span>•</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span>Horodatage HEAD</span>
            </div>
          </div>
        </form>
      )}
    </div>
  );

  if (isModal) {
    return (
      <div style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px'
      }}>
        {content}
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(ellipse at top, #1e293b, #0f172a)',
      padding: '20px'
    }}>
      {content}
    </div>
  );
}
