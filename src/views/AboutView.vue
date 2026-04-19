<template>
  <div class="about">

    <!-- ── Nav ── -->
    <nav class="about-nav">
      <a href="/login" class="nav-logo">Penstok</a>
      <a href="/login" class="nav-link">← アプリへ</a>
    </nav>

    <!-- ── Hero ── -->
    <section class="about-hero">
      <div class="about-hero-inner">
        <p class="eyebrow">About Penstok</p>
        <h1 class="about-headline">
          モノの出口を最適化することで、<br>
          <span class="accent">社会全体の流れを整える。</span>
        </h1>
      </div>
    </section>

    <!-- ── Mission ── -->
    <section class="about-section">
      <div class="about-inner narrow">
        <p class="section-label">Mission</p>
        <p class="large-text">
          私たちは「購入」には最適化された社会に生きている。
          ECサイト、レコメンド、ポイント。買う行為はどこまでも滑らかになった。
        </p>
        <p class="large-text">
          しかし「手放す」は？
        </p>
        <p class="body-text">
          使わなくなったモノが棚に積まれ、引き出しの奥に眠り、部屋の密度だけが増していく。
          手放したいとは思っている。でも、何から、どうやって、何に向けて手放せばいいか——
          その問いに答えるインフラが、今まで存在しなかった。
        </p>
        <p class="body-text">
          Penstokは、<strong>所有の終わりを設計するOS</strong>だ。
          買った記録から手放した記録まで、一本の線でつなぐ。
          それによって、個人の所有は整理され、社会のモノの流れは最適化される。
        </p>
      </div>
    </section>

    <!-- ── Philosophy ── -->
    <section class="about-section about-section--dark">
      <div class="about-inner narrow">
        <p class="section-label">Philosophy</p>
        <blockquote class="philosophy-block">
          <span class="ph-a">A: あなたの所有の記憶は、あなただけのもの。</span><br>
          <span class="ph-b">B: でも、あなたが手放した記録が、社会の循環をつくる。</span>
        </blockquote>
        <p class="body-text">
          Penstokは、個人データを売らない。広告に使わない。分析して外部に渡さない。
          あなたが持っているものの記録は、徹底的にあなたのものだ。
        </p>
        <p class="body-text">
          一方で、匿名化された集合データには大きな可能性がある。
          「この地域で、この種類のモノが手放されている」「このカテゴリの流通が停滞している」——
          そうしたインサイトは、リユース業者、フードバンク、物流設計者が切実に求めているデータだ。
        </p>
        <p class="body-text">
          個人の主権を守りながら、社会に貢献する。それがPenstokの設計思想だ。
        </p>
      </div>
    </section>

    <!-- ── What we build ── -->
    <section class="about-section">
      <div class="about-inner">
        <p class="section-label">What We Build</p>
        <div class="build-grid">
          <div class="build-card">
            <h3 class="build-title">所有の記録</h3>
            <p class="build-desc">バーコードスキャンで、本・日用品・ガジェットを瞬時に登録。ISBN、JANコードから商品情報を自動取得し、あなたの棚を構築する。</p>
          </div>
          <div class="build-card">
            <h3 class="build-title">手放しの記録</h3>
            <p class="build-desc">売った、贈った、捨てた、寄付した——手放し方の記録が、所有の全体像を完成させる。終わりのある所有だけが、本当の所有だ。</p>
          </div>
          <div class="build-card">
            <h3 class="build-title">Penstok Score</h3>
            <p class="build-desc">どれだけ所有を循環させているか。スコアは行動を変える。所有の最適化を、ゲームに変える。</p>
          </div>
          <div class="build-card">
            <h3 class="build-title">社会インフラ（構想中）</h3>
            <p class="build-desc">匿名化された所有・手放しデータを、物流・リユース・サステナビリティ分野へ。個人の記録の集積が、社会のインフラになる。</p>
          </div>
        </div>
      </div>
    </section>

    <!-- ── Vision ── -->
    <section class="about-section about-section--vision">
      <div class="about-inner narrow center">
        <p class="section-label">Vision</p>
        <p class="vision-text">
          「手放す」が当たり前になった社会では、<br>
          モノは必要な人のもとへ流れ、<br>
          部屋は軽くなり、<br>
          地球の負荷は下がる。
        </p>
        <p class="body-text" style="text-align:center; margin-top: 24px;">
          Penstokは、そのインフラをつくる。
        </p>
        <a href="/login" class="start-btn">はじめる</a>
      </div>
    </section>

    <footer class="about-footer">
      <span>© 2025 Penstok</span>
      <a href="/login">アプリに戻る</a>
    </footer>

  </div>
