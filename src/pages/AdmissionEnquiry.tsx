import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AddAdmissionEnquiryDialog } from "@/components/AddAdmissionEnquiryDialog";
import { EditAdmissionEnquiryDialog } from "@/components/EditAdmissionEnquiryDialog";
import { AddFollowupDialog } from "@/components/AddFollowupDialog";
import { toast } from "sonner";
import { Pencil, Trash2, Phone, Search, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function AdmissionEnquiry() {
  const { user } = useAuth();
  const [enquiries, setEnquiries] = useState<any[]>([]);
  const [filteredEnquiries, setFilteredEnquiries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingEnquiry, setEditingEnquiry] = useState<any>(null);
  const [followupEnquiryId, setFollowupEnquiryId] = useState<string | null>(null);
  const [deleteEnquiryId, setDeleteEnquiryId] = useState<string | null>(null);

  const fetchEnquiries = async () => {
    if (!user) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("admission_enquiry")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setEnquiries(data || []);
      setFilteredEnquiries(data || []);
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEnquiries();
  }, [user]);

  useEffect(() => {
    let filtered = enquiries;

    if (searchTerm) {
      filtered = filtered.filter(
        (e) =>
          e.child_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.parents_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          e.mobile_no?.includes(searchTerm)
      );
    }

    if (statusFilter !== "all") {
      filtered = filtered.filter((e) => e.status === statusFilter);
    }

    setFilteredEnquiries(filtered);
  }, [searchTerm, statusFilter, enquiries]);

  const handleDelete = async () => {
    if (!deleteEnquiryId) return;

    try {
      const { error } = await supabase
        .from("admission_enquiry")
        .delete()
        .eq("id", deleteEnquiryId);

      if (error) throw error;

      toast.success("Enquiry deleted successfully");
      fetchEnquiries();
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setDeleteEnquiryId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: any = {
      pending: "secondary",
      admitted: "default",
      not_admitted: "destructive"
    };
    const labels: any = {
      pending: "Pending",
      admitted: "Admitted",
      not_admitted: "Not Admitted"
    };
    return <Badge variant={variants[status] || "secondary"}>{labels[status] || status}</Badge>;
  };

  if (loading) {
    return <div className="flex items-center justify-center h-full">Loading...</div>;
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Admission Enquiries</h1>
        <AddAdmissionEnquiryDialog onSuccess={fetchEnquiries} />
      </div>

      <Card className="p-4">
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by name or mobile..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="admitted">Admitted</SelectItem>
              <SelectItem value="not_admitted">Not Admitted</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Child Name</TableHead>
                <TableHead>Parents Name</TableHead>
                <TableHead>Mobile</TableHead>
                <TableHead>Age/DOB</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredEnquiries.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No enquiries found
                  </TableCell>
                </TableRow>
              ) : (
                filteredEnquiries.map((enquiry) => (
                  <TableRow key={enquiry.id}>
                    <TableCell className="font-medium">{enquiry.child_name}</TableCell>
                    <TableCell>{enquiry.parents_name}</TableCell>
                    <TableCell>{enquiry.mobile_no}</TableCell>
                    <TableCell>
                      {enquiry.age ? `${enquiry.age} yrs` : enquiry.date_of_birth ? format(new Date(enquiry.date_of_birth), "dd/MM/yyyy") : "-"}
                    </TableCell>
                    <TableCell>{enquiry.course_name || "-"}</TableCell>
                    <TableCell>{getStatusBadge(enquiry.status)}</TableCell>
                    <TableCell>{format(new Date(enquiry.created_at), "dd/MM/yyyy")}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setFollowupEnquiryId(enquiry.id)}
                        >
                          <Phone className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingEnquiry(enquiry)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteEnquiryId(enquiry.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {editingEnquiry && (
        <EditAdmissionEnquiryDialog
          enquiry={editingEnquiry}
          open={!!editingEnquiry}
          onOpenChange={(open) => !open && setEditingEnquiry(null)}
          onSuccess={fetchEnquiries}
        />
      )}

      {followupEnquiryId && (
        <AddFollowupDialog
          enquiryId={followupEnquiryId}
          open={!!followupEnquiryId}
          onOpenChange={(open) => !open && setFollowupEnquiryId(null)}
          onSuccess={() => toast.success("Followup recorded")}
        />
      )}

      <AlertDialog open={!!deleteEnquiryId} onOpenChange={(open) => !open && setDeleteEnquiryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertCircle className="h-5 w-5 text-destructive" />
              Delete Enquiry
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this enquiry? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
