import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, Button } from "@/components/ui-polished";
import {
  Megaphone, Plus, Trash2, Shield, Heart, BookOpen, Calendar,
  Users, Tag, Send, X, CheckCircle2, ChevronDown, ChevronUp
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { formatDate } from "@/lib/utils";

const STAFF_ROLES = ["teacher", "head_of_year", "support_staff", "senco", "coordinator", "head_teacher"];

const CATEGORIES = [
  { id: "general", label: "General", icon: Megaphone, color: "bg-blue-100 text-blue-700 dark:bg-blue-950/30 dark:text-blue-400" },
  { id: "safeguarding", label: "Safeguarding", icon: Shield, color: "bg-red-100 text-red-700 dark:bg-red-950/30 dark:text-red-400" },
  { id: "wellbeing", label: "Wellbeing", icon: Heart, color: "bg-pink-100 text-pink-700 dark:bg-pink-950/30 dark:text-pink-400" },
  { id: "curriculum", label: "Curriculum", icon: BookOpen, color: "bg-green-100 text-green-700 dark:bg-green-950/30 dark:text-green-400" },
  { id: "event", label: "Event", icon: Calendar, color: "bg-purple-100 text-purple-700 dark:bg-purple-950/30 dark:text-purple-400" },
  { id: "policy", label: "Policy", icon: Tag, color: "bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-400" },
];

const AUDIENCES = [
  { id: "everyone", label: "Everyone" },
  { id: "pupils", label: "Pupils only" },
  { id: "parents", label: "Parents only" },
  { id: "staff", label: "Staff only" },
  { id: "pupils_parents", label: "Pupils & Parents" },
];

function getCategoryInfo(cat: string) {
  return CATEGORIES.find(c => c.id === cat) || CATEGORIES[0];
}

function getAudienceLabel(aud: string) {
  return AUDIENCES.find(a => a.id === aud)?.label || "Everyone";
}

function getRoleDisplayName(role: string) {
  const map: Record<string, string> = {
    teacher: "Teacher",
    head_of_year: "Head of Year",
    support_staff: "Support Staff",
    senco: "SENCO",
    coordinator: "Safeguarding Lead",
    head_teacher: "Head Teacher",
  };
  return map[role] || role;
}

function ComposeForm({ onClose }: { onClose: () => void }) {
  const queryClient = useQueryClient();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [category, setCategory] = useState("general");
  const [audience, setAudience] = useState("everyone");
  const [sent, setSent] = useState(false);

  const mutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/teacher-posts", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ title, body, category, audience }),
      });
      if (!res.ok) throw new Error("Failed to post");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher-posts"] });
      setSent(true);
    },
  });

  if (sent) {
    return (
      <Card className="border-green-200 dark:border-green-900/50">
        <CardContent className="p-8 text-center">
          <CheckCircle2 size={48} className="mx-auto text-green-500 mb-4" />
          <h3 className="text-xl font-bold mb-2">Shared successfully!</h3>
          <p className="text-muted-foreground text-sm mb-4">
            Your post is now visible to {getAudienceLabel(audience).toLowerCase()}.
          </p>
          <Button onClick={onClose} variant="outline">Done</Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-indigo-200 dark:border-indigo-900/50">
      <CardHeader className="bg-gradient-to-r from-indigo-50 to-blue-50 dark:from-indigo-950/20 dark:to-blue-950/20 border-b border-indigo-100 dark:border-indigo-900/30 pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Megaphone size={20} className="text-indigo-600" />
            Share a Learning or Update
          </CardTitle>
          <button onClick={onClose} className="text-muted-foreground hover:text-foreground" aria-label="Close form">
            <X size={20} />
          </button>
        </div>
      </CardHeader>
      <CardContent className="p-5 space-y-4">
        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={200}
            placeholder="e.g. Online Safety Tips for This Term"
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-sm focus-visible:outline-none focus-visible:border-indigo-400 focus-visible:ring-4 focus-visible:ring-indigo-100 dark:focus-visible:ring-indigo-950/30 transition-all"
          />
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">Content</label>
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={5}
            maxLength={5000}
            placeholder="Share information, resources, tips, or updates with the school community..."
            className="w-full px-4 py-3 rounded-xl border-2 border-border bg-background text-sm focus-visible:outline-none focus-visible:border-indigo-400 focus-visible:ring-4 focus-visible:ring-indigo-100 dark:focus-visible:ring-indigo-950/30 transition-all resize-none"
          />
          <p className="text-xs text-muted-foreground text-right mt-1">{body.length}/5000</p>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">Category</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(cat => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  category === cat.id
                    ? `${cat.color} border-current`
                    : "bg-muted/30 border-border text-muted-foreground hover:border-indigo-300"
                }`}
              >
                <cat.icon size={14} />
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-muted-foreground mb-1.5 block uppercase tracking-wider">Who should see this?</label>
          <div className="flex flex-wrap gap-2">
            {AUDIENCES.map(aud => (
              <button
                key={aud.id}
                type="button"
                onClick={() => setAudience(aud.id)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all border ${
                  audience === aud.id
                    ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-950/30 dark:text-indigo-400 border-indigo-300 dark:border-indigo-800"
                    : "bg-muted/30 border-border text-muted-foreground hover:border-indigo-300"
                }`}
              >
                <Users size={14} />
                {aud.label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={!title.trim() || !body.trim() || mutation.isPending}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700"
          >
            <Send size={16} className="mr-1" />
            {mutation.isPending ? "Sharing..." : "Share with school"}
          </Button>
        </div>

        {mutation.isError && (
          <p className="text-destructive text-xs text-center">Failed to share. Please try again.</p>
        )}
      </CardContent>
    </Card>
  );
}

