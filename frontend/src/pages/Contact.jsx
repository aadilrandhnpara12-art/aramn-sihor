import React, { useState } from "react";
import PublicNav from "../components/layout/PublicNav";
import { toast } from "sonner";
import { PaperPlaneTilt } from "@phosphor-icons/react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const submit = (e) => {
    e.preventDefault();
    toast.success("Thanks! We'll get back to you within 24 hours.");
    setForm({ name: "", email: "", message: "" });
  };
  return (
    <div className="cyber-bg cyber-noise min-h-screen">
      <div className="absolute inset-0 cyber-grid opacity-40 pointer-events-none" />
      <PublicNav />
      <section className="relative max-w-4xl mx-auto px-6 lg:px-10 pt-20 pb-32">
        <div className="mb-14 max-w-2xl">
          <div className="overline mb-4 text-cyan-300">Contact</div>
          <h1 className="font-display font-bold text-5xl text-white tracking-tight">Let's talk.</h1>
          <p className="mt-6 text-white/60">Questions about plans, custom branding, or partnerships? Drop us a note.</p>
        </div>
        <form onSubmit={submit} className="cyber-card p-8 md:p-12 space-y-6" data-testid="contact-form">
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <label className="overline block mb-2">Name</label>
              <input required data-testid="contact-name" className="cyber-input" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
            </div>
            <div>
              <label className="overline block mb-2">Email</label>
              <input required type="email" data-testid="contact-email" className="cyber-input" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} />
            </div>
          </div>
          <div>
            <label className="overline block mb-2">Message</label>
            <textarea required data-testid="contact-message" className="cyber-input min-h-[140px]" value={form.message} onChange={(e)=>setForm({...form,message:e.target.value})} />
          </div>
          <button type="submit" data-testid="contact-submit" className="cyber-btn">
            <PaperPlaneTilt size={16} weight="fill" /> Send message
          </button>
        </form>
      </section>
    </div>
  );
}
