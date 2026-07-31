'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { getUnipinPatterns } from '@/utils/unipinPatterns';

// packages mapping for auto-detection
const DIAMOND_PACKAGE_MAP: Record<string, string> = {
  '20': '25 Diamond',
  '36': '50 Diamond',
  '80': '115 Diamond',
  '160': '240 Diamond',
  '161': 'Weekly Pass',
  '405': '610 Diamond',
  '800': 'Monthly Pass',
  '810': '1240 Diamond',
  '1625': '2530 Diamond',
  '2000': '3000 Diamond',
};

type Status = 'Unused' | 'Success' | 'Pending' | 'Failed';

type Voucher = {
  id: string;
  code: string;
  amount: string;
  status: Status;
  date: string;
  redeemedBy?: string;
};

const AMOUNT_OPTIONS = [
  '25 Diamond',
  '50 Diamond',
  'Weekly Pass',
  'Monthly Pass',
  '100 Diamond',
  '520 Diamond',
  '1000 Diamond',
  '2200 Diamond',
];

function randomCode() {
  const chunk = Math.floor(1000 + Math.random() * 9000);
  return `FF-VOUCHER-${chunk}`;
}

function statusStyle(status: Status) {
  if (status === 'Success') {
    return 'bg-green-500/20 text-green-400 border border-green-500/30';
  } else if (status === 'Pending') {
    return 'bg-amber-500/20 text-amber-400 border border-amber-500/30';
  } else if (status === 'Failed') {
    return 'bg-[#D9352C]/20 text-[#F0847D] border border-[#D9352C]/30';
  } else {
    return 'bg-[#3A332C]/40 text-[#A89F94] border border-[#3A332C]';
  }
}

