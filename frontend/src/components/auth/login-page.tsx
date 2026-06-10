"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Loader2, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "../ui/toast";

export function LoginPage() {
  const { login, signup, isLoading } = useAuthStore();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password || (isSignUp && !username)) {
      toast.error("Please fill in all fields.");
      return;
    }

    try {
      if (isSignUp) {
        await signup(email, username, password);
        toast.success("Account created.");
      } else {
        await login(email, password);
        toast.success("Welcome back.");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background overflow-hidden">
      <div className="relative w-full max-w-sm px-6">
        {/* Header */}
        <div className="text-center mb-10">
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            AI Workspace
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5">
            {isSignUp ? "Create your account" : "Sign in to continue"}
          </p>
        </div>

        {/* Form */}
        <motion.div layout className="space-y-0">
          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-1.5"
                >
                  <label className="text-xs font-medium text-muted-foreground">Username</label>
                  <input
                    type="text"
                    placeholder="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-card border border-border focus:border-foreground/20 rounded-lg py-2.5 px-3 text-sm text-foreground placeholder-muted-foreground/40 outline-none transition-colors"
                  />
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-card border border-border focus:border-foreground/20 rounded-lg py-2.5 px-3 text-sm text-foreground placeholder-muted-foreground/40 outline-none transition-colors"
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-muted-foreground">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-card border border-border focus:border-foreground/20 rounded-lg py-2.5 px-3 text-sm text-foreground placeholder-muted-foreground/40 outline-none transition-colors"
                required
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-foreground text-background hover:bg-foreground/90 font-medium py-2.5 rounded-lg flex items-center justify-center gap-2 cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <span className="text-sm">{isSignUp ? "Create account" : "Continue"}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </>
              )}
            </button>
          </form>

          <div className="text-center mt-6">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
