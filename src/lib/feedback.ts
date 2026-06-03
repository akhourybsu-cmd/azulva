import { supabase } from "@/integrations/supabase/client";

export const FEEDBACK_TYPES = ["idea", "bug", "deal request", "destination request", "general feedback"] as const;
export type FeedbackType = (typeof FEEDBACK_TYPES)[number];

export type FeedbackInput = {
  email?: string | null;
  page?: string | null;
  feedbackType: FeedbackType;
  message: string;
  rating?: number | null;
  userId?: string | null;
};

export async function submitFeedback(input: FeedbackInput): Promise<{ ok: boolean; error?: string }> {
  const msg = input.message.trim();
  if (!msg) return { ok: false, error: "Please enter a message." };
  if (msg.length > 2000) return { ok: false, error: "Message is too long (max 2000 chars)." };
  const { error } = await supabase.from("feedback_submissions").insert({
    email: input.email ? input.email.trim().toLowerCase() : null,
    page: input.page ?? null,
    feedback_type: input.feedbackType,
    message: msg,
    rating: input.rating ?? null,
    user_id: input.userId ?? null,
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
