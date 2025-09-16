# CLAUDE.md

## 目的
Scala + LibGDX で作成された Qixxy を、Electron (TypeScript/Canvas または WebGL) 上で **完全再現**する。

## ルール
1. `reference/` 内の qixxy-master を仕様参考として扱う。
   - **コードやアセットは直接コピー禁止**
   - 抽出すべきは仕様（ゲームルール・挙動）
2. 実装は `app/` 以下で行う。
3. 設計・実装フェーズごとに **PR提案形式で出力**すること。
4. Gemini と協力してデザイン・UI・アセットの仕様を決定すること。
5. 問題が発生した場合は Gemini と相談して解決策を模索すること。

## 最初のタスク
1. `reference/qixxy-master/` からゲーム仕様を整理し、
   - フィールドシステム
   - プレイヤー移動/トレイル/領域確定
   - 敵キャラ（Qix, Spark 等）挙動
   を設計書にまとめる。
2. TypeScript + Electron でのモジュール分割案を提示する。
3. MVP（最小動作）実装プランを提示する。