"use client";

import { useState } from "react";
import { fetchApi } from "@/lib/api";
import { motion } from "framer-motion";
import { ShieldAlert, UserX, UserCheck, CheckCircle, XCircle } from "lucide-react";

export default function ManagerDashboard() {
  const [targetPhone, setTargetPhone] = useState("");
  const [loanId, setLoanId] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);

  const handleUserStatus = async (action: 'suspend' | 'activate') => {
    if (!targetPhone) return alert("Please enter a target phone number");
    setIsProcessing(true);
    try {
      await fetchApi(`/bank/manager/${action}`, {
        method: 'POST',
        body: JSON.stringify({ phone: targetPhone })
      });
      alert(`User ${targetPhone} has been successfully ${action}ed.`);
      setTargetPhone("");
    } catch (error: any) {
      alert(error.message || `Failed to ${action} user`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleLoan = async (action: 'approve' | 'reject') => {
    if (!loanId) return alert("Please enter a Loan ID");
    setIsProcessing(true);
    try {
      await fetchApi(`/bank/loans/${loanId}/${action}`, {
        method: 'POST'
      });
      alert(`Loan ${loanId} has been ${action}d.`);
      setLoanId("");
    } catch (error: any) {
      alert(error.message || `Failed to ${action} loan`);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-display font-semibold text-foreground">Manager Control Center</h1>
        <p className="text-muted-foreground text-sm">Oversee network security and manage user loan applications.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* User Management */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <ShieldAlert className="text-destructive w-5 h-5" />
            <h2 className="font-display font-medium text-lg text-foreground">Account Risk Management</h2>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Target User Phone</label>
              <input 
                type="text" 
                value={targetPhone}
                onChange={(e) => setTargetPhone(e.target.value)}
                placeholder="e.g. 0811111111" 
                className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 text-sm font-mono focus:border-primary outline-none"
              />
            </div>
            
            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => handleUserStatus('suspend')}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-destructive/10 text-destructive border border-destructive/30 py-2.5 rounded-lg text-sm font-semibold hover:bg-destructive/20 transition-all disabled:opacity-50"
              >
                <UserX size={16} /> Suspend
              </button>
              <button 
                onClick={() => handleUserStatus('activate')}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-primary/10 text-primary border border-primary/30 py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/20 transition-all disabled:opacity-50"
              >
                <UserCheck size={16} /> Activate
              </button>
            </div>
          </div>
        </motion.div>

        {/* Loan Management */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card border border-border rounded-2xl p-6"
        >
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-full bg-secondary">
              <CheckCircle className="text-foreground w-5 h-5" />
            </div>
            <h2 className="font-display font-medium text-lg text-foreground">Loan Approval Queue</h2>
          </div>
          
          <div className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Loan ID</label>
              <input 
                type="text" 
                value={loanId}
                onChange={(e) => setLoanId(e.target.value)}
                placeholder="Enter loan UUID" 
                className="w-full bg-secondary/50 border border-border rounded-lg py-2 px-3 text-sm font-mono focus:border-primary outline-none"
              />
            </div>
            
            <div className="flex gap-4 pt-2">
              <button 
                onClick={() => handleLoan('approve')}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-primary text-primary-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-primary/90 transition-all disabled:opacity-50"
              >
                <CheckCircle size={16} /> Approve
              </button>
              <button 
                onClick={() => handleLoan('reject')}
                disabled={isProcessing}
                className="flex-1 flex items-center justify-center gap-2 bg-secondary border border-border text-foreground py-2.5 rounded-lg text-sm font-semibold hover:bg-secondary/80 transition-all disabled:opacity-50"
              >
                <XCircle size={16} /> Reject
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