function PostCard({ post, canDelete, onDelete }: { post: any; canDelete: boolean; onDelete: () => void }) {
  const [expanded, setExpanded] = useState(false);
  const catInfo = getCategoryInfo(post.category);
  const isLong = post.body.length > 200;
  const displayBody = isLong && !expanded ? post.body.slice(0, 200) + "..." : post.body;

  return (
    <Card className="hover:shadow-sm transition-shadow">
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold ${catInfo.color}`}>
                <catInfo.icon size={12} />
                {catInfo.label}
              </span>
              <span className="text-[11px] text-muted-foreground px-2 py-0.5 rounded-full bg-muted">
                {getAudienceLabel(post.audience)}
              </span>
            </div>
            <h3 className="font-bold text-base mb-1">{post.title}</h3>
            <p className="text-sm text-foreground leading-relaxed whitespace-pre-wrap">{displayBody}</p>
            {isLong && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1 hover:underline flex items-center gap-1"
              >
                {expanded ? (
                  <>Show less <ChevronUp size={12} /></>
                ) : (
                  <>Read more <ChevronDown size={12} /></>
                )}
              </button>
            )}
            <div className="flex items-center gap-3 mt-3 text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">
                {post.authorFirstName} {post.authorLastName}
              </span>
              <span>{getRoleDisplayName(post.authorRole)}</span>
              <span>{formatDate(post.createdAt)}</span>
            </div>
          </div>
          {canDelete && (
            <button
              type="button"
              onClick={() => {
                if (confirm("Delete this post?")) onDelete();
              }}
              className="text-muted-foreground hover:text-destructive transition-colors p-1 shrink-0"
              aria-label="Delete post"
            >
              <Trash2 size={14} />
            </button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function LearningsPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [showCompose, setShowCompose] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string | null>(null);

  const isStaff = STAFF_ROLES.includes(user?.role || "");

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ["/api/teacher-posts"],
    queryFn: async () => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch("/api/teacher-posts", {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = localStorage.getItem("safeschool_token");
      const res = await fetch(`/api/teacher-posts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/teacher-posts"] });
    },
  });

  const filteredPosts = filterCategory
    ? posts.filter((p: any) => p.category === filterCategory)
    : posts;

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 animate-pulse">
        <div className="h-10 bg-muted rounded-lg w-48" />
        <div className="h-32 bg-muted rounded-2xl" />
        <div className="h-32 bg-muted rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-display font-bold flex items-center gap-3">
            <Megaphone className="text-indigo-500" size={32} />
            School Updates
          </h1>
          <p className="text-muted-foreground mt-1">
            {isStaff
              ? "Share learnings, resources, and information with the school community."
              : "Latest updates and learnings from your teachers."}
          </p>
        </div>
        {isStaff && !showCompose && (
          <Button
            onClick={() => setShowCompose(true)}
            className="bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus size={16} className="mr-1" />
            Share update
          </Button>
        )}
      </div>

      <AnimatePresence>
        {showCompose && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
          >
            <ComposeForm onClose={() => setShowCompose(false)} />
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilterCategory(null)}
          className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
            !filterCategory ? "bg-indigo-600 text-white" : "bg-muted text-muted-foreground hover:bg-muted/80"
          }`}
        >
          All
        </button>
        {CATEGORIES.map(cat => (
          <button
            key={cat.id}
            type="button"
            onClick={() => setFilterCategory(cat.id === filterCategory ? null : cat.id)}
            className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold transition-all ${
              filterCategory === cat.id ? `${cat.color}` : "bg-muted text-muted-foreground hover:bg-muted/80"
            }`}
          >
            <cat.icon size={12} />
            {cat.label}
          </button>
        ))}
      </div>

      {filteredPosts.length === 0 ? (
        <Card>
          <CardContent className="p-10 text-center">
            <Megaphone size={48} className="mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-bold mb-2">No updates yet</h3>
            <p className="text-muted-foreground text-sm">
              {isStaff
                ? "Be the first to share something with the school community."
                : "Check back soon for updates from your teachers."}
            </p>
            {isStaff && (
              <Button onClick={() => setShowCompose(true)} className="mt-4 bg-indigo-600 hover:bg-indigo-700">
                <Plus size={16} className="mr-1" /> Share your first update
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredPosts.map((post: any) => {
            const canDelete =
              post.authorId === user?.id ||
              ["coordinator", "head_teacher"].includes(user?.role || "");
            return (
              <PostCard
                key={post.id}
                post={post}
                canDelete={canDelete}
                onDelete={() => deleteMutation.mutate(post.id)}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
