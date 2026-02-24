"""
Unit tests for the emotion scoring formulas.
Run with: python -m pytest test_scoring.py -v
"""


def compute_scores(joy=0.0, sadness=0.0, anger=0.0, fear=0.0,
                   disgust=0.0, surprise=0.0, neutral=0.0, contempt=0.0):
    """
    Mirrors the improved scoring logic from analysis.py.
    Returns dict with confidence, clarity, engagement, resilience in [0, 1].
    """
    # Confidence
    pos_conf = neutral * 0.5 + joy * 0.5
    neg_conf = fear * 0.4 + sadness * 0.3 + anger * 0.3
    confidence = pos_conf / max(pos_conf + neg_conf, 0.01)

    # Clarity
    pos_clar = neutral * 0.6 + joy * 0.2
    neg_clar = surprise * 0.3 + anger * 0.35 + fear * 0.35
    clarity = pos_clar / max(pos_clar + neg_clar, 0.01)

    # Engagement
    expressive = joy * 0.5 + surprise * 0.25 + anger * 0.1 + fear * 0.05 + sadness * 0.1
    flat = neutral * 1.0
    engagement = expressive / max(expressive + flat * 0.5, 0.01)

    # Resilience
    distress = fear * 0.35 + sadness * 0.30 + disgust * 0.20 + contempt * 0.15
    composure = 1.0 - min(distress * 2.5, 1.0)
    resilience = composure

    return {
        "confidence": max(0.0, min(confidence, 1.0)),
        "clarity": max(0.0, min(clarity, 1.0)),
        "engagement": max(0.0, min(engagement, 1.0)),
        "resilience": max(0.0, min(resilience, 1.0)),
    }


class TestScoringFormulas:
    """Validates that the improved formulas produce differentiated, sensible scores."""

    def test_calm_interview(self):
        """Typical calm interview: high neutral + moderate joy."""
        s = compute_scores(neutral=0.45, joy=0.25, surprise=0.10,
                           anger=0.05, fear=0.05, sadness=0.05,
                           disgust=0.03, contempt=0.02)
        assert s["confidence"] > 0.65, f"Confidence too low: {s['confidence']:.2f}"
        assert s["clarity"] > 0.55, f"Clarity too low: {s['clarity']:.2f}"
        assert s["resilience"] > 0.75, f"Resilience too low: {s['resilience']:.2f}"
        # All scores should be meaningfully different from 0 and 1
        for k, v in s.items():
            assert 0.05 < v < 0.99, f"{k} at extreme: {v:.2f}"

    def test_animated_speaker(self):
        """Expressive speaker: lots of joy + surprise, low neutral."""
        s = compute_scores(joy=0.35, surprise=0.25, neutral=0.15,
                           anger=0.08, fear=0.05, sadness=0.05,
                           disgust=0.04, contempt=0.03)
        assert s["engagement"] > 0.60, f"Engagement too low for animated speaker: {s['engagement']:.2f}"
        assert s["clarity"] > 0.30, f"Clarity collapsed unfairly: {s['clarity']:.2f}"
        assert s["confidence"] > 0.50, f"Confidence too low: {s['confidence']:.2f}"

    def test_stressed_response(self):
        """Stressed candidate: elevated fear/sadness but still functional."""
        s = compute_scores(neutral=0.20, joy=0.10, fear=0.20,
                           sadness=0.20, anger=0.10, surprise=0.10,
                           disgust=0.05, contempt=0.05)
        assert s["confidence"] < 0.55, f"Confidence should be lower: {s['confidence']:.2f}"
        assert s["resilience"] < 0.70, f"Resilience should reflect stress: {s['resilience']:.2f}"
        # But nothing should be at absolute 0
        for k, v in s.items():
            assert v > 0.01, f"{k} collapsed to zero: {v:.2f}"

    def test_all_zeros(self):
        """Edge case: no emotion data. Should not crash or produce NaN."""
        s = compute_scores()
        for k, v in s.items():
            assert 0.0 <= v <= 1.0, f"{k} out of range: {v}"
            assert v == v, f"{k} is NaN"  # NaN != NaN

    def test_pure_neutral(self):
        """100% neutral face — high clarity/confidence, low engagement."""
        s = compute_scores(neutral=1.0)
        assert s["confidence"] > 0.90, f"Pure neutral should be high confidence: {s['confidence']:.2f}"
        assert s["clarity"] > 0.90, f"Pure neutral should be high clarity: {s['clarity']:.2f}"
        assert s["engagement"] < 0.15, f"Pure neutral should be low engagement: {s['engagement']:.2f}"
        assert s["resilience"] > 0.95, f"Pure neutral should be high resilience: {s['resilience']:.2f}"

    def test_pure_joy(self):
        """100% joy — high confidence/engagement, reasonable clarity."""
        s = compute_scores(joy=1.0)
        assert s["confidence"] > 0.90, f"Joy should give high confidence: {s['confidence']:.2f}"
        assert s["engagement"] > 0.90, f"Joy should give high engagement: {s['engagement']:.2f}"
        assert s["clarity"] > 0.50, f"Joy should give decent clarity: {s['clarity']:.2f}"

    def test_scores_in_range(self):
        """All scores must be in [0.0, 1.0] across various distributions."""
        import random
        random.seed(42)
        for _ in range(100):
            vals = [random.random() for _ in range(8)]
            total = sum(vals)
            normed = [v / total for v in vals]  # proportions summing to 1
            s = compute_scores(
                joy=normed[0], sadness=normed[1], anger=normed[2],
                fear=normed[3], disgust=normed[4], surprise=normed[5],
                neutral=normed[6], contempt=normed[7]
            )
            for k, v in s.items():
                assert 0.0 <= v <= 1.0, f"{k} out of range ({v:.4f}) with input {normed}"
