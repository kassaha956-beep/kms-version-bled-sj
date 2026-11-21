import React, { useState, useEffect } from 'react';
import { Landmark, ArrowRight, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';

interface OpenCaisseModalProps {
  isOpen: boolean;
  currentUser: any;
  onCaisseOpened: (session: any) => void;
}

export default function OpenCaisseModal({ isOpen, currentUser, onCaisseOpened }: OpenCaisseModalProps) {
  const [caisses, setCaisses] = useState<any[]>([]);
  const [balances, setBalances] = useState<{ [id: number]: string }>({});
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetchingCaisses, setFetchingCaisses] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    const loadCaisses = async () => {
      setFetchingCaisses(true);
      setErrorMsg('');
      try {
        if (window.electronAPI?.getCaisses) {
          const res = await window.electronAPI.getCaisses();
          if (res?.success && Array.isArray(res.caisses)) {
            setCaisses(res.caisses);
            const initBal: { [id: number]: string } = {};
            res.caisses.forEach((c: any) => {
              initBal[c.id] = String(Number(c.current_balance) || 0);
            });
            setBalances(initBal);
          }
        }
      } catch (err: any) {
        console.error('Failed to load caisses for mandatory login open:', err);
        setErrorMsg('Erreur lors du chargement des caisses.');
      } finally {
        setFetchingCaisses(false);
      }
    };

    loadCaisses();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleBalanceChange = (id: number, val: string) => {
    setBalances(prev => ({ ...prev, [id]: val }));
  };

  const handleStartAll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (caisses.length === 0) {
      setErrorMsg('Aucune caisse enregistrée dans le système.');
      return;
    }

    setLoading(true);
    setErrorMsg('');

    try {
      if (window.electronAPI?.flushCache) {
        await window.electronAPI.flushCache();
      }

      // Start each closed caisse with its specified fond de caisse
      for (const c of caisses) {
        if (c.status !== 'open') {
          const valNum = parseFloat(balances[c.id]);
          const openAmount = !isNaN(valNum) && valNum >= 0 ? valNum : (Number(c.current_balance) || 0);

          await window.electronAPI?.openCaisseSession?.({
            caisse_id: c.id,
            user_id: currentUser?.id,
            user_name: currentUser?.full_name || currentUser?.username || 'Caissier',
            opening_balance: openAmount,
            notes: notes.trim() || 'Ouverture globale de début de session'
          });
        }
      }

      if (window.electronAPI?.flushCache) {
        await window.electronAPI.flushCache();
      }

      // Retrieve active session for currentUser
      let activeSess = null;
      if (window.electronAPI?.getActiveCaisseSession) {
        const check = await window.electronAPI.getActiveCaisseSession({ user_id: currentUser?.id });
        if (check?.success && check.activeSession) {
          activeSess = check.activeSession;
        }
      }

      onCaisseOpened(activeSess || {
        id: Date.now(),
        user_id: currentUser?.id,
        user_name: currentUser?.full_name || currentUser?.username,
        all_started: true
      });
    } catch (err: any) {
      console.error('Error starting all caisses:', err);
      setErrorMsg(err.message || "Erreur lors du démarrage de l'ensemble des caisses.");
    } finally {
      setLoading(false);
    }
  };

  const closedCaisses = caisses.filter(c => c.status !== 'open');

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      backgroundColor: 'rgba(15, 23, 42, 0.8)',
      backdropFilter: 'blur(6px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 99999,
      padding: '16px'
    }}>
      <div style={{
        background: '#ffffff',
        borderRadius: '16px',
        width: '100%',
        maxWidth: '560px',
        maxHeight: '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
          padding: '22px 24px 18px 24px',
          color: '#ffffff',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
            <div style={{
              width: '42px',
              height: '42px',
              borderRadius: '10px',
              background: 'rgba(255, 255, 255, 0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Landmark size={22} color="#ffffff" />
            </div>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, margin: 0, letterSpacing: '-0.01em' }}>
                Démarrage Obligatoire de Toutes les Caisses
              </h2>
              <p style={{ fontSize: '12px', margin: '2px 0 0 0', opacity: 0.9 }}>
                Session de travail pour : <strong>{currentUser?.full_name || currentUser?.username}</strong>
              </p>
            </div>
          </div>
          <p style={{ fontSize: '11px', margin: 0, opacity: 0.9, lineHeight: 1.4 }}>
            Toutes les caisses du magasin démarrent ensemble. Vérifiez ou confirmez les fonds de caisse réels ci-dessous avant de commencer.
          </p>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleStartAll} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
          {errorMsg && (
            <div style={{
              background: '#fef2f2',
              border: '1px solid #fecaca',
              color: '#b91c1c',
              padding: '10px 12px',
              borderRadius: '8px',
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {fetchingCaisses ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              Chargement des caisses...
            </div>
          ) : caisses.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#b91c1c', fontSize: '13px', background: '#fef2f2', borderRadius: '8px' }}>
              Aucune caisse enregistrée.
            </div>
          ) : (
            <>
              {/* Caisses List with input per caisse */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, color: '#0f172a', marginBottom: '8px' }}>
                  Fonds de Caisse Initiaux par Caisse ({caisses.length} caisse{caisses.length > 1 ? 's' : ''}) :
                </label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {caisses.map((c) => {
                    const isOpen = c.status === 'open';
                    return (
                      <div
                        key={c.id}
                        style={{
                          background: isOpen ? '#f0fdf4' : '#f8fafc',
                          border: isOpen ? '1px solid #bbf7d0' : '1px solid #e2e8f0',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '12px'
                        }}
                      >
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <strong style={{ fontSize: '13px', color: '#0f172a' }}>{c.name}</strong>
                            {c.is_default === 1 && (
                              <span style={{ fontSize: '9px', background: '#dbeafe', color: '#1e40af', padding: '1px 5px', borderRadius: '4px', fontWeight: 700 }}>
                                Principale
                              </span>
                            )}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Solde précédent : {Number(c.current_balance || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2 })} DA
                            {isOpen && <span style={{ color: '#16a34a', fontWeight: 700, marginLeft: '6px' }}>• Déjà active</span>}
                          </div>
                        </div>

                        <div style={{ width: '160px', position: 'relative' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            disabled={isOpen}
                            className="input-clean"
                            value={balances[c.id] !== undefined ? balances[c.id] : String(c.current_balance || 0)}
                            onChange={(e) => handleBalanceChange(c.id, e.target.value)}
                            placeholder="0.00"
                            required
                            style={{
                              width: '100%',
                              fontSize: '13px',
                              fontWeight: 800,
                              padding: '8px 36px 8px 10px',
                              color: '#0f172a',
                              background: isOpen ? '#e2e8f0' : '#ffffff',
                              textAlign: 'right'
                            }}
                          />
                          <span style={{
                            position: 'absolute',
                            right: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            fontSize: '11px',
                            fontWeight: 700,
                            color: '#64748b',
                            pointerEvents: 'none'
                          }}>
                            DA
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Note d'ouverture commune (Optionnel) :
                </label>
                <input
                  type="text"
                  className="input-clean"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Démarrage équipe matin..."
                  style={{ width: '100%', fontSize: '12px' }}
                />
              </div>

              {/* Summary info banner */}
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#15803d'
              }}>
                <ShieldCheck size={18} style={{ flexShrink: 0 }} />
                <span>
                  {closedCaisses.length > 0
                    ? `En validant, les ${closedCaisses.length} caisse(s) fermée(s) seront immédiatement ouvertes et prêtes pour les encaissements.`
                    : 'Toutes les caisses sont actuellement actives.'}
                </span>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading || fetchingCaisses || caisses.length === 0}
                className="btn-green"
                style={{
                  width: '100%',
                  padding: '13px',
                  fontSize: '14px',
                  fontWeight: 800,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  boxShadow: '0 4px 6px -1px rgba(22, 163, 74, 0.25)',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  marginTop: '4px'
                }}
              >
                {loading ? (
                  <span>Démarrage en cours...</span>
                ) : (
                  <>
                    <CheckCircle2 size={18} />
                    <span>Démarrer Toutes les Caisses et Commencer</span>
                    <ArrowRight size={16} />
                  </>
                )}
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
