import React, { useState } from "react";
import { Mail, MessageSquare, MapPin, Send, CheckCircle2 } from "lucide-react";
import { useToast } from "../components/ToastContext";

export function ContactUsPage() {
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("General Support");
  const [message, setMessage] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !message) {
      toast({ title: "Incomplete Form", description: "Please fill out all required fields.", type: "error" });
      return;
    }
    setSubmitted(true);
    toast({ title: "Inquiry Dispatched", description: "Our team will respond within 24 business hours.", type: "success" });
  };

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="border-b border-slate-200 pb-8 mb-8">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
          Contact PawShield Support & Publisher Inquiries
        </h1>
        <p className="text-sm text-slate-500 mt-2">
          We are here to answer questions regarding pet care reservations, sitter verification, advertising inquiries, or privacy rights.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Contact Information */}
        <div className="space-y-6">
          <div className="bg-slate-50 p-6 rounded-2xl border border-slate-200 space-y-4">
            <h3 className="font-bold text-slate-900 text-sm">Direct Channels</h3>
            
            <div className="flex items-start gap-3 text-xs text-slate-600">
              <Mail className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Support & Feedback</p>
                <a href="mailto:support@pawshield.local" className="text-blue-600 hover:underline">support@pawshield.local</a>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs text-slate-600">
              <MessageSquare className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Publisher & Advertising</p>
                <a href="mailto:adsense@pawshield.local" className="text-blue-600 hover:underline">adsense@pawshield.local</a>
              </div>
            </div>

            <div className="flex items-start gap-3 text-xs text-slate-600">
              <MapPin className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold text-slate-800">Publisher Office</p>
                <p>100 Market St, Suite 400<br />San Francisco, CA 94105</p>
              </div>
            </div>
          </div>

          <div className="p-5 bg-blue-50/60 rounded-2xl border border-blue-100 text-xs text-blue-900 space-y-2">
            <p className="font-bold">Google AdSense Certified Compliance</p>
            <p className="text-blue-700 leading-relaxed">
              We promptly respond to any inquiries regarding advertisement display, cookies, or GDPR/CCPA consumer access requests.
            </p>
          </div>
        </div>

        {/* Contact Form */}
        <div className="md:col-span-2">
          {submitted ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center space-y-4 shadow-xs">
              <div className="w-12 h-12 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Message Received!</h2>
              <p className="text-sm text-slate-600 max-w-md mx-auto">
                Thank you for contacting PawShield. An acknowledgment email has been routed to <strong>{email}</strong>. Our human support team typically replies within 1 business day.
              </p>
              <button
                onClick={() => {
                  setSubmitted(false);
                  setName("");
                  setEmail("");
                  setMessage("");
                }}
                className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-semibold hover:bg-slate-800 transition-colors"
              >
                Send Another Message
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Your Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Jane Doe"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jane@example.com"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Subject Inquiry
                </label>
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="General Support">General Support & Booking Questions</option>
                  <option value="Sitter Verification">Sitter Verification & Onboarding</option>
                  <option value="Google AdSense / Advertising">Google AdSense / Advertising Inquiry</option>
                  <option value="Privacy / GDPR Rights">Privacy / GDPR Data Rights Request</option>
                  <option value="Billing / Escrow">Billing, Escrow & Refund Query</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Your Message *
                </label>
                <textarea
                  required
                  rows={4}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="How can our platform support team assist you today?"
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-300 text-sm focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Send className="w-4 h-4" />
                Submit Message
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
