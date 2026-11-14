import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  Users, Search, RefreshCw, Eye, DollarSign, TrendingUp,
  AlertCircle, CreditCard, ChevronLeft, ChevronRight, X,
  CheckCircle, Clock, Banknote, ArrowUpCircle, Trash2,
  Calendar, Check, Settings, Sun, Moon, Sparkles, RotateCcw, UserCheck
} from 'lucide-react';
import { translations } from '../i18n';
import type { Language, Translations } from '../i18n';
import { hasPermission } from '../permissions';

interface User {
  id: number;
  full_name: string;
  username: string;
  role: string;
  email?: string;
  phone?: string;
  department?: string;
  position?: string;
  base_salary?: number;
  daily_rate?: number;
  salary_type?: string;
  hire_date?: string;
  status?: string;
  emp_status?: string;
  total_advances: number;
  total_paid: number;
  total_debt: number;
  notes?: string;
}

interface AttendanceRecord {
  id?: number;
  employee_id: number;
  date: string; // YYYY-MM-DD
  status: 'present' | 'half_day' | 'absent' | 'leave' | 'rest';
  hours?: number;
  notes?: string;
}

interface Kpis {
  totalEmployees: number;
  masseSalariale: number;
  totalPaid: number;
  salaireRestant: number;
  totalAdvances: number;
  totalDebts: number;
  totalDepenses: number;
}

interface Advance {
  id: number;
  amount: number;
  date: string;
  reason: string;
  payment_method: string;
}

interface Payment {
  id: number;
  month: string;
  year: number;
  base_salary: number;
  bonuses: number;
  deductions: number;
  advance_deducted: number;
  net_paid: number;
  payment_method: string;
  payment_date: string;
}

interface Debt {
  id: number;
  amount: number;
  remaining: number;
  date: string;
  description: string;
  status: string;
}

interface Props {
  currentLang: Language;
  currentUser: any;
}

const fmt = (n: number) =>
  `${(n || 0).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} DA`;

const api = (window as any).electronAPI;
const tod = () => new Date().toISOString().slice(0, 10);
const payLbl = (m: string) =>
  ({ especes: 'Espèces', virement: 'Virement', cheque: 'Chèque', autre: 'Autre' }[m] || m);

const inp: React.CSSProperties = {
  width: '100%',
  padding: '8px 12px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '13px',
  color: '#0f172a',
  background: '#fff',
  outline: 'none',
  boxSizing: 'border-box'
};

const inpSm: React.CSSProperties = {
  padding: '6px 10px',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '12px',
  color: '#334155',
  background: '#fff',
  outline: 'none'
};

const btnG: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 16px',
  background: '#16a34a',
  color: '#fff',
  border: 'none',
  borderRadius: '8px',
  fontSize: '13px',
  fontWeight: 700,
  cursor: 'pointer'
};

const btnS: React.CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: '6px',
  padding: '8px 14px',
  background: '#fff',
  color: '#475569',
  border: '1px solid #e2e8f0',
  borderRadius: '8px',
  fontSize: '12px',
  fontWeight: 600,
  cursor: 'pointer'
};

const btnO: React.CSSProperties = { ...btnG, background: '#ea580c' };
const btnP: React.CSSProperties = { ...btnG, background: '#7c3aed' };

function KpiCard({ icon, label, value, color, bg }: any) {
  return (
    <div
      style={{
        background: '#fff',
        border: '1px solid #e2e8f0',
        borderRadius: '12px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px'
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        <div
          style={{
            width: '34px',
            height: '34px',
            borderRadius: '8px',
            background: bg,
            color,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          {icon}
        </div>
        <span style={{ fontSize: '11px', fontWeight: 600, color: '#64748b', lineHeight: '1.3' }}>
          {label}
        </span>
      </div>
      <div style={{ fontSize: '16px', fontWeight: 800, color: '#0f172a' }}>{value}</div>
    </div>
  );
}

function Modal({ title, onClose, children, wide = false }: any) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(15,23,42,0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '16px'
      }}
    >
      <div
        style={{
          background: '#fff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: wide ? '780px' : '520px',
          maxHeight: '90vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 20px 60px rgba(0,0,0,0.2)'
        }}
      >
        <div
          style={{
            padding: '20px 24px',
            borderBottom: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexShrink: 0
          }}
        >
          <h3 style={{ fontSize: '15px', fontWeight: 800, color: '#0f172a', margin: 0 }}>{title}</h3>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: '#64748b',
              display: 'flex'
            }}
          >
            <X size={18} />
          </button>
        </div>
        <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>{children}</div>
      </div>
    </div>
  );
}

function Row({ children }: any) {
  return <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>{children}</div>;
}

function Field({ label, children }: any) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      <label
        style={{
          fontSize: '11px',
          fontWeight: 700,
          color: '#64748b',
          textTransform: 'uppercase' as const,
          letterSpacing: '0.04em'
        }}
      >
        {label}
      </label>
      {children}
    </div>
  );
}

function Footer({ children }: any) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'flex-end',
        gap: '8px',
        marginTop: '16px',
        paddingTop: '16px',
        borderTop: '1px solid #f1f5f9'
      }}
    >
      {children}
    </div>
  );
}

