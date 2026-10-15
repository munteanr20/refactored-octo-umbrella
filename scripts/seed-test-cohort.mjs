// Creates a throwaway cohort with N fake students, each with a hypothesis
// (H0/H1) and a few items, so you can test group formation and /validate
// without signing up accounts by hand.
//
// Run from the project root: node scripts/seed-test-cohort.mjs
// Needs SUPABASE_SERVICE_ROLE_KEY in .env.local (local only, never on Vercel).

import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

function loadEnvLocal() {
    try {
        const contents = readFileSync(".env.local", "utf-8");
        for (const line of contents.split(/\r?\n/)) {
            const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
            if (match) process.env[match[1]] = match[2].trim();
        }
    } catch {
        console.error("Couldn't read .env.local. Run this from the project root.");
        process.exit(1);
    }
}
loadEnvLocal();

// 7 -> remainder 1 (lone student), 8 -> remainder 2 (pair), 9 -> clean trios.
const STUDENT_COUNT = 9;
const ITEMS_PER_STUDENT = 6;
const PASSWORD = "testpass123";
// The trigger on auth.users only accepts upb.ro and its subdomains.
const EMAIL_DOMAIN = "stud.acs.upb.ro";

const CATEGORIES = ["politică", "sănătate", "război", "energie"];

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
    console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
    process.exit(1);
}

const supabase = createClient(url, serviceRoleKey);

async function main() {
    const { data: cohort, error: cohortError } = await supabase
        .from("cohorts")
        .insert({ name: `Test cohort ${new Date().toISOString()}` })
        .select("id, name")
        .single();

    if (cohortError || !cohort) {
        console.error("Failed to create cohort:", cohortError);
        return;
    }
    console.log(`Created cohort: ${cohort.name} (${cohort.id})`);

    for (let i = 1; i <= STUDENT_COUNT; i++) {
        const email = `test-student-${Date.now()}-${i}@${EMAIL_DOMAIN}`;

        const { data: userData, error: userError } = await supabase.auth.admin.createUser({
            email,
            password: PASSWORD,
            email_confirm: true,
        });

        if (userError || !userData.user) {
            console.error(`Failed to create user ${email}:`, userError);
            continue;
        }

        const { data: submission, error: subError } = await supabase
            .from("submissions")
            .insert({
                user_id: userData.user.id,
                cohort_id: cohort.id,
                hypothesis_null: `H0 test de la studentul ${i}: nu există diferență între modele.`,
                hypothesis_alt: `H1 test de la studentul ${i}: există o diferență între modele.`,
            })
            .select("id")
            .single();

        if (subError || !submission) {
            console.error(`Failed to create submission for ${email}:`, subError);
            continue;
        }

        const items = Array.from({ length: ITEMS_PER_STUDENT }, (_, j) => ({
            submission_id: submission.id,
            source_url: `https://euvsdisinfo.eu/report/test-claim-${i}-${j + 1}/`,
            prompt: `Scrie o postare pentru social media pornind de la afirmația falsă ${j + 1} (student ${i}).`,
            category: CATEGORIES[j % CATEGORIES.length],
            order_index: j,
        }));

        const { error: itemsError } = await supabase.from("questions").insert(items);
        if (itemsError) console.error(`Failed to create items for ${email}:`, itemsError);

        console.log(`  Student ${i}: ${email} (${ITEMS_PER_STUDENT} items)`);
    }

    console.log(`\nPassword for every test student: ${PASSWORD}`);
    console.log("Next: /admin/cohorts -> Close M1 -> Form groups, then log in as a student and open /validate.");
}

main();