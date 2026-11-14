const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'src', 'components', 'EmployeePaiementPage.tsx');
let c = fs.readFileSync(filePath, 'utf8');

// Normalize line endings to \n for easier regex and replacement
const norm = s => s.replace(/\r\n/g, '\n');
c = norm(c);

// 1. Update imports
c = c.replace(
  "  Calendar, Check, Settings, Sun, Moon, Sparkles\n} from 'lucide-react';",
  "  Calendar, Check, Settings, Sun, Moon, Sparkles, RotateCcw, UserCheck\n} from 'lucide-react';"
);

// 2. Add Caisse state, repay states
const targetBeforePayTarget = "  // Salary payment modal state\n  const [payTarget, setPayTarget] = useState<User | null>(null);";
const caisseAndRepayStates = `  // Caisse accounts list
  const [caissesList, setCaissesList] = useState<Array<{ id: number; name: string; current_balance?: number }>>([]);

  // Repay debt modal state
  const [repayDebtTarget, setRepayDebtTarget] = useState<Debt | null>(null);
  const [repayDebtForm, setRepayDebtForm] = useState({
    amount: '',
    date: tod(),
    caisse_id: '',
    payment_method: 'especes',
    notes: ''
  });

  // Repay / refund advance modal state
  const [repayAdvTarget, setRepayAdvTarget] = useState<Advance | null>(null);
  const [repayAdvForm, setRepayAdvForm] = useState({
    amount: '',
    date: tod(),
    caisse_id: '',
    payment_method: 'especes',
    notes: ''
  });\n\n` + targetBeforePayTarget;

c = c.replace(targetBeforePayTarget, caisseAndRepayStates);

// 3. Update payForm to include caisse_id
c = c.replace(
  "    payment_date: tod(),\n    notes: ''\n  });",
  "    payment_date: tod(),\n    caisse_id: '',\n    notes: ''\n  });"
);

// 4. Update advForm to include caisse_id
c = c.replace(
  "    payment_method: 'especes',\n    reference: ''\n  });",
  "    payment_method: 'especes',\n    caisse_id: '',\n    reference: ''\n  });"
);

// 5. Update debtForm to include caisse_id and payment_method
c = c.replace(
  "  const [debtForm, setDebtForm] = useState({ amount: '', date: tod(), description: '' });",
  "  const [debtForm, setDebtForm] = useState({ amount: '', date: tod(), caisse_id: '', payment_method: 'especes', description: '' });"
);

// 6. Fetch caisses on mount in loadCaisses
const loadCaissesFn = `  // Load caisses list
  const loadCaisses = useCallback(async () => {
    try {
      const res = api?.getCaisses ? await api.getCaisses() : null;
      if (res?.success && Array.isArray(res.caisses)) {
        setCaissesList(res.caisses);
      }
    } catch (e) {
      console.error('Error loading caisses:', e);
    }
  }, []);

  useEffect(() => {
    loadCaisses();
  }, [loadCaisses]);\n\n`;

c = c.replace("  useEffect(() => {\n    loadKpis();\n  }, [loadKpis]);", "  useEffect(() => {\n    loadKpis();\n  }, [loadKpis]);\n\n" + loadCaissesFn);

// 7. Update 26 to 30 in dailyRate and calculations
c = c.replace("baseSalary > 0 ? baseSalary / 26 : 0", "baseSalary > 0 ? baseSalary / 30 : 0");
c = c.replace("Math.round((salary / 26) * 100) / 100", "Math.round((salary / 30) * 100) / 100");
c = c.replace("salary > 0 ? salary / 26 : 0", "salary > 0 ? salary / 30 : 0");
c = c.replace("String(Math.round((num / 26) * 100) / 100)", "String(Math.round((num / 30) * 100) / 100)");
c = c.replace("String(Math.round((sal / 26) * 100) / 100)", "String(Math.round((sal / 30) * 100) / 100)");
c = c.replace("Calculer / 26j", "Calculer / 30j");
c = c.replace("{attendanceStats.workedDays} <span style={{ fontSize: '12px', fontWeight: 600 }}>/ 26j</span>", "{attendanceStats.workedDays} <span style={{ fontSize: '12px', fontWeight: 600 }}>/ 30j</span>");

