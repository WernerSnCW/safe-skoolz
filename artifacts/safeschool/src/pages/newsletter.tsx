import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Mail, User, MapPin, Briefcase, Sparkles, CheckCircle2, ArrowLeft } from "lucide-react";
import { VoiceShieldIcon } from "@/components/VoiceShieldLogo";
import { Link } from "wouter";

const ORG_TYPES = [
  { id: "school", label: "School", description: "Primary, secondary, or international school" },
  { id: "authority", label: "Local Authority", description: "Municipal or regional education authority" },
  { id: "trust", label: "School Trust / MAT", description: "Multi-academy trust or school group" },
  { id: "ngo", label: "NGO / Charity", description: "Child protection or education charity" },
  { id: "other", label: "Other", description: "Other organisation interested in SafeSkoolZ" },
];

export default function NewsletterSignUp() {
  const [formData, setFormData] = useState({
    organisationType: "",
    organisationName: "",
    contactName: "",
    email: "",
    role: "",
    region: "",
    interests: "",
    consentGiven: false,
  });
  const [status, setStatus] = useState<"idle" | "submitting" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("submitting");
    setErrorMessage("");

    try {
      const baseUrl = import.meta.env.BASE_URL.replace(/\/$/, "");
      const res = await fetch(`${baseUrl}/api/newsletter/subscribe`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        setStatus("error");
        setErrorMessage(data.error || "Something went wrong. Please try again.");
        return;
      }

      setStatus("success");
    } catch {
      setStatus("error");
      setErrorMessage("Network error. Please check your connection and try again.");
    }
  };

  const updateField = (field: string, value: string | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  if (status === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-sky-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="max-w-lg w-full text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-4">You're registered!</h1>
          <p className="text-lg text-gray-600 mb-3">
            Thank you for your interest in SafeSkoolZ. We'll keep you updated on product launches, features, and safeguarding resources.
          </p>
          <p className="text-sm text-gray-500 mb-8">
            Check your inbox for a confirmation. You can unsubscribe at any time.
          </p>
          <Link href="/login">
            <button className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors">
              <ArrowLeft size={18} />
              Back to SafeSkoolZ
            </button>
          </Link>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-teal-50 via-white to-sky-50">
      <div className="max-w-2xl mx-auto px-6 py-12">
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-10">
          <Link href="/login">
            <button className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-teal-600 font-medium mb-6 transition-colors">
              <ArrowLeft size={16} />
              Back to SafeSkoolZ
            </button>
          </Link>
          <div className="text-center">
            <div className="w-16 h-16 bg-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-5 shadow-lg shadow-teal-200">
              <VoiceShieldIcon size={36} className="text-white" />
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-3">Register your interest</h1>
            <p className="text-lg text-gray-600 max-w-md mx-auto">
              Sign up to our newsletter to stay informed about SafeSkoolZ — safeguarding tools built for schools, by schools.
            </p>
          </div>
        </motion.div>

        <motion.form
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          onSubmit={handleSubmit}
          className="bg-white rounded-2xl shadow-xl shadow-gray-100 border border-gray-100 p-8 space-y-6"
        >
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-3">Type of organisation</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {ORG_TYPES.map(org => (
                <button
                  key={org.id}
                  type="button"
                  onClick={() => updateField("organisationType", org.id)}
                  className={`p-3 rounded-xl border-2 text-left transition-all ${
                    formData.organisationType === org.id
                      ? "border-teal-500 bg-teal-50"
                      : "border-gray-200 hover:border-gray-300"
                  }`}
                >
                  <span className="font-semibold text-sm text-gray-900">{org.label}</span>
                  <span className="block text-xs text-gray-500 mt-0.5">{org.description}</span>
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <Building2 size={14} className="inline mr-1.5 text-gray-400" />
              Organisation name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Morna International School"
              value={formData.organisationName}
              onChange={e => updateField("organisationName", e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-sm"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <User size={14} className="inline mr-1.5 text-gray-400" />
                Your name
              </label>
              <input
                type="text"
                required
                placeholder="Full name"
                value={formData.contactName}
                onChange={e => updateField("contactName", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <Mail size={14} className="inline mr-1.5 text-gray-400" />
                Email address
              </label>
              <input
                type="email"
                required
                placeholder="you@school.edu"
                value={formData.email}
                onChange={e => updateField("email", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <Briefcase size={14} className="inline mr-1.5 text-gray-400" />
                Your role <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Head Teacher, DSL, PTA Chair"
                value={formData.role}
                onChange={e => updateField("role", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-sm"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1.5">
                <MapPin size={14} className="inline mr-1.5 text-gray-400" />
                Region <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Balearic Islands, Spain"
                value={formData.region}
                onChange={e => updateField("region", e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1.5">
              <Sparkles size={14} className="inline mr-1.5 text-gray-400" />
              What interests you most? <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <textarea
              placeholder="e.g. Incident reporting, compliance dashboards, PTA portal, analytics..."
              value={formData.interests}
              onChange={e => updateField("interests", e.target.value)}
              rows={3}
              className="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-teal-500 focus:ring-2 focus:ring-teal-100 outline-none transition-all text-sm resize-none"
            />
          </div>

          <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-4">
            <input
              type="checkbox"
              id="consent"
              checked={formData.consentGiven}
              onChange={e => updateField("consentGiven", e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-teal-600 focus:ring-teal-500"
              required
            />
            <label htmlFor="consent" className="text-sm text-gray-600 leading-relaxed">
              I consent to receive newsletters and product updates from SafeSkoolZ. We respect your privacy and will never share your data. You can unsubscribe at any time.
            </label>
          </div>

          <AnimatePresence>
            {status === "error" && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm font-medium"
              >
                {errorMessage}
              </motion.div>
            )}
          </AnimatePresence>

          <button
            type="submit"
            disabled={status === "submitting" || !formData.organisationType || !formData.consentGiven}
            className="w-full py-3.5 bg-teal-600 text-white rounded-xl font-bold text-base hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-teal-200"
          >
            {status === "submitting" ? (
              <span className="flex items-center justify-center gap-2">
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                Registering...
              </span>
            ) : (
              "Register & Subscribe"
            )}
          </button>

          <p className="text-center text-xs text-gray-400">
            Already have an account?{" "}
            <Link href="/login" className="text-teal-600 hover:underline font-medium">Sign in here</Link>
          </p>
        </motion.form>

        <div className="mt-10 text-center text-sm text-gray-500">
          <p>SafeSkoolZ — safeguarding compliance made simple.</p>
          <p className="mt-1">LOPIVI · Convivèxit · Machista Violence Protocol</p>
          <p className="mt-2 text-xs text-gray-400">Powered by Cloudworkz</p>
        </div>
      </div>
    </div>
  );
}
