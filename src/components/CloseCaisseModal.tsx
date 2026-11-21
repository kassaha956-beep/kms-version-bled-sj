import React, { useState, useEffect } from 'react';
import { LogOut, AlertTriangle, CheckCircle, Clock, X, ShieldAlert } from 'lucide-react';

interface CloseCaisseModalProps {
  isOpen: boolean;
  currentUser: any;
  onCaisseClosed: () => void;
  onCancel: () => void;
}

export default function CloseCaisseModal({
  isOpen,
  currentUser,
  onCaisseClosed,
  onCancel
}: CloseCaisseModalProps) {
  const [openCaisses, setOpenCaisses] = useState<any[]>([]);
  const [countedBalances, setCountedBalances] = useState<{ [id: number]: string }>({});
  const [notes, setNotes] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [fetching, setFetching] = useState<boolean>(true);
  const [errorMsg, setErrorMsg] = useState<string>('');

  useEffect(() => {
    if (!isOpen) return;

    const loadOpenCaisses = async () => {
      setFetching(true);
      setErrorMsg('');
      try {
        if (window.electronAPI?.getCaisses) {
          const res = await window.electronAPI.getCaisses();
          if (res?.success && Array.isArray(res.caisses)) {
            const activeOnly = res.caisses.filter((c: any) => c.status === 'open');
            setOpenCaisses(activeOnly);

            const initialCounted: { [id: number]: string } = {};
            activeOnly.forEach((c: any) => {
              const act = c.active_session;
              const openBal = act?.opening_balance ? Number(act.opening_balance) : 0;
              const sessIn = act?.session_in ? Number(act.session_in) : (Number(c.today_in) || 0);
              const sessOut = act?.session_out ? Number(act.session_out) : (Number(c.today_out) || 0);
              const drawerExp = act?.drawer_expected !== undefined 
                ? Number(act.drawer_expected) 
                : (openBal + sessIn - sessOut);
              initialCounted[c.id] = String(drawerExp);
            });
            setCountedBalances(initialCounted);
          }
        }
      } catch (err: any) {
        console.error('Failed to load open caisses for closing:', err);
        setErrorMsg('Erreur lors du chargement des caisses ouvertes.');
      } finally {
        setFetching(false);
      }
    };

    loadOpenCaisses();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCountedChange = (id: number, val: string) => {
    setCountedBalances(prev => ({ ...prev, [id]: val }));
  };

  const formatMoney = (val: number) => {
    return Number(val || 0).toLocaleString('fr-DZ', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' DA';
  };

  const handleCloseAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');

    try {
      if (window.electronAPI?.flushCache) {
        await window.electronAPI.flushCache();
      }

      if (window.electronAPI?.closeAllCaisses) {
        const items = openCaisses.map((c: any) => {
          const valNum = parseFloat(countedBalances[c.id]);
          return {
            caisse_id: c.id,
            actual_balance: !isNaN(valNum) ? valNum : Number(c.current_balance || 0),
            notes: notes.trim()
          };
        });

        const res = await window.electronAPI.closeAllCaisses({
          user_id: currentUser?.id,
          user_name: currentUser?.full_name || currentUser?.username || 'Caissier',
          items,
          notes: notes.trim() || 'Clôture groupée de fin de journée'
        });

        if (res?.success) {
          onCaisseClosed();
        } else {
          setErrorMsg(res?.message || 'Erreur lors de la clôture des caisses.');
        }
      } else {
        // Fallback: close each one by one
        for (const c of openCaisses) {
          const valNum = parseFloat(countedBalances[c.id]);
          await window.electronAPI?.closeCaisseSession?.({
            caisse_id: c.id,
            user_id: currentUser?.id,
            user_name: currentUser?.full_name || currentUser?.username || 'Caissier',
            closing_balance_actual: !isNaN(valNum) ? valNum : Number(c.current_balance || 0),
            actual_balance: !isNaN(valNum) ? valNum : Number(c.current_balance || 0),
            notes: notes.trim()
          });
        }
        onCaisseClosed();
      }
    } catch (err: any) {
      console.error('Error closing all caisses:', err);
      setErrorMsg(err.message || 'Erreur lors de la clôture de toutes les caisses.');
    } finally {
      setLoading(false);
    }
  };

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
        maxWidth: '580px',
        maxHeight: '90vh',
        boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
        overflow: 'hidden',
        border: '1px solid #e2e8f0',
        display: 'flex',
        flexDirection: 'column'
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          padding: '20px 24px',
          color: '#ffffff',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              borderRadius: '10px',
              background: 'rgba(239, 68, 68, 0.2)',
              border: '1px solid rgba(239, 68, 68, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <LogOut size={20} color="#f87171" />
            </div>
            <div>
              <h2 style={{ fontSize: '17px', fontWeight: 800, margin: 0 }}>
                Clôture de Toutes les Caisses & Déconnexion
              </h2>
              <p style={{ fontSize: '11px', margin: '2px 0 0 0', color: '#94a3b8' }}>
                Toutes les caisses actives doivent être clôturées avant de quitter l'application.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onCancel}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: 'none',
              borderRadius: '8px',
              width: '32px',
              height: '32px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#cbd5e1'
            }}
          >
            <X size={16} />
          </button>
        </div>

        {/* Content & Form */}
        <form onSubmit={handleCloseAll} style={{ padding: '22px 24px', display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}>
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
              <AlertTriangle size={16} style={{ flexShrink: 0 }} />
              <span>{errorMsg}</span>
            </div>
          )}

          {fetching ? (
            <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '13px' }}>
              Chargement des caisses ouvertes...
            </div>
          ) : openCaisses.length === 0 ? (
            <div style={{
              padding: '20px',
              textAlign: 'center',
              background: '#f0fdf4',
              border: '1px solid #bbf7d0',
              borderRadius: '10px',
              color: '#15803d',
              fontSize: '13px',
              fontWeight: 700
            }}>
              Toutes les caisses sont déjà fermées. Vous pouvez vous déconnecter directement.
            </div>
          ) : (
            <>
              {/* Caisses count badge */}
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '10px 12px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '12px',
                color: '#1e40af'
              }}>
                <ShieldAlert size={18} style={{ flexShrink: 0 }} />
                <span>
                  <strong>{openCaisses.length} caisse(s) active(s)</strong> seront clôturées et archivées ensemble.
                </span>
              </div>

              {/* List of each open caisse */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {openCaisses.map((c: any) => {
                  const act = c.active_session;
                  const openBal = act?.opening_balance ? Number(act.opening_balance) : 0;
                  const sessIn = act?.session_in ? Number(act.session_in) : (Number(c.today_in) || 0);
                  const sessOut = act?.session_out ? Number(act.session_out) : (Number(c.today_out) || 0);
                  const drawerExp = act?.drawer_expected !== undefined 
                    ? Number(act.drawer_expected) 
                    : (openBal + sessIn - sessOut);

                  const countedVal = parseFloat(countedBalances[c.id]);
                  const validCounted = !isNaN(countedVal);
                  const discrepancy = validCounted ? (countedVal - drawerExp) : 0;

                  return (
                    <div
                      key={c.id}
                      style={{
                        background: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '14px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '10px'
                      }}
                    >
                      {/* Caisse row top */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <strong style={{ fontSize: '14px', color: '#0f172a' }}>{c.name}</strong>
                          <span style={{ fontSize: '11px', color: '#64748b', marginLeft: '6px' }}>({c.code})</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#64748b' }}>
                          <Clock size={12} />
                          <span>Session #{act?.id || '-'}</span>
                        </div>
                      </div>

                      {/* Numbers row */}
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '6px' }}>
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
                          <div style={{ fontSize: '10px', color: '#64748b' }}>Fond initial</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>{formatMoney(openBal)}</div>
                        </div>
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
                          <div style={{ fontSize: '10px', color: '#16a34a' }}>+ Entrées</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#16a34a' }}>+{formatMoney(sessIn)}</div>
                        </div>
                        <div style={{ background: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '6px', padding: '6px 8px' }}>
                          <div style={{ fontSize: '10px', color: '#dc2626' }}>- Sorties</div>
                          <div style={{ fontSize: '11px', fontWeight: 700, color: '#dc2626' }}>-{formatMoney(sessOut)}</div>
                        </div>
                      </div>

                      {/* Expected vs counted input */}
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', background: '#ffffff', padding: '8px 10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                        <div>
                          <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700 }}>Attendu théorique :</div>
                          <div style={{ fontSize: '13px', fontWeight: 800, color: '#1e40af' }}>{formatMoney(drawerExp)}</div>
                        </div>

                        <div style={{ width: '180px', position: 'relative' }}>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            className="input-clean"
                            value={countedBalances[c.id] !== undefined ? countedBalances[c.id] : String(drawerExp)}
                            onChange={(e) => handleCountedChange(c.id, e.target.value)}
                            placeholder="0.00"
                            required
                            style={{
                              width: '100%',
                              fontSize: '13px',
                              fontWeight: 800,
                              padding: '8px 36px 8px 10px',
                              textAlign: 'right',
                              border: validCounted ? (discrepancy === 0 ? '2px solid #16a34a' : discrepancy > 0 ? '2px solid #0284c7' : '2px solid #dc2626') : '1px solid #cbd5e1'
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

                      {/* Discrepancy indicator for this caisse */}
                      {validCounted && (
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          padding: '4px 8px',
                          borderRadius: '6px',
                          fontSize: '11px',
                          fontWeight: 700,
                          background: discrepancy === 0 ? '#f0fdf4' : discrepancy > 0 ? '#f0f9ff' : '#fef2f2',
                          color: discrepancy === 0 ? '#15803d' : discrepancy > 0 ? '#0369a1' : '#b91c1c'
                        }}>
                          <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            {discrepancy === 0 ? <CheckCircle size={13} /> : <AlertTriangle size={13} />}
                            {discrepancy === 0 ? 'Équilibrée' : discrepancy > 0 ? 'Excédent' : 'Déficit'}
                          </span>
                          <span>{discrepancy > 0 ? `+${formatMoney(discrepancy)}` : formatMoney(discrepancy)}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Notes */}
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: '#475569', marginBottom: '4px' }}>
                  Notes de Clôture Générales :
                </label>
                <input
                  type="text"
                  className="input-clean"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Ex: Clôture fin de journée..."
                  style={{ width: '100%', fontSize: '12px' }}
                />
              </div>

              {/* Buttons */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={onCancel}
                  style={{
                    flex: 1,
                    padding: '11px',
                    fontSize: '13px',
                    fontWeight: 700,
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    background: '#ffffff',
                    color: '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Annuler (Rester)
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    flex: 2,
                    padding: '11px',
                    fontSize: '13px',
                    fontWeight: 800,
                    borderRadius: '8px',
                    border: 'none',
                    background: '#dc2626',
                    color: '#ffffff',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    boxShadow: '0 4px 6px -1px rgba(220, 38, 38, 0.25)'
                  }}
                >
                  <LogOut size={16} />
                  <span>{loading ? 'Clôture en cours...' : 'Clôturer Toutes les Caisses et Quitter'}</span>
                </button>
              </div>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
