import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  transaction_date: string;
}

interface EditFirmTransactionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: Transaction | null;
  onTransactionUpdated: () => void;
}

export function EditFirmTransactionDialog({
  open,
  onOpenChange,
  transaction,
  onTransactionUpdated
}: EditFirmTransactionDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    transaction_type: '',
    amount: '',
    description: '',
    transaction_date: ''
  });

  useEffect(() => {
    if (transaction && open) {
      setFormData({
        transaction_type: transaction.transaction_type,
        amount: transaction.amount.toString(),
        description: transaction.description || '',
        transaction_date: transaction.transaction_date
      });
    }
  }, [transaction, open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('firm_transactions')
        .update({
          transaction_type: formData.transaction_type,
          amount: parseFloat(formData.amount),
          description: formData.description || null,
          transaction_date: formData.transaction_date
        })
        .eq('id', transaction.id);

      if (error) throw error;

      toast.success('Transaction updated successfully');
      onTransactionUpdated();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error updating transaction:', error);
      toast.error('Failed to update transaction');
    } finally {
      setLoading(false);
    }
  };

  if (!transaction) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Transaction</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="transaction_type">Transaction Type</Label>
            <Select
              value={formData.transaction_type}
              onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partner_deposit">Partner Deposit</SelectItem>
                <SelectItem value="partner_withdrawal">Partner Withdrawal</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="adjustment">Adjustment</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction_date">Transaction Date</Label>
            <Input
              id="transaction_date"
              type="date"
              value={formData.transaction_date}
              onChange={(e) => setFormData({ ...formData, transaction_date: e.target.value })}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Optional notes..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Transaction'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
