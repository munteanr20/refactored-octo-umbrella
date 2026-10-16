"use client";

import { useRef } from "react";
import SubmitButton from "@/components/submit-button";
import { addFeedback } from "./actions";

export default function FeedbackForm({ submissionId }: { submissionId: string }) {
    const ref = useRef<HTMLFormElement>(null);

    async function action(formData: FormData) {
        if (!String(formData.get("feedback_text") ?? "").trim()) return;
        await addFeedback(submissionId, formData);
        ref.current?.reset();
    }

    return (
        <form ref={ref} action={action} className="flex flex-col gap-3">
            <label htmlFor="feedback_text" className="text-sm font-semibold">
                Feedback nou pentru student
            </label>
            <textarea id="feedback_text" name="feedback_text" rows={4} required className="field" />
            <SubmitButton pendingLabel="Se trimite..." className="btn btn-primary self-start">
                Trimite feedback
            </SubmitButton>
        </form>
    );
}