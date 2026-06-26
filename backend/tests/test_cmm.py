from app.services.cmm import Card, SRSModel, User, UserCardState


def test_schedule_respects_min_interval():
    model = SRSModel()
    interval = model.schedule(
        User(user_id="user-1", theta={"math": 0.0}),
        Card(card_id="card-1", beta=1.0, c=0.25),
        UserCardState(S=0.1),
        subject="math",
    )

    assert interval >= model.config.min_interval


def test_review_updates_state_and_card():
    model = SRSModel()
    user = User(user_id="user-1", theta={})
    card = Card(card_id="card-1", beta=0.4, c=0.1)
    state = UserCardState(S=1.0, last_review_time=10.0)

    result = model.review(
        user, card, state, "biology", actual_score=1.0, now_hours=34.0
    )

    assert result["S"] >= model.config.S_min
    assert user.theta["biology"] > 0
    assert card.review_count == 1
    assert state.last_review_time == 34.0
