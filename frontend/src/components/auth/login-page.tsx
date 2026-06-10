"use client";

import { useState } from "react";
import { useAuthStore } from "@/store/auth-store";
import { Mail, Lock, User, Loader2, Sparkles, LogIn, ArrowRight } from "lucide-react";
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
      toast.error("Please fill in all required fields.");
      return;
    }

    try {
      if (isSignUp) {
        await signup(email, username, password);
        toast.success("Account created successfully!");
      } else {
        await login(email, password);
        toast.success("Welcome back!");
      }
    } catch (err: any) {
      toast.error(err.message || "Authentication failed. Please check credentials.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-zinc-950 overflow-hidden font-sans">
      {/* Background Orbs */}
      <div className="absolute top-1/4 left-1/4 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-purple-600/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute bottom-1/4 right-1/4 translate-x-1/2 translate-y-1/2 w-96 h-96 bg-indigo-600/20 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: "2s" }} />

      <div className="relative w-full max-w-md p-6">
        {/* Logo Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center p-3 bg-gradient-to-tr from-purple-600 to-indigo-500 rounded-2xl shadow-xl shadow-purple-900/20 mb-4 ring-1 ring-white/10">
            <Sparkles className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-extrabold text-white tracking-tight">
            AI Workspace
          </h1>
          <p className="text-sm text-zinc-400 mt-2">
            The premium AI orchestrator and operating environment
          </p>
        </div>

        {/* Card Panel */}
        <motion.div
          layout
          className="glass-card bg-zinc-900/60 border border-white/5 backdrop-blur-xl p-8 rounded-3xl shadow-2xl relative"
        >
          <h2 className="text-xl font-bold text-white mb-6 flex items-center gap-2">
            <LogIn className="w-5 h-5 text-purple-400" />
            {isSignUp ? "Create Account" : "Welcome Back"}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <AnimatePresence mode="popLayout">
              {isSignUp && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="space-y-1"
                >
                  <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Username</label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                    <input
                      type="text"
                      placeholder="stewy85"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="w-full bg-zinc-950/50 border border-white/5 focus:border-purple-500/50 rounded-xl py-3 pl-11 pr-4 text-white placeholder-zinc-500 outline-none transition-colors duration-200"
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="email"
                  placeholder="name@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/5 focus:border-purple-500/50 rounded-xl py-3 pl-11 pr-4 text-white placeholder-zinc-500 outline-none transition-colors duration-200"
                  required
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Password</label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-zinc-500" />
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-zinc-950/50 border border-white/5 focus:border-purple-500/50 rounded-xl py-3 pl-11 pr-4 text-white placeholder-zinc-500 outline-none transition-colors duration-200"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-semibold py-3.5 rounded-xl flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-purple-600/20 active:scale-[0.99] transition-transform duration-100 disabled:opacity-50 disabled:cursor-not-allowed mt-6"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  {isSignUp ? "Register Account" : "Access Workspace"}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Toggle Button */}
          <div className="text-center mt-6">
            <button
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-zinc-400 hover:text-purple-400 transition-colors duration-200 cursor-pointer"
            >
              {isSignUp ? "Already have an account? Sign In" : "Need a workspace? Create an Account"}
            </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
