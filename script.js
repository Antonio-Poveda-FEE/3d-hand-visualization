// Error handler function
function showError(message) {
  const errorElement = document.getElementById('error');
  errorElement.textContent = "Error: " + message;
  errorElement.style.display = 'block';
  document.getElementById('loading').style.display = 'none';
  console.error(message);
}

// Check if Three.js is loaded
if (typeof THREE === 'undefined') {
  showError("Three.js library failed to load. Please check your internet connection and try again.");
} else {
  try {
    // Scene, camera, renderer setup
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050510);

    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.z = 5;

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.shadowMap.enabled = true;
    document.body.appendChild(renderer.domElement);

    // Check if OrbitControls is loaded
    if (typeof THREE.OrbitControls === 'undefined') {
      showError("OrbitControls failed to load. Using limited controls instead.");
      // Provide basic fallback controls
      var controls = {
        update: function() {},
        enabled: true
      };
    } else {
      // Controls
      var controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
    }

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
    directionalLight.position.set(5, 5, 5);
    directionalLight.castShadow = true;
    scene.add(directionalLight);

    const blueLight = new THREE.PointLight(0x0044ff, 1, 10);
    blueLight.position.set(-5, 2, 3);
    scene.add(blueLight);

    const pinkLight = new THREE.PointLight(0xff00ff, 1, 10);
    pinkLight.position.set(5, -2, 3);
    scene.add(pinkLight);

    // Grid helper
    const gridHelper = new THREE.GridHelper(10, 10, 0x888888, 0x444444);
    scene.add(gridHelper);

    // Hand variables
    let hand;
    const fingers = {
      thumb: null,
      index: null,
      middle: null,
      ring: null,
      pinky: null
    };
    let activeFinger = null;

    // Hand material
    const handMaterial = new THREE.MeshStandardMaterial({
      color: 0xffe0d0,
      metalness: 0.1,
      roughness: 0.5,
    });

    // Create the hand
    function createHand() {
      console.log("Creating hand...");
      
      // Create hand group
      hand = new THREE.Group();
      scene.add(hand);

      // Create palm
      const palmGeometry = new THREE.BoxGeometry(1.5, 0.5, 2);
      const palm = new THREE.Mesh(palmGeometry, handMaterial);
      palm.position.set(0, 0, 0);
      hand.add(palm);

      // Create wrist
      const wristGeometry = new THREE.BoxGeometry(1.4, 0.4, 0.7);
      const wrist = new THREE.Mesh(wristGeometry, handMaterial);
      wrist.position.set(0, 0, -1.35);
      hand.add(wrist);

      // Create fingers
      createFinger('thumb', new THREE.Vector3(-0.7, 0, 0.8), 1.3, 0.18, -0.3);
      createFinger('index', new THREE.Vector3(-0.4, 0, 1), 1.5, 0.15, 0);
      createFinger('middle', new THREE.Vector3(0, 0, 1), 1.6, 0.16, 0);
      createFinger('ring', new THREE.Vector3(0.4, 0, 1), 1.5, 0.15, 0);
      createFinger('pinky', new THREE.Vector3(0.7, 0, 0.9), 1.2, 0.12, 0);

      // Position thumb differently
      if (fingers.thumb) {
        fingers.thumb.rotation.y = Math.PI / 4;
        fingers.thumb.rotation.z = -Math.PI / 5;
      }
      
      console.log("Hand created successfully");
    }

    // Create a finger
    function createFinger(name, position, length, thickness, angle) {
      const finger = new THREE.Group();
      finger.position.copy(position);
      finger.rotation.x = angle;
      
      // Create finger segments
      const segmentLength = length / 3;
      
      for (let i = 0; i < 3; i++) {
        const segmentGeometry = new THREE.BoxGeometry(thickness, thickness, segmentLength);
        const segment = new THREE.Mesh(segmentGeometry, handMaterial);
        segment.position.set(0, 0, (i + 0.5) * segmentLength);
        
        // Add joints
        if (i > 0) {
          const jointGeometry = new THREE.SphereGeometry(thickness * 0.6, 8, 8);
          const joint = new THREE.Mesh(jointGeometry, handMaterial);
          joint.position.set(0, 0, i * segmentLength);
          finger.add(joint);
        }
        
        finger.add(segment);
      }
      
      fingers[name] = finger;
      hand.add(finger);
    }

    // Event handlers
    function onMouseDown(event) {
      // Calculate mouse position
      const mouse = new THREE.Vector2(
        (event.clientX / window.innerWidth) * 2 - 1,
        -(event.clientY / window.innerHeight) * 2 + 1
      );

      // Raycasting to detect which finger is clicked
      const raycaster = new THREE.Raycaster();
      raycaster.setFromCamera(mouse, camera);
      
      const fingerObjects = Object.values(fingers).filter(f => f);
      const intersects = raycaster.intersectObjects(fingerObjects, true);

      if (intersects.length > 0) {
        // Find which finger was clicked
        let obj = intersects[0].object;
        let fingerName = null;
        
        while (obj && !fingerName) {
          for (const [name, finger] of Object.entries(fingers)) {
            if (finger === obj) {
              fingerName = name;
              break;
            }
          }
          obj = obj.parent;
        }
        
        if (fingerName) {
          activeFinger = fingerName;
          controls.enabled = false;
          updateStatus(`Currently moving: ${fingerName.charAt(0).toUpperCase() + fingerName.slice(1)} finger`);
        }
      }
    }

    function onMouseMove(event) {
      if (!activeFinger || !fingers[activeFinger]) return;
      
      // Calculate normalized movement
      const movementX = event.movementX / window.innerWidth * 5;
      const movementY = -event.movementY / window.innerHeight * 5;
      
      // Apply rotation to the active finger
      const finger = fingers[activeFinger];
      
      // Rotate around appropriate axis based on the finger
      if (activeFinger === 'thumb') {
        finger.rotation.z += movementX;
        finger.rotation.y += movementY;
      } else {
        finger.rotation.x += movementY;
      }
    }

    function onMouseUp() {
      activeFinger = null;
      controls.enabled = true;
      updateStatus('Click on a finger to move it');
    }

    function onWindowResize() {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function updateStatus(text) {
      document.getElementById('status').textContent = text;
    }

    // Animation loop
    function animate() {
      requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    }

    // Initialize
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('resize', onWindowResize);

    // Start everything
    createHand();
    animate();
    
    // Remove loading screen when everything is ready
    setTimeout(() => {
      document.getElementById('loading').style.display = 'none';
      console.log("App loaded successfully");
    }, 1000);
    
  } catch (e) {
    showError(e.message || "Unknown error occurred while initializing the 3D scene");
  }
}