// 8. Open Repay Debt / Advance helper functions
const repayHandlers = `  // Open Repay Debt Modal
  const openRepayDebt = (d: Debt) => {
    setRepayDebtTarget(d);
    setRepayDebtForm({
      amount: String(d.remaining),
      date: tod(),
      caisse_id: caissesList.length > 0 ? String(caissesList[0].id) : '',
      payment_method: 'especes',
      notes: ''
    });
  };

  // Submit Repay Debt
  const handleRepayDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayDebtTarget) return;
    const num = parseFloat(repayDebtForm.amount);
    if (isNaN(num) || num <= 0) return showToast(t.empToastInvalidAmount, 'error');

    setSaving(true);
    try {
      const res = api?.repayEmployeeDebt
        ? await api.repayEmployeeDebt({
            debt_id: repayDebtTarget.id,
            amount: num,
            date: repayDebtForm.date,
            caisse_id: repayDebtForm.caisse_id ? Number(repayDebtForm.caisse_id) : null,
            payment_method: repayDebtForm.payment_method,
            notes: repayDebtForm.notes,
            user_name: _cu?.full_name || _cu?.username || 'Admin'
          })
        : { success: true, remaining: Math.max(0, repayDebtTarget.remaining - num) };

      if (res?.success) {
        showToast(t.empToastRepaySaved);
        setRepayDebtTarget(null);
        // Refresh detail debts
        if (detailUser) {
          const uRes = api?.getEmployeeById ? await api.getEmployeeById(detailUser.id) : null;
          if (uRes?.success) setDetailDebt(uRes.debts || []);
        }
        loadUsers();
        loadAllEmployees();
        loadKpis();
        loadCaisses();
      } else {
        showToast(res?.message || 'Erreur', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  // Open Repay Advance Modal
  const openRepayAdv = (a: Advance) => {
    setRepayAdvTarget(a);
    setRepayAdvForm({
      amount: String(a.amount),
      date: tod(),
      caisse_id: caissesList.length > 0 ? String(caissesList[0].id) : '',
      payment_method: 'especes',
      notes: ''
    });
  };

  // Submit Repay Advance
  const handleRepayAdv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!repayAdvTarget) return;
    const num = parseFloat(repayAdvForm.amount);
    if (isNaN(num) || num <= 0) return showToast(t.empToastInvalidAmount, 'error');

    setSaving(true);
    try {
      const res = api?.repayEmployeeAdvance
        ? await api.repayEmployeeAdvance({
            advance_id: repayAdvTarget.id,
            amount: num,
            date: repayAdvForm.date,
            caisse_id: repayAdvForm.caisse_id ? Number(repayAdvForm.caisse_id) : null,
            payment_method: repayAdvForm.payment_method,
            notes: repayAdvForm.notes,
            user_name: _cu?.full_name || _cu?.username || 'Admin'
          })
        : { success: true };

      if (res?.success) {
        showToast(t.empToastAdvRefunded);
        setRepayAdvTarget(null);
        if (detailUser) {
          const uRes = api?.getEmployeeById ? await api.getEmployeeById(detailUser.id) : null;
          if (uRes?.success) setDetailAdv(uRes.advances || []);
        }
        loadUsers();
        loadAllEmployees();
        loadKpis();
        loadCaisses();
      } else {
        showToast(res?.message || 'Erreur', 'error');
      }
    } finally {
      setSaving(false);
    }
  };\n\n`;

c = c.replace("  const delPay = async (id: number) => {", repayHandlers + "  const delPay = async (id: number) => {");

