import React, { useState, useEffect } from 'react';
import { api } from '../../services/api.ts';
import { PlatformSettings } from '../../types/index.ts';
import { Sliders, Save, CheckCircle2, Shield, Percent, AlertCircle } from 'lucide-react';

export const PlatformSettingsScreen: React.FC = () => {
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [commission, setCommission] = useState('5.0');
  const [maintenance, setMaintenance] = useState(false);
  const [supportEmail, setSupportEmail] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    api.getAdminSettings().then((res) => {
      if (res.success && res.settings) {
        setSettings(res.settings);
        setCommission(String(res.settings.commissionPercentage));
        setMaintenance(res.settings.maintenanceMode);
        setSupportEmail(res.settings.supportEmail);
      }
    });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      setErrorMessage('');
      const res = await api.updateAdminSettings({
        commissionPercentage: Number(commission),
        maintenanceMode: maintenance,
        supportEmail,
      });
      if (res.success) {
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="pb-8 space-y-4">
      <div className="pt-3 px-4">
        <h2 className="text-sm font-bold text-slate-900 dark:text-white">
          Platform Settings
        </h2>
        <p className="text-[11px] text-slate-500">
          Manage commission fee, maintenance mode, and campus email policies
        </p>
      </div>

      <div className="px-4">
        <form
          onSubmit={handleSave}
          className="p-4 rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 space-y-4 shadow-xs"
        >
          {savedSuccess && (
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Platform settings updated successfully.</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Campus360 Commission (%)
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                min="0"
                max="25"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-bold"
              />
              <Percent className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Deducted automatically during YouPI-PG payment processing for platform maintenance and escrow escrow insurance.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Support Email Address
            </label>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700">
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-white">
                Maintenance Mode
              </div>
              <div className="text-[10px] text-slate-500">
                Temporarily pause new checkout orders
              </div>
            </div>
            <input
              type="checkbox"
              checked={maintenance}
              onChange={(e) => setMaintenance(e.target.checked)}
              className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Allowed College Domains
            </label>
            <div className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 font-mono text-[11px] text-slate-600 dark:text-slate-300 space-y-1">
              <div>• ait.edu (Apex Institute of Technology)</div>
              <div>• nce.ac.in (National College of Engg)</div>
              <div>• *.ac.in & *.edu.in</div>
            </div>
          </div>

          {errorMessage && (
            <div className="p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs">
              {errorMessage}
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-500/20 transition active:scale-95 disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              <span>Save Marketplace Settings</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