</template>

<script setup lang="ts">
// static page, no logic needed
</script>

<style scoped>
.about {
  font-family: inherit;
  background: #0a0907;
  color: #f0ead8;
  min-height: 100vh;
}

/* Nav */
.about-nav {
  position: fixed;
  top: 0; left: 0; right: 0;
  z-index: 50;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  background: rgba(10, 9, 7, 0.85);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.nav-logo {
  font-size: 15px;
  font-weight: 700;
  letter-spacing: 0.12em;
  color: #c9942a;
  text-decoration: none;
}
.nav-link {
  font-size: 13px;
  color: rgba(240, 234, 216, 0.45);
  text-decoration: none;
  transition: color 0.15s;
}
.nav-link:hover { color: #f0ead8; }

/* Hero */
.about-hero {
  padding: 140px 24px 80px;
  background: radial-gradient(ellipse 80% 50% at 50% 0%, rgba(180, 120, 20, 0.16) 0%, transparent 70%);
}
.about-hero-inner {
  max-width: 720px;
  margin: 0 auto;
}
.eyebrow {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #c9942a;
  margin: 0 0 20px;
}
.about-headline {
  font-size: clamp(24px, 5vw, 42px);
  font-weight: 800;
  line-height: 1.3;
  letter-spacing: -0.01em;
  margin: 0;
  color: #f0ead8;
}
.accent { color: #c9942a; }

/* Sections */
.about-section {
  padding: 72px 24px;
}
.about-section--dark {
  background: #0f0d09;
}
.about-section--vision {
  background: linear-gradient(180deg, #0a0907 0%, #110e06 100%);
  padding: 96px 24px;
}

.about-inner {
  max-width: 720px;
  margin: 0 auto;
}
.about-inner.narrow { max-width: 580px; }
.about-inner.center { text-align: center; display: flex; flex-direction: column; align-items: center; }

.section-label {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.25em;
  text-transform: uppercase;
  color: #c9942a;
  margin: 0 0 24px;
}

.large-text {
  font-size: clamp(18px, 3vw, 24px);
  font-weight: 700;
  line-height: 1.6;
  color: #f0ead8;
  margin: 0 0 20px;
}

.body-text {
  font-size: 15px;
  line-height: 1.9;
  color: rgba(240, 234, 216, 0.62);
  margin: 0 0 20px;
}
.body-text strong { color: rgba(240, 234, 216, 0.9); font-weight: 600; }
.body-text:last-child { margin-bottom: 0; }

/* Philosophy block */
.philosophy-block {
  font-size: clamp(16px, 3vw, 20px);
  font-weight: 700;
  line-height: 1.7;
  margin: 0 0 32px;
  padding: 28px 24px;
  border-left: 3px solid #c9942a;
  background: rgba(201, 148, 42, 0.06);
  border-radius: 0 8px 8px 0;
  font-style: normal;
}
.ph-a { color: #f0ead8; }
.ph-b { color: rgba(240, 234, 216, 0.6); }

/* Build grid */
.build-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  gap: 16px;
  margin-top: 28px;
}
.build-card {
  background: rgba(255,255,255,0.035);
  border: 1px solid rgba(201, 148, 42, 0.12);
  border-radius: 12px;
  padding: 24px 20px;
}
.build-title {
  font-size: 15px;
  font-weight: 700;
  color: #f0ead8;
  margin: 0 0 10px;
}
.build-desc {
  font-size: 13px;
  line-height: 1.75;
  color: rgba(240, 234, 216, 0.52);
  margin: 0;
}

/* Vision */
.vision-text {
  font-size: clamp(18px, 3.5vw, 26px);
  font-weight: 700;
  line-height: 1.8;
  color: #f0ead8;
  margin: 0;
}

.start-btn {
  display: inline-flex;
  align-items: center;
  height: 52px;
  padding: 0 36px;
  background: #c9942a;
  border-radius: 26px;
  font-size: 15px;
  font-weight: 700;
  color: #0a0907;
  text-decoration: none;
  margin-top: 40px;
  letter-spacing: 0.04em;
  transition: background 0.15s;
}
.start-btn:hover { background: #e0a830; }

/* Footer */
.about-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 20px 24px;
  border-top: 1px solid rgba(255,255,255,0.06);
  font-size: 12px;
  color: rgba(240, 234, 216, 0.25);
}
.about-footer a {
  color: rgba(240, 234, 216, 0.25);
  text-decoration: none;
  transition: color 0.15s;
}
.about-footer a:hover { color: rgba(240, 234, 216, 0.6); }
</style>