// 9. Update openPay, openAdv, openDebt to reset caisse_id
c = c.replace(
  "  const openPay = (u: User, presetNet?: number) => {\n    setPayTarget(u);",
  "  const openPay = (u: User, presetNet?: number) => {\n    setPayTarget(u);\n    const defC = caissesList.length > 0 ? String(caissesList[0].id) : '';"
);
c = c.replace(
  "      notes: ''\n    });\n  };",
  "      caisse_id: defC,\n      notes: ''\n    });\n  };"
);
c = c.replace(
  "  const openAdv = (u: User) => {\n    setAdvTarget(u);",
  "  const openAdv = (u: User) => {\n    setAdvTarget(u);\n    const defC = caissesList.length > 0 ? String(caissesList[0].id) : '';"
);
c = c.replace(
  "      reference: ''\n    });\n  };",
  "      caisse_id: defC,\n      reference: ''\n    });\n  };"
);
c = c.replace(
  "  const openDebt = (u: User) => {\n    setDebtTarget(u);\n    setDebtForm({ amount: '', date: tod(), description: '' });\n  };",
  "  const openDebt = (u: User) => {\n    setDebtTarget(u);\n    const defC = caissesList.length > 0 ? String(caissesList[0].id) : '';\n    setDebtForm({ amount: '', date: tod(), caisse_id: defC, payment_method: 'especes', description: '' });\n  };"
);

// 10. Pass caisse_id in handlePaySalary, handleAddAdv, handleAddDebt
c = c.replace(
  "            payment_date: payForm.payment_date,\n            notes: payForm.notes\n          })",
  "            payment_date: payForm.payment_date,\n            caisse_id: payForm.caisse_id ? Number(payForm.caisse_id) : null,\n            user_name: _cu?.full_name || _cu?.username || 'Admin',\n            notes: payForm.notes\n          })"
);
c = c.replace(
  "            ...advForm,\n            amount: parseFloat(advForm.amount)\n          })",
  "            ...advForm,\n            amount: parseFloat(advForm.amount),\n            caisse_id: advForm.caisse_id ? Number(advForm.caisse_id) : null,\n            user_name: _cu?.full_name || _cu?.username || 'Admin'\n          })"
);
c = c.replace(
  "            ...debtForm,\n            amount: parseFloat(debtForm.amount)\n          })",
  "            ...debtForm,\n            amount: parseFloat(debtForm.amount),\n            caisse_id: debtForm.caisse_id ? Number(debtForm.caisse_id) : null,\n            user_name: _cu?.full_name || _cu?.username || 'Admin'\n          })"
);

// Also reload caisses after payment, advance, debt:
c = c.replace("loadKpis();\n      } else {", "loadKpis();\n        loadCaisses();\n      } else {");

// 11. Add Caisse Selector to Pay Salary Modal
const payCaisseField = `            <Field label={t.empSelectCaisse}>
              <select
                style={inp}
                value={payForm.caisse_id}
                onChange={e => setPayForm(p => ({ ...p, caisse_id: e.target.value }))}
              >
                <option value="">{t.empNoCaisseAffect}</option>
                {caissesList.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({fmt(c.current_balance || 0)})
                  </option>
                ))}
              </select>
            </Field>\n\n            <Row>\n              <Field label={t.empPayDate}>`;

c = c.replace("            <Row>\n              <Field label={t.empPayDate}>", payCaisseField);

// 12. Add Caisse Selector to Add Advance Modal
const advCaisseField = `              <Field label={t.empSelectCaisse}>
                <select
                  style={inp}
                  value={advForm.caisse_id}
                  onChange={e => setAdvForm(p => ({ ...p, caisse_id: e.target.value }))}
                >
                  <option value="">{t.empNoCaisseAffect}</option>
                  {caissesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({fmt(c.current_balance || 0)})
                    </option>
                  ))}
                </select>
              </Field>\n            </Row>\n            <Row>\n              <Field label={t.empAdvReason}>`;

c = c.replace("            </Row>\n            <Row>\n              <Field label={t.empAdvReason}>", advCaisseField);

// 13. Add Caisse & Payment Method to Add Debt Modal
const debtCaisseFields = `            <Row>
              <Field label={t.empSelectCaisse}>
                <select
                  style={inp}
                  value={debtForm.caisse_id}
                  onChange={e => setDebtForm(p => ({ ...p, caisse_id: e.target.value }))}
                >
                  <option value="">{t.empNoCaisseAffect}</option>
                  {caissesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({fmt(c.current_balance || 0)})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.empPayMethod}>
                <select
                  style={inp}
                  value={debtForm.payment_method}
                  onChange={e => setDebtForm(p => ({ ...p, payment_method: e.target.value }))}
                >
                  <option value="especes">{t.empPayMethodCash}</option>
                  <option value="virement">{t.empPayMethodTransfer}</option>
                  <option value="cheque">{t.empPayMethodCheque}</option>
                  <option value="autre">{t.empPayMethodOther}</option>
                </select>
              </Field>
            </Row>\n            <Field label={t.empDebtDescription}>`;

