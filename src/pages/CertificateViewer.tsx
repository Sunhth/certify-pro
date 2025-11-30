import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { CheckCircle2, Download, Home, Loader2, Share2 } from "lucide-react";
import { useParams } from "react-router";

export default function CertificateViewer() {
  const { id } = useParams();
  const certificate = useQuery(api.certificates.getByAccessCode, { 
    accessCode: id || "" 
  });

  if (certificate === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  if (certificate === null) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4">
        <h1 className="text-2xl font-bold">Certificate Not Found</h1>
        <p className="text-muted-foreground">The certificate link is invalid or has been removed.</p>
        <Button onClick={() => window.location.href = "https://projxty.in"}>Go to Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background Effects */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-primary/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-secondary/10 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl relative z-10"
      >
        <Card className="bg-[#111] border-primary/30 shadow-[0_0_50px_rgba(0,255,136,0.15)] p-8 md:p-12 relative overflow-hidden">
          {/* Decorative Borders */}
          <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary via-accent to-secondary" />
          
          <div className="text-center space-y-8">
            <div className="flex justify-center">
              <div className="h-20 w-20 rounded-full bg-primary/10 flex items-center justify-center border border-primary/50 shadow-[0_0_20px_rgba(0,255,136,0.3)]">
                <CheckCircle2 className="h-10 w-10 text-primary" />
              </div>
            </div>

            <div className="space-y-2">
              <h2 className="text-xl text-accent font-medium tracking-widest uppercase">Certificate of Completion</h2>
              <h1 className="text-4xl md:text-6xl font-bold text-white tracking-tight glow-text">
                {certificate.candidateName}
              </h1>
            </div>

            <div className="space-y-4 max-w-2xl mx-auto">
              <p className="text-muted-foreground text-lg">
                Has successfully completed the internship program at <span className="text-white font-semibold">ProjXty</span> as a
              </p>
              <div className="text-3xl font-bold text-secondary drop-shadow-lg">
                {certificate.role}
              </div>
              <p className="text-muted-foreground">
                Duration: <span className="text-white">{certificate.duration}</span>
              </p>
            </div>

            <div className="pt-8 flex flex-col md:flex-row items-center justify-center gap-4">
              <div className="text-left text-sm text-muted-foreground border-l-2 border-primary/50 pl-4">
                <p>Certificate ID: <span className="font-mono text-white">{certificate.accessCode}</span></p>
                <p>Issued: {new Date(certificate.issueDate).toLocaleDateString()}</p>
                <p>Verified by ProjXty</p>
              </div>
              
              <div className="flex-1" />

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => window.print()}>
                  <Download className="mr-2 h-4 w-4" /> Print / PDF
                </Button>
                <Button variant="secondary" onClick={() => {
                  navigator.clipboard.writeText(window.location.href);
                  alert("Link copied to clipboard!");
                }}>
                  <Share2 className="mr-2 h-4 w-4" /> Share
                </Button>
              </div>
            </div>
          </div>
        </Card>

        <div className="mt-8 flex justify-center">
          <Button 
            variant="ghost" 
            className="text-muted-foreground hover:text-white"
            onClick={() => window.location.href = "https://projxty.in"}
          >
            <Home className="mr-2 h-4 w-4" /> Back to ProjXty.in
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
