import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { api } from "@/convex/_generated/api";
import { useMutation, useQuery } from "convex/react";
import { Download, FileSpreadsheet, Loader2, Plus, Trash2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import { useAuth } from "@/hooks/use-auth";
import { useEffect } from "react";
import { useNavigate } from "react-router";

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

  const [newCert, setNewCert] = useState({ candidateName: "", role: "", duration: "" });
  const [isUploading, setIsUploading] = useState(false);

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

  const handleDownloadExcel = () => {
    if (!certificates) return;

    const data = certificates.map(cert => ({
      "Full Name": cert.candidateName,
      "Role": cert.role,
      "Duration": cert.duration,
      "Issue Date": new Date(cert.issueDate).toLocaleDateString(),
      "Viewer Link": `${window.location.origin}/c/${cert.accessCode}`
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Certificates");
    XLSX.writeFile(wb, "ProjXty_Certificates.xlsx");
  };

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
                  <p className="text-xs text-muted-foreground">Download all certificates with links</p>
                </div>
                <Button variant="outline" onClick={handleDownloadExcel} disabled={!certificates?.length}>
                  <Download className="mr-2 h-4 w-4" /> Download Excel
                </Button>
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
                        <Button variant="ghost" size="icon" onClick={() => handleDelete(cert._id)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}