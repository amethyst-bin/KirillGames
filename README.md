# 🎰 KirillGames — Lucky Casino (Android & Web)

Казуальная игра в стиле *Royal Match / Candy Crush* с игровыми автоматами, плавной физикой вращения барабанов, звуковыми эффектами, экономикой и таблицей лидеров.

## 📱 Сборка Android APK
Сборка APK файла происходит автоматически через **GitHub Actions** при каждом коммите в ветку `main`.

1. Перейдите во вкладку **[Actions](../../actions)** или **[Releases](../../releases)**.
2. Скачайте свежий файл **`app-debug.apk`**.
3. Установите на любой Android телефон!

## 🚀 Локальный запуск на компьютере
```bash
npm install
npm run dev
```
Откройте в браузере: `http://localhost:5173/` (или по локальному IP с мобильного телефона).

## 🛠 Технологии
- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS
- **Mobile Engine:** Capacitor 8 (Android)
- **Audio:** Web Audio API (процедурный синтезатор звуков)
- **Visuals & FX:** Canvas-Confetti, кастомные анимации пружин и отскока
- **CI/CD:** GitHub Actions (автоматическая сборка APK)