export default function DashboardPage() {
  const router = useRouter();

  // Active Sidebar Menu
  const [activeTab, setActiveTab] = useState<'vouchers' | 'bot' | 'settings'>(
    'vouchers',
  );

  const [vouchers, setVouchers] = useState<Voucher[]>([
    {
      id: '1',
      code: 'FF-VOUCHER-9821',
      amount: '1000 Diamond',
      status: 'Success',
      date: '2026-06-06',
      redeemedBy: 'player_ratul22',
    },
    {
      id: '2',
      code: 'FF-VOUCHER-4432',
      amount: '520 Diamond',
      status: 'Pending',
      date: '2026-06-06',
    },
    {
      id: '3',
      code: 'FF-VOUCHER-7719',
      amount: '2200 Diamond',
      status: 'Failed',
      date: '2026-06-05',
    },
    {
      id: '4',
      code: 'FF-VOUCHER-1206',
      amount: '100 Diamond',
      status: 'Unused',
      date: '2026-06-05',
    },
  ]);

  // add single voucher
  const [newCode, setNewCode] = useState('');
  const [newAmount, setNewAmount] = useState(AMOUNT_OPTIONS[2]);
  const [detectedNotice, setDetectedNotice] = useState('');

  // bulk generate
  const [bulkCount, setBulkCount] = useState(5);
  const [bulkAmount, setBulkAmount] = useState(AMOUNT_OPTIONS[2]);

  // search / filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'All' | Status>('All');

  // settings panel state
  const [adminEmail, setAdminEmail] = useState('admin@gmail.com');
  const [newPassword, setNewPassword] = useState('');
  const [settingsSaved, setSettingsSaved] = useState(false);

  // copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Detect voucher package based on input text
  const detectVoucherPackage = (text: string) => {
    const patterns = getUnipinPatterns();
    for (const [diamondKey, regexList] of Object.entries(patterns)) {
      for (const regex of regexList) {
        regex.lastIndex = 0;
        if (regex.test(text)) {
          return diamondKey;
        }
      }
    }
    return null;
  };

  const handleCodeInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setNewCode(text);

    const matchedKey = detectVoucherPackage(text);
    if (matchedKey && DIAMOND_PACKAGE_MAP[matchedKey]) {
      const mappedPackage = DIAMOND_PACKAGE_MAP[matchedKey];
      setNewAmount(mappedPackage);
      setDetectedNotice(`Auto-detected: ${matchedKey} Key (${mappedPackage})`);
    } else {
      setDetectedNotice('');
    }
  };

  const handleAddVoucher = (e: React.SyntheticEvent) => {
    e.preventDefault();
    if (!newCode) return;
    const item: Voucher = {
      id: Date.now().toString(),
      code: newCode.toUpperCase(),
      amount: newAmount,
      status: 'Unused',
      date: new Date().toISOString().split('T')[0],
    };
    setVouchers([item, ...vouchers]);
    setNewCode('');
    setDetectedNotice('');
  };

  const handleBulkGenerate = (e: React.SyntheticEvent) => {
    e.preventDefault();
    const count = Math.min(Math.max(bulkCount, 1), 100);
    const today = new Date().toISOString().split('T')[0];
    const items: Voucher[] = Array.from({ length: count }, (_, i) => ({
      id: `${Date.now()}-${i}`,
      code: randomCode(),
      amount: bulkAmount,
      status: 'Unused',
      date: today,
    }));
    setVouchers([...items, ...vouchers]);
  };

  const handleExportCsv = () => {
    const header = ['Code', 'Package', 'Status', 'Date', 'RedeemedBy'];
    const rows = filteredVouchers.map(v => [
      v.code,
      v.amount,
      v.status,
      v.date,
      v.redeemedBy ?? '',
    ]);
    const csv = [header, ...rows].map(r => r.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vouchers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopy = (voucher: Voucher) => {
    navigator.clipboard.writeText(voucher.code).then(() => {
      setCopiedId(voucher.id);
      setTimeout(() => setCopiedId(null), 1500);
    });
  };

  const handleSaveSettings = async (e: React.SyntheticEvent) => {
    e.preventDefault();

    try {
      const response = await fetch('/api/admin/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: newPassword }),
      });

      if (response.ok) {
        setSettingsSaved(true);
        setNewPassword('');
        setTimeout(() => setSettingsSaved(false), 2000);
      } else {
        alert('Failed to update settings');
      }
    } catch (error) {
      console.error('Error saving settings:', error);
    }
  };

  const handleLogout = () => {
    document.cookie = 'admin_session=; path=/; max-age=0';
    router.push('/login');
  };

  const filteredVouchers = vouchers.filter(v => {
    const matchesSearch = v.code.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = statusFilter === 'All' || v.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: vouchers.length,
    unused: vouchers.filter(v => v.status === 'Unused').length,
    success: vouchers.filter(v => v.status === 'Success').length,
    pendingFailed: vouchers.filter(
      v => v.status === 'Pending' || v.status === 'Failed',
    ).length,
  };

  return (
    <div className="min-h-screen bg-[#0D0B09] text-white flex flex-col md:flex-row font-['Manrope',sans-serif] pb-20 md:pb-0">
      {/* Desktop Sidebar (Hidden on Mobile/Tablet) */}
      <aside className="w-64 bg-[#17130F] border-r border-[#2A2420] flex-col justify-between hidden md:flex min-h-screen sticky top-0">
        <div>
          <div className="p-6 border-b border-[#2A2420]">
            <span className="text-[10px] font-['JetBrains_Mono',monospace] tracking-[0.2em] uppercase text-[#FFB74A]">
              Free Fire Bot
            </span>
            <h2 className="text-xl font-bold font-['Rajdhani',sans-serif] uppercase text-white mt-1">
              Admin Panel
            </h2>
          </div>
          <nav className="p-4 space-y-2">
            <button
              onClick={() => setActiveTab('vouchers')}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition duration-200 ${
                activeTab === 'vouchers'
                  ? 'bg-gradient-to-r from-[#FF5A1F] to-[#FFB74A] text-[#0D0B09] font-bold shadow-lg'
                  : 'text-[#A89F94] hover:bg-[#252019] hover:text-white'
              }`}
            >
              📦 Vouchers
            </button>
            <button
              onClick={() => setActiveTab('bot')}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition duration-200 ${
                activeTab === 'bot'
                  ? 'bg-gradient-to-r from-[#FF5A1F] to-[#FFB74A] text-[#0D0B09] font-bold shadow-lg'
                  : 'text-[#A89F94] hover:bg-[#252019] hover:text-white'
              }`}
            >
              🤖 Bot Status
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold text-sm transition duration-200 ${
                activeTab === 'settings'
                  ? 'bg-gradient-to-r from-[#FF5A1F] to-[#FFB74A] text-[#0D0B09] font-bold shadow-lg'
                  : 'text-[#A89F94] hover:bg-[#252019] hover:text-white'
              }`}
            >
              ⚙️ Settings
            </button>
          </nav>
        </div>

        <div className="p-4 border-t border-[#2A2420]">
          <button
            onClick={handleLogout}
            className="w-full py-3 px-4 bg-[#D9352C]/20 hover:bg-[#D9352C] text-[#F0847D] hover:text-white rounded-xl font-bold text-sm transition duration-200 border border-[#D9352C]/30 text-center"
          >
            Sign Out
          </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-8 overflow-y-auto space-y-6">
        {/* Mobile Header */}
        <div className="flex md:hidden justify-between items-center bg-[#17130F] p-4 rounded-2xl border border-[#2A2420]">
          <h1 className="text-lg font-bold font-['Rajdhani',sans-serif] uppercase text-white">
            FF Bot Admin
          </h1>
          <span className="text-xs text-[#FFB74A] font-['JetBrains_Mono',monospace]">
            Online
          </span>
        </div>

        {/* Tab 1: Vouchers Management */}
        {activeTab === 'vouchers' && (
          <div className="space-y-6">
            {/* Status Summary Cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
              <div className="bg-[#17130F] p-5 sm:p-6 rounded-2xl border border-[#2A2420] shadow-lg">
                <p className="text-[11px] uppercase font-['JetBrains_Mono',monospace] tracking-wider text-[#8C8074]">
                  Total Vouchers
                </p>
                <h3 className="text-3xl sm:text-4xl font-bold text-white mt-2 font-['Rajdhani',sans-serif]">
                  {stats.total}
                </h3>
              </div>
              <div className="bg-[#17130F] p-5 sm:p-6 rounded-2xl border border-[#2A2420] shadow-lg">
                <p className="text-[11px] uppercase font-['JetBrains_Mono',monospace] tracking-wider text-[#8C8074]">
                  Active / Unused
                </p>
                <h3 className="text-3xl sm:text-4xl font-bold text-[#A89F94] mt-2 font-['Rajdhani',sans-serif]">
                  {stats.unused}
                </h3>
              </div>
              <div className="bg-[#17130F] p-5 sm:p-6 rounded-2xl border border-[#2A2420] shadow-lg">
                <p className="text-[11px] uppercase font-['JetBrains_Mono',monospace] tracking-wider text-[#8C8074]">
                  Redeemed / Success
                </p>
                <h3 className="text-3xl sm:text-4xl font-bold text-green-500 mt-2 font-['Rajdhani',sans-serif]">
                  {stats.success}
                </h3>
              </div>
              <div className="bg-[#17130F] p-5 sm:p-6 rounded-2xl border border-[#2A2420] shadow-lg">
                <p className="text-[11px] uppercase font-['JetBrains_Mono',monospace] tracking-wider text-[#8C8074]">
                  Pending / Failed
                </p>
                <h3 className="text-3xl sm:text-4xl font-bold text-[#F0A93D] mt-2 font-['Rajdhani',sans-serif]">
                  {stats.pendingFailed}
                </h3>
              </div>
            </div>

            {/* Quick Actions: Add single + Bulk generate */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-[#17130F] p-6 sm:p-8 rounded-2xl border border-[#2A2420] shadow-xl">
                <h2 className="text-lg font-bold font-['Rajdhani',sans-serif] uppercase text-white mb-4">
                  Add Single Voucher (Auto-Detect)
                </h2>
                <form onSubmit={handleAddVoucher} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-['JetBrains_Mono',monospace] tracking-[0.15em] uppercase text-[#8C8074] mb-2">
                      Voucher_Code / Text
                    </label>
                    <input
                      type="text"
                      value={newCode}
                      onChange={handleCodeInputChange}
                      placeholder="e.g. BDMB-T-S-20260606 1234-5678-9012-3456"
                      required
                      className="w-full px-4 py-3 bg-[#0D0B09] rounded-xl border border-[#3A332C] focus:outline-none focus:border-[#FF5A1F] text-white font-['JetBrains_Mono',monospace] text-sm"
                    />
                    {detectedNotice && (
                      <p className="text-xs text-green-400 mt-1 font-['JetBrains_Mono',monospace]">
                        {detectedNotice}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-3">
                    <select
                      value={newAmount}
                      onChange={e => setNewAmount(e.target.value)}
                      className="flex-1 px-4 py-3 bg-[#0D0B09] rounded-xl border border-[#3A332C] focus:outline-none focus:border-[#FF5A1F] text-white text-sm"
                    >
                      {AMOUNT_OPTIONS.map(a => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-[#FF5A1F] to-[#FFB74A] hover:brightness-110 text-[#0D0B09] rounded-xl font-bold font-['Rajdhani',sans-serif] uppercase tracking-wide transition duration-200 whitespace-nowrap"
                    >
                      Add
                    </button>
                  </div>
                </form>
              </div>

              <div className="bg-[#17130F] p-6 sm:p-8 rounded-2xl border border-[#2A2420] shadow-xl">
                <h2 className="text-lg font-bold font-['Rajdhani',sans-serif] uppercase text-white mb-4">
                  Bulk Generate
                </h2>
                <form onSubmit={handleBulkGenerate} className="space-y-4">
                  <div className="flex gap-3">
                    <div className="flex-1">
                      <label className="block text-[11px] font-['JetBrains_Mono',monospace] tracking-[0.15em] uppercase text-[#8C8074] mb-2">
                        Quantity
                      </label>
                      <input
                        type="number"
                        min={1}
                        max={100}
                        value={bulkCount}
                        onChange={e => setBulkCount(Number(e.target.value))}
                        className="w-full px-4 py-3 bg-[#0D0B09] rounded-xl border border-[#3A332C] focus:outline-none focus:border-[#FF5A1F] text-white font-['JetBrains_Mono',monospace] text-sm"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[11px] font-['JetBrains_Mono',monospace] tracking-[0.15em] uppercase text-[#8C8074] mb-2">
                        Package
                      </label>
                      <select
                        value={bulkAmount}
                        onChange={e => setBulkAmount(e.target.value)}
                        className="w-full px-4 py-3 bg-[#0D0B09] rounded-xl border border-[#3A332C] focus:outline-none focus:border-[#FF5A1F] text-white text-sm"
                      >
                        {AMOUNT_OPTIONS.map(a => (
                          <option key={a} value={a}>
                            {a}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                  <button
                    type="submit"
                    className="w-full py-3 px-6 bg-gradient-to-r from-[#FF5A1F] to-[#FFB74A] hover:brightness-110 text-[#0D0B09] rounded-xl font-bold font-['Rajdhani',sans-serif] uppercase tracking-wide transition duration-200"
                  >
                    Generate Codes
                  </button>
                </form>
              </div>
            </div>

            {/* Voucher Table with search/filter/export */}
            <div className="bg-[#17130F] rounded-2xl border border-[#2A2420] shadow-xl overflow-hidden">
              <div className="p-6 border-b border-[#2A2420] flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <h2 className="text-lg font-bold font-['Rajdhani',sans-serif] uppercase text-white">
                  Voucher History & Status
                </h2>

                <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
                  <input
                    type="text"
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search code..."
                    className="px-4 py-2.5 bg-[#0D0B09] rounded-xl border border-[#3A332C] focus:outline-none focus:border-[#FF5A1F] text-white font-['JetBrains_Mono',monospace] text-sm w-full sm:w-48"
                  />
                  <select
                    value={statusFilter}
                    onChange={e =>
                      setStatusFilter(e.target.value as 'All' | Status)
                    }
                    className="px-4 py-2.5 bg-[#0D0B09] rounded-xl border border-[#3A332C] focus:outline-none focus:border-[#FF5A1F] text-white text-sm"
                  >
                    <option value="All">All Status</option>
                    <option value="Unused">Unused</option>
                    <option value="Success">Success</option>
                    <option value="Pending">Pending</option>
                    <option value="Failed">Failed</option>
                  </select>
                  <button
                    onClick={handleExportCsv}
                    className="px-4 py-2.5 bg-[#252019] hover:bg-[#2E241C] text-[#FFB74A] rounded-xl font-semibold text-sm transition duration-200 border border-[#3A332C] whitespace-nowrap"
                  >
                    Export CSV
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-[#0D0B09] text-[#8C8074] text-[11px] font-['JetBrains_Mono',monospace] font-bold uppercase tracking-wider">
                      <th className="p-4">Voucher Code</th>
                      <th className="p-4">Package</th>
                      <th className="p-4">Status</th>
                      <th className="p-4">Date</th>
                      <th className="p-4">Redeemed By</th>
                      <th className="p-4"></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2A2420] text-sm">
                    {filteredVouchers.length === 0 && (
                      <tr>
                        <td
                          colSpan={6}
                          className="p-8 text-center text-[#6B6259] text-sm"
                        >
                          No vouchers match your search.
                        </td>
                      </tr>
                    )}
                    {filteredVouchers.map(voucher => (
                      <tr
                        key={voucher.id}
                        className="hover:bg-[#1C1815] transition"
                      >
                        <td className="p-4 font-['JetBrains_Mono',monospace] text-[#FFB74A] font-semibold">
                          {voucher.code}
                        </td>
                        <td className="p-4 text-white">{voucher.amount}</td>
                        <td className="p-4">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-bold ${statusStyle(voucher.status)}`}
                          >
                            {voucher.status}
                          </span>
                        </td>
                        <td className="p-4 text-[#A89F94] font-['JetBrains_Mono',monospace] text-xs">
                          {voucher.date}
                        </td>
                        <td className="p-4 text-[#A89F94] text-xs">
                          {voucher.redeemedBy ?? '—'}
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleCopy(voucher)}
                            className="text-xs font-['JetBrains_Mono',monospace] text-[#8C8074] hover:text-[#FFB74A] transition"
                          >
                            {copiedId === voucher.id ? 'Copied ✓' : 'Copy'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Bot Status & Logs */}
        {activeTab === 'bot' && (
          <div className="bg-[#17130F] p-8 rounded-2xl border border-[#2A2420] shadow-xl space-y-6">
            <h2 className="text-xl font-bold font-['Rajdhani',sans-serif] uppercase text-white">
              Automation Bot Status
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="bg-[#0D0B09] p-4 rounded-xl border border-[#3A332C]">
                <p className="text-xs text-[#8C8074]">Bot State</p>
                <p className="text-lg font-bold text-green-400 mt-1">
                  🟢 Running / Ready
                </p>
              </div>
              <div className="bg-[#0D0B09] p-4 rounded-xl border border-[#3A332C]">
                <p className="text-xs text-[#8C8074]">Active Proxy</p>
                <p className="text-lg font-bold text-white mt-1 font-['JetBrains_Mono',monospace]">
                  103.152.xx.xx
                </p>
              </div>
              <div className="bg-[#0D0B09] p-4 rounded-xl border border-[#3A332C]">
                <p className="text-xs text-[#8C8074]">Queue Count</p>
                <p className="text-lg font-bold text-[#FFB74A] mt-1">
                  0 Requests
                </p>
              </div>
            </div>
            <div>
              <h3 className="text-sm font-bold uppercase text-[#8C8074] mb-2 font-['JetBrains_Mono',monospace]">
                Live Terminal Logs
              </h3>
              <div className="bg-[#0D0B09] p-4 rounded-xl border border-[#3A332C] font-['JetBrains_Mono',monospace] text-xs text-green-400 space-y-1 h-60 overflow-y-auto">
                <p>[2026-06-06 18:30:00] Bot initialized successfully.</p>
                <p>[2026-06-06 18:30:05] Connected to Telegram Webhook.</p>
                <p>[2026-06-06 18:32:12] Proxy rotated successfully.</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Settings */}
        {activeTab === 'settings' && (
          <div className="bg-[#17130F] p-8 rounded-2xl border border-[#2A2420] shadow-xl max-w-xl">
            <h2 className="text-xl font-bold font-['Rajdhani',sans-serif] uppercase text-white mb-2">
              Admin Profile & Security
            </h2>
            <p className="text-xs text-[#8C8074] mb-6">
              Update your login email and password.
            </p>

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-[11px] font-['JetBrains_Mono',monospace] tracking-[0.15em] uppercase text-[#8C8074] mb-2">
                  Admin_Email
                </label>
                <input
                  type="email"
                  value={adminEmail}
                  onChange={e => setAdminEmail(e.target.value)}
                  className="w-full px-4 py-3 bg-[#0D0B09] rounded-xl border border-[#3A332C] focus:outline-none focus:border-[#FF5A1F] text-white font-['JetBrains_Mono',monospace] text-sm"
                />
              </div>
              <div>
                <label className="block text-[11px] font-['JetBrains_Mono',monospace] tracking-[0.15em] uppercase text-[#8C8074] mb-2">
                  New_Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-3 bg-[#0D0B09] rounded-xl border border-[#3A332C] focus:outline-none focus:border-[#FF5A1F] text-white font-['JetBrains_Mono',monospace] text-sm"
                />
              </div>
              <button
                type="submit"
                className="w-full py-3 px-6 bg-gradient-to-r from-[#FF5A1F] to-[#FFB74A] hover:brightness-110 text-[#0D0B09] rounded-xl font-bold font-['Rajdhani',sans-serif] uppercase tracking-wide transition duration-200"
              >
                {settingsSaved ? 'Saved ✓' : 'Save Changes'}
              </button>
            </form>
          </div>
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (Visible only on Mobile/Tablet) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-[#17130F] border-t border-[#2A2420] flex md:hidden justify-around items-center p-2 z-50 shadow-2xl">
        <button
          onClick={() => setActiveTab('vouchers')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition ${
            activeTab === 'vouchers' ? 'text-[#FFB74A]' : 'text-[#8C8074]'
          }`}
        >
          <span className="text-lg">📦</span>
          <span className="text-[10px] font-bold uppercase mt-0.5">
            Vouchers
          </span>
        </button>
        <button
          onClick={() => setActiveTab('bot')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition ${
            activeTab === 'bot' ? 'text-[#FFB74A]' : 'text-[#8C8074]'
          }`}
        >
          <span className="text-lg">🤖</span>
          <span className="text-[10px] font-bold uppercase mt-0.5">Bot</span>
        </button>
        <button
          onClick={() => setActiveTab('settings')}
          className={`flex flex-col items-center py-1.5 px-3 rounded-xl transition ${
            activeTab === 'settings' ? 'text-[#FFB74A]' : 'text-[#8C8074]'
          }`}
        >
          <span className="text-lg">⚙️</span>
          <span className="text-[10px] font-bold uppercase mt-0.5">
            Settings
          </span>
        </button>
        <button
          onClick={handleLogout}
          className="flex flex-col items-center py-1.5 px-3 rounded-xl text-[#F0847D] transition"
        >
          <span className="text-lg">🚪</span>
          <span className="text-[10px] font-bold uppercase mt-0.5">Logout</span>
        </button>
      </nav>
    </div>
  );
}
