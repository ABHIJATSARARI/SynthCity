<div align="center">

# 🎵 Eademem — Synth City (AI Music Metropolis) 🌆

![Logo](logo.png)

<p align="center">
  <img src="./public/logo-animated.gif" alt="Animated Logo" width="200"/>
</p>

[![MIT License](https://img.shields.io/badge/License-MIT-green.svg)](https://choosealicense.com/licenses/mit/)
[![React](https://img.shields.io/badge/React-20232A?style=flat&logo=react&logoColor=61DAFB)](https://reactjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=flat&logo=typescript&logoColor=white)](https://typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev/)

*Interactive AI-powered music metropolis demo built with modern web technologies*

</div>

---

## ✨ Features

🎸 **AI Music Generation** — Powered by cutting-edge AI models  
🌃 **Immersive 3D City** — WebGL-powered synth city visualization  
🎨 **Rich Interactive UI** — Responsive design with smooth animations  
🔊 **Real-time Audio** — WebAudio API for pristine sound synthesis  
⚡ **Lightning Fast** — Built with Vite for optimal performance  

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Installation & Development

```bash
# 📦 Install dependencies
npm ci

# 🔥 Start development server
npm run dev

# 🌐 Open http://localhost:5173
```

### Production Build

```bash
# 🏗️ Build for production
npm run build

# 👀 Preview production build
npm run preview
```

---

## 🎨 Making It Interactive & Rich Graphics

### 🌟 Visual Effects
- **WebGL/Three.js** — Create immersive 3D synth-city environments
- **Post-processing** — Bloom, chromatic aberration, retro-futuristic shaders  
- **Particle Systems** — Dynamic music visualizations and atmospheric effects
- **Lottie Animations** — Smooth micro-interactions throughout the UI

### 🔊 Audio Features  
- **WebAudio API** — Real-time audio synthesis and processing
- **AudioWorklet** — Offload heavy computations for smooth performance
- **Canvas Visualizers** — Real-time frequency domain visualizations
- **MIDI Support** — Connect external controllers for live performance

### 📱 Responsive Design
- **Mobile-first** — Touch-friendly controls and gestures
- **Progressive Enhancement** — Graceful fallbacks for older devices
- **Accessibility** — Screen reader support and keyboard navigation

---

## 🏗️ Project Structure

```
synthcity-ai-music-metropolis/
├── 📄 index.html          # Entry HTML with meta tags
├── 📱 App.tsx             # Main React component  
├── 🎯 index.tsx           # React entry point
├── ⚙️ vite.config.ts      # Vite configuration
├── 🖼️ public/            
│   ├── logo.png           # Static logo (replace with yours)
│   └── logo-animated.gif  # Animated logo (replace with yours)
└── 📦 package.json        # Dependencies and scripts
```

---
---

## 🛠️ Tech Stack

**Frontend:** Vite, React, React DOM, TypeScript  
**AI/ML:** @google/genai  
**Build Tools:** @vitejs/plugin-react, Node.js  
**Styling:** CSS3, CSS Modules (add your preferred solution)  
**Graphics:** WebGL, Canvas API, Three.js (to be added)  

---

## 📋 Development Roadmap

- [ ] 🎵 Implement AI music generation interface
- [ ] 🌆 Create 3D synth city with Three.js  
- [ ] 🎨 Add post-processing visual effects
- [ ] 🔊 Integrate WebAudio synthesis engine
- [ ] 📱 Optimize for mobile devices
- [ ] 🎮 Add MIDI controller support
- [ ] 🌐 Deploy to production

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the project
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📜 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

<div align="center">

**Made with ❤️ for the music and tech community**

⭐ Star this repo if you find it helpful!


## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`
