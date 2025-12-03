import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { api } from "@/convex/_generated/api";
import { Doc, Id } from "@/convex/_generated/dataModel";
import { useMutation, useQuery } from "convex/react";
import { Download, FileSpreadsheet, Loader2, Pencil, Plus, Trash2, Upload } from "lucide-react";
import { CheckedState } from "@radix-ui/react-checkbox";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useNavigate } from "react-router";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type CertificateDoc = Doc<"certificates">;

export default function Dashboard() {
  const { isAuthenticated, isLoading } = useAuth();
  const navigate = useNavigate();
  
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth");
    }
  }, [isLoading, isAuthenticated, navigate]);

  const certificates = useQuery(api.certificates.list);
  const createCertificate = useMutation(api.certificates.create);
  const bulkCreateCertificates = useMutation(api.certificates.bulkCreate);
  const deleteCertificate = useMutation(api.certificates.deleteCertificate);
  const updateCertificate = useMutation(api.certificates.update);

  const [newCert, setNewCert] = useState({ candidateName: "", role: "", duration: "" });
  const [isUploading, setIsUploading] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<Id<"certificates">>>(new Set());
  const [isExporting, setIsExporting] = useState(false);
  const [editingCert, setEditingCert] = useState<CertificateDoc | null>(null);
  const [editForm, setEditForm] = useState({
    candidateName: "",
    role: "",
    duration: "",
  });

  useEffect(() => {
    if (!certificates) return;
    setSelectedIds((prev) => {
      const next = new Set(prev);
      let changed = false;

      const latestIds = new Set(certificates.map((cert) => cert._id));
      for (const id of Array.from(next)) {
        if (!latestIds.has(id)) {
          next.delete(id);
          changed = true;
        }
      }
      for (const cert of certificates) {
        if (!next.has(cert._id)) {
          next.add(cert._id);
          changed = true;
        }
      }

      return changed ? next : prev;
    });
  }, [certificates]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCertificate(newCert);
      toast.success("Certificate created successfully");
      setNewCert({ candidateName: "", role: "", duration: "" });
    } catch (error) {
      toast.error("Failed to create certificate");
    }
  };

  const handleDelete = async (id: any) => {
    if (confirm("Are you sure you want to delete this certificate?")) {
      try {
        await deleteCertificate({ id });
        toast.success("Certificate deleted");
      } catch (error) {
        toast.error("Failed to delete");
      }
    }
  };

  const openEditDialog = (cert: CertificateDoc) => {
    setEditingCert(cert);
    setEditForm({
      candidateName: cert.candidateName,
      role: cert.role,
      duration: cert.duration,
    });
  };

  const handleEditSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingCert) return;

    try {
      await updateCertificate({
        id: editingCert._id,
        candidateName: editForm.candidateName,
        role: editForm.role,
        duration: editForm.duration,
      });
      toast.success("Certificate updated");
      setEditingCert(null);
    } catch (error) {
      console.error(error);
      toast.error("Failed to update certificate");
    }
  };

  const toggleCertificateSelection = (id: Id<"certificates">) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!certificates || certificates.length === 0) return;
    setSelectedIds((prev) =>
      prev.size === certificates.length
        ? new Set()
        : new Set(certificates.map((cert) => cert._id)),
    );
  };

  const downloadQrImages = async (items: CertificateDoc[]) => {
    const failed: string[] = [];
    for (const cert of items) {
      try {
        const viewerLink = `${window.location.origin}/c/${cert.accessCode}`;
        const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
          viewerLink,
        )}`;
        const response = await fetch(qrUrl);
        if (!response.ok) {
          throw new Error("QR request failed");
        }
        const blob = await response.blob();
        const objectUrl = URL.createObjectURL(blob);
        const anchor = document.createElement("a");
        anchor.href = objectUrl;
        anchor.download = `${cert.candidateName.replace(/\s+/g, "_")}_QR.png`;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
        URL.revokeObjectURL(objectUrl);
      } catch (error) {
        console.error("Failed to download QR", error);
        failed.push(cert.candidateName);
      }
    }
    return failed;
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: "binary" });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws) as any[];

        // Map fields - assuming Excel headers are Name, Role, Duration
        const formattedData = data.map((row) => ({
          candidateName: row.Name || row.name || row["Full Name"] || "",
          role: row.Role || row.role || row.Position || "",
          duration: row.Duration || row.duration || "",
        })).filter(d => d.candidateName && d.role);

        if (formattedData.length === 0) {
          toast.error("No valid data found in Excel");
          setIsUploading(false);
          return;
        }

        await bulkCreateCertificates({ certificates: formattedData });
        toast.success(`Imported ${formattedData.length} certificates`);
      } catch (error) {
        console.error(error);
        toast.error("Failed to process Excel file");
      } finally {
        setIsUploading(false);
        // Reset input
        e.target.value = "";
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleDownloadExcel = async () => {
    if (!certificates) return;

    const selectedCerts = certificates.filter((cert) => selectedIds.has(cert._id));
    if (selectedCerts.length === 0) {
      toast.error("Select at least one certificate to export.");
      return;
    }

    setIsExporting(true);
    try {
      const data = selectedCerts.map((cert) => ({
        NAME: cert.candidateName,
        ROLE: cert.role,
        "DURATION (TIME PERIOD)": cert.duration,
        LINK: `${window.location.origin}/c/${cert.accessCode}`,
      }));

      const ws = XLSX.utils.json_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Certificates");
      XLSX.writeFile(wb, "ProjXty_Selected_Certificates.xlsx");

      const failures = await downloadQrImages(selectedCerts);
      if (failures.length > 0) {
        toast.warning(
          `Excel downloaded but QR files failed for: ${failures.join(", ")}`,
        );
      } else {
        toast.success("Excel and QR codes downloaded.");
      }
    } catch (error) {
      console.error(error);
      toast.error("Failed to export certificates.");
    } finally {
      setIsExporting(false);
    }
  };

  const totalCertificates = certificates?.length ?? 0;
  const selectedCount = selectedIds.size;
  const hasSelectableCertificates = totalCertificates > 0 && selectedCount > 0;
  const headerSelectionState: CheckedState =
    totalCertificates === 0
      ? false
      : selectedCount === totalCertificates
        ? true
        : selectedCount === 0
          ? false
          : "indeterminate";

  return (
    <div className="min-h-screen bg-background p-8 space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-4xl font-bold text-primary tracking-tight">ProjXty Dashboard</h1>
          <p className="text-muted-foreground">Manage certificates and internships</p>
        </div>
        <div className="flex gap-4">
          <Button variant="outline" onClick={() => window.open("https://projxty.in", "_blank")}>
            Visit ProjXty.in
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Create Single */}
        <Card className="md:col-span-1 border-primary/20 shadow-[0_0_15px_rgba(0,255,136,0.1)]">
          <CardHeader>
            <CardTitle className="text-primary">Issue Certificate</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Full Name</label>
                <Input 
                  placeholder="John Doe" 
                  value={newCert.candidateName}
                  onChange={(e) => setNewCert({...newCert, candidateName: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Role / Position</label>
                <Input 
                  placeholder="Software Intern" 
                  value={newCert.role}
                  onChange={(e) => setNewCert({...newCert, role: e.target.value})}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Duration</label>
                <Input 
                  placeholder="Jan 2024 - Mar 2024" 
                  value={newCert.duration}
                  onChange={(e) => setNewCert({...newCert, duration: e.target.value})}
                  required
                />
              </div>
              <Button type="submit" className="w-full bg-primary text-primary-foreground hover:bg-primary/90">
                <Plus className="mr-2 h-4 w-4" /> Issue Certificate
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Bulk Actions */}
        <Card className="md:col-span-2 border-accent/20 shadow-[0_0_15px_rgba(0,136,255,0.1)]">
          <CardHeader>
            <CardTitle className="text-accent">Bulk Operations</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-4 p-6 border border-dashed border-muted-foreground/25 rounded-lg flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
                <FileSpreadsheet className="h-10 w-10 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">Upload Excel</h3>
                  <p className="text-xs text-muted-foreground">Columns: Name, Role, Duration</p>
                </div>
                <div className="relative">
                  <input 
                    type="file" 
                    accept=".xlsx, .xls" 
                    onChange={handleFileUpload}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={isUploading}
                  />
                  <Button variant="secondary" disabled={isUploading}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
                    Select File
                  </Button>
                </div>
              </div>

              <div className="space-y-4 p-6 border border-muted rounded-lg flex flex-col items-center justify-center text-center hover:bg-muted/50 transition-colors">
                <Download className="h-10 w-10 text-muted-foreground" />
                <div>
                  <h3 className="font-semibold">Export Data</h3>
                  <p className="text-xs text-muted-foreground">
                    Choose certificates below, then export with QR codes
                  </p>
                </div>
                <Button
                  variant="outline"
                  onClick={handleDownloadExcel}
                  disabled={!hasSelectableCertificates || isExporting}
                  className="w-full"
                >
                  {isExporting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Preparing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" /> Download Excel & QR
                    </>
                  )}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  {selectedCount} of {totalCertificates} certificates selected
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* List */}
      <Card className="border-border">
        <CardHeader>
          <CardTitle>Issued Certificates</CardTitle>
        </CardHeader>
        <CardContent>
          {!certificates ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : certificates.length === 0 ? (
            <div className="text-center p-8 text-muted-foreground">No certificates issued yet.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">
                      <Checkbox
                        aria-label="Select all certificates"
                        checked={headerSelectionState}
                        disabled={totalCertificates === 0}
                        onCheckedChange={() => toggleSelectAll()}
                      />
                    </TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead>Link</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {certificates.map((cert) => (
                    <TableRow key={cert._id}>
                      <TableCell className="w-12">
                        <Checkbox
                          aria-label={`Select ${cert.candidateName}`}
                          checked={selectedIds.has(cert._id)}
                          onCheckedChange={() => toggleCertificateSelection(cert._id)}
                        />
                      </TableCell>
                      <TableCell className="font-medium">{cert.candidateName}</TableCell>
                      <TableCell>{cert.role}</TableCell>
                      <TableCell>{cert.duration}</TableCell>
                      <TableCell>
                        <a 
                          href={`/c/${cert.accessCode}`} 
                          target="_blank" 
                          className="text-accent hover:underline text-sm"
                        >
                          View Link
                        </a>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            aria-label={`Edit ${cert.candidateName}`}
                            onClick={() => openEditDialog(cert)}
                          >
                            <Pencil className="h-4 w-4 text-primary" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(cert._id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!editingCert} onOpenChange={(open) => !open && setEditingCert(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Edit certificate</DialogTitle>
            <DialogDescription>Update the intern's name, role, or duration.</DialogDescription>
          </DialogHeader>

          <form className="space-y-4" onSubmit={handleEditSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Full Name</label>
              <Input
                value={editForm.candidateName}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, candidateName: e.target.value }))
                }
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Role / Position</label>
              <Input
                value={editForm.role}
                onChange={(e) => setEditForm((prev) => ({ ...prev, role: e.target.value }))}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Duration</label>
              <Input
                value={editForm.duration}
                onChange={(e) =>
                  setEditForm((prev) => ({ ...prev, duration: e.target.value }))
                }
                required
              />
            </div>

            <DialogFooter className="flex flex-col sm:flex-row sm:justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setEditingCert(null)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-primary text-primary-foreground hover:bg-primary/90">
                Save changes
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}