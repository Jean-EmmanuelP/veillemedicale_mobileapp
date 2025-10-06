-- WARNING: This schema is for context only and is not meant to be run.
-- Table order and constraints may not be valid for execution.

CREATE TABLE public.article_disciplines (
  article_id integer NOT NULL,
  discipline_id integer NOT NULL,
  CONSTRAINT article_disciplines_pkey PRIMARY KEY (discipline_id, article_id),
  CONSTRAINT article_disciplines_discipline_id_fkey FOREIGN KEY (discipline_id) REFERENCES public.disciplines(id),
  CONSTRAINT article_disciplines_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id)
);
CREATE TABLE public.article_likes (
  id integer NOT NULL DEFAULT nextval('article_likes_id_seq'::regclass),
  article_id integer NOT NULL,
  user_id uuid NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT article_likes_pkey PRIMARY KEY (id),
  CONSTRAINT article_likes_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id),
  CONSTRAINT article_likes_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.article_read (
  user_id uuid NOT NULL,
  article_id integer NOT NULL,
  read_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT article_read_pkey PRIMARY KEY (article_id, user_id),
  CONSTRAINT article_read_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT article_read_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id)
);
CREATE TABLE public.article_sent_history (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid NOT NULL,
  article_id integer NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  discipline text,
  sub_discipline text,
  is_article_of_the_day boolean DEFAULT false,
  CONSTRAINT article_sent_history_pkey PRIMARY KEY (id),
  CONSTRAINT article_sent_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT article_sent_history_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id)
);
CREATE TABLE public.article_sub_disciplines (
  article_id integer NOT NULL,
  sub_discipline_id integer NOT NULL,
  CONSTRAINT article_sub_disciplines_pkey PRIMARY KEY (sub_discipline_id, article_id),
  CONSTRAINT article_sub_disciplines_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id),
  CONSTRAINT article_sub_disciplines_sub_discipline_id_fkey FOREIGN KEY (sub_discipline_id) REFERENCES public.sub_disciplines(id)
);
CREATE TABLE public.article_thumbs_up (
  user_id uuid NOT NULL,
  article_id integer NOT NULL,
  thumbed_up_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT article_thumbs_up_pkey PRIMARY KEY (article_id, user_id),
  CONSTRAINT article_thumbs_up_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id),
  CONSTRAINT article_thumbs_up_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.articles (
  id integer NOT NULL DEFAULT nextval('articles_id_seq'::regclass),
  title text NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
  published_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  link text UNIQUE,
  grade text DEFAULT 'A'::text,
  journal text DEFAULT 'Inconnu'::text,
  graded_yet text NOT NULL DEFAULT 'FALSE'::text,
  reclassification_status text DEFAULT 'pending'::text,
  is_recommandation boolean NOT NULL DEFAULT false,
  like_count integer NOT NULL DEFAULT 0,
  read_count integer NOT NULL DEFAULT 0,
  thumbs_up_count integer NOT NULL DEFAULT 0,
  discipline_ids ARRAY,
  sub_discipline_ids ARRAY,
  check_recommandation boolean DEFAULT false,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_by uuid,
  audio_url text,
  CONSTRAINT articles_pkey PRIMARY KEY (id),
  CONSTRAINT articles_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id)
);
CREATE TABLE public.comments (
  id integer NOT NULL DEFAULT nextval('comments_id_seq'::regclass),
  article_id integer NOT NULL,
  user_id uuid NOT NULL,
  content text NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT comments_pkey PRIMARY KEY (id),
  CONSTRAINT comments_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id),
  CONSTRAINT comments_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.committee_applications (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  first_name text NOT NULL,
  last_name text NOT NULL,
  status text NOT NULL,
  specialty text NOT NULL,
  sub_specialty text,
  practice_center text NOT NULL,
  CONSTRAINT committee_applications_pkey PRIMARY KEY (id),
  CONSTRAINT committee_applications_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.committee_referents (
  specialty text NOT NULL,
  name text NOT NULL,
  title text,
  affiliation text,
  focus text,
  emoji text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  CONSTRAINT committee_referents_pkey PRIMARY KEY (id)
);
CREATE TABLE public.disciplines (
  id integer NOT NULL DEFAULT nextval('disciplines_id_seq'::regclass),
  name text NOT NULL UNIQUE,
  CONSTRAINT disciplines_pkey PRIMARY KEY (id)
);
CREATE TABLE public.donations (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid,
  stripe_payment_intent_id text NOT NULL UNIQUE,
  amount integer NOT NULL,
  currency text NOT NULL,
  status text NOT NULL,
  stripe_event_id text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT donations_pkey PRIMARY KEY (id),
  CONSTRAINT donations_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.feedback (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_id uuid,
  created_at timestamp with time zone NOT NULL DEFAULT timezone('utc'::text, now()),
  content_useful text,
  format_suitable text,
  desired_features text,
  willing_to_pay text,
  price_suggestion text,
  reason_not_to_pay text,
  improvements text,
  CONSTRAINT feedback_pkey PRIMARY KEY (id),
  CONSTRAINT feedback_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.notification_history (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  sent_at timestamp with time zone NOT NULL DEFAULT now(),
  type text NOT NULL,
  CONSTRAINT notification_history_pkey PRIMARY KEY (id),
  CONSTRAINT notification_history_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.saved_articles (
  id integer NOT NULL DEFAULT nextval('saved_articles_id_seq'::regclass),
  user_id uuid NOT NULL,
  article_id integer NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  CONSTRAINT saved_articles_pkey PRIMARY KEY (id),
  CONSTRAINT saved_articles_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.user_profiles(id),
  CONSTRAINT saved_articles_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id)
);
CREATE TABLE public.showed_articles (
  id integer NOT NULL DEFAULT nextval('showed_articles_id_seq'::regclass),
  article_id integer NOT NULL,
  added_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  is_article_of_the_day boolean DEFAULT false,
  title text,
  content text,
  journal text,
  published_at timestamp with time zone,
  link text,
  grade text,
  CONSTRAINT showed_articles_pkey PRIMARY KEY (id),
  CONSTRAINT showed_articles_article_id_fkey FOREIGN KEY (article_id) REFERENCES public.articles(id)
);
CREATE TABLE public.stripe_subscription_payments (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_profile_id uuid NOT NULL,
  user_profile_subscription_id bigint NOT NULL,
  stripe_invoice_id text UNIQUE,
  stripe_payment_intent_id text UNIQUE,
  stripe_charge_id text UNIQUE,
  stripe_subscription_id text NOT NULL,
  amount_paid integer NOT NULL,
  currency character varying NOT NULL,
  status text NOT NULL,
  paid_at timestamp with time zone,
  invoice_pdf_url text,
  hosted_invoice_url text,
  billing_reason text,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT stripe_subscription_payments_pkey PRIMARY KEY (id),
  CONSTRAINT stripe_subscription_payments_user_profile_subscription_id_fkey FOREIGN KEY (user_profile_subscription_id) REFERENCES public.user_profile_subscriptions(id),
  CONSTRAINT stripe_subscription_payments_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.sub_disciplines (
  id integer NOT NULL DEFAULT nextval('sub_disciplines_id_seq'::regclass),
  name text NOT NULL,
  discipline_id integer NOT NULL,
  CONSTRAINT sub_disciplines_pkey PRIMARY KEY (id),
  CONSTRAINT sub_disciplines_discipline_id_fkey FOREIGN KEY (discipline_id) REFERENCES public.disciplines(id)
);
CREATE TABLE public.subscriptions (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_profile_id uuid NOT NULL,
  plan text NOT NULL CHECK (plan = ANY (ARRAY['basic'::text, 'standard'::text, 'premium'::text])),
  duration interval NOT NULL CHECK (duration = ANY (ARRAY['1 mon'::interval, '4 mons'::interval, '1 year'::interval])),
  start_date timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  end_date timestamp with time zone,
  status text NOT NULL DEFAULT 'active'::text CHECK (status = ANY (ARRAY['active'::text, 'expired'::text, 'canceled'::text])),
  created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT subscriptions_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_grade_preferences (
  user_id uuid NOT NULL,
  grade text NOT NULL CHECK (grade = ANY (ARRAY['A'::text, 'B'::text, 'C'::text, 'R'::text])),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_grade_preferences_pkey PRIMARY KEY (grade, user_id),
  CONSTRAINT user_grade_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_profile_subscriptions (
  id bigint GENERATED ALWAYS AS IDENTITY NOT NULL,
  user_profile_id uuid NOT NULL,
  stripe_customer_id text NOT NULL,
  stripe_subscription_id text NOT NULL UNIQUE,
  stripe_price_id text NOT NULL,
  status text NOT NULL,
  current_period_start timestamp with time zone NOT NULL,
  current_period_end timestamp with time zone NOT NULL,
  cancel_at_period_end boolean NOT NULL DEFAULT false,
  canceled_at timestamp with time zone,
  trial_start timestamp with time zone,
  trial_end timestamp with time zone,
  metadata jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_profile_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT user_profile_subscriptions_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_profiles (
  id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  email text NOT NULL,
  notification_frequency USER-DEFINED NOT NULL,
  disciplines ARRAY NOT NULL,
  date_of_birth date,
  specialty text,
  status text,
  last_notification_sent_date timestamp with time zone,
  minimum_grade_notification text NOT NULL DEFAULT 'C'::text,
  feedback_modal timestamp with time zone,
  has_seen_tooltip boolean NOT NULL DEFAULT false,
  stripe_customer_id text UNIQUE,
  tooltip_time timestamp with time zone,
  is_admin boolean NOT NULL DEFAULT false,
  has_all_power boolean NOT NULL DEFAULT false,
  CONSTRAINT user_profiles_pkey PRIMARY KEY (id),
  CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id)
);
CREATE TABLE public.user_push_tokens (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  user_profile_id uuid NOT NULL,
  push_token text NOT NULL,
  device_type text,
  expo_push_token text,
  last_used_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  CONSTRAINT user_push_tokens_pkey PRIMARY KEY (id),
  CONSTRAINT user_push_tokens_user_profile_id_fkey FOREIGN KEY (user_profile_id) REFERENCES public.user_profiles(id)
);
CREATE TABLE public.user_subscriptions (
  id integer NOT NULL DEFAULT nextval('user_subscriptions_id_seq'::regclass),
  user_id uuid NOT NULL,
  discipline_id integer NOT NULL,
  sub_discipline_id integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT user_subscriptions_pkey PRIMARY KEY (id),
  CONSTRAINT user_subscriptions_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id),
  CONSTRAINT user_subscriptions_discipline_id_fkey FOREIGN KEY (discipline_id) REFERENCES public.disciplines(id),
  CONSTRAINT user_subscriptions_sub_discipline_id_fkey FOREIGN KEY (sub_discipline_id) REFERENCES public.sub_disciplines(id)
);