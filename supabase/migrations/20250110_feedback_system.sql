-- Feedback Learning System
-- Tracks user interactions to improve AI recommendations over time

-- 1. Message-level feedback (thumbs up/down)
CREATE TABLE IF NOT EXISTS feedback_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  message_index INTEGER NOT NULL,
  message_content TEXT NOT NULL,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('positive', 'negative')),
  feedback_reason TEXT, -- Optional: why they liked/disliked it
  chat_type TEXT NOT NULL, -- home, business, restaurant, etc.
  user_session TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Prevent duplicate feedback on same message
  UNIQUE(conversation_id, message_index, user_session)
);

-- 2. Product engagement tracking (clicked, added, ignored, removed)
CREATE TABLE IF NOT EXISTS feedback_products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  message_index INTEGER NOT NULL,
  product_id TEXT NOT NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  product_price DECIMAL(10,2),
  action_type TEXT NOT NULL CHECK (action_type IN ('shown', 'clicked', 'added', 'removed', 'ignored')),
  chat_type TEXT NOT NULL,
  search_query TEXT, -- What query led to this product being shown
  position_in_list INTEGER, -- Where it appeared in suggested products (1-10)
  user_session TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Search quality metrics
CREATE TABLE IF NOT EXISTS feedback_search_quality (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id TEXT NOT NULL,
  message_index INTEGER NOT NULL,
  search_query TEXT NOT NULL,
  chat_type TEXT NOT NULL,
  products_count INTEGER NOT NULL, -- How many products were returned
  products_clicked INTEGER DEFAULT 0, -- How many were clicked
  products_added INTEGER DEFAULT 0, -- How many were added to quote
  user_rephrased BOOLEAN DEFAULT FALSE, -- Did they ask again differently?
  user_complained BOOLEAN DEFAULT FALSE, -- Did they say "where's the X?"
  response_time_ms INTEGER, -- How long the search took
  user_session TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Product performance scores (computed from feedback)
CREATE TABLE IF NOT EXISTS product_performance_scores (
  product_id TEXT PRIMARY KEY,
  product_name TEXT NOT NULL,
  product_sku TEXT NOT NULL,
  times_shown INTEGER DEFAULT 0,
  times_clicked INTEGER DEFAULT 0,
  times_added INTEGER DEFAULT 0,
  times_removed INTEGER DEFAULT 0,
  times_ignored INTEGER DEFAULT 0,
  click_through_rate DECIMAL(5,4), -- clicked / shown
  add_rate DECIMAL(5,4), -- added / shown
  relevance_score DECIMAL(5,4), -- Overall quality score (0-1)
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Conversation quality metrics
CREATE TABLE IF NOT EXISTS feedback_conversations (
  conversation_id TEXT PRIMARY KEY,
  chat_type TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  total_messages INTEGER DEFAULT 0,
  products_added_count INTEGER DEFAULT 0,
  quote_total_value DECIMAL(10,2) DEFAULT 0,
  user_satisfaction TEXT CHECK (user_satisfaction IN ('positive', 'negative', 'neutral')),
  generated_quote BOOLEAN DEFAULT FALSE,
  user_session TEXT
);

-- Indexes for performance
CREATE INDEX idx_feedback_messages_conversation ON feedback_messages(conversation_id);
CREATE INDEX idx_feedback_messages_chat_type ON feedback_messages(chat_type);
CREATE INDEX idx_feedback_messages_created ON feedback_messages(created_at DESC);

CREATE INDEX idx_feedback_products_product ON feedback_products(product_id);
CREATE INDEX idx_feedback_products_conversation ON feedback_products(conversation_id);
CREATE INDEX idx_feedback_products_action ON feedback_products(action_type);
CREATE INDEX idx_feedback_products_chat_type ON feedback_products(chat_type);
CREATE INDEX idx_feedback_products_created ON feedback_products(created_at DESC);

CREATE INDEX idx_feedback_search_conversation ON feedback_search_quality(conversation_id);
CREATE INDEX idx_feedback_search_chat_type ON feedback_search_quality(chat_type);
CREATE INDEX idx_feedback_search_created ON feedback_search_quality(created_at DESC);

CREATE INDEX idx_product_scores_relevance ON product_performance_scores(relevance_score DESC);
CREATE INDEX idx_product_scores_add_rate ON product_performance_scores(add_rate DESC);

CREATE INDEX idx_feedback_conversations_chat_type ON feedback_conversations(chat_type);
CREATE INDEX idx_feedback_conversations_started ON feedback_conversations(started_at DESC);

-- Function to update product performance scores
CREATE OR REPLACE FUNCTION update_product_performance_score(p_product_id TEXT)
RETURNS VOID AS $$
DECLARE
  v_shown INTEGER;
  v_clicked INTEGER;
  v_added INTEGER;
  v_removed INTEGER;
  v_ignored INTEGER;
  v_ctr DECIMAL(5,4);
  v_add_rate DECIMAL(5,4);
  v_relevance DECIMAL(5,4);
BEGIN
  -- Count actions for this product
  SELECT
    COUNT(*) FILTER (WHERE action_type = 'shown'),
    COUNT(*) FILTER (WHERE action_type = 'clicked'),
    COUNT(*) FILTER (WHERE action_type = 'added'),
    COUNT(*) FILTER (WHERE action_type = 'removed'),
    COUNT(*) FILTER (WHERE action_type = 'ignored')
  INTO v_shown, v_clicked, v_added, v_removed, v_ignored
  FROM feedback_products
  WHERE product_id = p_product_id;

  -- Calculate rates
  IF v_shown > 0 THEN
    v_ctr := v_clicked::DECIMAL / v_shown;
    v_add_rate := v_added::DECIMAL / v_shown;
  ELSE
    v_ctr := 0;
    v_add_rate := 0;
  END IF;

  -- Calculate relevance score (weighted formula)
  -- Formula: (add_rate * 0.6) + (ctr * 0.3) - (remove_penalty * 0.1)
  v_relevance := (v_add_rate * 0.6) + (v_ctr * 0.3) - (LEAST(v_removed::DECIMAL / GREATEST(v_shown, 1), 0.5) * 0.1);
  v_relevance := GREATEST(0, LEAST(1, v_relevance)); -- Clamp between 0 and 1

  -- Upsert into scores table
  INSERT INTO product_performance_scores (
    product_id,
    product_name,
    product_sku,
    times_shown,
    times_clicked,
    times_added,
    times_removed,
    times_ignored,
    click_through_rate,
    add_rate,
    relevance_score,
    last_updated
  )
  SELECT
    p_product_id,
    product_name,
    product_sku,
    v_shown,
    v_clicked,
    v_added,
    v_removed,
    v_ignored,
    v_ctr,
    v_add_rate,
    v_relevance,
    NOW()
  FROM feedback_products
  WHERE product_id = p_product_id
  LIMIT 1
  ON CONFLICT (product_id)
  DO UPDATE SET
    times_shown = v_shown,
    times_clicked = v_clicked,
    times_added = v_added,
    times_removed = v_removed,
    times_ignored = v_ignored,
    click_through_rate = v_ctr,
    add_rate = v_add_rate,
    relevance_score = v_relevance,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update scores when feedback is added
CREATE OR REPLACE FUNCTION trigger_update_product_score()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM update_product_performance_score(NEW.product_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER after_feedback_product_insert
AFTER INSERT ON feedback_products
FOR EACH ROW
EXECUTE FUNCTION trigger_update_product_score();

-- Grant permissions
GRANT ALL ON feedback_messages TO authenticated, service_role;
GRANT ALL ON feedback_products TO authenticated, service_role;
GRANT ALL ON feedback_search_quality TO authenticated, service_role;
GRANT ALL ON product_performance_scores TO authenticated, service_role;
GRANT ALL ON feedback_conversations TO authenticated, service_role;

-- Comments
COMMENT ON TABLE feedback_messages IS 'Tracks thumbs up/down feedback on AI messages';
COMMENT ON TABLE feedback_products IS 'Tracks all product interactions (shown, clicked, added, removed)';
COMMENT ON TABLE feedback_search_quality IS 'Measures search effectiveness per query';
COMMENT ON TABLE product_performance_scores IS 'Computed scores for each product based on user engagement';
COMMENT ON TABLE feedback_conversations IS 'Overall conversation quality metrics';
