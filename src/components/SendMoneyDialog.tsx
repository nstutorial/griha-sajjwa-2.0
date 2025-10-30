import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

interface SendMoneyDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  firmAccountId: string;
  firmAccountName: string;
  onMoneySent: () => void;
}

interface Partner {
  id: string;
  name: string;
}

interface Mahajan {
  id: string;
  name: string;
}

export function SendMoneyDialog({
  open,
  onOpenChange,
  firmAccountId,
  firmAccountName,
  onMoneySent
}: SendMoneyDialogProps) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [mahajans, setMahajans] = useState<Mahajan[]>([]);
  const [formData, setFormData] = useState({
    recipient_type: 'partner' as 'partner' | 'mahajan',
    recipient_id: '',
    transaction_type: 'partner_deposit',
    amount: '',
    transaction_date: new Date().toISOString().split('T')[0],
    description: ''
  });

  useEffect(() => {
    if (open && user) {
      fetchRecipients();
    }
  }, [open, user]);

  const fetchRecipients = async () => {
    try {
      const [partnersRes, mahajansRes] = await Promise.all([
        supabase.from('partners').select('id, name').eq('user_id', user?.id).order('name'),
        supabase.from('mahajans').select('id, name').eq('user_id', user?.id).order('name')
      ]);

      if (partnersRes.error) throw partnersRes.error;
      if (mahajansRes.error) throw mahajansRes.error;

      setPartners(partnersRes.data || []);
      setMahajans(mahajansRes.data || []);
    } catch (error: any) {
      console.error('Error fetching recipients:', error);
      toast.error('Failed to load recipients');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.recipient_id || !formData.amount) {
      toast.error('Please fill all required fields');
      return;
    }

    setLoading(true);
    try {
      const amount = parseFloat(formData.amount);

      if (formData.recipient_type === 'partner') {
        // Create firm transaction for partner
        const { error: firmError } = await supabase
          .from('firm_transactions')
          .insert({
            firm_account_id: firmAccountId,
            partner_id: formData.recipient_id,
            transaction_type: formData.transaction_type,
            amount: amount,
            transaction_date: formData.transaction_date,
            description: formData.description || `Money sent to partner from ${firmAccountName}`
          });

        if (firmError) throw firmError;
      } else {
        // For mahajan: record firm transaction
        const { error: firmError } = await supabase
          .from('firm_transactions')
          .insert({
            firm_account_id: firmAccountId,
            partner_id: null,
            transaction_type: formData.transaction_type,
            amount: amount,
            transaction_date: formData.transaction_date,
            description: formData.description || `Payment to mahajan: ${mahajans.find(m => m.id === formData.recipient_id)?.name} from ${firmAccountName}`
          });

        if (firmError) throw firmError;
      }

      toast.success('Money sent successfully');
      setFormData({
        recipient_type: 'partner',
        recipient_id: '',
        transaction_type: 'partner_deposit',
        amount: '',
        transaction_date: new Date().toISOString().split('T')[0],
        description: ''
      });
      onMoneySent();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error sending money:', error);
      toast.error('Failed to send money');
    } finally {
      setLoading(false);
    }
  };

  const recipients = formData.recipient_type === 'partner' ? partners : mahajans;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Send Money from {firmAccountName}</DialogTitle>
          <DialogDescription>
            Send money to a partner or mahajan from this firm account
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="recipient_type">Recipient Type</Label>
            <Select
              value={formData.recipient_type}
              onValueChange={(value: 'partner' | 'mahajan') => {
                setFormData({ ...formData, recipient_type: value, recipient_id: '' });
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="partner">Partner</SelectItem>
                <SelectItem value="mahajan">Mahajan</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="recipient_id">
              {formData.recipient_type === 'partner' ? 'Select Partner' : 'Select Mahajan'}
            </Label>
            <Select
              value={formData.recipient_id}
              onValueChange={(value) => setFormData({ ...formData, recipient_id: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={`Select ${formData.recipient_type}`} />
              </SelectTrigger>
              <SelectContent>
                {recipients.map((recipient) => (
                  <SelectItem key={recipient.id} value={recipient.id}>
                    {recipient.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="transaction_type">Transaction Type</Label>
            <Select
              value={formData.transaction_type}
              onValueChange={(value) => setFormData({ ...formData, transaction_type: value })}
            >
              <SelectTrigger>
                <SelectValue />
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
              placeholder="Optional description..."
            />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Sending...' : 'Send Money'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
