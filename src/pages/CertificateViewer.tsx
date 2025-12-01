import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { motion } from "framer-motion";
import { CheckCircle2, Download, Home, Loader2, Share2 } from "lucide-react";
import { useParams } from "react-router";
import { toast } from "sonner";

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
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#f8f6f0,_#e3dac6)] px-4 py-10 flex items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/paper-fibers.png')] opacity-40 pointer-events-none" />
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-4xl relative z-10"
      >
        <Card className="relative overflow-hidden border-[#e8dcc3] bg-white/95 text-[#2f261a] shadow-[0_30px_90px_-60px_rgba(47,38,26,0.9)] px-6 md:px-12 py-10">
          <div className="absolute inset-x-12 top-8 border-t border-[#e3d2b4]" />
          <div className="absolute inset-x-12 bottom-8 border-b border-[#e3d2b4]" />
          <div className="relative z-10 space-y-10 md:space-y-12">
            <div className="text-center space-y-4">
              <p className="tracking-[0.4em] text-xs uppercase text-[#b5986d]">Certificate of Completion</p>
              <h1 className="text-4xl md:text-5xl font-semibold tracking-tight text-[#2f261a]">{certificate.candidateName}</h1>
              <p className="text-base text-[#6b5b44] max-w-2xl mx-auto">
                This certifies that the above individual has fulfilled the internship requirements at <span className="font-semibold text-[#4b3b2b]">ProjXty</span> as a
                <span className="text-[#9c6f37] font-medium"> {certificate.role}</span>.
              </p>
            </div>
            <div className="grid gap-10 md:grid-cols-2">
              <div className="space-y-6 text-[#54452f]">
                <div className="space-y-2">
                  <p className="uppercase text-xs tracking-[0.3em] text-[#b5986d]">Presented To</p>
                  <p className="text-3xl font-semibold text-[#2f261a]">{certificate.candidateName}</p>
                </div>
                <p>
                  In recognition of dedicated contribution throughout the period of <span className="font-medium text-[#4b3b2b]">{certificate.duration}</span>, demonstrating professionalism and growth.
                </p>
                <div className="space-y-1 text-sm">
                  <p>
                    Certificate ID: <span className="font-mono text-[#2f261a]">{certificate.accessCode}</span>
                  </p>
                  <p>Issued on {new Date(certificate.issueDate).toLocaleDateString()}</p>
                </div>
              </div>
              <div className="rounded-2xl border border-[#f0e6d3] bg-white/80 p-6 shadow-[0_40px_120px_-70px_rgba(47,38,26,0.8)]">
                <p className="uppercase text-xs tracking-[0.3em] text-[#b5986d]">Verification</p>
                <p className="mt-3 text-sm text-[#6b5b44]">
                  This document is digitally verifiable. Use the link below or present this code to confirm authenticity.
                </p>
                <div className="mt-6 space-y-2 text-[#4b3b2b]">
                  <p className="text-xs uppercase tracking-[0.4em] text-[#b5986d]">Quick Actions</p>
                  <div className="flex flex-wrap gap-3">
                    <Button
                      variant="outline"
                      className="border-[#d6c3a4] text-[#4b3b2b] hover:bg-[#f5ecdd]"
                      onClick={() => window.print()}
                    >
                      <Download className="mr-2 h-4 w-4" /> Print / PDF
                    </Button>
                    <Button
                      className="bg-[#2f261a] text-white hover:bg-[#463829]"
                      onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success("Certificate link copied");
                      }}
                    >
                      <Share2 className="mr-2 h-4 w-4" /> Share
                    </Button>
                  </div>
                </div>
              </div>
            </div>
            <div className="grid gap-6 md:grid-cols-2 text-center text-xs uppercase tracking-[0.2em] text-[#9b8461]">
              <div className="flex flex-col items-center gap-3">
                <span className="w-32 border-t border-[#d6c2a3]" />
                <p>Program Director</p>
              </div>
              <div className="flex flex-col items-center gap-3">
                <span className="w-32 border-t border-[#d6c2a3]" />
                <p>ProjXty Seal</p>
              </div>
            </div>
          </div>
        </Card>
        <div className="mt-8 flex justify-center">
          <Button
            variant="ghost"
            className="text-[#6b5b44] hover:text-[#2f261a]"
            onClick={() => (window.location.href = "https://projxty.in")}
          >
            <Home className="mr-2 h-4 w-4" /> Back to ProjXty.in
          </Button>
        </div>
      </motion.div>
    </div>
  );
}