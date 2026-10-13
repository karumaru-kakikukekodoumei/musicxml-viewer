<!--
権限: このプロジェクトは WSL 内のみで完結する。Windows 側(/mnt/c/)の読み書きは許可なし。
GitHub への公開(リポジトリ作成・push)は、ユーザーの指示があるまで行わない。
-->

# musicxml-viewer

デモ: https://karumaru-kakikukekodoumei.github.io/musicxml-viewer/

MusicXML(score-partwise)を読み込んで、ブラウザに SVG の楽譜として表示するビューア。
Finale / Sibelius などの商用楽譜ソフトの代替を目指す小さな試作。

## 方針(クリーンルーム)
- 根拠にするのは **公開されている MusicXML 仕様** と、楽譜の一般的な記法だけ。
- 商用ソフトのバイナリの解析結果やコードは使わない。

## 使い方
```sh
pnpm install
pnpm dev        # http://localhost:5173 でサンプルが表示される。ファイル選択で任意の .musicxml も読める
pnpm test
pnpm typecheck
```

## 対応状況
- 対応: 音符 / 休符 / 和音 / 付点 / 臨時記号 / 加線 / 符幹 / 旗 / G・F・C 音部記号 / 調号 / 拍子 / 小節番号 / 複数パート(縦積み) / 幅に応じた改行
- 未対応: 連桁 / タイ・スラー / 強弱・歌詞などの記号 / score-timewise / 圧縮 .mxl / パート同士の縦位置の揃え / 小節内の臨時記号ルール(音符ごとに alter があれば出すだけ)

## 公開
`main` に push すると GitHub Actions がテスト・ビルドして GitHub Pages に自動デプロイする(`.github/workflows/pages.yml`)。

## ライセンス
MIT([LICENSE](LICENSE))

## 依存ライブラリの確認結果
- fast-xml-parser 5.11.2: MIT、NaturalIntelligence 管理、継続的にメンテ、`pnpm audit` で既知の脆弱性なし
- vite / vitest / typescript / @types/node: 定番の開発用ツール、`pnpm audit` で既知の脆弱性なし
