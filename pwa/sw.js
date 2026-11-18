"use strict";

/* Service worker PWA Tracker Pengeluaran Bulanan.
   Hanya men-cache file statis aplikasi agar bisa dibuka offline.
   Tidak ada panggilan API: semua data tinggal di localStorage perangkat. */

const CACHE_NAME = "tracker-pwa-v1";

/* File inti aplikasi. */
const CORE_ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./icons/icon.svg",
];

/* Ikon PNG dicoba di-cache juga, tetapi kegagalan satu ikon (misalnya file
   belum ter-upload saat pertama deploy) tidak boleh menggagalkan install. */
const OPTIONAL_ASSETS = [
  "./icons/apple-touch-icon.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
];

self.addEventListener("install", function (event) {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then(function (cache) {
        /* Cache satu per satu dengan toleransi gagal: tidak memakai
           cache.addAll, yang gagal total bila satu entri 404. */
        const jobs = CORE_ASSETS.concat(OPTIONAL_ASSETS).map(function (url) {
          return cache.add(url).catch(function () {
            /* Abaikan file yang gagal di-cache; aplikasi tetap jalan
               dari network untuk file tersebut. */
          });
        });
        return Promise.all(jobs);
      })
      .then(function () {
        return self.skipWaiting();
      })
  );
});

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches
      .keys()
      .then(function (keys) {
        return Promise.all(
          keys.map(function (key) {
            if (key !== CACHE_NAME) {
              return caches.delete(key);
            }
            return Promise.resolve();
          })
        );
      })
      .then(function () {
        return self.clients.claim();
      })
  );
});

self.addEventListener("fetch", function (event) {
  const request = event.request;

  /* Hanya request GET same-origin yang dilayani dari cache. */
  if (request.method !== "GET") {
    return;
  }
  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  event.respondWith(
    caches.match(request, { ignoreSearch: true }).then(function (cached) {
      if (cached) {
        return cached;
      }
      return fetch(request).catch(function () {
        /* Offline dan tidak ada di cache: navigasi jatuh kembali ke
           halaman utama dari cache. */
        if (request.mode === "navigate") {
          return caches.match("./index.html");
        }
        return Promise.reject(new Error("offline dan tidak ada di cache"));
      });
    })
  );
});
