-- Migration: Add new features for dropletter
-- Features: Organizations, Subscriptions, Share Links, PDF Comments, Activity Logs, Human Review

-- ============================================
-- 1. USER PROFILES (extends auth.users)
-- ============================================
CREATE TABLE IF NOT EXISTS user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Profile info
  display_name TEXT,
  avatar_url TEXT,

  -- Subscription info
  plan TEXT DEFAULT 'free' CHECK (plan IN ('free', 'pro')),
  free_checks_used INT DEFAULT 0,

  -- Stripe
  stripe_customer_id TEXT UNIQUE
);

CREATE INDEX IF NOT EXISTS idx_user_profiles_stripe_customer_id ON user_profiles(stripe_customer_id);

-- ============================================
-- 2. ORGANIZATIONS (teams)
-- ============================================
CREATE TABLE IF NOT EXISTS organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,

  -- Owner
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Settings
  settings JSONB DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_organizations_owner_id ON organizations(owner_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON organizations(slug);

-- Organization members
CREATE TABLE IF NOT EXISTS organization_members (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  role TEXT DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),

  UNIQUE(organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);

-- ============================================
-- 3. SUBSCRIPTIONS (Stripe)
-- ============================================
CREATE TABLE IF NOT EXISTS subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Stripe info
  stripe_subscription_id TEXT UNIQUE,
  stripe_price_id TEXT,

  -- Status
  status TEXT DEFAULT 'inactive' CHECK (status IN ('active', 'inactive', 'canceled', 'past_due')),

  -- Period
  current_period_start TIMESTAMPTZ,
  current_period_end TIMESTAMPTZ,
  cancel_at_period_end BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_user_id ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_stripe_id ON subscriptions(stripe_subscription_id);

-- ============================================
-- 4. SHARE LINKS
-- ============================================
CREATE TABLE IF NOT EXISTS share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Report reference
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,

  -- Creator
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Token for URL
  token TEXT UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),

  -- Expiration (7 days default)
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '7 days'),

  -- Access control
  require_auth BOOLEAN DEFAULT TRUE,

  -- Tracking
  view_count INT DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_share_links_report_id ON share_links(report_id);
CREATE INDEX IF NOT EXISTS idx_share_links_token ON share_links(token);
CREATE INDEX IF NOT EXISTS idx_share_links_expires_at ON share_links(expires_at);

-- ============================================
-- 5. PDF COMMENTS (pin-style)
-- ============================================
CREATE TABLE IF NOT EXISTS pdf_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Report reference
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,

  -- Author
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Position on PDF
  page_number INT NOT NULL,
  x_position FLOAT NOT NULL, -- percentage from left (0-100)
  y_position FLOAT NOT NULL, -- percentage from top (0-100)

  -- Content
  content TEXT NOT NULL,

  -- Thread support (replies)
  parent_id UUID REFERENCES pdf_comments(id) ON DELETE CASCADE,

  -- Status
  is_resolved BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_pdf_comments_report_id ON pdf_comments(report_id);
CREATE INDEX IF NOT EXISTS idx_pdf_comments_user_id ON pdf_comments(user_id);
CREATE INDEX IF NOT EXISTS idx_pdf_comments_parent_id ON pdf_comments(parent_id);

-- ============================================
-- 6. ACTIVITY LOGS (history)
-- ============================================
CREATE TABLE IF NOT EXISTS activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),

  -- Who
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,

  -- What
  action_type TEXT NOT NULL,
  -- Types: 'report.created', 'report.viewed', 'report.shared',
  --        'comment.added', 'comment.resolved',
  --        'human_review.requested', 'human_review.completed',
  --        'subscription.started', 'subscription.canceled'

  -- Target
  target_type TEXT, -- 'report', 'comment', 'share_link', 'human_review'
  target_id UUID,

  -- Details
  metadata JSONB DEFAULT '{}'::jsonb,

  -- IP for audit
  ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_user_id ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_org_id ON activity_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_action_type ON activity_logs(action_type);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_logs_target ON activity_logs(target_type, target_id);

