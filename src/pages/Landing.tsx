import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { ArrowRight, ShieldCheck } from "lucide-react";
import { useNavigate } from "react-router";

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">
      {/* Background Gradients */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-primary/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-accent/5 rounded-full blur-[150px]" />

      {/* Navbar */}
      <nav className="w-full p-6 flex justify-between items-center relative z-10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 bg-primary rounded-lg flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-black" />
          </div>
          <span className="text-xl font-bold tracking-tight">ProjXty CMS</span>
        </div>
        <div className="flex gap-4">
          <Button variant="ghost" onClick={() => window.location.href = "https://projxty.in"}>
            Main Site
          </Button>
          <Button onClick={() => navigate("/auth")}>
            Admin Login
          </Button>
        </div>
      </nav>

      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-4 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
          className="max-w-4xl space-y-8"
        >
          <h1 className="text-5xl md:text-7xl font-bold tracking-tighter">
            Verify & Manage <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-accent to-secondary">
              Internship Certificates
            </span>
          </h1>
          
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            The official certificate management system for ProjXty. Secure, verifiable, and instant access to internship credentials.
          </p>

          <div className="flex flex-col sm:flex-row gap-4 justify-center pt-4">
            <Button size="lg" className="bg-primary text-black hover:bg-primary/90 text-lg h-12 px-8" onClick={() => navigate("/auth")}>
              Access Dashboard <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg h-12 px-8" onClick={() => window.location.href = "https://projxty.in"}>
              Visit ProjXty.in
            </Button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="p-6 text-center text-sm text-muted-foreground relative z-10">
        <p>© {new Date().getFullYear()} ProjXty. All rights reserved.</p>
      </footer>
    </div>
  );
}