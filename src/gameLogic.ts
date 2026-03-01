import * as THREE from 'three';

export interface GameState {
  score: number;
  health: number;
  isGameOver: boolean;
  isPaused: boolean;
}

export class Enemy {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3 = new THREE.Vector3();
  id: string;

  constructor(scene: THREE.Scene, position: THREE.Vector3) {
    this.id = Math.random().toString(36).substr(2, 9);
    const geometry = new THREE.BoxGeometry(1, 2, 1);
    const material = new THREE.MeshStandardMaterial({ 
      color: 0xff0055,
      emissive: 0xff0055,
      emissiveIntensity: 0.5
    });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.mesh.castShadow = true;
    scene.add(this.mesh);
  }

  update(playerPos: THREE.Vector3, delta: number) {
    const direction = new THREE.Vector3().subVectors(playerPos, this.mesh.position).normalize();
    direction.y = 0; // Keep on ground
    this.mesh.position.add(direction.multiplyScalar(2 * delta));
    this.mesh.lookAt(playerPos.x, this.mesh.position.y, playerPos.z);
  }

  destroy(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}

export class Bullet {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  life: number = 2.0;

  constructor(scene: THREE.Scene, position: THREE.Vector3, direction: THREE.Vector3) {
    const geometry = new THREE.SphereGeometry(0.1, 8, 8);
    const material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
    this.mesh = new THREE.Mesh(geometry, material);
    this.mesh.position.copy(position);
    this.velocity = direction.clone().multiplyScalar(50);
    scene.add(this.mesh);
  }

  update(delta: number) {
    this.mesh.position.add(this.velocity.clone().multiplyScalar(delta));
    this.life -= delta;
  }

  destroy(scene: THREE.Scene) {
    scene.remove(this.mesh);
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
