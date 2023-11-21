CREATE TABLE IF NOT EXISTS players (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS locations (
    id INTEGER PRIMARY KEY,
    name TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS matches (
    id TEXT PRIMARY KEY,
    started_at BIGINT,
    ended_at BIGINT,
    entered_at BIGINT,
    location_id INTEGER REFERENCES locations(id),
    buy_in INTEGER,
    players_count INTEGER NOT NULL,
    chips_count INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS players_matches (
    player_id INTEGER REFERENCES players(id),
    match_id TEXT REFERENCES matches(id),
    final_chips_count INTEGER,
    money_earned INTEGER,
    profit INTEGER,
    PRIMARY KEY (player_id, match_id)
);

CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY,
    num INTEGER NOT NULL,
    min_bet INTEGER NOT NULL,
    dealer_id INTEGER REFERENCES players(id),
    match_id INTEGER REFERENCES matches(id),
    winner_id INTEGER REFERENCES players(id),
    split_winner_id INTEGER REFERENCES players(id),
    winning_hand TEXT NOT NULL,
    winning_hand_rank INTEGER NOT NULL
);