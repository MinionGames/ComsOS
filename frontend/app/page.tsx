// filepath: /c:/Users/leyan/Documents/GitHub/ComsOS/frontend/app/page.tsx
"use client";

import { useMemo, useState } from "react";
import { api } from "../lib/api";
import BorderGlow from "../components/BorderGlow";
import CountUp from "../components/CountUp";
import DecryptedText from "../components/DecryptedText";
import Particles from "../components/Particles";
import styles from "./page.module.css";

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const normalizeScore = (raw: string): number | null => {
  if (!raw.trim()) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  const rounded = Math.round(value);
  if (rounded < 400 || rounded > 1600) return null;
  return rounded;
};

export default function Page() {
  const [email, setEmail] = useState("");
  const [currentScore, setCurrentScore] = useState("");
  const [targetScore, setTargetScore] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [submittedEmails, setSubmittedEmails] = useState<Set<string>>(new Set());
  const [showScoreModal, setShowScoreModal] = useState(false);
  const [countFrom, setCountFrom] = useState(0);
  const [countTo, setCountTo] = useState(1600);

  const normalizedEmail = useMemo(() => email.trim().toLowerCase(), [email]);
  const localDuplicate = normalizedEmail && submittedEmails.has(normalizedEmail);
  const particleColors = useMemo(() => ["#ffffff", "#eeedfe", "#cfd0ff"], []);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage("");
    setSuccessMessage("");

    if (!normalizedEmail || !emailRegex.test(normalizedEmail)) {
      setErrorMessage("Enter a valid email address.");
      return;
    }

    if (localDuplicate) {
      setErrorMessage("This email is already on the waitlist.");
      return;
    }

    const normalizedCurrent = normalizeScore(currentScore);
    const normalizedTarget = normalizeScore(targetScore);

    if (currentScore.trim() && normalizedCurrent === null) {
      setErrorMessage("Current SAT score must be between 400 and 1600.");
      return;
    }

    if (targetScore.trim() && normalizedTarget === null) {
      setErrorMessage("Target SAT score must be between 400 and 1600.");
      return;
    }

    setSubmitting(true);
    try {
      const computedFrom = normalizedCurrent ?? 0;
      const computedTo = normalizedTarget ?? 1600;

      await api.waitlist.join({
        email: normalizedEmail,
        current_sat_score: normalizedCurrent,
        target_sat_score: normalizedTarget,
      });

      setSubmittedEmails((prev) => {
        const next = new Set(prev);
        next.add(normalizedEmail);
        return next;
      });
      setSuccessMessage(
        "You're on the list. We'll let you know when ComsOS opens beta access.",
      );
      setCountFrom(computedFrom);
      setCountTo(computedTo);
      setShowScoreModal(true);
      setEmail("");
      setCurrentScore("");
      setTargetScore("");
    } catch (error: any) {
      const message = String(error?.message || "").toLowerCase();
      if (message.includes("already") || message.includes("duplicate") || message.includes("exists") || message.includes("409")) {
        setErrorMessage("This email is already on the waitlist.");
      } else {
        setErrorMessage("Unable to join the waitlist right now. Please try again.");
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className={styles.pageWrap}>
      {showScoreModal ? (
        <div
          className={styles.modalBackdrop}
          role="dialog"
          aria-modal="true"
          aria-labelledby="score-journey-title"
        >
          <div className={styles.modalCard}>
            <h3 id="score-journey-title" className={styles.modalTitle}>
              Your SAT Score Journey Starts Now!
            </h3>
            {successMessage ? <p className={styles.modalSuccess}>{successMessage}</p> : null}
            <CountUp
              from={countFrom}
              to={countTo}
              direction={countFrom > countTo ? "down" : "up"}
              duration={2}
              className={styles.countUpValue}
            />
            <button
              type="button"
              className={styles.modalButton}
              onClick={() => setShowScoreModal(false)}
            >
              Keep Exploring ComsOS
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.particlesLayer} aria-hidden>
        <Particles
          particleColors={particleColors}
          particleCount={120}
          particleSpread={8}
          speed={0.08}
          particleBaseSize={90}
          moveParticlesOnHover
          particleHoverFactor={0.35}
          alphaParticles
          disableRotation={false}
          pixelRatio={1}
        />
      </div>

      <div className={styles.page}>
        <section className={styles.hero}>
          <p className={styles.kicker}>ComsOS SAT</p>
          <h1 className={styles.headline}>
            <DecryptedText
              text="Find the Hidden Weaknesses Holding Back Your SAT Score"
              speed={40}
              maxIterations={14}
              sequential
              revealDirection="center"
              animateOn="view"
              className={styles.decryptedChar}
              encryptedClassName={styles.encryptedChar}
              parentClassName={styles.decryptedTextWrap}
            />
          </h1>
          <p className={styles.subheadline}>
            ComsOS maps SAT concepts into a knowledge graph and identifies the prerequisite gaps causing your mistakes.
          </p>
        </section>

        <section className={styles.graphSection} aria-label="Concept graph example">
          <h2 className={styles.graphTitle}>How ComsOS Finds Root Gaps</h2>
          <div className={styles.graphCard}>
            <div className={styles.conceptNode}>Algebraic Manipulation</div>
            <div className={styles.arrow}>↓</div>
            <div className={styles.conceptNode}>Functions</div>
            <div className={styles.arrow}>↓</div>
            <div className={styles.conceptNode}>Quadratics</div>
            <div className={styles.weaknessBox}>
              <span className={styles.weaknessLabel}>Weakness Found:</span>
              <strong>Algebraic Manipulation</strong>
            </div>
          </div>
        </section>

        <section className={styles.formSection}>
          <h2 className={styles.formTitle}>Join the Waitlist</h2>
          <form className={styles.form} onSubmit={handleSubmit} noValidate>
            <label className={styles.fieldLabel} htmlFor="waitlist-email">
              Email
            </label>
            <input
              id="waitlist-email"
              className={styles.input}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@example.com"
            />

            <label className={styles.fieldLabel} htmlFor="waitlist-current-score">
              Current SAT Score (optional)
            </label>
            <input
              id="waitlist-current-score"
              className={styles.input}
              type="number"
              inputMode="numeric"
              min={400}
              max={1600}
              step={10}
              value={currentScore}
              onChange={(event) => setCurrentScore(event.target.value)}
              placeholder="e.g. 1180"
            />

            <label className={styles.fieldLabel} htmlFor="waitlist-target-score">
              Target SAT Score (optional)
            </label>
            <input
              id="waitlist-target-score"
              className={styles.input}
              type="number"
              inputMode="numeric"
              min={400}
              max={1600}
              step={10}
              value={targetScore}
              onChange={(event) => setTargetScore(event.target.value)}
              placeholder="e.g. 1450"
            />

            <BorderGlow
              className={styles.ctaGlow}
              edgeSensitivity={28}
              glowColor="266 85 72"
              backgroundColor="#101935"
              borderRadius={12}
              glowRadius={26}
              glowIntensity={0.95}
              coneSpread={24}
              animated={false}
              colors={["#a78bfa", "#f472b6", "#38bdf8"]}
              fillOpacity={0.4}
            >
              <button className={styles.cta} type="submit" disabled={submitting}>
                {submitting ? "Joining..." : "Join Waitlist!"}
              </button>
            </BorderGlow>
          </form>

          {errorMessage ? <p className={styles.error}>{errorMessage}</p> : null}
        </section>
      </div>
    </main>
  );
}
