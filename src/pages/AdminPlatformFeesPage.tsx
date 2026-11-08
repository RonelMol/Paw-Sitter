import { useState, useEffect } from "react";
import { useAuth } from "../lib/AuthContext";
import { useToast } from "../components/ToastContext";
import { useCurrency } from "../lib/CurrencyContext";
import { Save, AlertTriangle, Calculator, Settings2 } from "lucide-react";

export function AdminPlatformFeesPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatPrice, currencyConfig } = useCurrency();

  const [config, setConfig] = useState({
    ownerFeePercentage: 11,
    ownerFeeCap: 500, // ₱500 cap
    sitterCommissionPercentage: 20,
    fixedTransactionFee: 150 // ₱150 fixed fee
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Fetch current config
    const fetchConfig = async () => {
      try {
        const token = await user?.getIdToken();
        const res = await fetch("/api/v1/admin/platform-config", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          if (data && data.length > 0) {
            const item = data[0];
            const rawCap = item.ownerFeeCap !== null && item.ownerFeeCap !== undefined ? Number(item.ownerFeeCap) : 500;
            const rawFixed = item.fixedTransactionFee !== null && item.fixedTransactionFee !== undefined ? Number(item.fixedTransactionFee) : 150;
            setConfig({
              ownerFeePercentage: Number(item.ownerFeePercentage || 11),
              ownerFeeCap: rawCap >= 100 ? rawCap / 100 : rawCap,
              sitterCommissionPercentage: Number(item.sitterCommissionPercentage || 20),
              fixedTransactionFee: rawFixed >= 100 ? rawFixed / 100 : rawFixed
            });
          }
        }
      } catch (e) {
        console.error("Fetch config failed", e);
      } finally {
        setLoading(false);
      }
    };
    if (user) fetchConfig();
    else setLoading(false);
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    setSaving(true);
    try {
      const token = await user.getIdToken();
      const res = await fetch("/api/v1/admin/platform-config", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          ownerFeePercentage: config.ownerFeePercentage,
          ownerFeeCap: config.ownerFeeCap !== null && config.ownerFeeCap !== undefined ? Math.round(Number(config.ownerFeeCap) * 100) : null,
          sitterCommissionPercentage: config.sitterCommissionPercentage,
          fixedTransactionFee: Math.round(Number(config.fixedTransactionFee || 150) * 100)
        })
      });
      
      if (res.ok) {
        toast({ title: "Configuration Published", description: "An immutable audit log has been permanently generated in Philippine Pesos (₱).", type: "success" });
      } else {
        const err = await res.json();
        toast({ title: "Save Failed", description: err.error, type: "error" });
      }
    } catch (e) {
      toast({ title: "Save Failed", description: "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  // Live Simulation in Pesos (₱)
  const baseTransaction = 1000; // ₱1,000 standard booking base
  const ownerPct = Number(config.ownerFeePercentage || 0);
  const cap = config.ownerFeeCap !== null && config.ownerFeeCap !== undefined ? Number(config.ownerFeeCap) : Infinity;
  const ownerFeeRaw = baseTransaction * (ownerPct / 100);
  const ownerFee = Math.min(ownerFeeRaw, cap);
  const fixedFee = Number(config.fixedTransactionFee || 0);
  const totalOwnerPays = baseTransaction + ownerFee + fixedFee;
  
  const commPct = Number(config.sitterCommissionPercentage || 0);
  const sitterDeduction = baseTransaction * (commPct / 100);
  const sitterTakesHome = baseTransaction - sitterDeduction;
  
  const platformNet = ownerFee + sitterDeduction + fixedFee;

  if (loading) {
    return <div className="p-12 flex justify-center"><div className="animate-spin h-8 w-8 border-4 border-slate-900 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div className="flex flex-col lg:flex-row gap-8">
      
      {/* Editor Panel */}
      <div className="flex-1 space-y-6">
        <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-200">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold flex items-center gap-2 text-slate-900">
              <Settings2 className="w-5 h-5 text-purple-700" /> Platform Monetization (PHP ₱)
            </h2>
            <span className="text-xs font-bold px-2.5 py-1 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              Default: Philippine Peso (₱)
            </span>
          </div>
          
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Owner Service Fee Percentage ({config.ownerFeePercentage}%)
              </label>
              <input 
                type="range" min="0" max="30" step="0.5"
                value={config.ownerFeePercentage}
                onChange={e => setConfig(c => ({...c, ownerFeePercentage: Number(e.target.value)}))}
                className="w-full accent-slate-900" 
              />
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Owner Fee Maximum Cap (₱)
              </label>
              <div className="relative max-w-[220px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₱</span>
                <input 
                  type="number"
                  value={config.ownerFeeCap}
                  onChange={e => setConfig(c => ({...c, ownerFeeCap: Number(e.target.value)}))}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold" 
                />
              </div>
            </div>
            
            <div className="pt-6 border-t border-slate-100">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Sitter Platform Commission Deduction ({config.sitterCommissionPercentage}%)
              </label>
              <input 
                type="range" min="0" max="40" step="1"
                value={config.sitterCommissionPercentage}
                onChange={e => setConfig(c => ({...c, sitterCommissionPercentage: Number(e.target.value)}))}
                className="w-full accent-blue-600" 
              />
            </div>

            <div className="pt-6 border-t border-slate-100">
              <label className="block text-sm font-semibold text-slate-700 mb-2">
                Fixed Transaction Fee (₱)
              </label>
              <div className="relative max-w-[220px]">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 font-bold text-sm">₱</span>
                <input 
                  type="number" step="5"
                  value={config.fixedTransactionFee}
                  onChange={e => setConfig(c => ({...c, fixedTransactionFee: Number(e.target.value)}))}
                  className="w-full pl-8 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-slate-900 font-bold" 
                />
              </div>
            </div>

          </div>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3 items-start">
          <AlertTriangle className="text-amber-600 w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <h4 className="font-semibold text-amber-900 text-sm">Audit Trail Notice</h4>
            <p className="text-xs text-amber-800 mt-1">Modifying these parameters affects all newly generated quotes in Philippine Pesos (₱). An immutable audit record will be generated binding this change to your user ID.</p>
          </div>
        </div>

        <button 
          onClick={handleSave} disabled={saving}
          className="py-3 px-6 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-2"
        >
          <Save className="w-5 h-5" /> {saving ? "Publishing..." : "Publish Updates"}
        </button>
      </div>

      {/* Simulator Panel in Pesos (₱) */}
      <div className="w-full lg:w-[400px]">
        <div className="sticky top-24 bg-slate-900 rounded-2xl shadow-xl p-6 text-white">
           <h3 className="text-lg font-bold flex items-center gap-2 mb-6">
              <Calculator className="w-5 h-5 text-blue-400" /> Live Simulation Sandbox (PHP ₱)
           </h3>

           <div className="text-slate-400 text-sm mb-4">Sample Base Transaction: <strong className="text-white">₱1,000.00</strong></div>

           <div className="space-y-4">
             <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
               <h4 className="text-sm font-semibold text-slate-300 mb-3">Owner Pays</h4>
               <div className="flex justify-between text-sm mb-1 text-slate-400"><span>Base Cost</span><span>₱1,000.00</span></div>
               <div className="flex justify-between text-sm mb-1 text-slate-400"><span>Service Fee ({config.ownerFeePercentage}%)</span><span>₱{ownerFee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
               <div className="flex justify-between text-sm mb-2 text-slate-400"><span>Fixed Fee</span><span>₱{Number(config.fixedTransactionFee || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
               <div className="flex justify-between font-bold text-lg border-t border-slate-600 pt-2 text-white"><span>Total Charge</span><span>₱{totalOwnerPays.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
             </div>

             <div className="bg-slate-800 rounded-xl p-4 border border-slate-700">
               <h4 className="text-sm font-semibold text-slate-300 mb-3">Sitter Receives</h4>
               <div className="flex justify-between text-sm mb-1 text-slate-400"><span>Base Earnings</span><span>₱1,000.00</span></div>
               <div className="flex justify-between text-sm mb-2 text-rose-400"><span>Commission ({(config.sitterCommissionPercentage).toFixed(1)}%)</span><span>-₱{sitterDeduction.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
               <div className="flex justify-between font-bold text-lg border-t border-slate-600 pt-2 text-emerald-400"><span>Take Home</span><span>₱{sitterTakesHome.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span></div>
             </div>

             <div className="bg-blue-900/50 rounded-xl p-4 border border-blue-800 mt-6">
               <h4 className="text-sm font-semibold text-blue-300 mb-2">Platform Net Revenue</h4>
               <div className="flex justify-between font-bold text-2xl text-blue-100">
                 <span>Yield</span>
                 <span>₱{platformNet.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
               </div>
               <div className="text-xs text-blue-300/70 mt-1 text-right">Effective Take-Rate: {((platformNet / totalOwnerPays)*100).toFixed(1)}%</div>
             </div>
           </div>
        </div>
      </div>
    </div>
  );
}