-- ============================================
-- 7. EXPERTS (for human review)
-- ============================================
CREATE TABLE IF NOT EXISTS experts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- User link (if registered)
  user_id UUID UNIQUE REFERENCES auth.users(id) ON DELETE SET NULL,

  -- Profile
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  title TEXT, -- e.g., '弁護士', '行政書士'
  specialties TEXT[], -- e.g., ['契約書', '労務', '知財']
  bio TEXT,

  -- Verification
  is_verified BOOLEAN DEFAULT FALSE,
  verification_documents JSONB DEFAULT '[]'::jsonb,

  -- Availability
  is_available BOOLEAN DEFAULT TRUE,
  max_concurrent_reviews INT DEFAULT 5,

  -- Stats
  total_reviews INT DEFAULT 0,
  average_rating FLOAT,

  -- Payout
  stripe_account_id TEXT -- for Connect payouts
);

CREATE INDEX IF NOT EXISTS idx_experts_user_id ON experts(user_id);
CREATE INDEX IF NOT EXISTS idx_experts_is_available ON experts(is_available);
CREATE INDEX IF NOT EXISTS idx_experts_specialties ON experts USING GIN(specialties);

-- ============================================
-- 8. HUMAN REVIEW REQUESTS
-- ============================================
CREATE TABLE IF NOT EXISTS human_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Report reference
  report_id UUID NOT NULL REFERENCES reports(id) ON DELETE CASCADE,

  -- Requester
  requester_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  -- Expert assignment
  expert_id UUID REFERENCES experts(id) ON DELETE SET NULL,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN (
    'pending',      -- waiting for expert assignment
    'assigned',     -- expert assigned
    'in_progress',  -- expert working on it
    'completed',    -- review done
    'canceled'      -- canceled by requester
  )),

  -- Request details
  notes TEXT, -- user notes to expert
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('normal', 'urgent')),

  -- SLA tracking
  due_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '24 hours'),

  -- Expert response
  expert_comments TEXT,
  expert_rating INT CHECK (expert_rating BETWEEN 1 AND 5),
  completed_at TIMESTAMPTZ,

  -- Payment
  amount_cents INT DEFAULT 300000, -- 3000 JPY in cents
  payment_status TEXT DEFAULT 'pending' CHECK (payment_status IN ('pending', 'paid', 'refunded')),
  stripe_payment_intent_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_human_reviews_report_id ON human_review_requests(report_id);
CREATE INDEX IF NOT EXISTS idx_human_reviews_requester_id ON human_review_requests(requester_id);
CREATE INDEX IF NOT EXISTS idx_human_reviews_expert_id ON human_review_requests(expert_id);
CREATE INDEX IF NOT EXISTS idx_human_reviews_status ON human_review_requests(status);
CREATE INDEX IF NOT EXISTS idx_human_reviews_due_at ON human_review_requests(due_at);

-- ============================================
-- 9. ADD organization_id TO REPORTS
-- ============================================
ALTER TABLE reports ADD COLUMN IF NOT EXISTS organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_reports_org_id ON reports(organization_id);

-- ============================================
-- 10. RLS POLICIES
-- ============================================

-- User Profiles
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own profile" ON user_profiles
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Organizations
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view organization" ON organizations
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = organizations.id
      AND organization_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Owner can update organization" ON organizations
  FOR UPDATE USING (owner_id = auth.uid());

CREATE POLICY "Authenticated users can create organizations" ON organizations
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL AND owner_id = auth.uid());

-- Organization Members
ALTER TABLE organization_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Members can view members" ON organization_members
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM organization_members AS om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage members" ON organization_members
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM organization_members AS om
      WHERE om.organization_id = organization_members.organization_id
      AND om.user_id = auth.uid()
      AND om.role IN ('owner', 'admin')
    )
  );

