const USERS = [
  { id: "user-tanaka", name: "田中 花子", email: "tanaka@example.com", password: "demo123", purchasedCourseIds: ["html-css", "javascript"] },
  { id: "user-suzuki", name: "鈴木 太郎", email: "suzuki@example.com", password: "demo123", purchasedCourseIds: ["wordpress"] }
];

const COURSES = [
  {
    id: "html-css", category: "HTML/CSS", title: "はじめてのHTML & CSS", level: "初級", duration: "4時間30分", color: "blue",
    description: "Webページの構造とデザインを基礎から学び、レスポンシブなページを作ります。",
    videos: [["html-01", "HTMLの基本と開発環境", "12:20"], ["html-02", "CSSでレイアウトを整える", "18:45"], ["html-03", "レスポンシブデザイン入門", "21:10"]]
  },
  {
    id: "javascript", category: "JavaScript", title: "実践JavaScript入門", level: "中級", duration: "6時間10分", color: "yellow",
    description: "DOM操作や非同期処理を使って、実際に動くWebアプリケーションを作ります。",
    videos: [["js-01", "JavaScriptの基礎文法", "16:30"], ["js-02", "DOMを操作してみよう", "24:05"], ["js-03", "非同期処理とAPI", "28:40"]]
  },
  {
    id: "wordpress", category: "WordPress", title: "WordPressサイト制作", level: "中級", duration: "5時間20分", color: "purple",
    description: "WordPressの導入からテーマ編集まで、オリジナルサイト制作の流れを学びます。",
    videos: [["wp-01", "WordPressの始め方", "15:20"], ["wp-02", "テーマとページの編集", "22:15"], ["wp-03", "公開前のチェック", "19:50"]]
  }
];

const state = { user: getStoredUser() };
const app = document.querySelector("#app");
const headerActions = document.querySelector("#header-actions");

function getStoredUser() {
  try {
    const id = localStorage.getItem("manabi-session");
    return USERS.find((user) => user.id === id) || null;
  } catch {
    return null;
  }
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[character]));
}

function courseIsPurchased(courseId) {
  return Boolean(state.user?.purchasedCourseIds.includes(courseId));
}

function renderHeader() {
  headerActions.innerHTML = state.user
    ? `<span class="user-name">${escapeHtml(state.user.name)}さん</span><button class="button button-ghost" id="logout">ログアウト</button>`
    : "";
  document.querySelector("#logout")?.addEventListener("click", () => {
    localStorage.removeItem("manabi-session");
    state.user = null;
    location.hash = "#/login";
    render();
  });
}

function courseCard(course) {
  return `<a class="course-card" href="#/course/${course.id}">
    <div class="course-thumbnail ${course.color}"><span>${escapeHtml(course.category)}</span><strong>▶</strong></div>
    <div class="course-card-body"><span class="eyebrow">${escapeHtml(course.level)}　・　${escapeHtml(course.duration)}</span>
      <h3>${escapeHtml(course.title)}</h3><p>${escapeHtml(course.description)}</p><span class="card-link">講座を見る <span aria-hidden="true">→</span></span>
    </div>
  </a>`;
}

function renderLogin() {
  app.innerHTML = `<section class="auth-layout"><div class="auth-copy"><span class="eyebrow">LEARN AT YOUR PACE</span><h1>学びたい気持ちを、<br /><em>いつでも</em>そばに。</h1><p>購入した講座を、好きな時間に、好きな場所で。あなたのペースでスキルを身につけましょう。</p><div class="feature-list"><span>✓ いつでも繰り返し視聴</span><span>✓ スマートフォンにも対応</span></div></div>
    <div class="auth-card"><h2>ログイン</h2><p class="muted">アカウントにログインして学習を続けましょう。</p><form id="login-form"><label for="email">メールアドレス</label><input id="email" type="email" autocomplete="email" required placeholder="you@example.com" /><label for="password">パスワード</label><input id="password" type="password" autocomplete="current-password" required placeholder="パスワードを入力" /><p id="login-error" class="form-error" role="alert"></p><button class="button button-primary button-wide" type="submit">ログインする</button></form><div class="demo-box"><strong>テスト用アカウント</strong><span>tanaka@example.com / demo123</span><span>suzuki@example.com / demo123</span></div></div></section>`;
  document.querySelector("#login-form").addEventListener("submit", (event) => {
    event.preventDefault();
    const email = event.target.email.value.trim();
    const password = event.target.password.value;
    const user = USERS.find((item) => item.email === email && item.password === password);
    if (!user) {
      document.querySelector("#login-error").textContent = "メールアドレスまたはパスワードが正しくありません。";
      return;
    }
    localStorage.setItem("manabi-session", user.id);
    state.user = user;
    location.hash = "#/dashboard";
    render();
  });
}

