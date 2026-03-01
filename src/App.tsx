import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { Joystick } from './components/Joystick';
import { Enemy, Bullet, GameState } from './gameLogic';
import { Crosshair, Heart, Trophy, RefreshCw, Play } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const playerRef = useRef<THREE.Group | null>(null);
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const clockRef = useRef(new THREE.Clock());
  
  const gameStateRef = useRef<GameState>({
    score: 0,
    health: 100,
    isGameOver: false,
    isPaused: true,
  });

  const [gameState, setGameState] = useState<GameState>(gameStateRef.current);

  const updateGameState = (updates: Partial<GameState>) => {
    gameStateRef.current = { ...gameStateRef.current, ...updates };
    setGameState({ ...gameStateRef.current });
  };

  const moveInput = useRef({ x: 0, y: 0 });
  const lookInput = useRef({ x: 0, y: 0 });
  const keys = useRef<{ [key: string]: boolean }>({});

  const spawnEnemy = () => {
    if (!sceneRef.current || !playerRef.current) return;
    const angle = Math.random() * Math.PI * 2;
    const distance = 20 + Math.random() * 10;
    const x = playerRef.current.position.x + Math.cos(angle) * distance;
    const z = playerRef.current.position.z + Math.sin(angle) * distance;
    const enemy = new Enemy(sceneRef.current, new THREE.Vector3(x, 1, z));
    enemiesRef.current.push(enemy);
  };

  const shoot = () => {
    if (!sceneRef.current || !playerRef.current || !cameraRef.current || gameStateRef.current.isGameOver || gameStateRef.current.isPaused) return;
    
    const direction = new THREE.Vector3();
    cameraRef.current.getWorldDirection(direction);
    
    const bullet = new Bullet(sceneRef.current, playerRef.current.position.clone().add(new THREE.Vector3(0, 1.5, 0)), direction);
    bulletsRef.current.push(bullet);
  };

  useEffect(() => {
    if (!containerRef.current) return;

    // Scene setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0a0f);
    scene.fog = new THREE.FogExp2(0x0a0a0f, 0.04);
    sceneRef.current = scene;

    // Camera setup
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    cameraRef.current = camera;

    // Renderer setup
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0x404040, 2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(10, 20, 10);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    // Floor
    const gridHelper = new THREE.GridHelper(100, 50, 0x00ff88, 0x222222);
    scene.add(gridHelper);

    const floorGeo = new THREE.PlaneGeometry(200, 200);
    const floorMat = new THREE.MeshStandardMaterial({ 
      color: 0x111111,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    scene.add(floor);

    // Player Group
    const player = new THREE.Group();
    player.position.y = 0;
    scene.add(player);
    player.add(camera);
    camera.position.y = 1.7; // Eye level
    playerRef.current = player;

    // Test Cube
    const testCube = new THREE.Mesh(
      new THREE.BoxGeometry(1, 1, 1),
      new THREE.MeshStandardMaterial({ color: 0x00ff00, emissive: 0x00ff00, emissiveIntensity: 0.5 })
    );
    testCube.position.set(0, 0.5, -5);
    scene.add(testCube);

    // Input handling
    const onKeyDown = (e: KeyboardEvent) => { keys.current[e.code] = true; if (e.code === 'Space') shoot(); };
    const onKeyUp = (e: KeyboardEvent) => { keys.current[e.code] = false; };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);

    // Mouse look (Desktop)
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement === renderer.domElement) {
        player.rotation.y -= e.movementX * 0.004;
        camera.rotation.x -= e.movementY * 0.004;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));
      }
    };
    window.addEventListener('mousemove', onMouseMove);

    // Resize handling
    const resizeObserver = new ResizeObserver((entries) => {
      if (!entries[0]) return;
      const { width, height } = entries[0].contentRect;
      if (width === 0 || height === 0) return;
      
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
      renderer.setSize(width, height);
    });
    resizeObserver.observe(containerRef.current);

    // Animation loop
    let lastSpawn = 0;
    const animate = () => {
      requestAnimationFrame(animate);
      const delta = clockRef.current.getDelta();

      if (!gameStateRef.current.isPaused && !gameStateRef.current.isGameOver) {
        // Movement
        const moveX = (keys.current['KeyD'] ? 1 : 0) - (keys.current['KeyA'] ? 1 : 0) + moveInput.current.x;
        const moveZ = (keys.current['KeyS'] ? 1 : 0) - (keys.current['KeyW'] ? 1 : 0) - moveInput.current.y;
        
        const moveDir = new THREE.Vector3(moveX, 0, moveZ).normalize();
        moveDir.applyQuaternion(player.quaternion);
        player.position.add(moveDir.multiplyScalar(15 * delta));

        // Look (Mobile)
        player.rotation.y += lookInput.current.x * 4 * delta;
        camera.rotation.x += lookInput.current.y * 4 * delta;
        camera.rotation.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, camera.rotation.x));

        // Spawn enemies
        lastSpawn += delta;
        if (lastSpawn > 2) {
          spawnEnemy();
          lastSpawn = 0;
        }

        // Update enemies
        enemiesRef.current.forEach((enemy, index) => {
          enemy.update(player.position, delta);
          
          // Collision with player
          if (enemy.mesh.position.distanceTo(player.position) < 1.5) {
            const newHealth = Math.max(0, gameStateRef.current.health - 10 * delta * 5);
            if (newHealth <= 0) {
              updateGameState({ health: 0, isGameOver: true });
            } else {
              updateGameState({ health: newHealth });
            }
          }
        });

        // Update bullets
        bulletsRef.current.forEach((bullet, bIndex) => {
          bullet.update(delta);
          
          // Hit detection
          enemiesRef.current.forEach((enemy, eIndex) => {
            if (bullet.mesh.position.distanceTo(enemy.mesh.position) < 1) {
              enemy.destroy(scene);
              enemiesRef.current.splice(eIndex, 1);
              bullet.life = 0;
              updateGameState({ score: gameStateRef.current.score + 100 });
            }
          });

          if (bullet.life <= 0) {
            bullet.destroy(scene);
            bulletsRef.current.splice(bIndex, 1);
          }
        });
      }

      renderer.render(scene, camera);
    };
    animate();

    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('mousemove', onMouseMove);
      resizeObserver.disconnect();
      if (containerRef.current && renderer.domElement) {
        containerRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [gameState.isGameOver]); // We still want to restart on game over to clear scene

  const resetGame = () => {
    enemiesRef.current.forEach(e => e.destroy(sceneRef.current!));
    bulletsRef.current.forEach(b => b.destroy(sceneRef.current!));
    enemiesRef.current = [];
    bulletsRef.current = [];
    playerRef.current!.position.set(0, 0, 0);
    updateGameState({
      score: 0,
      health: 100,
      isGameOver: false,
      isPaused: false,
    });
  };

  const startGame = () => {
    updateGameState({ isPaused: false });
    if (containerRef.current && !('ontouchstart' in window)) {
      rendererRef.current?.domElement.requestPointerLock();
    }
  };

  return (
    <div className="relative w-full h-full overflow-hidden bg-black font-sans text-white">
      <div ref={containerRef} className="absolute inset-0" />

      {/* HUD */}
      {!gameState.isPaused && !gameState.isGameOver && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 md:p-10">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-1">
              <div className="flex items-center gap-2 text-emerald-400">
                <Trophy size={20} />
                <span className="text-2xl font-bold font-mono tracking-tighter">{gameState.score.toLocaleString()}</span>
              </div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/40">Score</span>
            </div>
            
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-2 text-rose-500">
                <span className="text-2xl font-bold font-mono tracking-tighter">{Math.ceil(gameState.health)}%</span>
                <Heart size={20} fill="currentColor" />
              </div>
              <div className="w-32 h-1 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  className="h-full bg-rose-500"
                  initial={{ width: "100%" }}
                  animate={{ width: `${gameState.health}%` }}
                />
              </div>
            </div>
          </div>

          {/* Crosshair */}
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 opacity-50">
            <div className="w-8 h-8 flex items-center justify-center">
              <div className="w-1 h-1 bg-white rounded-full" />
              <div className="absolute w-4 h-[1px] bg-white -left-1" />
              <div className="absolute w-4 h-[1px] bg-white -right-1" />
              <div className="absolute h-4 w-[1px] bg-white -top-1" />
              <div className="absolute h-4 w-[1px] bg-white -bottom-1" />
            </div>
          </div>

          {/* Mobile Controls */}
          <div className="flex justify-between items-end pointer-events-auto">
            <Joystick 
              label="Move"
              onMove={(x, y) => { moveInput.current = { x, y }; }}
              onEnd={() => { moveInput.current = { x: 0, y: 0 }; }}
            />
            
            <div className="flex flex-col items-center gap-6">
              <button 
                className="w-24 h-24 rounded-full bg-rose-500/20 border-2 border-rose-500/50 flex items-center justify-center active:scale-95 transition-transform shadow-[0_0_30px_rgba(244,63,94,0.3)]"
                onPointerDown={(e) => { e.stopPropagation(); shoot(); }}
              >
                <div className="w-16 h-16 rounded-full bg-rose-500 flex items-center justify-center">
                  <Crosshair size={32} />
                </div>
              </button>
              <Joystick 
                label="Look"
                onMove={(x, y) => { lookInput.current = { x: x * 1.5, y: y * 1.5 }; }}
                onEnd={() => { lookInput.current = { x: 0, y: 0 }; }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Menus */}
      <AnimatePresence>
        {(gameState.isPaused || gameState.isGameOver) && (
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md"
          >
            <div className="max-w-md w-full p-8 text-center">
              <motion.h1 
                initial={{ y: 20 }}
                animate={{ y: 0 }}
                className="text-6xl font-black italic tracking-tighter mb-2"
              >
                {gameState.isGameOver ? "WASTED" : "NEON STRIKE"}
              </motion.h1>
              <p className="text-white/50 text-sm uppercase tracking-[0.3em] mb-12">
                {gameState.isGameOver ? "Mission Failed" : "Tactical FPS Protocol"}
              </p>

              {gameState.isGameOver && (
                <div className="mb-12">
                  <div className="text-4xl font-mono font-bold text-emerald-400 mb-1">
                    {gameState.score.toLocaleString()}
                  </div>
                  <div className="text-[10px] uppercase tracking-widest text-white/30">Final Score</div>
                </div>
              )}

              <div className="flex flex-col gap-4">
                <button 
                  onClick={gameState.isGameOver ? resetGame : startGame}
                  className="group relative px-8 py-4 bg-white text-black font-bold uppercase tracking-widest overflow-hidden transition-all hover:scale-105 active:scale-95"
                >
                  <div className="relative z-10 flex items-center justify-center gap-2">
                    {gameState.isGameOver ? <RefreshCw size={20} /> : <Play size={20} />}
                    {gameState.isGameOver ? "Deploy Again" : "Initialize"}
                  </div>
                  <div className="absolute inset-0 bg-emerald-400 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                </button>

                {!gameState.isGameOver && (
                  <div className="grid grid-cols-2 gap-4 mt-8 text-left">
                    <div className="p-4 border border-white/10 rounded-lg">
                      <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">PC Controls</div>
                      <div className="text-xs space-y-1">
                        <p><span className="text-emerald-400 font-mono">WASD</span> Move</p>
                        <p><span className="text-emerald-400 font-mono">MOUSE</span> Look</p>
                        <p><span className="text-emerald-400 font-mono">SPACE</span> Fire</p>
                      </div>
                    </div>
                    <div className="p-4 border border-white/10 rounded-lg">
                      <div className="text-[10px] uppercase tracking-widest text-white/30 mb-2">Mobile</div>
                      <div className="text-xs space-y-1">
                        <p><span className="text-rose-400 font-mono">LEFT</span> Move</p>
                        <p><span className="text-rose-400 font-mono">RIGHT</span> Look</p>
                        <p><span className="text-rose-400 font-mono">BUTTON</span> Fire</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
