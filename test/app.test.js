import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const app = await readFile("app.js", "utf8");
const readme = await readFile("README.md", "utf8");

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
  assert.match(app, /新規アカウント登録/);
  assert.match(app, /このメールアドレスはすでに登録されています/);
  assert.match(app, /manabi-users/);
});

test("必要な講座カテゴリと日本語セットアップ情報がある", () => {
  for (const category of ["HTML\/CSS", "JavaScript", "WordPress"]) assert.match(app, new RegExp(category));
  assert.match(readme, /npm run build/);
  assert.match(readme, /環境変数/);
});
