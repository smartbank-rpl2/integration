"use client";

import { useEffect, useState } from "react";
import { fetchApi } from "@/lib/api";
import { motion } from "framer-motion";
import { Wallet, ArrowUpRight, ArrowDownLeft, Clock, PlusCircle } from "lucide-react";
import { LineChart, Line, ResponsiveContainer, YAxis, Tooltip } from "recharts";

const mockChartData = [
  { value: 400 },
  { value: 300 },
  { value: 550 },
  { value: 450 },
  { value: 700 },
  { value: 650 },
  { value: 800 },
];

export default function RetailDashboard() {
  const [balance, setBalance] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  // Transfer Form State
  const [transferPhone, setTransferPhone] = useState("");
  const [transferAmount, setTransferAmount] = useState("");
  const [isTransferring, setIsTransferring] = useState(false);

  useEffect(() => {
    fetchBalance();
  }, []);

  const fetchBalance = async () => {
    try {
      const res = await fetchApi('/wallet/balance');
      setBalance(res.data.balance);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsTransferring(true);
    try {
      await fetchApi('/wallet/transfer', {
        method: 'POST',
        body: JSON.stringify({
          toPhone: transferPhone,
          amount: parseFloat(transferAmount),
          currency: 'CBDC'
        })
      });
      alert('Transfer successful');
      setTransferPhone("");
      setTransferAmount("");
      fetchBalance();
    } catch (error: any) {
      alert(error.message || 'Transfer failed');
    } finally {
      setIsTransferring(false);
    }
  };

  const handleApplyLoan = async () => {
    const amount = prompt("Enter loan amount requested:");
    if (!amount) return;
    try {
      await fetchApi('/bank/loans/apply', {
        method: 'POST',
        body: JSON.stringify({ amount: parseFloat(amount) })
      });
      alert('Loan application submitted successfully and is PENDING approval.');
    } catch (error: any) {
      alert(error.message || 'Failed to apply for loan');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-semibold text-foreground">Retail Dashboard</h1>
          <p className="text-muted-foreground text-sm">Manage your digital assets and view transaction history.</p>
        </div>
        <button 
          onClick={handleApplyLoan}
          className="bg-secondary border border-border text-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-secondary/80 flex items-center gap-2 transition-colors"
        >
          <PlusCircle size={16} /> Apply for Loan
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Balance Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="col-span-1 lg:col-span-2 bg-card border border-border rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-[300px] h-[300px] bg-primary/5 blur-[80px] rounded-full pointer-events-none" />
          
          <div className="flex items-center gap-3 text-muted-foreground mb-2">
            <Wallet size={20} className="text-primary" />
            <h2 className="font-medium text-sm uppercase tracking-wider">Total CBDC Balance</h2>
          </div>
          
          <div className="text-5xl font-display font-semibold text-foreground tracking-tight mb-8">
            {loading ? <span className="animate-pulse bg-secondary text-transparent rounded">0000.00</span> : `$${balance?.toFixed(2) || '0.00'}`}
          </div>

          <div className="h-[120px] w-full -ml-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={mockChartData}>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#18181b', borderColor: '#27272a', borderRadius: '8px' }}
                  itemStyle={{ color: '#00ffa3' }}
                  cursor={{ stroke: '#27272a', strokeWidth: 1, strokeDasharray: '4 4' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="value" 
                  stroke="#00ffa3" 
                  strokeWidth={3} 
                  dot={false}
                  animationDuration={2000}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Transfer Action Card */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="col-span-1 bg-card border border-border rounded-2xl p-6 flex flex-col"
        >
          <h2 className="font-display font-medium text-lg text-foreground mb-4">Quick Transfer</h2>
          <form onSubmit={handleTransfer} className="space-y-4 flex-1 flex flex-col justify-end">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Recipient Phone</label>
              <input 
                type="text" 
                value={transferPhone}
                onChange={(e) => setTransferPhone(e.target.value)}
                placeholder="081234..." 
                className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 text-sm font-mono focus:border-primary outline-none"
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Amount (CBDC)</label>
              <input 
                type="number" 
                value={transferAmount}
                onChange={(e) => setTransferAmount(e.target.value)}
                placeholder="0.00" 
                className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 text-sm font-mono focus:border-primary outline-none"
                required
              />
            </div>
            <button 
              type="submit" 
              disabled={isTransferring}
              className="w-full mt-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
            >
              {isTransferring ? "Processing..." : "Send Funds"}
            </button>
          </form>
        </motion.div>
      </div>

      {/* Recent Activity */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-card border border-border rounded-2xl overflow-hidden"
      >
        <div className="p-6 border-b border-border flex items-center justify-between">
          <h2 className="font-display font-medium text-lg text-foreground">Recent Activity</h2>
          <Clock size={16} className="text-muted-foreground" />
        </div>
        <div className="p-0">
          {/* Mock Transactions */}
          <div className="flex items-center justify-between p-4 px-6 hover:bg-secondary/30 border-b border-border transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <ArrowDownLeft size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Top-up from Teller</p>
                <p className="text-xs text-muted-foreground">Today, 10:45 AM</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono font-medium text-primary">+ $500.00</p>
              <p className="text-xs font-mono text-muted-foreground">CBDC</p>
            </div>
          </div>

          <div className="flex items-center justify-between p-4 px-6 hover:bg-secondary/30 transition-colors">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                <ArrowUpRight size={18} className="text-foreground" />
              </div>
              <div>
                <p className="text-sm font-medium text-foreground">Transfer to 0822222222</p>
                <p className="text-xs text-muted-foreground">Yesterday, 14:20 PM</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm font-mono font-medium text-foreground">- $120.00</p>
              <p className="text-xs font-mono text-muted-foreground">CBDC</p>
            </div>
          </div>
        </div>
      </motion.div>

    </div>
  );
}
