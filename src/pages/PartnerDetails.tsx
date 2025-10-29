import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { RecordPartnerPaymentDialog } from '@/components/RecordPartnerPaymentDialog';
import { ReceiveMoneyDialog } from '@/components/ReceiveMoneyDialog';
import { PartnerStatement } from '@/components/PartnerStatement';

interface Partner {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  total_invested: number;
}

interface Transaction {
  id: string;
  amount: number;
  payment_date: string;
  payment_mode: string;
  notes: string | null;
  mahajan_name: string;
}

export default function PartnerDetails() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [partner, setPartner] = useState<Partner | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPaymentDialog, setShowPaymentDialog] = useState(false);
  const [showReceiveMoneyDialog, setShowReceiveMoneyDialog] = useState(false);

  useEffect(() => {
    if (id) {
      fetchPartnerDetails();
      fetchTransactions();
    }
  }, [id]);

  // Realtime subscriptions for transaction updates
  useEffect(() => {
    if (!id) return;

    const partnerTransactionsChannel = supabase
      .channel('partner-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'partner_transactions',
          filter: `partner_id=eq.${id}`
        },
        () => {
          fetchTransactions();
          fetchPartnerDetails();
        }
      )
      .subscribe();

    const firmTransactionsChannel = supabase
      .channel('firm-transactions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'firm_transactions',
          filter: `partner_id=eq.${id}`
        },
        () => {
          fetchTransactions();
          fetchPartnerDetails();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(partnerTransactionsChannel);
      supabase.removeChannel(firmTransactionsChannel);
    };
  }, [id]);

  const fetchPartnerDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('partners')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      setPartner(data);
    } catch (error: any) {
      console.error('Error fetching partner:', error);
      toast.error('Failed to load partner details');
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      // Fetch partner_transactions
      const { data: partnerTxns, error: partnerError } = await supabase
        .from('partner_transactions')
        .select(`
          id,
          amount,
          payment_date,
          payment_mode,
          notes,
          mahajan_id,
          mahajans (name)
        `)
        .eq('partner_id', id)
        .order('payment_date', { ascending: false });

      if (partnerError) throw partnerError;

      // Fetch firm_transactions for this partner
      const { data: firmTxns, error: firmError } = await supabase
        .from('firm_transactions')
        .select(`
          id,
          amount,
          transaction_date,
          description,
          transaction_type,
          firm_account_id,
          firm_accounts (account_name)
        `)
        .eq('partner_id', id)
        .order('transaction_date', { ascending: false });

      if (firmError) throw firmError;
      
      // Format partner transactions
      const formattedPartnerTxns = (partnerTxns || []).map(t => ({
        id: t.id,
        amount: t.amount,
        payment_date: t.payment_date,
        payment_mode: t.payment_mode,
        notes: t.notes,
        mahajan_name: t.mahajan_id ? ((t.mahajans as any)?.name || 'Unknown') : 'Firm Account'
      }));

      // Format firm transactions
      const formattedFirmTxns = (firmTxns || []).map(t => ({
        id: t.id,
        amount: t.amount,
        payment_date: t.transaction_date,
        payment_mode: 'bank', // firm transactions are typically bank transactions
        notes: `${t.transaction_type} - ${t.description || 'No description'} (${(t.firm_accounts as any)?.account_name || 'Firm Account'})`,
        mahajan_name: 'Firm Account'
      }));

      // Merge and sort all transactions by date
      const allTransactions = [...formattedPartnerTxns, ...formattedFirmTxns]
        .sort((a, b) => new Date(b.payment_date).getTime() - new Date(a.payment_date).getTime());

      setTransactions(allTransactions);
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      toast.error('Failed to load transactions');
    }
  };

  const handlePaymentAdded = () => {
    fetchPartnerDetails();
    fetchTransactions();
  };

  if (loading) {
    return <div className="container mx-auto p-6">Loading...</div>;
  }

  if (!partner) {
    return <div className="container mx-auto p-6">Partner not found</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <Button 
        variant="ghost" 
        onClick={() => navigate('/partners')}
        className="mb-4"
      >
        <ArrowLeft className="h-4 w-4 mr-2" />
        Back to Partners
      </Button>

      <div className="grid gap-6 mb-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>{partner.name}</CardTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setShowReceiveMoneyDialog(true)}>
                Receive Money
              </Button>
              <Button onClick={() => setShowPaymentDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Record Payment
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                {partner.phone && (
                  <p className="text-sm"><span className="font-medium">Phone:</span> {partner.phone}</p>
                )}
                {partner.email && (
                  <p className="text-sm"><span className="font-medium">Email:</span> {partner.email}</p>
                )}
                {partner.address && (
                  <p className="text-sm"><span className="font-medium">Address:</span> {partner.address}</p>
                )}
              </div>
              <div className="flex items-center justify-end">
                <div className="text-right">
                  <p className="text-sm text-muted-foreground">Total Invested</p>
                  <p className="text-3xl font-bold">₹{partner.total_invested.toFixed(2)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Transaction History</CardTitle>
          </CardHeader>
          <CardContent>
            <PartnerStatement transactions={transactions} />
          </CardContent>
        </Card>
      </div>

      <RecordPartnerPaymentDialog
        open={showPaymentDialog}
        onOpenChange={setShowPaymentDialog}
        partnerId={partner.id}
        onPaymentAdded={handlePaymentAdded}
      />

      <ReceiveMoneyDialog
        open={showReceiveMoneyDialog}
        onOpenChange={setShowReceiveMoneyDialog}
        partnerId={partner.id}
        partnerName={partner.name}
        onPaymentAdded={handlePaymentAdded}
      />
    </div>
  );
}