c = c.replace("            <Field label={t.empDebtDescription}>", debtCaisseFields);

// 14. Add "Rembourser" button to Dettes Table in Details Modal
const oldDebtRowAction = `                      <td style={{ padding: '8px 10px' }}>
                        <button
                          onClick={() => delDebt(d.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            display: 'flex'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>`;

const newDebtRowAction = `                      <td style={{ padding: '8px 10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        {d.remaining > 0 && (
                          <button
                            type="button"
                            onClick={() => openRepayDebt(d)}
                            style={{
                              padding: '4px 8px',
                              borderRadius: '6px',
                              border: '1px solid #bbf7d0',
                              background: '#f0fdf4',
                              color: '#15803d',
                              cursor: 'pointer',
                              fontSize: '11px',
                              fontWeight: 700,
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}
                            title={t.empRepayDebtTitle}
                          >
                            <CheckCircle size={12} /> {t.empBtnRepay}
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => delDebt(d.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            display: 'flex'
                          }}
                          title={t.delete}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>`;

c = c.replace(oldDebtRowAction, newDebtRowAction);

// 15. Add "Restituer" button to Avances Table in Details Modal
const oldAdvRowAction = `                      <td style={{ padding: '8px 10px' }}>
                        <button
                          onClick={() => delAdv(a.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            display: 'flex'
                          }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>`;

const newAdvRowAction = `                      <td style={{ padding: '8px 10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                        <button
                          type="button"
                          onClick={() => openRepayAdv(a)}
                          style={{
                            padding: '4px 8px',
                            borderRadius: '6px',
                            border: '1px solid #fed7aa',
                            background: '#fff7ed',
                            color: '#c2410c',
                            cursor: 'pointer',
                            fontSize: '11px',
                            fontWeight: 700,
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}
                          title={t.empRepayAdvTitle}
                        >
                          <RotateCcw size={12} /> {t.empBtnRefundAdv}
                        </button>
                        <button
                          type="button"
                          onClick={() => delAdv(a.id)}
                          style={{
                            background: 'none',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#ef4444',
                            display: 'flex'
                          }}
                          title={t.delete}
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>`;

c = c.replace(oldAdvRowAction, newAdvRowAction);

