require("dotenv").config();

const CONFIG = {
  delayBetweenRequests: 2000,
  dryRun: false,
  autoUnfollow: true,
  skipYellowVerified: true, // skip yellow checkmark (verified org/gov/company) on unfollow
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const AUTH_TOKEN = process.env.AUTH_TOKEN;
const CT0 = process.env.CT0;
const USERNAME = process.env.TW_USERNAME;
const USER_ID = process.env.USER_ID;

if (!AUTH_TOKEN || !CT0 || !USERNAME || !USER_ID) {
  console.error("❌ AUTH_TOKEN, CT0, TW_USERNAME, USER_ID are required in .env");
  process.exit(1);
}

const HEADERS = {
  authorization:
    "Bearer AAAAAAAAAAAAAAAAAAAAANRILgAAAAAAnNwIzUejRCOuH5E6I8xnZz4puTs%3D1Zv7ttfk8LF81IUq16cHjhLTvJu4FA33AGWWjCpTnA",
  cookie: `auth_token=${AUTH_TOKEN}; ct0=${CT0}`,
  "x-csrf-token": CT0,
  "content-type": "application/json",
  "user-agent":
    "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "x-twitter-active-user": "yes",
  "x-twitter-auth-type": "OAuth2Session",
  "x-twitter-client-language": "en",
  referer: "https://x.com/",
  origin: "https://x.com",
};

const FOLLOWING_QUERY_ID = "ILoifaG-s7J3wWLd29oMSw";

const FEATURES = JSON.stringify({
  rweb_video_screen_enabled: false,
  profile_label_improvements_pcf_label_in_post_enabled: true,
  responsive_web_profile_redirect_enabled: false,
  rweb_tipjar_consumption_enabled: false,
  verified_phone_label_enabled: false,
  creator_subscriptions_tweet_preview_api_enabled: true,
  responsive_web_graphql_timeline_navigation_enabled: true,
  responsive_web_graphql_skip_user_profile_image_extensions_enabled: false,
  premium_content_api_read_enabled: false,
  communities_web_enable_tweet_community_results_fetch: true,
  c9s_tweet_anatomy_moderator_badge_enabled: true,
  responsive_web_grok_analyze_button_fetch_trends_enabled: false,
  responsive_web_grok_analyze_post_followups_enabled: true,
  responsive_web_jetfuel_frame: true,
  responsive_web_grok_share_attachment_enabled: true,
  responsive_web_grok_annotations_enabled: true,
  articles_preview_enabled: true,
  responsive_web_edit_tweet_api_enabled: true,
  graphql_is_translatable_rweb_tweet_is_translatable_enabled: true,
  view_counts_everywhere_api_enabled: true,
  longform_notetweets_consumption_enabled: true,
  responsive_web_twitter_article_tweet_consumption_enabled: true,
  tweet_awards_web_tipping_enabled: false,
  content_disclosure_indicator_enabled: true,
  content_disclosure_ai_generated_indicator_enabled: true,
  responsive_web_grok_show_grok_translated_post: false,
  responsive_web_grok_analysis_button_from_backend: true,
  post_ctas_fetch_enabled: false,
  freedom_of_speech_not_reach_fetch_enabled: true,
  standardized_nudges_misinfo: true,
  tweet_with_visibility_results_prefer_gql_limited_actions_policy_enabled: true,
  longform_notetweets_rich_text_read_enabled: true,
  longform_notetweets_inline_media_enabled: true,
  responsive_web_grok_image_annotation_enabled: true,
  responsive_web_grok_imagine_annotation_enabled: true,
  responsive_web_grok_community_note_auto_translation_is_enabled: false,
  responsive_web_enhance_cards_enabled: false,
});

// ─────────────────────────────────────────────
// GET FOLLOWING
// ─────────────────────────────────────────────

async function getFollowingPage(cursor = null) {
  const variables = {
    userId: USER_ID,
    count: 200,
    includePromotedContent: false,
    withGrokTranslatedBio: false,
  };
  if (cursor) variables.cursor = cursor;

  const url =
    `https://x.com/i/api/graphql/${FOLLOWING_QUERY_ID}/Following` +
    `?variables=${encodeURIComponent(JSON.stringify(variables))}` +
    `&features=${encodeURIComponent(FEATURES)}`;

  const res = await fetch(url, { headers: HEADERS });
  if (res.status === 429) throw new Error("Rate limit exceeded");
  const data = await res.json();
  if (!res.ok || data.errors) {
    throw new Error(
      `Failed to fetch following: ${JSON.stringify(data.errors || data).substring(0, 300)}`
    );
  }
  return data;
}

function extractUsersAndCursor(data) {
  const users = [];
  let nextCursor = null;

  const instructions =
    data?.data?.user?.result?.timeline?.timeline?.instructions || [];

  for (const instr of instructions) {
    if (instr.type === "TimelineAddEntries") {
      for (const entry of instr.entries || []) {
        if (
          entry.content?.entryType === "TimelineTimelineCursor" &&
          entry.content?.cursorType === "Bottom"
        ) {
          nextCursor = entry.content.value;
          continue;
        }
        const userResult = entry.content?.itemContent?.user_results?.result;
        if (!userResult || userResult.__typename !== "User") continue;

        const legacy = userResult.legacy || {};
        const followedBy =
          legacy.followed_by ??
          userResult.relationship_perspectives?.followed_by ??
          null;

        // Yellow checkmark detection — Business, Government, or legacy verified
        const affiliateBadgeUrl =
          userResult?.affiliates_highlighted_label?.label?.badge?.url || "";
        const verifiedType = userResult?.verified_type || "";
        const isYellowVerified =
          verifiedType === "Business" ||
          verifiedType === "Government" ||
          legacy?.verified === true ||
          (affiliateBadgeUrl.includes("verified") && !affiliateBadgeUrl.includes("blue"));

        const yellowReason =
          verifiedType === "Business" ? "Business" :
          verifiedType === "Government" ? "Government" :
          legacy?.verified === true ? "Legacy Verified" :
          affiliateBadgeUrl.includes("verified") ? "Badge" : null;

        users.push({
          id_str: userResult.rest_id,
          screen_name: legacy.screen_name || `id_${userResult.rest_id}`,
          name: legacy.name || "",
          followers_count: legacy.followers_count || 0,
          statuses_count: legacy.statuses_count || 0,
          followed_by: followedBy,
          is_yellow_verified: isYellowVerified,
          yellow_reason: yellowReason,
        });
      }
    }
  }

  return { users, nextCursor };
}

async function getAllFollowing() {
  const allUsers = [];
  let cursor = null;
  let page = 0;

  while (true) {
    page++;
    process.stdout.write(
      `\r  Page ${page}, found ${allUsers.length} following...`
    );

    let data;
    try {
      data = await getFollowingPage(cursor);
    } catch (err) {
      if (err.message.includes("Rate limit")) {
        process.stdout.write(`\n⏳ Rate limit hit! Waiting 60s...`);
        await sleep(60000);
        continue;
      }
      throw err;
    }

    const { users, nextCursor } = extractUsersAndCursor(data);
    allUsers.push(...users);
    if (!nextCursor || users.length === 0) break;
    cursor = nextCursor;
    await sleep(CONFIG.delayBetweenRequests);
  }

  return allUsers;
}

// ─────────────────────────────────────────────
// UNFOLLOW (REST API 1.1)
// ─────────────────────────────────────────────

async function unfollow(userId) {
  const res = await fetch("https://x.com/i/api/1.1/friendships/destroy.json", {
    method: "POST",
    headers: {
      ...HEADERS,
      "content-type": "application/x-www-form-urlencoded",
    },
    body: `user_id=${userId}`,
  });
  const data = await res.json();
  if (!res.ok || data.errors)
    throw new Error(JSON.stringify(data.errors || data).substring(0, 150));
  return data;
}

// ─────────────────────────────────────────────
// ANALYZE
// ─────────────────────────────────────────────

function analyzeUsers(users) {
  const dist = { true: 0, false: 0, null: 0 };
  users.forEach((u) => {
    dist[String(u.followed_by)] = (dist[String(u.followed_by)] || 0) + 1;
  });
  console.log(
    `  📊 followed_by — true: ${dist["true"] || 0}, false: ${dist["false"] || 0}, null: ${dist["null"] || 0}`
  );

  const nullMeansNotFollowing =
    !dist["true"] && !dist["false"] && dist["null"] > 0;
  if (nullMeansNotFollowing)
    console.log(
      `  ⚠️  followed_by field unavailable from API — null = not following back\n`
    );

  const notFollowingBack = users.filter(
    (u) =>
      u.followed_by === false ||
      (nullMeansNotFollowing && u.followed_by === null)
  );

  return notFollowingBack;
}

// ─────────────────────────────────────────────
// PRINT TABLE
// ─────────────────────────────────────────────

function printTable(users) {
  if (users.length === 0) {
    console.log(`\n👤 Not Following Back: none found\n`);
    return;
  }
  console.log(`\n👤 Not Following Back — ${users.length} accounts:`);
  console.log("─".repeat(72));
  console.log(
    `${"No".padEnd(5)}   ${"Username".padEnd(22)} ${"Name".padEnd(22)} ${"Tweets".padStart(8)} ${"Followers".padStart(10)}`
  );
  console.log("─".repeat(72));
  users.forEach((u, i) => {
    const no = String(i + 1).padEnd(5);
    const badge = u.is_yellow_verified ? "🟡" : "  ";
    const uname = `@${u.screen_name}`.substring(0, 21).padEnd(22);
    const name = u.name.substring(0, 21).padEnd(22);
    const tweets = String(u.statuses_count).padStart(8);
    const followers = String(u.followers_count).padStart(10);
    console.log(`${no} ${badge} ${uname} ${name} ${tweets} ${followers}`);
  });
  console.log("─".repeat(72));
}

// ─────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────

async function runBot() {
  console.log("╔══════════════════════════════════════════════╗");
  console.log("║     Follow Checker Bot - X/Twitter           ║");
  console.log("╚══════════════════════════════════════════════╝\n");
  console.log(`⚙️  Dry Run       : ${CONFIG.dryRun}`);
  console.log(`⚙️  Auto Unfollow : ${CONFIG.autoUnfollow}`);
  console.log(`⚙️  Skip Yellow ✓ : ${CONFIG.skipYellowVerified}\n`);

  console.log(`📥 Fetching following list for @${USERNAME}...`);
  let allFollowing;
  try {
    allFollowing = await getAllFollowing();
  } catch (err) {
    console.error(`\n❌ Error: ${err.message}`);
    process.exit(1);
  }
  console.log(`\n✅ Total following: ${allFollowing.length}\n`);

  if (allFollowing.length === 0) {
    console.log("✨ No following found. Done!");
    return;
  }

  // Show yellow verified summary
  const yellowAccounts = allFollowing.filter((u) => u.is_yellow_verified);
  if (yellowAccounts.length > 0) {
    console.log(`🟡 Yellow verified accounts detected (${yellowAccounts.length}) — will be skipped:`);
    yellowAccounts.forEach((u) =>
      console.log(`   🟡 @${u.screen_name} — ${u.name}  [${u.yellow_reason}]`)
    );
    console.log();
  }

  const notFollowingBack = analyzeUsers(allFollowing);
  printTable(notFollowingBack);

  if (CONFIG.autoUnfollow && !CONFIG.dryRun) {
    let targets = [...notFollowingBack];

    // Filter out yellow verified accounts if enabled
    if (CONFIG.skipYellowVerified) {
      const skipped = targets.filter((u) => u.is_yellow_verified);
      targets = targets.filter((u) => !u.is_yellow_verified);
      if (skipped.length > 0) {
        console.log(`\n🟡 Skipping ${skipped.length} yellow verified account(s):`);
        skipped.forEach((u) => console.log(`   ✓  @${u.screen_name} — ${u.name}  [${u.yellow_reason}]`));
        console.log(`   (remaining: ${targets.length} accounts)\n`);
      }
    }

    console.log(`\n🔃 Unfollowing ${targets.length} accounts...\n`);
    let success = 0, failed = 0;

    for (let i = 0; i < targets.length; i++) {
      const u = targets[i];
      const num = String(i + 1).padStart(4);
      try {
        await unfollow(u.id_str);
        console.log(`✅ ${num}  @${u.screen_name}`);
        success++;
      } catch (err) {
        console.error(
          `❌ ${num}  @${u.screen_name}  — ${err.message.substring(0, 60)}`
        );
        failed++;
      }
      if (i < targets.length - 1) await sleep(CONFIG.delayBetweenRequests);
    }

    console.log(`\n📋 Unfollow Summary:`);
    console.log(`   ✅ Success : ${success}`);
    console.log(`   ❌ Failed  : ${failed}`);
  } else if (CONFIG.autoUnfollow && CONFIG.dryRun) {
    console.log(`\n⚠️  DRY RUN enabled — unfollow will not be executed`);
  }

  console.log(`\n🎉 Done!\n`);
}

runBot().catch((err) => {
  console.error("Fatal error:", err.message);
  process.exit(1);
});
