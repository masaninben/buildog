<template>
  <div class="karte-view">
    <div class="karte-hero">
      <span class="karte-owl">🦉</span>
      <h1 class="karte-title">マイホームカルテ</h1>
      <p class="karte-sub">家のこと、ちゃんと残そう。</p>
    </div>
    <p class="karte-wip">（準備中）</p>
  </div>
</template>

<style scoped>
.karte-view {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 12px;
  padding: 40px 24px;
  background: #f9f9f7;
  color: #1b3a5c;
}
.karte-hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}
.karte-owl { font-size: 56px; }
.karte-title { font-size: 24px; font-weight: 800; }
.karte-sub { font-size: 14px; color: #2d6a4f; font-weight: 600; }
.karte-wip { font-size: 12px; color: #aaa; }
</style>