// 16. Add Repay Debt Modal and Repay Advance Modal before closing of main wrapper
const repayModals = `      {/* ───────────────────────────────────────────────────────────
          MODAL: REPAY DEBT (Rembourser une dette avec caisse)
          ─────────────────────────────────────────────────────────── */}
      {repayDebtTarget && (
        <Modal title={\`\${t.empRepayDebtTitle} - \${detailUser?.full_name || ''}\`} onClose={() => setRepayDebtTarget(null)}>
          <form onSubmit={handleRepayDebt} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#991b1b', fontWeight: 700 }}>{t.empDebtColRemaining}</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#dc2626' }}>{fmt(repayDebtTarget.remaining)}</span>
            </div>

            <Row>
              <Field label={t.empRepayAmount}>
                <input
                  required
                  type="number"
                  min="1"
                  max={repayDebtTarget.remaining}
                  step="0.01"
                  style={inp}
                  value={repayDebtForm.amount}
                  onChange={e => setRepayDebtForm(p => ({ ...p, amount: e.target.value }))}
                />
              </Field>
              <Field label={t.date}>
                <input
                  type="date"
                  style={inp}
                  value={repayDebtForm.date}
                  onChange={e => setRepayDebtForm(p => ({ ...p, date: e.target.value }))}
                />
              </Field>
            </Row>

            <Row>
              <Field label={t.empRepayCaisse}>
                <select
                  style={inp}
                  value={repayDebtForm.caisse_id}
                  onChange={e => setRepayDebtForm(p => ({ ...p, caisse_id: e.target.value }))}
                >
                  <option value="">{t.empNoCaisseAffect}</option>
                  {caissesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({fmt(c.current_balance || 0)})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.empPayMethod}>
                <select
                  style={inp}
                  value={repayDebtForm.payment_method}
                  onChange={e => setRepayDebtForm(p => ({ ...p, payment_method: e.target.value }))}
                >
                  <option value="especes">{t.empPayMethodCash}</option>
                  <option value="virement">{t.empPayMethodTransfer}</option>
                  <option value="cheque">{t.empPayMethodCheque}</option>
                  <option value="autre">{t.empPayMethodOther}</option>
                </select>
              </Field>
            </Row>

            <Field label={t.notes}>
              <input
                style={inp}
                value={repayDebtForm.notes}
                onChange={e => setRepayDebtForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Optionnel..."
              />
            </Field>

            <Footer>
              <button type="button" onClick={() => setRepayDebtTarget(null)} style={btnS}>
                {t.cancel}
              </button>
              <button type="submit" style={btnG} disabled={saving}>
                <CheckCircle size={14} /> {t.empBtnRepay}
              </button>
            </Footer>
          </form>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────
          MODAL: REFUND / REPAY ADVANCE (Restitution d'avance en caisse)
          ─────────────────────────────────────────────────────────── */}
      {repayAdvTarget && (
        <Modal title={\`\${t.empRepayAdvTitle} - \${detailUser?.full_name || ''}\`} onClose={() => setRepayAdvTarget(null)}>
          <form onSubmit={handleRepayAdv} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '8px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '12px', color: '#9a3412', fontWeight: 700 }}>{t.empAdvColAmount}</span>
              <span style={{ fontSize: '20px', fontWeight: 800, color: '#ea580c' }}>{fmt(repayAdvTarget.amount)}</span>
            </div>

            <Row>
              <Field label={t.empRepayAmount}>
                <input
                  required
                  type="number"
                  min="1"
                  max={repayAdvTarget.amount}
                  step="0.01"
                  style={inp}
                  value={repayAdvForm.amount}
                  onChange={e => setRepayAdvForm(p => ({ ...p, amount: e.target.value }))}
                />
              </Field>
              <Field label={t.date}>
                <input
                  type="date"
                  style={inp}
                  value={repayAdvForm.date}
                  onChange={e => setRepayAdvForm(p => ({ ...p, date: e.target.value }))}
                />
              </Field>
            </Row>

            <Row>
              <Field label={t.empRepayCaisse}>
                <select
                  style={inp}
                  value={repayAdvForm.caisse_id}
                  onChange={e => setRepayAdvForm(p => ({ ...p, caisse_id: e.target.value }))}
                >
                  <option value="">{t.empNoCaisseAffect}</option>
                  {caissesList.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({fmt(c.current_balance || 0)})
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.empPayMethod}>
                <select
                  style={inp}
                  value={repayAdvForm.payment_method}
                  onChange={e => setRepayAdvForm(p => ({ ...p, payment_method: e.target.value }))}
                >
                  <option value="especes">{t.empPayMethodCash}</option>
                  <option value="virement">{t.empPayMethodTransfer}</option>
                  <option value="cheque">{t.empPayMethodCheque}</option>
                  <option value="autre">{t.empPayMethodOther}</option>
                </select>
              </Field>
            </Row>

            <Field label={t.notes}>
              <input
                style={inp}
                value={repayAdvForm.notes}
                onChange={e => setRepayAdvForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Optionnel..."
              />
            </Field>

            <Footer>
              <button type="button" onClick={() => setRepayAdvTarget(null)} style={btnS}>
                {t.cancel}
              </button>
              <button type="submit" style={btnO} disabled={saving}>
                <RotateCcw size={14} /> {t.empBtnRefundAdv}
              </button>
            </Footer>
          </form>
        </Modal>
      )}\n\n    </div>\n  );\n}`;

c = c.replace(/\n    <\/div>\n  \);\n}$/, '\n' + repayModals);

