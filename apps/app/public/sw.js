// Terceirizei OS — service worker mínimo, só para satisfazer o critério de
// instalabilidade como app (ícone próprio, janela própria). Deliberadamente
// não faz cache de páginas/dados — este é um app com dados que mudam o tempo
// todo, cache agressivo aqui causaria tela desatualizada, não ajuda.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (event) => {
  event.respondWith(fetch(event.request));
});
