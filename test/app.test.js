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
  assert.match(app, /マイ講座/);
  assert.match(app, /href="#\/dashboard"/);
  assert.match(app, /function renderAbout/);
});
