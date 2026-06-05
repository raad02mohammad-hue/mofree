import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { DollarSign, TrendingUp, TrendingDown, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { Transaction } from "@shared/schema";
import AIPanel from "@/components/AIPanel";

const EXPENSE_CATEGORIES = ["Housing","Food","Transport","Health","Entertainment","Shopping","Utilities","Other"];
const CAT_COLORS: Record<string,string> = { Housing:"#6366f1", Food:"#f59e0b", Transport:"#3b82f6", Health:"#10b981", Entertainment:"#ec4899", Shopping:"#8b5cf6", Utilities:"#06b6d4", Income:"#22c55e", Other:"#94a3b8" };

export default function Budget() {
  const qc = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState({ description:"", amount:"", type:"expense", category:"Food" });

  const { data: transactions = [] } = useQuery<Transaction[]>({ queryKey:["/api/transactions"] });
  const addMutation = useMutation({ mutationFn:(data:any) => apiRequest("POST","/api/transactions",data), onSuccess:() => qc.invalidateQueries({ queryKey:["/api/transactions"] }) });
  const delMutation = useMutation({ mutationFn:(id:number) => apiRequest("DELETE",`/api/transactions/${id}`), onSuccess:() => qc.invalidateQueries({ queryKey:["/api/transactions"] }) });

  const income   = transactions.filter(t => t.amount > 0).reduce((s,t) => s+t.amount, 0);
  const expenses = Math.abs(transactions.filter(t => t.amount < 0).reduce((s,t) => s+t.amount, 0));
  const balance  = income - expenses;
  const catTotals = transactions.filter(t => t.amount < 0).reduce((acc:Record<string,number>, t) => { acc[t.category]=(acc[t.category]||0)+Math.abs(t.amount); return acc; }, {});
  const topCat = Object.entries(catTotals).sort((a,b) => b[1]-a[1])[0];
  const recentTx = transactions.slice(0,5);

  const aiContext = `Budget overview. Total balance: $${balance.toFixed(2)}. Income: $${income.toFixed(2)}. Total expenses: $${expenses.toFixed(2)}. Spending by category: ${Object.entries(catTotals).map(([k,v]) => `${k}: $${v.toFixed(2)}`).join(", ") || "none"}. Biggest category: ${topCat ? `${topCat[0]} ($${topCat[1].toFixed(2)})` : "none"}. Recent transactions: ${recentTx.map(t => `${t.description} $${t.amount.toFixed(2)}`).join(", ")}.`;

  const handleAdd = () => {
    if (!form.description || !form.amount) return;
    const amount = form.type === "expense" ? -Math.abs(parseFloat(form.amount)) : Math.abs(parseFloat(form.amount));
    addMutation.mutate({ description:form.description, amount, type:form.type, category:form.type==="income" ? "Income" : form.category, date:new Date().toISOString().split("T")[0] });
    setAddOpen(false);
    setForm({ description:"", amount:"", type:"expense", category:"Food" });
  };

  return (
    <div className="h-full overflow-y-auto p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-foreground flex items-center gap-2"><DollarSign className="w-5 h-5 text-green-400" /> Budget</h1>
        <Button size="sm" onClick={() => setAddOpen(true)}><Plus className="w-4 h-4 mr-1.5" /> Add</Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label:"Balance",  value:`$${balance.toFixed(2)}`, icon:DollarSign,  color:balance>=0?"text-green-400":"text-red-400",  bg:"bg-green-400/10" },
          { label:"Income",   value:`$${income.toFixed(2)}`,  icon:TrendingUp,  color:"text-emerald-400", bg:"bg-emerald-400/10" },
          { label:"Expenses", value:`$${expenses.toFixed(2)}`,icon:TrendingDown,color:"text-rose-400",    bg:"bg-rose-400/10" },
        ].map(({ label, value, icon:Icon, color, bg }) => (
          <div key={label} className="bg-card border border-border rounded-xl p-4">
            <div className="flex items-center justify-between">
              <p className="text-xs text-muted-foreground">{label}</p>
              <div className={`w-7 h-7 rounded-lg ${bg} flex items-center justify-center`}><Icon className={`w-3.5 h-3.5 ${color}`} /></div>
            </div>
            <p className={`text-xl font-bold mt-2 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      {/* Orion AI — Budget */}
      <AIPanel
        context={aiContext}
        suggestions={["Where am I overspending?","How do I save more?","Budget breakdown this month","Biggest expense category","Am I on track financially?","Ways to cut my food budget"]}
        placeholder="Ask Orion about your finances..."
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Category breakdown */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-foreground mb-4">Spending by Category</h3>
          <div className="space-y-3">
            {Object.entries(catTotals).sort((a,b) => b[1]-a[1]).map(([cat,amt]) => (
              <div key={cat}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-foreground">{cat}</span>
                  <span className="font-semibold" style={{ color:CAT_COLORS[cat]||"#94a3b8" }}>${amt.toFixed(2)}</span>
                </div>
                <div className="h-2 bg-background rounded-full overflow-hidden">
                  <div className="h-full rounded-full" style={{ width:`${(amt/expenses)*100}%`, backgroundColor:CAT_COLORS[cat]||"#94a3b8" }} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Transactions */}
        <div className="bg-card border border-border rounded-xl p-4">
          <h3 className="font-semibold text-foreground mb-4">Recent Transactions</h3>
          <div className="space-y-2 max-h-72 overflow-y-auto">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between py-2 border-b border-border/50 last:border-0">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor:CAT_COLORS[t.category]||"#94a3b8" }} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{t.description}</p>
                    <p className="text-xs text-muted-foreground">{t.date} · {t.category}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`text-sm font-semibold ${t.amount>=0?"text-emerald-400":"text-rose-400"}`}>{t.amount>=0?"+":""}${t.amount.toFixed(2)}</span>
                  <button onClick={() => delMutation.mutate(t.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add Transaction</DialogTitle></DialogHeader>
          <div className="space-y-3 mt-2">
            <div><label className="text-xs text-muted-foreground">Type</label>
              <Select value={form.type} onValueChange={v => setForm(f => ({ ...f, type:v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="expense">Expense</SelectItem><SelectItem value="income">Income</SelectItem></SelectContent>
              </Select>
            </div>
            <div><label className="text-xs text-muted-foreground">Description</label><Input value={form.description} onChange={e => setForm(f => ({ ...f, description:e.target.value }))} placeholder="e.g. Grocery Store" /></div>
            <div><label className="text-xs text-muted-foreground">Amount ($)</label><Input type="number" value={form.amount} onChange={e => setForm(f => ({ ...f, amount:e.target.value }))} placeholder="0.00" /></div>
            {form.type==="expense" && (
              <div><label className="text-xs text-muted-foreground">Category</label>
                <Select value={form.category} onValueChange={v => setForm(f => ({ ...f, category:v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{EXPENSE_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" className="flex-1" onClick={() => setAddOpen(false)}>Cancel</Button>
            <Button className="flex-1" onClick={handleAdd}>Add</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