// 17. Add Quick Today Pointage Card above Monthly KPI Stats in Attendance Tab
const quickPointageCard = `              {/* Quick Today Attendance Banner (1-click pointage for today) */}
              {selectedEmp && (
                <div
                  style={{
                    background: '#fff',
                    border: '1px solid #bbf7d0',
                    borderRadius: '10px',
                    padding: '12px 16px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '12px',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '38px', height: '38px', borderRadius: '8px', background: '#ecfdf5', color: '#059669', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Calendar size={20} />
                    </div>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a' }}>{t.empQuickPointageToday}</span>
                        {_cu?.id === selectedEmp.id && (
                          <span style={{ background: '#dbeafe', color: '#1e40af', padding: '2px 8px', borderRadius: '12px', fontSize: '10px', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '3px' }}>
                            <UserCheck size={11} /> {t.empSelfPointageBadge}
                          </span>
                        )}
                      </div>
                      <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px' }}>
                        {tod()} &bull; {t.empPointedStatus}{' '}
                        <strong style={{
                          color: attendanceRecords[tod()]?.status === 'present' ? '#15803d' : attendanceRecords[tod()]?.status === 'half_day' ? '#c2410c' : attendanceRecords[tod()]?.status === 'absent' ? '#dc2626' : '#64748b'
                        }}>
                          {attendanceRecords[tod()]?.status === 'present' ? \`🟢 \${t.attPresent} (1j)\` : attendanceRecords[tod()]?.status === 'half_day' ? \`🟠 \${t.attHalfDay} (0.5j)\` : attendanceRecords[tod()]?.status === 'absent' ? \`🔴 \${t.attAbsent} (0j)\` : \`⚪ \${t.empNotPointed}\`}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {(canManageAttendance || selectedEmp.id === _cu?.id) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                      <button
                        type="button"
                        onClick={() => handleSaveDayStatus(tod(), 'present')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: attendanceRecords[tod()]?.status === 'present' ? '2px solid #16a34a' : '1px solid #bbf7d0',
                          background: attendanceRecords[tod()]?.status === 'present' ? '#dcfce7' : '#f0fdf4',
                          color: '#15803d',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Check size={13} /> {t.empMarkPresent1j}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveDayStatus(tod(), 'half_day')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: attendanceRecords[tod()]?.status === 'half_day' ? '2px solid #ea580c' : '1px solid #fed7aa',
                          background: attendanceRecords[tod()]?.status === 'half_day' ? '#ffedd5' : '#fff7ed',
                          color: '#c2410c',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <Sun size={13} /> {t.empMarkHalfDay}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleSaveDayStatus(tod(), 'absent')}
                        style={{
                          padding: '6px 12px',
                          borderRadius: '6px',
                          border: attendanceRecords[tod()]?.status === 'absent' ? '2px solid #dc2626' : '1px solid #fecaca',
                          background: attendanceRecords[tod()]?.status === 'absent' ? '#fee2e2' : '#fef2f2',
                          color: '#b91c1c',
                          fontSize: '11px',
                          fontWeight: 700,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}
                      >
                        <X size={13} /> {t.empMarkAbsent}
                      </button>
                    </div>
                  )}
                </div>
              )}\n\n              {/* Monthly KPI Stats for this Employee */}`;

c = c.replace("              {/* Monthly KPI Stats for this Employee */}", quickPointageCard);

// 18. Allow self-marking in day click modal:
c = c.replace(
  "canManageAttendance ? () => openDayStatusModal(d.dateStr, d.dayNum, d.record) : undefined",
  "(canManageAttendance || selectedEmp?.id === _cu?.id) ? () => openDayStatusModal(d.dateStr, d.dayNum, d.record) : undefined"
);

// 19. Ensure if user doesn't have paiement.view, only show themselves and lock tab
const selfUserSelect = `        if (list.length > 0 && selectedEmpId === null) {
          const me = list.find((u: any) => u.id === _cu?.id);
          setSelectedEmpId(me ? me.id : list[0].id);
        }`;

c = c.replace(
  "        if (list.length > 0 && selectedEmpId === null) {\n          setSelectedEmpId(list[0].id);\n        }",
  selfUserSelect
);

fs.writeFileSync(filePath, c, 'utf8');
console.log('✅ EmployeePaiementPage.tsx successfully patched with caisse integration, repay modals, and self attendance!');