-- Subscriptions
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own subscription" ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

-- Share Links
ALTER TABLE share_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view share links by token" ON share_links
  FOR SELECT USING (true);

CREATE POLICY "Users can create share links" ON share_links
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Users can delete own share links" ON share_links
  FOR DELETE USING (auth.uid() = created_by);

-- PDF Comments
ALTER TABLE pdf_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view pdf comments" ON pdf_comments
  FOR SELECT USING (true);

CREATE POLICY "Users can create pdf comments" ON pdf_comments
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own pdf comments" ON pdf_comments
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own pdf comments" ON pdf_comments
  FOR DELETE USING (auth.uid() = user_id);

-- Activity Logs
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own activity" ON activity_logs
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Members can view org activity" ON activity_logs
  FOR SELECT USING (
    organization_id IS NOT NULL AND
    EXISTS (
      SELECT 1 FROM organization_members
      WHERE organization_members.organization_id = activity_logs.organization_id
      AND organization_members.user_id = auth.uid()
    )
  );

-- Service role can insert activity logs (from API routes)
CREATE POLICY "Service can insert activity logs" ON activity_logs
  FOR INSERT WITH CHECK (true);

-- Experts
ALTER TABLE experts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view available experts" ON experts
  FOR SELECT USING (is_available = true AND is_verified = true);

CREATE POLICY "Experts can update own profile" ON experts
  FOR UPDATE USING (auth.uid() = user_id);

-- Human Review Requests
ALTER TABLE human_review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own review requests" ON human_review_requests
  FOR SELECT USING (auth.uid() = requester_id);

CREATE POLICY "Experts can view assigned requests" ON human_review_requests
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM experts
      WHERE experts.id = human_review_requests.expert_id
      AND experts.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create review requests" ON human_review_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

CREATE POLICY "Users can cancel own requests" ON human_review_requests
  FOR UPDATE USING (auth.uid() = requester_id AND status = 'pending');

-- ============================================
-- 11. UPDATE TRIGGERS
-- ============================================
CREATE TRIGGER user_profiles_updated_at
  BEFORE UPDATE ON user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER organizations_updated_at
  BEFORE UPDATE ON organizations
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER pdf_comments_updated_at
  BEFORE UPDATE ON pdf_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER experts_updated_at
  BEFORE UPDATE ON experts
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER human_review_requests_updated_at
  BEFORE UPDATE ON human_review_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- ============================================
-- 12. HELPER FUNCTIONS
-- ============================================

-- Function to check if user has active subscription
CREATE OR REPLACE FUNCTION has_active_subscription(uid UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM subscriptions
    WHERE user_id = uid
    AND status = 'active'
    AND current_period_end > NOW()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to check if user can use free check
CREATE OR REPLACE FUNCTION can_use_free_check(uid UUID)
RETURNS BOOLEAN AS $$
DECLARE
  checks_used INT;
BEGIN
  SELECT COALESCE(free_checks_used, 0) INTO checks_used
  FROM user_profiles WHERE id = uid;

  RETURN checks_used < 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to increment free checks used
CREATE OR REPLACE FUNCTION increment_free_checks(uid UUID)
RETURNS VOID AS $$
BEGIN
  INSERT INTO user_profiles (id, free_checks_used)
  VALUES (uid, 1)
  ON CONFLICT (id) DO UPDATE
  SET free_checks_used = user_profiles.free_checks_used + 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log activity
CREATE OR REPLACE FUNCTION log_activity(
  p_user_id UUID,
  p_org_id UUID,
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_ip_address INET DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO activity_logs (user_id, organization_id, action_type, target_type, target_id, metadata, ip_address)
  VALUES (p_user_id, p_org_id, p_action_type, p_target_type, p_target_id, p_metadata, p_ip_address)
  RETURNING id INTO log_id;

  RETURN log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
