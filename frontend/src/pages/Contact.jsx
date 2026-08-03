import React, { useState } from "react";
import PublicNav from "../components/layout/PublicNav";
import { toast } from "sonner";
import { PaperPlaneTilt, EnvelopeSimple, ChatCircle, ArrowRight } from "@phosphor-icons/react";

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const submit = (e) => {
    e.preventDefault();
    toast.success("Thanks — we'll reply within 24 hours.");
    setForm({ name: "", email: "", message: "" });
  };
  return (
    <div className="min-h-screen bg-ink-50 text-ink-900">
      <PublicNav />
      <section className="container-editorial pt-16 pb-24 lg:pt-24 lg:pb-32">
        <div className="grid lg:grid-cols-12 gap-16">
          <div className="lg:col-span-5">
            <div className="overline mb-4">Contact</div>
            <h1 className="display font-semibold text-5xl lg:text-6xl text-ink-900 leading-[1.02]">
              Let's <span className="serif-italic text-clay-600">talk.</span>
            </h1>
            <p className="mt-6 text-lg text-ink-600 leading-relaxed">
              Questions about plans, custom branding, or how MenuMaker fits your operation? Drop us a note — a human replies.
            </p>
            <div className="mt-10 space-y-5 pt-8 border-t border-ink-200">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-clay-50 text-clay-600 grid place-items-center shrink-0"><EnvelopeSimple size={18} weight="regular" /></div>
                <div>
                  <div className="display font-semibold text-ink-900">Email</div>
                  <div className="text-ink-600 text-sm mt-0.5">hello@menumaker.app</div>
                </div>
              </div>
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-lg bg-clay-50 text-clay-600 grid place-items-center shrink-0"><ChatCircle size={18} weight="regular" /></div>
                <div>
                  <div className="display font-semibold text-ink-900">Live chat</div>
                  <div className="text-ink-600 text-sm mt-0.5">Mon–Fri, 9am–6pm UTC</div>
                </div>
              </div>
            </div>
          </div>

          <div className="lg:col-span-7">
            <form onSubmit={submit} className="card-editorial p-8 md:p-12 space-y-5" data-testid="contact-form">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="overline block mb-2">Name</label>
                  <input required data-testid="contact-name" className="input-field" value={form.name} onChange={(e)=>setForm({...form,name:e.target.value})} />
                </div>
                <div>
                  <label className="overline block mb-2">Email</label>
                  <input required type="email" data-testid="contact-email" className="input-field" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} />
                </div>
              </div>
              <div>
                <label className="overline block mb-2">Message</label>
                <textarea required data-testid="contact-message" className="input-field min-h-[160px]" value={form.message} onChange={(e)=>setForm({...form,message:e.target.value})} />
              </div>
              <button type="submit" data-testid="contact-submit" className="btn-accent">
                Send message <PaperPlaneTilt size={14} weight="fill" />
              </button>
            </form>
          </div>
        </div>
      </section>
    </div>
  );
}