export default function EmployeePaiementPage({ currentLang, currentUser: _cu }: Props) {
  const t: Translations = translations[currentLang] || translations.fr;
  const isRTL = currentLang === 'ar';

  const canPaySalary = hasPermission(_cu, 'paiement.salaries');
  const canAddAdvance = hasPermission(_cu, 'paiement.advances') || hasPermission(_cu, 'paiement.advance');
  const canAddDebt = hasPermission(_cu, 'paiement.debts');
  const canManageAttendance = hasPermission(_cu, 'paiement.attendance') || _cu?.role === 'admin';

  const months = t.empMonths || ['Jan', 'Fev', 'Mar', 'Avr', 'Mai', 'Jun', 'Jul', 'Aou', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthOpts = months.map((m: string, i: number) => ({
    label: m,
    value: String(i + 1).padStart(2, '0')
  }));
  const now = new Date();

  // Main Page Tabs: 'payroll' (Paie & Règlements) vs 'attendance' (Pointage & Calendrier)
  const [activeMainTab, setActiveMainTab] = useState<'payroll' | 'attendance'>('attendance');

  const [users, setUsers] = useState<User[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [kpis, setKpis] = useState<Kpis | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalCount, setTotal] = useState(0);
  const [totalPages, setTPages] = useState(1);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ msg: string; type: 'success' | 'error' } | null>(null);

  const [kpiMonth, setKpiMonth] = useState(String(now.getMonth() + 1).padStart(2, '0'));
  const [kpiYear, setKpiYear] = useState(String(now.getFullYear()));

  // Caisse accounts list
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
  });

  // Salary payment modal state
  const [payTarget, setPayTarget] = useState<User | null>(null);
  const [payForm, setPayForm] = useState({
    month: String(now.getMonth() + 1).padStart(2, '0'),
    year: String(now.getFullYear()),
    bonuses: '0',
    deductions: '0',
    advance_deducted: '0',
    payment_method: 'especes',
    payment_date: tod(),
    caisse_id: '',
    notes: ''
  });

  // Advance modal state
  const [advTarget, setAdvTarget] = useState<User | null>(null);
  const [advForm, setAdvForm] = useState({
    amount: '',
    date: tod(),
    reason: '',
    payment_method: 'especes',
    caisse_id: '',
    reference: ''
  });

  // Debt modal state
  const [debtTarget, setDebtTarget] = useState<User | null>(null);
  const [debtForm, setDebtForm] = useState({ amount: '', date: tod(), caisse_id: '', payment_method: 'especes', description: '' });

  // Detail user modal state
  const [detailUser, setDetailUser] = useState<User | null>(null);
  const [detailTab, setDetailTab] = useState<'salaires' | 'avances' | 'dettes'>('salaires');
  const [detailPay, setDetailPay] = useState<Payment[]>([]);
  const [detailAdv, setDetailAdv] = useState<Advance[]>([]);
  const [detailDebt, setDetailDebt] = useState<Debt[]>([]);

  // Salary definition modal state (v3.4.0)
  const [salaryTarget, setSalaryTarget] = useState<User | null>(null);
  const [salaryForm, setSalaryForm] = useState({
    base_salary: '0',
    daily_rate: '0',
    salary_type: 'monthly',
    notes: ''
  });

  // Attendance Tab State (v3.4.0)
  const [selectedEmpId, setSelectedEmpId] = useState<number | null>(null);
  const [attMonth, setAttMonth] = useState(now.getMonth()); // 0-11
  const [attYear, setAttYear] = useState(now.getFullYear());
  const [attendanceRecords, setAttendanceRecords] = useState<Record<string, AttendanceRecord>>({});
  const [attLoading, setAttLoading] = useState(false);
  const [dayEditTarget, setDayEditTarget] = useState<{ dateStr: string; dayNum: number; record?: AttendanceRecord } | null>(null);
  const [dayStatusChoice, setDayStatusChoice] = useState<'present' | 'half_day' | 'absent' | 'leave' | 'rest' | 'none'>('present');
  const [dayNote, setDayNote] = useState('');

  // Load paginated users
  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const res = api?.getEmployees
        ? await api.getEmployees({ search, page, pageSize: 12 })
        : { success: false, employees: [], totalCount: 0, totalPages: 1 };
      if (res?.success) {
        setUsers(res.employees || []);
        setTotal(res.totalCount || 0);
        setTPages(res.totalPages || 1);
      }
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  // Load all employees list for the Attendance selector
  const loadAllEmployees = useCallback(async () => {
    try {
      const res = api?.getEmployees
        ? await api.getEmployees({ pageSize: 100 })
        : null;
      if (res?.success) {
        const list = res.employees || [];
        setAllUsers(list);
        if (list.length > 0 && selectedEmpId === null) {
          const me = list.find((u: any) => u.id === _cu?.id);
          setSelectedEmpId(me ? me.id : list[0].id);
        }
      }
    } catch (e) {
      console.error('Error loading all employees:', e);
    }
  }, [selectedEmpId]);

  const loadKpis = useCallback(async () => {
    const res = api?.getEmployeeKpis
      ? await api.getEmployeeKpis({ month: kpiMonth, year: kpiYear })
      : null;
    if (res?.success) setKpis(res.kpis);
  }, [kpiMonth, kpiYear]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    loadAllEmployees();
  }, [loadAllEmployees]);

  useEffect(() => {
    loadKpis();
  }, [loadKpis]);

  // Load caisses list
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
  }, [loadCaisses]);



  const showToast = (msg: string, type: 'success' | 'error' = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  // Selected Employee object
  const selectedEmp = useMemo(() => {
    return allUsers.find(u => u.id === selectedEmpId) || users.find(u => u.id === selectedEmpId) || null;
  }, [allUsers, users, selectedEmpId]);

  // Load attendance records for selected employee & month
  const loadAttendance = useCallback(async () => {
    if (!selectedEmpId) return;
    setAttLoading(true);
    try {
      if (api?.getEmployeeAttendance) {
        const monthStr = String(attMonth + 1).padStart(2, '0');
        const res = await api.getEmployeeAttendance({
          employee_id: selectedEmpId,
          month: monthStr,
          year: attYear
        });
        if (res?.success && Array.isArray(res.records)) {
          const map: Record<string, AttendanceRecord> = {};
          res.records.forEach((r: AttendanceRecord) => {
            map[r.date] = r;
          });
          setAttendanceRecords(map);
        } else {
          setAttendanceRecords({});
        }
      }
    } catch (e) {
      console.error('Failed to load attendance:', e);
    } finally {
      setAttLoading(false);
    }
  }, [selectedEmpId, attMonth, attYear]);

  useEffect(() => {
    loadAttendance();
  }, [loadAttendance]);

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const totalDays = new Date(attYear, attMonth + 1, 0).getDate();
    // In JS getDay(): 0 is Sunday, 1 is Monday. We map to Monday = 0, Sunday = 6
    const firstDayIndex = (new Date(attYear, attMonth, 1).getDay() + 6) % 7;
    const days: Array<{ dayNum: number; dateStr: string; isCurrentMonth: boolean }> = [];

    // Empty lead slots
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ dayNum: 0, dateStr: '', isCurrentMonth: false });
    }

    // Month days
    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(attMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      days.push({
        dayNum: d,
        dateStr: `${attYear}-${monthStr}-${dayStr}`,
        isCurrentMonth: true
      });
    }

    return days;
  }, [attYear, attMonth]);

  // Attendance stats for selected employee & month
  const attendanceStats = useMemo(() => {
    let presentCount = 0;
    let halfDayCount = 0;
    let absentCount = 0;
    let leaveCount = 0;
    let restCount = 0;

    Object.values(attendanceRecords).forEach(r => {
      if (r.status === 'present') presentCount += 1;
      else if (r.status === 'half_day') halfDayCount += 1;
      else if (r.status === 'absent') absentCount += 1;
      else if (r.status === 'leave') leaveCount += 1;
      else if (r.status === 'rest') restCount += 1;
    });

    // Total working days value (full = 1, half = 0.5, paid leave = 1)
    const workedDays = presentCount + halfDayCount * 0.5 + leaveCount;
    const baseSalary = selectedEmp?.base_salary || 0;
    const dailyRate = selectedEmp?.daily_rate || (baseSalary > 0 ? baseSalary / 30 : 0);
    const calculatedGross = workedDays > 0 ? workedDays * dailyRate : 0;

    return {
      presentCount,
      halfDayCount,
      absentCount,
      leaveCount,
      restCount,
      workedDays,
      dailyRate,
      calculatedGross
    };
  }, [attendanceRecords, selectedEmp]);

  // Handle single day status change
  const handleSaveDayStatus = async (
    dateStr: string,
    status: 'present' | 'half_day' | 'absent' | 'leave' | 'rest' | 'none',
    noteText = ''
  ) => {
    if (!selectedEmpId) return;
    try {
      if (api?.saveEmployeeAttendance) {
        await api.saveEmployeeAttendance({
          employee_id: selectedEmpId,
          date: dateStr,
          status,
          notes: noteText
        });
        // Optimistic local update
        setAttendanceRecords(prev => {
          const next = { ...prev };
          if (status === 'none') {
            delete next[dateStr];
          } else {
            next[dateStr] = {
              employee_id: selectedEmpId,
              date: dateStr,
              status: status as any,
              notes: noteText
            };
          }
          return next;
        });
      }
    } catch (e) {
      console.error('Error saving single attendance day:', e);
      showToast('Erreur enregistrement pointage', 'error');
    }
  };

  // Mass action: mark all weekdays as present (Mon - Sat)
  const handleMarkAllWeekdaysPresent = async () => {
    if (!selectedEmpId) return;
    const totalDays = new Date(attYear, attMonth + 1, 0).getDate();
    const entries: Array<{ date: string; status: string; notes?: string }> = [];

    for (let d = 1; d <= totalDays; d++) {
      const dt = new Date(attYear, attMonth, d);
      const dayOfWeek = dt.getDay(); // 0 is Sun
      const monthStr = String(attMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      const dateStr = `${attYear}-${monthStr}-${dayStr}`;

      if (dayOfWeek === 0) {
        // Sunday is rest day
        entries.push({ date: dateStr, status: 'rest' });
      } else {
        entries.push({ date: dateStr, status: 'present' });
      }
    }

    try {
      if (api?.bulkSaveEmployeeAttendance) {
        await api.bulkSaveEmployeeAttendance({
          employee_id: selectedEmpId,
          entries
        });
        await loadAttendance();
        showToast(t.empAttendanceSavedSuccess);
      }
    } catch (e) {
      showToast('Erreur pointage en masse', 'error');
    }
  };

  // Mass action: reset month
  const handleResetMonth = async () => {
    if (!selectedEmpId) return;
    if (!window.confirm(t.attClearMonth + ' ?')) return;
    const totalDays = new Date(attYear, attMonth + 1, 0).getDate();
    const entries: Array<{ date: string; status: string }> = [];

    for (let d = 1; d <= totalDays; d++) {
      const monthStr = String(attMonth + 1).padStart(2, '0');
      const dayStr = String(d).padStart(2, '0');
      entries.push({ date: `${attYear}-${monthStr}-${dayStr}`, status: 'none' });
    }

    try {
      if (api?.bulkSaveEmployeeAttendance) {
        await api.bulkSaveEmployeeAttendance({
          employee_id: selectedEmpId,
          entries
        });
        await loadAttendance();
        showToast('Mois réinitialisé.');
      }
    } catch (e) {
      showToast('Erreur réinitialisation', 'error');
    }
  };

  // Open Salary definition modal
  const openSalaryModal = (u: User) => {
    setSalaryTarget(u);
    const salary = u.base_salary || 0;
    const dRate = u.daily_rate || (salary > 0 ? Math.round((salary / 30) * 100) / 100 : 0);
    setSalaryForm({
      base_salary: String(salary),
      daily_rate: String(dRate),
      salary_type: u.salary_type || 'monthly',
      notes: u.notes || ''
    });
  };

  // Save Salary configuration
  const handleSaveSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!salaryTarget) return;
    setSaving(true);
    try {
      const salary = parseFloat(salaryForm.base_salary) || 0;
      const dRate = parseFloat(salaryForm.daily_rate) || (salary > 0 ? salary / 30 : 0);

      if (api?.updateEmployeeSalary) {
        const res = await api.updateEmployeeSalary({
          id: salaryTarget.id,
          base_salary: salary,
          daily_rate: dRate,
          salary_type: salaryForm.salary_type,
          notes: salaryForm.notes
        });
        if (res?.success) {
          showToast(t.empSalarySavedSuccess);
          setSalaryTarget(null);
          loadUsers();
          loadAllEmployees();
          loadKpis();
        } else {
          showToast(res?.message || 'Erreur', 'error');
        }
      }
    } catch (err: any) {
      showToast(err?.message || 'Erreur', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Pay Salary Modal Handlers
  const basePay = payTarget?.base_salary || 0;
  const netPay = Math.max(
    0,
    basePay +
      (parseFloat(payForm.bonuses) || 0) -
      (parseFloat(payForm.deductions) || 0) -
      (parseFloat(payForm.advance_deducted) || 0)
  );

  const openPay = (u: User, prefillNet?: number) => {
    setPayTarget(u);
    const defC = caissesList.length > 0 ? String(caissesList[0].id) : '';
    setPayForm({
      caisse_id: defC,
      month: String(attMonth + 1).padStart(2, '0'),
      year: String(attYear),
      bonuses: '0',
      deductions: '0',
      advance_deducted: '0',
      payment_method: 'especes',
      payment_date: tod(),
      notes: prefillNet ? `Règlement selon pointage (${attendanceStats.workedDays} jours)` : ''
    });
  };

  const openAdv = (u: User) => {
    setAdvTarget(u);
    const defC = caissesList.length > 0 ? String(caissesList[0].id) : '';
    setAdvForm({ amount: '', date: tod(), reason: '', payment_method: 'especes', caisse_id: defC, reference: '' });
  };

  const openDebt = (u: User) => {
    setDebtTarget(u);
    const defC = caissesList.length > 0 ? String(caissesList[0].id) : '';
    setDebtForm({ amount: '', date: tod(), caisse_id: defC, payment_method: 'especes', description: '' });
  };

  const openDetail = async (u: User) => {
    setDetailUser(u);
    setDetailTab('salaires');
    const res = api?.getEmployeeById ? await api.getEmployeeById(u.id) : null;
    if (res?.success) {
      setDetailPay(res.payments || []);
      setDetailAdv(res.advances || []);
      setDetailDebt(res.debts || []);
    }
  };

  const handlePaySalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payTarget) return;
    setSaving(true);
    try {
      const res = api?.paySalary
        ? await api.paySalary({
            employee_id: payTarget.id,
            month: payForm.month,
            year: payForm.year,
            base_salary: basePay,
            bonuses: parseFloat(payForm.bonuses) || 0,
            deductions: parseFloat(payForm.deductions) || 0,
            advance_deducted: parseFloat(payForm.advance_deducted) || 0,
            net_paid: netPay,
            payment_method: payForm.payment_method,
            payment_date: payForm.payment_date,
            caisse_id: payForm.caisse_id ? Number(payForm.caisse_id) : null,
            user_name: _cu?.full_name || _cu?.username || 'Admin',
            notes: payForm.notes
          })
        : { success: true };
      if (res?.success) {
        showToast(`${t.empPayBtnSubmit}: ${fmt(netPay)}`);
        setPayTarget(null);
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

  const handleAddAdv = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!advTarget || !parseFloat(advForm.amount)) return showToast(t.empToastInvalidAmount, 'error');
    setSaving(true);
    try {
      const res = api?.addEmployeeAdvance
        ? await api.addEmployeeAdvance({
            employee_id: advTarget.id,
            ...advForm,
            amount: parseFloat(advForm.amount),
            caisse_id: advForm.caisse_id ? Number(advForm.caisse_id) : null,
            user_name: _cu?.full_name || _cu?.username || 'Admin'
          })
        : { success: true };
      if (res?.success) {
        showToast(`${t.empToastAdvGranted}: ${fmt(parseFloat(advForm.amount))}`);
        setAdvTarget(null);
        loadUsers();
        loadAllEmployees();
        loadKpis();
      } else {
        showToast(res?.message || 'Erreur', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  const handleAddDebt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!debtTarget || !parseFloat(debtForm.amount)) return showToast(t.empToastInvalidAmount, 'error');
    setSaving(true);
    try {
      const res = api?.addEmployeeDebt
        ? await api.addEmployeeDebt({
            employee_id: debtTarget.id,
            ...debtForm,
            amount: parseFloat(debtForm.amount),
            caisse_id: debtForm.caisse_id ? Number(debtForm.caisse_id) : null,
            user_name: _cu?.full_name || _cu?.username || 'Admin'
          })
        : { success: true };
      if (res?.success) {
        showToast(t.empToastDebtSaved);
        setDebtTarget(null);
        loadUsers();
        loadAllEmployees();
        loadKpis();
      } else {
        showToast(res?.message || 'Erreur', 'error');
      }
    } finally {
      setSaving(false);
    }
  };

  // Open Repay Debt Modal
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
  };

  const delPay = async (id: number) => {
    if (!window.confirm(t.empConfirmDeletePay)) return;
    const r = api?.deleteEmployeePayment ? await api.deleteEmployeePayment(id) : { success: true };
    if (r?.success) {
      setDetailPay(p => p.filter(x => x.id !== id));
      showToast(t.empToastPayDeleted);
      loadKpis();
    }
  };

  const delAdv = async (id: number) => {
    if (!window.confirm(t.empConfirmDeleteAdv)) return;
    const r = api?.deleteEmployeeAdvance ? await api.deleteEmployeeAdvance(id) : { success: true };
    if (r?.success) {
      setDetailAdv(p => p.filter(x => x.id !== id));
      showToast(t.empToastAdvDeleted);
      loadKpis();
    }
  };

  const delDebt = async (id: number) => {
    if (!window.confirm(t.empConfirmDeleteDebt)) return;
    const r = api?.deleteEmployeeDebt ? await api.deleteEmployeeDebt(id) : { success: true };
    if (r?.success) {
      setDetailDebt(p => p.filter(x => x.id !== id));
      showToast(t.empToastDebtDeleted);
      loadKpis();
    }
  };

  const TH = (h: string) => (
    <th
      key={h}
      style={{
        padding: '8px 10px',
        textAlign: isRTL ? 'right' : ('left' as const),
        fontWeight: 700,
        color: '#64748b',
        fontSize: '10px',
        textTransform: 'uppercase' as const
      }}
    >
      {h}
    </th>
  );

  const dayHeaders = [t.empDayMon, t.empDayTue, t.empDayWed, t.empDayThu, t.empDayFri, t.empDaySat, t.empDaySun];

  return (
    <div
      style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {toast && (
        <div
          style={{
            position: 'fixed',
            top: '20px',
            [isRTL ? 'left' : 'right']: '20px',
            zIndex: 2000,
            background: toast.type === 'success' ? '#15803d' : '#dc2626',
            color: '#fff',
            padding: '12px 20px',
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '13px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
          }}
        >
          {toast.msg}
        </div>
      )}

      {/* Page Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          flexWrap: 'wrap',
          gap: '12px'
        }}
      >
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '22px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
              {t.empPageTitle}
            </h1>
            <span
              style={{
                background: '#dcfce7',
                color: '#15803d',
                fontSize: '11px',
                fontWeight: 700,
                padding: '2px 8px',
                borderRadius: '12px'
              }}
            >
              v3.4.0
            </span>
          </div>
          <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0' }}>
            {t.empPageSubtitle}
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => {
              loadUsers();
              loadAllEmployees();
              loadKpis();
              loadAttendance();
            }}
            style={btnS}
          >
            <RefreshCw size={14} className={loading || attLoading ? 'animate-spin' : ''} /> {t.empRefresh}
          </button>
        </div>
      </div>

      {/* Main Tab Switcher (v3.4.0: Paie vs Pointage & Calendrier) */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          background: '#f1f5f9',
          padding: '4px',
          borderRadius: '10px',
          width: 'fit-content'
        }}
      >
        <button
          type="button"
          onClick={() => setActiveMainTab('attendance')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            background: activeMainTab === 'attendance' ? '#fff' : 'transparent',
            color: activeMainTab === 'attendance' ? '#15803d' : '#64748b',
            boxShadow: activeMainTab === 'attendance' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Calendar size={16} color={activeMainTab === 'attendance' ? '#16a34a' : '#64748b'} />
          <span>{t.empTabAttendance}</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveMainTab('payroll')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 18px',
            borderRadius: '8px',
            border: 'none',
            cursor: 'pointer',
            fontSize: '13px',
            fontWeight: 700,
            background: activeMainTab === 'payroll' ? '#fff' : 'transparent',
            color: activeMainTab === 'payroll' ? '#15803d' : '#64748b',
            boxShadow: activeMainTab === 'payroll' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
            transition: 'all 0.15s ease'
          }}
        >
          <Banknote size={16} color={activeMainTab === 'payroll' ? '#16a34a' : '#64748b'} />
          <span>{t.empTabPayroll}</span>
        </button>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          TAB 1: POINTAGE & CALENDRIER DE PRÉSENCE (v3.4.0)
          ───────────────────────────────────────────────────────────── */}
      {activeMainTab === 'attendance' && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: '20px', alignItems: 'start' }}>
          {/* Left: Employee Selection List */}
          <div
            style={{
              background: '#fff',
              border: '1px solid #e2e8f0',
              borderRadius: '14px',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '12px'
            }}
          >
            <div style={{ fontWeight: 800, fontSize: '13px', color: '#0f172a', textTransform: 'uppercase' }}>
              Employés ({allUsers.length})
            </div>

            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                style={{
                  position: 'absolute',
                  [isRTL ? 'right' : 'left']: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94a3b8'
                }}
              />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder={t.empSearchEmpPlaceholder}
                style={{
                  ...inp,
                  fontSize: '12px',
                  [isRTL ? 'paddingRight' : 'paddingLeft']: '30px'
                }}
              />
            </div>

            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                maxHeight: '620px',
                overflowY: 'auto'
              }}
            >
              {allUsers
                .filter(u => !search || u.full_name.toLowerCase().includes(search.toLowerCase()) || (u.department && u.department.toLowerCase().includes(search.toLowerCase())))
                .map(u => {
                  const isSelected = u.id === selectedEmpId;
                  return (
                    <div
                      key={u.id}
                      onClick={() => setSelectedEmpId(u.id)}
                      style={{
                        padding: '10px 12px',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        border: isSelected ? '2px solid #16a34a' : '1px solid #f1f5f9',
                        background: isSelected ? '#f0fdf4' : '#ffffff',
                        transition: 'all 0.15s ease',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '8px'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0 }}>
                        <div
                          style={{
                            width: '34px',
                            height: '34px',
                            borderRadius: '50%',
                            background: isSelected ? '#16a34a' : '#e2e8f0',
                            color: isSelected ? '#fff' : '#475569',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontWeight: 700,
                            fontSize: '13px',
                            flexShrink: 0
                          }}
                        >
                          {u.full_name?.[0]?.toUpperCase() || 'U'}
                        </div>
                        <div style={{ minWidth: 0, overflow: 'hidden' }}>
                          <div
                            style={{
                              fontWeight: 700,
                              fontSize: '13px',
                              color: isSelected ? '#15803d' : '#0f172a',
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {u.full_name}
                          </div>
                          <div style={{ fontSize: '11px', color: '#64748b' }}>
                            {u.department || u.position || 'Salarié'}
                          </div>
                        </div>
                      </div>

                      <div style={{ textAlign: isRTL ? 'left' : 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: '11px', fontWeight: 700, color: '#0f172a' }}>
                          {u.base_salary ? `${Math.round(u.base_salary / 1000)}k DA` : '-'}
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>

          {/* Right: Interactive Monthly Calendar & Pointage Dashboard */}
          {selectedEmp ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {/* Employee Summary & Month Navigator Card */}
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                  <div
                    style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #16a34a, #15803d)',
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: 800,
                      fontSize: '18px',
                      boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)'
                    }}
                  >
                    {selectedEmp.full_name?.[0]?.toUpperCase() || 'E'}
                  </div>
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <h2 style={{ fontSize: '17px', fontWeight: 800, color: '#0f172a', margin: 0 }}>
                        {selectedEmp.full_name}
                      </h2>
                      <button
                        type="button"
                        onClick={() => openSalaryModal(selectedEmp)}
                        className="btn-secondary"
                        style={{ fontSize: '11px', padding: '3px 8px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title={t.empDefineSalaryTitle}
                      >
                        <Settings size={12} />
                        <span>{t.empEditSalaryBtn}</span>
                      </button>
                    </div>
                    <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                      <span>
                        {t.empBaseSalaryLabel}: <strong style={{ color: '#0f172a' }}>{fmt(selectedEmp.base_salary || 0)}</strong>
                      </span>
                      <span>
                        {t.empDailySalaryRate}: <strong style={{ color: '#16a34a' }}>{fmt(attendanceStats.dailyRate)}</strong>
                      </span>
                    </div>
                  </div>
                </div>

                {/* Month Navigator Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      if (attMonth === 0) {
                        setAttMonth(11);
                        setAttYear(y => y - 1);
                      } else {
                        setAttMonth(m => m - 1);
                      }
                    }}
                    style={btnS}
                  >
                    <ChevronLeft size={16} />
                  </button>

                  <div
                    style={{
                      padding: '6px 14px',
                      background: '#f8fafc',
                      borderRadius: '8px',
                      border: '1px solid #e2e8f0',
                      fontWeight: 800,
                      fontSize: '14px',
                      color: '#0f172a',
                      minWidth: '150px',
                      textAlign: 'center'
                    }}
                  >
                    {months[attMonth]} {attYear}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      if (attMonth === 11) {
                        setAttMonth(0);
                        setAttYear(y => y + 1);
                      } else {
                        setAttMonth(m => m + 1);
                      }
                    }}
                    style={btnS}
                  >
                    <ChevronRight size={16} />
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAttMonth(now.getMonth());
                      setAttYear(now.getFullYear());
                    }}
                    style={{ ...btnS, fontSize: '11px', padding: '6px 10px' }}
                  >
                    Ce mois
                  </button>
                </div>
              </div>

              {/* Quick Today Attendance Banner (1-click pointage for today) */}
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
                          {attendanceRecords[tod()]?.status === 'present' ? `🟢 ${t.attPresent} (1j)` : attendanceRecords[tod()]?.status === 'half_day' ? `🟠 ${t.attHalfDay} (0.5j)` : attendanceRecords[tod()]?.status === 'absent' ? `🔴 ${t.attAbsent} (0j)` : `⚪ ${t.empNotPointed}`}
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
              )}

              {/* Monthly KPI Stats for this Employee */}
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '10px'
                }}
              >
                <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700 }}>{t.attWorkDaysTotal}</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#15803d', marginTop: '4px' }}>
                    {attendanceStats.workedDays} <span style={{ fontSize: '12px', fontWeight: 600 }}>/ 30j</span>
                  </div>
                </div>

                <div style={{ background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#9a3412', fontWeight: 700 }}>{t.attHalfDaysTotal}</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#ea580c', marginTop: '4px' }}>
                    {attendanceStats.halfDayCount}
                  </div>
                </div>

                <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#991b1b', fontWeight: 700 }}>{t.attAbsencesTotal}</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#dc2626', marginTop: '4px' }}>
                    {attendanceStats.absentCount}
                  </div>
                </div>

                <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: '10px', padding: '12px' }}>
                  <div style={{ fontSize: '11px', color: '#1e40af', fontWeight: 700 }}>{t.attRestDaysTotal}</div>
                  <div style={{ fontSize: '22px', fontWeight: 900, color: '#2563eb', marginTop: '4px' }}>
                    {attendanceStats.restCount}
                  </div>
                </div>

                <div
                  style={{
                    background: '#faf5ff',
                    border: '1px solid #e9d5ff',
                    borderRadius: '10px',
                    padding: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between'
                  }}
                >
                  <div>
                    <div style={{ fontSize: '11px', color: '#6b21a8', fontWeight: 700 }}>{t.attEstMonthlySalary}</div>
                    <div style={{ fontSize: '18px', fontWeight: 900, color: '#7c3aed', marginTop: '2px' }}>
                      {fmt(attendanceStats.calculatedGross)}
                    </div>
                  </div>
                  {canPaySalary && (
                    <button
                      type="button"
                      onClick={() => openPay(selectedEmp, attendanceStats.calculatedGross)}
                      style={{
                        marginTop: '6px',
                        background: '#7c3aed',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        padding: '4px 8px',
                        fontSize: '11px',
                        fontWeight: 700,
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        justifyContent: 'center'
                      }}
                    >
                      <DollarSign size={12} /> {t.attPayBasedOnAttendance}
                    </button>
                  )}
                </div>
              </div>

              {/* Mass Action Toolbar & Legend */}
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '10px',
                  padding: '10px 16px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '10px'
                }}
              >
                {/* Legend */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', fontSize: '11px', fontWeight: 600 }}>
                  <span style={{ color: '#64748b' }}>{t.empMonthDaysLegend}</span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#15803d' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#16a34a' }} /> {t.attPresent} (1j)
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#c2410c' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#ea580c' }} /> {t.attHalfDay} (0.5j)
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#b91c1c' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#dc2626' }} /> {t.attAbsent} (0j)
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#1d4ed8' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#2563eb' }} /> {t.attLeave}
                  </span>
                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', color: '#64748b' }}>
                    <span style={{ width: '10px', height: '10px', borderRadius: '50%', background: '#94a3b8' }} /> {t.attRest}
                  </span>
                </div>

                {/* Bulk Actions */}
                {canManageAttendance && (
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={handleMarkAllWeekdaysPresent}
                      className="btn-secondary"
                      style={{ fontSize: '11px', padding: '5px 10px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      title="Marquer automatiquement tous les jours ouvrables (Lundi au Samedi) comme présents"
                    >
                      <Sparkles size={12} color="#16a34a" /> {t.attMarkAllPresent}
                    </button>
                    <button
                      type="button"
                      onClick={handleResetMonth}
                      className="btn-secondary"
                      style={{ fontSize: '11px', padding: '5px 10px', color: '#dc2626' }}
                    >
                      {t.attClearMonth}
                    </button>
                  </div>
                )}
              </div>

              {/* Monthly Interactive Calendar Grid */}
              <div
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  padding: '16px'
                }}
              >
                {/* 7 Days Header */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px', marginBottom: '8px' }}>
                  {dayHeaders.map((dh, i) => (
                    <div
                      key={dh}
                      style={{
                        textAlign: 'center',
                        fontSize: '12px',
                        fontWeight: 800,
                        color: i === 6 ? '#ea580c' : '#475569',
                        padding: '6px',
                        background: '#f8fafc',
                        borderRadius: '6px'
                      }}
                    >
                      {dh}
                    </div>
                  ))}
                </div>

                {/* Days Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: '8px' }}>
                  {calendarDays.map((cd, idx) => {
                    if (!cd.isCurrentMonth) {
                      return (
                        <div
                          key={`empty-${idx}`}
                          style={{
                            minHeight: '76px',
                            background: '#f8fafc',
                            borderRadius: '10px',
                            opacity: 0.3
                          }}
                        />
                      );
                    }

                    const rec = attendanceRecords[cd.dateStr];
                    const status = rec?.status;
                    const isToday = cd.dateStr === tod();

                    // Colors per status
                    let bg = '#ffffff';
                    let border = '#e2e8f0';
                    let color = '#475569';
                    let statusLabel = '';

                    if (status === 'present') {
                      bg = '#f0fdf4';
                      border = '#86efac';
                      color = '#15803d';
                      statusLabel = t.attPresent;
                    } else if (status === 'half_day') {
                      bg = '#fff7ed';
                      border = '#fdba74';
                      color = '#c2410c';
                      statusLabel = t.attHalfDay;
                    } else if (status === 'absent') {
                      bg = '#fef2f2';
                      border = '#fca5a5';
                      color = '#b91c1c';
                      statusLabel = t.attAbsent;
                    } else if (status === 'leave') {
                      bg = '#eff6ff';
                      border = '#93c5fd';
                      color = '#1d4ed8';
                      statusLabel = t.attLeave;
                    } else if (status === 'rest') {
                      bg = '#f8fafc';
                      border = '#cbd5e1';
                      color = '#64748b';
                      statusLabel = t.attRest;
                    }

                    return (
                      <div
                        key={cd.dateStr}
                        onClick={() => {
                          const canEditThisDay = canManageAttendance || (selectedEmp?.id === _cu?.id && isToday);
                          if (canEditThisDay) {
                            setDayEditTarget({ dateStr: cd.dateStr, dayNum: cd.dayNum, record: rec });
                            setDayStatusChoice(rec?.status || 'present');
                            setDayNote(rec?.notes || '');
                          }
                        }}
                        style={{
                          minHeight: '78px',
                          background: bg,
                          border: isToday ? '2px solid #2563eb' : `1.5px solid ${border}`,
                          borderRadius: '10px',
                          padding: '8px',
                          cursor: (canManageAttendance || (selectedEmp?.id === _cu?.id && isToday)) ? 'pointer' : 'default',
                          transition: 'all 0.15s ease',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: isToday ? '0 0 0 2px rgba(37, 99, 235, 0.2)' : 'none'
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span
                            style={{
                              fontSize: '14px',
                              fontWeight: 900,
                              color: isToday ? '#2563eb' : '#0f172a'
                            }}
                          >
                            {cd.dayNum}
                          </span>
                          {isToday && (
                            <span style={{ fontSize: '9px', fontWeight: 800, color: '#2563eb', background: '#dbeafe', padding: '1px 4px', borderRadius: '4px' }}>
                              Aujourd'hui
                            </span>
                          )}
                        </div>

                        {/* Status Badge */}
                        <div style={{ marginTop: '4px' }}>
                          {status ? (
                            <div
                              style={{
                                fontSize: '10px',
                                fontWeight: 800,
                                color,
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '3px'
                              }}
                            >
                              {status === 'present' && <Check size={11} />}
                              {status === 'half_day' && <Sun size={11} />}
                              {status === 'absent' && <X size={11} />}
                              {status === 'leave' && <Sparkles size={11} />}
                              {status === 'rest' && <Moon size={11} />}
                              <span>{statusLabel}</span>
                            </div>
                          ) : (
                            <span style={{ fontSize: '10px', color: '#94a3b8', fontStyle: 'italic' }}>
                              -
                            </span>
                          )}
                        </div>

                        {/* Note snippet if present */}
                        {rec?.notes ? (
                          <div
                            style={{
                              fontSize: '9px',
                              color: '#64748b',
                              overflow: 'hidden',
                              whiteSpace: 'nowrap',
                              textOverflow: 'ellipsis',
                              marginTop: '2px'
                            }}
                            title={rec.notes}
                          >
                            📝 {rec.notes}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                background: '#fff',
                border: '1px solid #e2e8f0',
                borderRadius: '14px',
                padding: '60px 20px',
                textAlign: 'center',
                color: '#64748b'
              }}
            >
              <Users size={48} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
              <div style={{ fontWeight: 700, fontSize: '15px' }}>{t.attSelectEmployee}</div>
            </div>
          )}
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          TAB 2: FICHES DE PAIE & RÈGLEMENTS (Existing & Enhanced)
          ───────────────────────────────────────────────────────────── */}
      {activeMainTab === 'payroll' && (
        <>
          {/* KPI Period Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#475569' }}>{t.empKpiPeriod}</span>
            <select value={kpiMonth} onChange={e => setKpiMonth(e.target.value)} style={inpSm}>
              {monthOpts.map((m: any) => (
                <option key={m.value} value={m.value}>
                  {m.label}
                </option>
              ))}
            </select>
            <select value={kpiYear} onChange={e => setKpiYear(e.target.value)} style={inpSm}>
              {[2022, 2023, 2024, 2025, 2026, 2027].map(y => (
                <option key={y} value={String(y)}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          {/* KPI Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '14px' }}>
            <KpiCard icon={<Users size={18} />} label={t.empTotalEmployees} value={kpis ? String(kpis.totalEmployees) : '-'} color="#3b82f6" bg="#eff6ff" />
            <KpiCard icon={<TrendingUp size={18} />} label={t.empMasseSalariale} value={kpis ? fmt(kpis.masseSalariale) : '-'} color="#8b5cf6" bg="#f5f3ff" />
            <KpiCard icon={<CheckCircle size={18} />} label={t.empTotalPaid} value={kpis ? fmt(kpis.totalPaid) : '-'} color="#16a34a" bg="#f0fdf4" />
            <KpiCard icon={<Clock size={18} />} label={t.empSalaireRestant} value={kpis ? fmt(kpis.salaireRestant) : '-'} color="#f59e0b" bg="#fffbeb" />
            <KpiCard icon={<ArrowUpCircle size={18} />} label={t.empTotalAdvances} value={kpis ? fmt(kpis.totalAdvances) : '-'} color="#f97316" bg="#fff7ed" />
            <KpiCard icon={<AlertCircle size={18} />} label={t.empTotalDebts} value={kpis ? fmt(kpis.totalDebts) : '-'} color="#ef4444" bg="#fef2f2" />
            <KpiCard icon={<Banknote size={18} />} label={t.empTotalDepenses} value={kpis ? fmt(kpis.totalDepenses) : '-'} color="#0891b2" bg="#ecfeff" />
          </div>

          {/* Employees Table */}
          <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', overflow: 'hidden' }}>
            <div style={{ padding: '14px 18px', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '10px', alignItems: 'center' }}>
              <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                <Search size={14} style={{ position: 'absolute', [isRTL ? 'right' : 'left']: '10px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
                <input
                  value={search}
                  onChange={e => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                  placeholder={t.empSearchPlaceholder}
                  style={{ ...inp, [isRTL ? 'paddingRight' : 'paddingLeft']: '32px' }}
                />
              </div>
              <span style={{ fontSize: '12px', color: '#64748b' }}>
                {totalCount} {t.empColEmployee}
                {totalCount !== 1 ? 's' : ''}
              </span>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  {[t.empColEmployee, t.empColDeptPost, t.empColBaseSalary, t.empColTotalPaid, t.empColAdvances, t.empColDebts, t.empColActions].map(h => (
                    <th
                      key={h}
                      style={{
                        padding: '10px 14px',
                        textAlign: isRTL ? 'right' : ('left' as const),
                        fontWeight: 700,
                        color: '#475569',
                        fontSize: '11px',
                        textTransform: 'uppercase' as const,
                        whiteSpace: 'nowrap' as const
                      }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '32px', textAlign: 'center', color: '#94a3b8' }}>
                      ...
                    </td>
                  </tr>
                ) : users.length === 0 ? (
                  <tr>
                    <td colSpan={7} style={{ padding: '40px', textAlign: 'center', color: '#94a3b8' }}>
                      {t.empNoEmployees}
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div
                            style={{
                              width: '36px',
                              height: '36px',
                              borderRadius: '50%',
                              background: 'linear-gradient(135deg,#16a34a,#15803d)',
                              color: '#fff',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontWeight: 700,
                              fontSize: '13px',
                              flexShrink: 0
                            }}
                          >
                            {u.full_name?.[0]?.toUpperCase() || 'U'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 700, color: '#0f172a' }}>{u.full_name}</div>
                            <div style={{ fontSize: '11px', color: '#94a3b8' }}>@{u.username}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ fontSize: '12px', fontWeight: 600, color: '#334155' }}>
                          {u.department || '-'}
                        </div>
                        <div style={{ fontSize: '11px', color: '#94a3b8' }}>{u.position || u.role}</div>
                      </td>
                      <td style={{ padding: '10px 14px', fontWeight: 700, color: '#0f172a' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{u.base_salary ? fmt(u.base_salary) : '-'}</span>
                          <button
                            type="button"
                            onClick={() => openSalaryModal(u)}
                            style={{
                              background: 'transparent',
                              border: 'none',
                              color: '#16a34a',
                              cursor: 'pointer',
                              display: 'flex',
                              padding: '2px'
                            }}
                            title={t.empDefineSalaryTitle}
                          >
                            <Settings size={13} />
                          </button>
                        </div>
                      </td>
                      <td style={{ padding: '10px 14px', color: '#16a34a', fontWeight: 700 }}>
                        {fmt(u.total_paid || 0)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#f97316', fontWeight: 700 }}>
                        {fmt(u.total_advances || 0)}
                      </td>
                      <td style={{ padding: '10px 14px', color: '#ef4444', fontWeight: 700 }}>
                        {fmt(u.total_debt || 0)}
                      </td>
                      <td style={{ padding: '10px 14px' }}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button
                            title="Calendrier & Pointage"
                            onClick={() => {
                              setSelectedEmpId(u.id);
                              setActiveMainTab('attendance');
                            }}
                            style={{ ...btnS, padding: '5px 8px', background: '#f0fdf4', border: 'none', color: '#16a34a' }}
                          >
                            <Calendar size={12} />
                          </button>

                          <button
                            title={t.empTabInfo}
                            onClick={() => openDetail(u)}
                            style={{ ...btnS, padding: '5px 8px', background: '#eff6ff', border: 'none', color: '#3b82f6' }}
                          >
                            <Eye size={12} />
                          </button>

                          {canPaySalary && (
                            <button
                              title={t.empPayModalPrefix}
                              onClick={() => openPay(u)}
                              style={{ ...btnS, padding: '5px 8px', background: '#f0fdf4', border: 'none', color: '#16a34a' }}
                            >
                              <DollarSign size={12} />
                            </button>
                          )}

                          {canAddAdvance && (
                            <button
                              title={t.empAdvModalPrefix}
                              onClick={() => openAdv(u)}
                              style={{ ...btnS, padding: '5px 8px', background: '#fff7ed', border: 'none', color: '#f97316' }}
                            >
                              <ArrowUpCircle size={12} />
                            </button>
                          )}

                          {canAddDebt && (
                            <button
                              title={t.empDebtModalPrefix}
                              onClick={() => openDebt(u)}
                              style={{ ...btnS, padding: '5px 8px', background: '#faf5ff', border: 'none', color: '#7c3aed' }}
                            >
                              <CreditCard size={12} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>

            {totalPages > 1 && (
              <div
                style={{
                  padding: '12px 18px',
                  borderTop: '1px solid #f1f5f9',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}
              >
                <span style={{ fontSize: '12px', color: '#64748b' }}>
                  {t.empPage} {page} {t.empOf} {totalPages}
                </span>
                <div style={{ display: 'flex', gap: '6px' }}>
                  <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} style={btnS}>
                    <ChevronLeft size={14} />
                  </button>
                  <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page >= totalPages} style={btnS}>
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: DÉFINIR / MODIFIER LE SALAIRE (v3.4.0)
          ───────────────────────────────────────────────────────────── */}
      {salaryTarget && (
        <Modal title={`${t.empDefineSalaryTitle} - ${salaryTarget.full_name}`} onClose={() => setSalaryTarget(null)}>
          <form onSubmit={handleSaveSalary} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Banknote size={20} color="#16a34a" />
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: '#0f172a' }}>{salaryTarget.full_name}</div>
                <div style={{ fontSize: '11px', color: '#64748b' }}>{salaryTarget.department || salaryTarget.position || 'Salarié'}</div>
              </div>
            </div>

            <Field label={t.empBaseSalaryLabel}>
              <input
                required
                type="number"
                min="0"
                step="100"
                style={inp}
                value={salaryForm.base_salary}
                onChange={e => {
                  const val = e.target.value;
                  const num = parseFloat(val) || 0;
                  setSalaryForm(p => ({
                    ...p,
                    base_salary: val,
                    daily_rate: num > 0 ? String(Math.round((num / 30) * 100) / 100) : '0'
                  }));
                }}
              />
            </Field>

            <Field label={t.empDailyRateLabel}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  style={inp}
                  value={salaryForm.daily_rate}
                  onChange={e => setSalaryForm(p => ({ ...p, daily_rate: e.target.value }))}
                />
                <button
                  type="button"
                  onClick={() => {
                    const sal = parseFloat(salaryForm.base_salary) || 0;
                    if (sal > 0) {
                      setSalaryForm(p => ({ ...p, daily_rate: String(Math.round((sal / 30) * 100) / 100) }));
                    }
                  }}
                  className="btn-secondary"
                  style={{ whiteSpace: 'nowrap', fontSize: '11px', padding: '6px 10px' }}
                >
                  Calculer / 30j
                </button>
              </div>
              <span style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                {t.empWorkingDaysBasis} (Algérie/Maghreb standard)
              </span>
            </Field>

            <Field label="Remarques / Conditions de rémunération (Optionnel)">
              <input
                style={inp}
                value={salaryForm.notes}
                onChange={e => setSalaryForm(p => ({ ...p, notes: e.target.value }))}
                placeholder="Ex: Primes incluses, paiement fin de mois..."
              />
            </Field>

            <Footer>
              <button type="button" onClick={() => setSalaryTarget(null)} style={btnS}>
                {t.cancel}
              </button>
              <button type="submit" style={btnG} disabled={saving}>
                <CheckCircle size={14} /> {t.save}
              </button>
            </Footer>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ÉDITION RAPIDE D'UN JOUR DANS LE CALENDRIER (v3.4.0)
          ───────────────────────────────────────────────────────────── */}
      {dayEditTarget && (
        <Modal
          title={`Pointage du ${dayEditTarget.dayNum} ${months[attMonth]} ${attYear}`}
          onClose={() => setDayEditTarget(null)}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600 }}>
              {t.empQuickStatusPrompt}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '8px' }}>
              <button
                type="button"
                onClick={() => setDayStatusChoice('present')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: dayStatusChoice === 'present' ? '2px solid #16a34a' : '1px solid #e2e8f0',
                  background: dayStatusChoice === 'present' ? '#f0fdf4' : '#fff',
                  color: dayStatusChoice === 'present' ? '#15803d' : '#334155',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Check size={14} color="#16a34a" /> {t.attPresent} (1j)
              </button>

              <button
                type="button"
                onClick={() => setDayStatusChoice('half_day')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: dayStatusChoice === 'half_day' ? '2px solid #ea580c' : '1px solid #e2e8f0',
                  background: dayStatusChoice === 'half_day' ? '#fff7ed' : '#fff',
                  color: dayStatusChoice === 'half_day' ? '#c2410c' : '#334155',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sun size={14} color="#ea580c" /> {t.attHalfDay} (0.5j)
              </button>

              <button
                type="button"
                onClick={() => setDayStatusChoice('absent')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: dayStatusChoice === 'absent' ? '2px solid #dc2626' : '1px solid #e2e8f0',
                  background: dayStatusChoice === 'absent' ? '#fef2f2' : '#fff',
                  color: dayStatusChoice === 'absent' ? '#b91c1c' : '#334155',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <X size={14} color="#dc2626" /> {t.attAbsent} (0j)
              </button>

              <button
                type="button"
                onClick={() => setDayStatusChoice('leave')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: dayStatusChoice === 'leave' ? '2px solid #2563eb' : '1px solid #e2e8f0',
                  background: dayStatusChoice === 'leave' ? '#eff6ff' : '#fff',
                  color: dayStatusChoice === 'leave' ? '#1d4ed8' : '#334155',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Sparkles size={14} color="#2563eb" /> {t.attLeave}
              </button>

              <button
                type="button"
                onClick={() => setDayStatusChoice('rest')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: dayStatusChoice === 'rest' ? '2px solid #64748b' : '1px solid #e2e8f0',
                  background: dayStatusChoice === 'rest' ? '#f8fafc' : '#fff',
                  color: dayStatusChoice === 'rest' ? '#334155' : '#64748b',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Moon size={14} color="#64748b" /> {t.attRest}
              </button>

              <button
                type="button"
                onClick={() => setDayStatusChoice('none')}
                style={{
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: dayStatusChoice === 'none' ? '2px solid #94a3b8' : '1px solid #e2e8f0',
                  background: dayStatusChoice === 'none' ? '#f1f5f9' : '#fff',
                  color: '#64748b',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                Effacer (Non pointé)
              </button>
            </div>

            <Field label="Note ou motif de l'absence / retard">
              <input
                style={inp}
                placeholder={t.attDayNotePlaceholder}
                value={dayNote}
                onChange={e => setDayNote(e.target.value)}
              />
            </Field>

            <Footer>
              <button type="button" onClick={() => setDayEditTarget(null)} style={btnS}>
                {t.cancel}
              </button>
              <button
                type="button"
                onClick={async () => {
                  if (dayEditTarget) {
                    await handleSaveDayStatus(dayEditTarget.dateStr, dayStatusChoice, dayNote);
                    setDayEditTarget(null);
                  }
                }}
                style={btnG}
              >
                <Check size={14} /> {t.save}
              </button>
            </Footer>
          </div>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: PAY SALARY
          ───────────────────────────────────────────────────────────── */}
      {payTarget && (
        <Modal title={`${t.empPayModalPrefix} - ${payTarget.full_name}`} onClose={() => setPayTarget(null)}>
          <form onSubmit={handlePaySalary} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '12px 16px' }}>
              <div style={{ fontSize: '11px', color: '#166534', fontWeight: 700, marginBottom: '4px' }}>
                {t.empPayBaseSalaryLabel}
              </div>
              <div style={{ fontSize: '22px', fontWeight: 800, color: '#15803d' }}>{fmt(basePay)}</div>
            </div>

            <Row>
              <Field label={t.empPayMonth}>
                <select
                  style={inp}
                  value={payForm.month}
                  onChange={e => setPayForm(p => ({ ...p, month: e.target.value }))}
                >
                  {monthOpts.map((m: any) => (
                    <option key={m.value} value={m.value}>
                      {m.label}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label={t.empPayYear}>
                <select
                  style={inp}
                  value={payForm.year}
                  onChange={e => setPayForm(p => ({ ...p, year: e.target.value }))}
                >
                  {[2022, 2023, 2024, 2025, 2026, 2027].map(y => (
                    <option key={y} value={String(y)}>
                      {y}
                    </option>
                  ))}
                </select>
              </Field>
            </Row>

            <Row>
              <Field label={t.empPayBonuses}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={inp}
                  value={payForm.bonuses}
                  onChange={e => setPayForm(p => ({ ...p, bonuses: e.target.value }))}
                />
              </Field>
              <Field label={t.empPayDeductions}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={inp}
                  value={payForm.deductions}
                  onChange={e => setPayForm(p => ({ ...p, deductions: e.target.value }))}
                />
              </Field>
            </Row>

            <Row>
              <Field label={t.empPayAdvanceDeducted}>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  style={inp}
                  value={payForm.advance_deducted}
                  onChange={e => setPayForm(p => ({ ...p, advance_deducted: e.target.value }))}
                />
              </Field>
              <Field label={t.empPayMethod}>
                <select
                  style={inp}
                  value={payForm.payment_method}
                  onChange={e => setPayForm(p => ({ ...p, payment_method: e.target.value }))}
                >
                  <option value="especes">{t.empPayMethodCash}</option>
                  <option value="virement">{t.empPayMethodTransfer}</option>
                  <option value="cheque">{t.empPayMethodCheque}</option>
                  <option value="autre">{t.empPayMethodOther}</option>
                </select>
              </Field>
            </Row>

            <Field label={t.empSelectCaisse}>
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
            </Field>

            <Row>
              <Field label={t.empPayDate}>
                <input
                  type="date"
                  style={inp}
                  value={payForm.payment_date}
                  onChange={e => setPayForm(p => ({ ...p, payment_date: e.target.value }))}
                />
              </Field>
              <Field label={t.empPayNotes}>
                <input
                  style={inp}
                  value={payForm.notes}
                  onChange={e => setPayForm(p => ({ ...p, notes: e.target.value }))}
                  placeholder="Optionnel..."
                />
              </Field>
            </Row>

            <div
              style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <span style={{ fontWeight: 700, color: '#1e40af' }}>{t.empPayNetLabel}</span>
              <span style={{ fontSize: '22px', fontWeight: 800, color: '#1e40af' }}>{fmt(netPay)}</span>
            </div>

            <Footer>
              <button type="button" onClick={() => setPayTarget(null)} style={btnS}>
                {t.empBtnCancel}
              </button>
              <button type="submit" style={btnG} disabled={saving}>
                <DollarSign size={14} /> {t.empPayBtnSubmit}
              </button>
            </Footer>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD ADVANCE
          ───────────────────────────────────────────────────────────── */}
      {advTarget && (
        <Modal title={`${t.empAdvModalPrefix} - ${advTarget.full_name}`} onClose={() => setAdvTarget(null)}>
          <form onSubmit={handleAddAdv} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Row>
              <Field label={t.empAdvAmount}>
                <input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  style={inp}
                  value={advForm.amount}
                  onChange={e => setAdvForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="5000"
                />
              </Field>
              <Field label={t.empAdvDate}>
                <input
                  type="date"
                  style={inp}
                  value={advForm.date}
                  onChange={e => setAdvForm(p => ({ ...p, date: e.target.value }))}
                />
              </Field>
            </Row>
            <Field label={t.empAdvReason}>
              <input
                style={inp}
                value={advForm.reason}
                onChange={e => setAdvForm(p => ({ ...p, reason: e.target.value }))}
              />
            </Field>
            <Row>
              <Field label={t.empAdvMethod}>
                <select
                  style={inp}
                  value={advForm.payment_method}
                  onChange={e => setAdvForm(p => ({ ...p, payment_method: e.target.value }))}
                >
                  <option value="especes">{t.empPayMethodCash}</option>
                  <option value="virement">{t.empPayMethodTransfer}</option>
                  <option value="cheque">{t.empPayMethodCheque}</option>
                  <option value="autre">{t.empPayMethodOther}</option>
                </select>
              </Field>
              <Field label={t.empAdvReference}>
                <input
                  style={inp}
                  value={advForm.reference}
                  onChange={e => setAdvForm(p => ({ ...p, reference: e.target.value }))}
                />
              </Field>
            </Row>
            <Footer>
              <button type="button" onClick={() => setAdvTarget(null)} style={btnS}>
                {t.empBtnCancel}
              </button>
              <button type="submit" style={btnO} disabled={saving}>
                <ArrowUpCircle size={14} /> {t.empAdvBtnSubmit}
              </button>
            </Footer>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: ADD DEBT
          ───────────────────────────────────────────────────────────── */}
      {debtTarget && (
        <Modal title={`${t.empDebtModalPrefix} - ${debtTarget.full_name}`} onClose={() => setDebtTarget(null)}>
          <form onSubmit={handleAddDebt} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <Row>
              <Field label={t.empDebtAmount}>
                <input
                  required
                  type="number"
                  min="1"
                  step="0.01"
                  style={inp}
                  value={debtForm.amount}
                  onChange={e => setDebtForm(p => ({ ...p, amount: e.target.value }))}
                  placeholder="2500"
                />
              </Field>
              <Field label={t.empDebtDate}>
                <input
                  type="date"
                  style={inp}
                  value={debtForm.date}
                  onChange={e => setDebtForm(p => ({ ...p, date: e.target.value }))}
                />
              </Field>
            </Row>
            <Row>
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
            </Row>
            <Field label={t.empDebtDescription}>
              <textarea
                style={{ ...inp, resize: 'vertical' }}
                rows={3}
                value={debtForm.description}
                onChange={e => setDebtForm(p => ({ ...p, description: e.target.value }))}
              />
            </Field>
            <Footer>
              <button type="button" onClick={() => setDebtTarget(null)} style={btnS}>
                {t.empBtnCancel}
              </button>
              <button type="submit" style={btnP} disabled={saving}>
                <CreditCard size={14} /> {t.empDebtBtnSubmit}
              </button>
            </Footer>
          </form>
        </Modal>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MODAL: EMPLOYEE DETAILS HISTORY (Salaires, Avances, Dettes)
          ───────────────────────────────────────────────────────────── */}
      {detailUser && (
        <Modal title={`${t.empDetailPrefix} - ${detailUser.full_name}`} onClose={() => setDetailUser(null)} wide>
          <div
            style={{
              display: 'flex',
              gap: '4px',
              marginBottom: '16px',
              background: '#f1f5f9',
              borderRadius: '8px',
              padding: '4px'
            }}
          >
            {(['salaires', 'avances', 'dettes'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setDetailTab(tab)}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: '6px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: 700,
                  background: detailTab === tab ? '#fff' : 'transparent',
                  color: detailTab === tab ? '#15803d' : '#64748b'
                }}
              >
                {tab === 'salaires' ? t.empTabSalaires : tab === 'avances' ? t.empTabAvances : t.empTabDettes}
              </button>
            ))}
          </div>

          {detailTab === 'salaires' &&
            (detailPay.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>{t.empEmptyPayments}</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {[
                      t.empSalColMonth,
                      t.empSalColBase,
                      t.empSalColBonuses,
                      t.empSalColDeductions,
                      t.empSalColAdvDed,
                      t.empSalColNet,
                      t.empSalColDate,
                      ''
                    ].map(h => TH(h))}
                  </tr>
                </thead>
                <tbody>
                  {detailPay.map(p => (
                    <tr key={p.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', fontWeight: 700 }}>
                        {months[(parseInt(p.month) - 1) % 12]} {p.year}
                      </td>
                      <td style={{ padding: '8px 10px' }}>{fmt(p.base_salary)}</td>
                      <td style={{ padding: '8px 10px', color: '#16a34a' }}>+{fmt(p.bonuses)}</td>
                      <td style={{ padding: '8px 10px', color: '#ef4444' }}>-{fmt(p.deductions)}</td>
                      <td style={{ padding: '8px 10px', color: '#f97316' }}>-{fmt(p.advance_deducted)}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 800, color: '#15803d' }}>
                        {fmt(p.net_paid)}
                      </td>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{p.payment_date}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <button
                          onClick={() => delPay(p.id)}
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}

          {detailTab === 'avances' &&
            (detailAdv.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>{t.empEmptyAdvances}</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {[t.empAdvColDate, t.empAdvColAmount, t.empAdvColReason, t.empAdvColMethod, ''].map(h => TH(h))}
                  </tr>
                </thead>
                <tbody>
                  {detailAdv.map(a => (
                    <tr key={a.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{a.date}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#f97316' }}>{fmt(a.amount)}</td>
                      <td style={{ padding: '8px 10px' }}>{a.reason || '-'}</td>
                      <td style={{ padding: '8px 10px' }}>{payLbl(a.payment_method)}</td>
                      <td style={{ padding: '8px 10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}

          {detailTab === 'dettes' &&
            (detailDebt.length === 0 ? (
              <p style={{ textAlign: 'center', color: '#94a3b8', padding: '24px' }}>{t.empEmptyDebts}</p>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    {[
                      t.empDebtColDate,
                      t.empDebtColAmount,
                      t.empDebtColRemaining,
                      t.empDebtColDesc,
                      t.empDebtColStatus,
                      ''
                    ].map(h => TH(h))}
                  </tr>
                </thead>
                <tbody>
                  {detailDebt.map(d => (
                    <tr key={d.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '8px 10px', color: '#64748b' }}>{d.date}</td>
                      <td style={{ padding: '8px 10px', fontWeight: 700, color: '#ef4444' }}>{fmt(d.amount)}</td>
                      <td
                        style={{
                          padding: '8px 10px',
                          fontWeight: 700,
                          color: d.remaining > 0 ? '#ef4444' : '#16a34a'
                        }}
                      >
                        {fmt(d.remaining)}
                      </td>
                      <td style={{ padding: '8px 10px' }}>{d.description || '-'}</td>
                      <td style={{ padding: '8px 10px' }}>
                        <span
                          style={{
                            background: d.status === 'en_cours' ? '#fef2f2' : '#f0fdf4',
                            color: d.status === 'en_cours' ? '#b91c1c' : '#15803d',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontSize: '10px',
                            fontWeight: 700
                          }}
                        >
                          {d.status === 'en_cours' ? 'En cours' : 'Soldé'}
                        </span>
                      </td>
                      <td style={{ padding: '8px 10px', display: 'flex', gap: '6px', alignItems: 'center' }}>
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
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ))}

          <Footer>
            <button onClick={() => setDetailUser(null)} style={btnS}>
              {t.close}
            </button>
          </Footer>
        </Modal>
      )}

      {/* ───────────────────────────────────────────────────────────
          MODAL: REPAY DEBT (Rembourser une dette avec caisse)
          ─────────────────────────────────────────────────────────── */}
      {repayDebtTarget && (
        <Modal title={`${t.empRepayDebtTitle} - ${detailUser?.full_name || ''}`} onClose={() => setRepayDebtTarget(null)}>
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

            <Field label={t.empInfoNotes}>
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
        <Modal title={`${t.empRepayAdvTitle} - ${detailUser?.full_name || ''}`} onClose={() => setRepayAdvTarget(null)}>
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

            <Field label={t.empInfoNotes}>
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
      )}

    </div>
  );
}
