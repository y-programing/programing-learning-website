import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile("app.js", "utf8");
const readme = await readFile("README.md", "utf8");
const index = await readFile("index.html", "utf8");

test("モックユーザーは購入講座IDを持つ", () => {
  assert.match(app, /purchasedCourseIds/);
  assert.match(app, /tanaka@example\.com/);
  assert.match(app, /suzuki@example\.com/);
});

test("購入権限を講座表示と視聴の両方で検証する", () => {
  assert.ok((app.match(/courseIsPurchased/g) || []).length >= 3);
  assert.match(app, /この講座は視聴できません/);
});

test("新規登録画面と重複メールアドレスの検証がある", () => {
  assert.match(app, /#\/register/);
  assert.match(app, /新規登録はこちら/);
  assert.match(app, /新規アカウント登録/);
  assert.match(app, /このメールアドレスはすでに登録されています/);
  assert.match(app, /manabi-users/);
});

test("必要な講座カテゴリと日本語セットアップ情報がある", () => {
  for (const category of ["HTML\/CSS", "JavaScript", "WordPress"]) assert.match(app, new RegExp(category));
  assert.match(readme, /npm run build/);
  assert.match(readme, /環境変数/);
});

test("サービス名をCloSkillとして表示する", () => {
  assert.match(index, /CloSkill/);
  assert.doesNotMatch(index, /まなび動画/);
  assert.match(readme, /^# CloSkill/m);
});

test("ログイン後のヘッダーに下層ページへの導線がある", () => {
  assert.match(app, /CloSkillについて/);
  assert.match(app, /href="#\/about"/);
  assert.match(app, /マイページ/);
  assert.match(app, /href="#\/dashboard"/);
  assert.match(app, /id="logout"/);
  assert.match(app, /function renderAbout/);
});

test("購入済み講座はマイページに表示する", () => {
  assert.match(app, /MY PAGE/);
  assert.match(app, /マイページから購入済みの講座をいつでも視聴できます/);
  assert.doesNotMatch(app, /<a href="#\/dashboard">マイ講座<\/a>/);
});

test("3コースの価格表示と購入導線がある", () => {
  for (const course of ["HTML/CSSコース", "JavaScript\\(jQuery\\)コース", "WordPressコース"]) assert.match(app, new RegExp(course));
  assert.match(app, /price/);
  assert.match(app, /購入する/);
  assert.match(app, /purchaseCourse/);
  assert.match(app, /manabi-purchases-/);
});

test("PayPal決済はサーバーAPI経由で開始する", () => {
  assert.match(app, /\/api\/paypal\/orders/);
  assert.match(app, /completePayPalOrder/);
  assert.match(app, /PayPal決済サーバーに接続できません/);
});
