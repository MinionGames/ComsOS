# ComsOS Memory Model (CMM)
# A custom SRS algorithm inspired by human memory research,
# designed for optimal long-term retention and personalized scheduling.
from dataclasses import dataclass, field
from typing import Dict, Optional
import math
import time
import numpy as np

# =========================
# Utility Functions
# =========================


def sigmoid(x: float) -> float:
    # numerically stable sigmoid
    if x >= 0:
        z = math.exp(-x)
        return 1 / (1 + z)
    else:
        z = math.exp(x)
        return z / (1 + z)


def logit(p: float) -> float:
    p = min(max(p, 1e-6), 1 - 1e-6)
    return math.log(p / (1 - p))


def clamp(x: float, lo: float, hi: float) -> float:
    return max(lo, min(hi, x))


# =========================
# Hyperparameters (tunable)
# =========================


@dataclass
class SRSConfig:
    # Stability dynamics
    # Success function: Sn = Sn-1 * (1 + a * (1 - P) * (Sn-1^alpha))
    # Failure function: Sn = Sn-1 * (1 - b * P)
    a: float = 0.3
    b: float = 0.5
    alpha: float = 0.3

    # Learning rates
    eta_theta: float = 0.05
    eta_beta: float = 0.01
    eta_c: float = 0.005

    # Guessing
    c_max: float = 0.25  # Guessing parameter (0-0.25)

    # Time
    t_min: float = 0.1  # hours
    min_interval: float = 1.0  # hours
    max_interval: float = 8760.0  # hours (1 year)

    # Retention target
    target_retention: float = 0.9  # Desired retention rate

    # Beta initialization weights
    w_ai: float = 0.2
    w_neighbor: float = 0.6
    w_default: float = 0.2

    # Early learning boost
    early_review_threshold: int = 20
    early_eta_beta_multiplier: float = 3.0

    # Stability floor
    S_min: float = 0.1


# =========================
# Data Models
# =========================


@dataclass
class Card:
    card_id: str
    beta: float = 0.5
    c: float = 0.1
    embedding: Optional[np.ndarray] = None
    review_count: int = 0


@dataclass
class User:
    user_id: str
    theta: Dict[str, float] = field(default_factory=dict)  # subject -> ability


@dataclass
class UserCardState:
    S: float = 1.0
    last_review_time: float = field(default_factory=lambda: time.time() / 3600.0)


# =========================
# Embedding / AI Hooks
# =========================


class DifficultyInitializer:
    """
    Plug in your AI + embedding system here.
    """

    def __init__(self, embedding_index=None):
        self.embedding_index = embedding_index  # e.g. FAISS index

    def ai_estimate(self, text: str) -> float:
        """
        Replace with LLM call.
        Return value in [0, 1]
        """
        return 0.5  # fallback

    def neighbor_estimate(self, embedding: np.ndarray, k: int = 20) -> float:
        if self.embedding_index is None:
            return 0.5

        neighbors = self.embedding_index.search(embedding, k)
        if not neighbors:
            return 0.5

        betas = [n.beta for n in neighbors]
        return float(np.mean(betas))

    def initialize_beta(
        self, text: str, embedding: Optional[np.ndarray], config: SRSConfig
    ) -> float:
        beta_ai = self.ai_estimate(text)
        beta_neighbor = (
            self.neighbor_estimate(embedding) if embedding is not None else 0.5
        )

        beta = (
            config.w_ai * beta_ai
            + config.w_neighbor * beta_neighbor
            + config.w_default * 0.5
        )

        return clamp(beta, 0.0, 1.0)


# =========================
# Core Model
# =========================


class SRSModel:
    def __init__(self, config: Optional[SRSConfig] = None):
        self.config = config or SRSConfig()

    def predict_recall(
        self, theta: float, beta: float, S: float, t: float, c: float
    ) -> float:
        t = max(self.config.t_min, t)
        x = theta - beta + math.log(S) - math.log(t)
        return c + (1 - c) * sigmoid(x)

    def review(
        self,
        user: User,
        card: Card,
        state: UserCardState,
        subject: str,
        actual_score: float,  # 0 → 1
        now_hours: Optional[float] = None,
    ):
        now = now_hours if now_hours is not None else time.time() / 3600.0

        theta = user.theta.get(subject, 0.0)
        beta = card.beta
        S = state.S
        c = card.c

        t = max(self.config.t_min, now - state.last_review_time)

        # --- Prediction ---
        P = self.predict_recall(theta, beta, S, t, c)

        error = actual_score - P

        # --- Stability update (asymmetric) ---
        if actual_score > 0.5:
            S_new = S * (1 + self.config.a * (1 - P) * (S**self.config.alpha))
        else:
            S_new = S * (1 - self.config.b * P)

        S_new = max(self.config.S_min, S_new)

        # --- Ability update ---
        theta_new = theta + self.config.eta_theta * error

        # --- Difficulty update (ability-aware) ---
        eta_beta = self.config.eta_beta
        if card.review_count < self.config.early_review_threshold:
            eta_beta *= self.config.early_eta_beta_multiplier

        weight = 1 / (1 + math.exp(theta - beta))
        beta_new = beta - eta_beta * weight * error
        beta_new = clamp(beta_new, 0.0, 1.0)

        # --- Guessing update (optional) ---
        # Only update if guessing likely (e.g., low latency / MCQ flag)
        c_new = c + self.config.eta_c * (actual_score - c)
        c_new = clamp(c_new, 0.0, self.config.c_max)

        # --- Save ---
        state.S = S_new
        state.last_review_time = now

        user.theta[subject] = theta_new
        card.beta = beta_new
        card.c = c_new
        card.review_count += 1

        return {
            "predicted": P,
            "error": error,
            "S": S_new,
            "theta": theta_new,
            "beta": beta_new,
            "c": c_new,
        }

    def schedule(
        self, user: User, card: Card, state: UserCardState, subject: str
    ) -> float:
        theta = user.theta.get(subject, 0.0)
        beta = card.beta
        S = state.S
        c = card.c

        target = self.config.target_retention

        # Adjust for guessing
        P_adj = (target - c) / (1 - c)
        P_adj = clamp(P_adj, 1e-6, 1 - 1e-6)

        logit_val = logit(P_adj)

        t_next = S * math.exp(theta - beta - logit_val)
        t_next = max(self.config.min_interval, t_next)

        return t_next