function renderDashboard() {
  const courses = COURSES.filter((course) => courseIsPurchased(course.id));
  app.innerHTML = `<section class="dashboard"><div class="welcome"><div><span class="eyebrow">MY LEARNING</span><h1>${escapeHtml(state.user.name)}さん、<br class="mobile-only" />学習を続けましょう。</h1><p class="muted">購入済みの講座をいつでも視聴できます。</p></div><div class="welcome-icon">✦</div></div><div class="section-heading"><div><h2>購入した講座</h2><p class="muted">${courses.length}講座を受講できます</p></div></div><div class="course-grid">${courses.map(courseCard).join("")}</div><div class="help-banner"><span class="help-icon">?</span><div><strong>学びたい講座を探していますか？</strong><p class="muted">新しい講座の追加をお楽しみに。</p></div></div></section>`;
}

function renderCourse(courseId) {
  const course = COURSES.find((item) => item.id === courseId);
  if (!course) return renderNotFound();
  if (!courseIsPurchased(courseId)) {
    app.innerHTML = `<section class="message-page"><div class="message-icon">🔒</div><h1>この講座は視聴できません</h1><p class="muted">このアカウントでは「${escapeHtml(course.title)}」を購入していません。購入済み講座はマイページから確認できます。</p><a class="button button-primary" href="#/dashboard">マイページへ戻る</a></section>`;
    return;
  }
  app.innerHTML = `<section class="course-page"><a class="back-link" href="#/dashboard">← 購入した講座一覧</a><div class="course-hero"><div><span class="eyebrow">${escapeHtml(course.category)}　・　${escapeHtml(course.level)}</span><h1>${escapeHtml(course.title)}</h1><p>${escapeHtml(course.description)}</p><span class="muted">全${course.videos.length}本　・　${escapeHtml(course.duration)}</span></div><div class="hero-mark ${course.color}">▶</div></div><div class="video-layout"><div><h2>講座の動画</h2><div class="video-list">${course.videos.map((video, index) => `<a class="video-row" href="#/watch/${course.id}/${video[0]}"><span class="video-number">${String(index + 1).padStart(2, "0")}</span><span class="play-circle">▶</span><span class="video-title">${escapeHtml(video[1])}</span><span class="video-time">${escapeHtml(video[2])}</span><span>→</span></a>`).join("")}</div></div><aside class="side-note"><strong>この講座について</strong><p class="muted">動画を見ながら手を動かすことで、より深く身につきます。</p></aside></div></section>`;
}

function renderWatch(courseId, videoId) {
  const course = COURSES.find((item) => item.id === courseId);
  const video = course?.videos.find((item) => item[0] === videoId);
  if (!course || !video) return renderNotFound();
  if (!courseIsPurchased(courseId)) return renderCourse(courseId);
  app.innerHTML = `<section class="watch-page"><a class="back-link" href="#/course/${course.id}">← ${escapeHtml(course.title)}に戻る</a><div class="watch-grid"><div><div class="video-player"><div class="player-lock">▶</div><span>動画プレーヤー</span><small>サンプル動画</small></div><span class="eyebrow">${escapeHtml(course.category)}</span><h1>${escapeHtml(video[1])}</h1><p class="muted">この動画で学んだ内容を、実際にコードを書きながら試してみましょう。</p></div><aside class="playlist"><h2>講座の動画</h2>${course.videos.map((item, index) => `<a class="playlist-row ${item[0] === videoId ? "active" : ""}" href="#/watch/${course.id}/${item[0]}"><span>${String(index + 1).padStart(2, "0")}</span><span>${escapeHtml(item[1])}</span><small>${escapeHtml(item[2])}</small></a>`).join("")}</aside></div></section>`;
}

function renderNotFound() {
  app.innerHTML = `<section class="message-page"><h1>ページが見つかりません</h1><a class="button button-primary" href="#/dashboard">マイページへ戻る</a></section>`;
}

function render() {
  renderHeader();
  const [path, id, subId] = location.hash.replace(/^#\/?/, "").split("/");
  if (!state.user && path !== "login") return renderLogin();
  if (state.user && path === "login") return (location.hash = "#/dashboard");
  if (path === "course" && id) return renderCourse(id);
  if (path === "watch" && id && subId) return renderWatch(id, subId);
  if (path === "login") return renderLogin();
  return renderDashboard();
}

window.addEventListener("hashchange", render);
render();
