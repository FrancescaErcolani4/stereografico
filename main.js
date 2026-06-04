let canvas, gl;
let program;

// Matrici (m4.js)
let modelViewMatrix, projectionMatrix, viewMatrix, normalMatrix, matrixLocation;
let viewMatrixLoc, normalMatrixLoc;

// Buffers
let positionBuffer, colorBuffer, normalBuffer;
let points = [],
  colors = [],
  normals = [];

// Geometria
const R = 1.5;
let sphereStart, sphereCount;
let planeStart, planeCount;
let rayStart, rayCount;
let markerStart, markerCount;
let shadowCircleStart, shadowCircleCount;
let trailStart, trailCount;

// Traccia del movimento (trail)
let trailPoints = [];
const MAX_TRAIL_LENGTH = 1000;
let trailBufferDirty = false;

// Stato
let time = 0.0;
let isRunning = true;
let params = {
  useLighting: true,
  showShadow: true,
  showProjectionPoint: true,
  showStatistics: true,
  rayRotation: 0,
  cameraPreset: "default",
  lightIntensity: 1.0,
  transparency: 0.4,
  wireframeMode: true,
  animationSpeed: 1.0,
  sphereColor: [0.3, 0.5, 1.0],
  rayColor: [1.0, 0.0, 1.0],
  planeColor: [0.3, 0.3, 0.3],
};

// ID della richiesta di animazione (per poterla cancellare quando si passa alla vista GeoGebra)
let rafId = null;

let lightPos = [3.5, 4.0, 3.5];
let cameraPos = [0.0, 3.5, 5.5];
let cameraTarget = [0.0, -0.5, 0.0];

// Controllo camera con mouse (coordinate sferiche)
let cameraDistance = 6.0;
let minCameraDistance = 1.5;
let maxCameraDistance = 15.0;
let cameraAzimuth = Math.atan2(5.5, 0.0); // Angolo azimutale
let cameraElevation = Math.asin(3.5 / cameraDistance); // Angolo di elevazione
let isDragging = false;
let lastMouseX = 0,
  lastMouseY = 0;
const MOUSE_SENSITIVITY = 0.005; // Sensibilità del mouse

// Statistiche
let stats = {
  spherePoint: [0, 0, 0],
  projectionPoint: [0, 0, 0],
  distance: 0,
  distanceFactor: 0,
};

window.onload = function init() {
  // OVERLAY: Aggiungi event listener al bottone
  const overlayBtn = document.querySelector(".overlay-btn");
  const overlay = document.getElementById("attenzione-overlay");
  if (overlayBtn) {
    overlayBtn.addEventListener("click", function () {
      overlay.style.display = "none";
    });
  }

  canvas = document.getElementById("gl-canvas");

  // Ridimensiona canvas per riempire lo schermo mantenendo aspect ratio
  resizeCanvas();
  window.addEventListener("resize", resizeCanvas);

  gl = canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
  if (!gl) {
    alert("WebGL non disponibile!");
    return;
  }

  gl.viewport(0, 0, canvas.width, canvas.height);
  gl.clearColor(0.07, 0.07, 0.07, 1.0);
  gl.enable(gl.DEPTH_TEST);
  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // Compila shader
  const vsSource = document.getElementById("vertex-shader").text;
  const fsSource = document.getElementById("fragment-shader").text;
  program = createProgram(gl, vsSource, fsSource);
  gl.useProgram(program);

  // Genera geometria
  generaGeometria();

  // Setup Buffer Posizioni
  positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(points), gl.DYNAMIC_DRAW);

  let vPosition = gl.getAttribLocation(program, "vPosition");
  gl.vertexAttribPointer(vPosition, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vPosition);

  // Setup Buffer Colori
  colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

  let vColor = gl.getAttribLocation(program, "vColor");
  gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vColor);

  // Setup Buffer Normali
  normalBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, normalBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(normals), gl.DYNAMIC_DRAW);

  let vNormal = gl.getAttribLocation(program, "vNormal");
  gl.vertexAttribPointer(vNormal, 3, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(vNormal);

  // Uniform locations
  matrixLocation = gl.getUniformLocation(program, "u_matrix");
  viewMatrixLoc = gl.getUniformLocation(program, "u_viewMatrix");
  normalMatrixLoc = gl.getUniformLocation(program, "u_normalMatrix");

  let useLightingLoc = gl.getUniformLocation(program, "u_useLighting");
  let lightPosLoc = gl.getUniformLocation(program, "u_lightPos");
  let viewPosLoc = gl.getUniformLocation(program, "u_viewPos");
  let lightColorLoc = gl.getUniformLocation(program, "u_lightColor");

  // Setup pannello di controllo personalizzato e inizia rendering
  setupControlPanel();
  render();
};

function generaGeometria() {
  // SFERA con normali
  sphereStart = points.length / 4;
  let bands = 25;
  for (let i = 0; i <= bands; i++) {
    let lat = (i * Math.PI) / bands - Math.PI / 2;
    for (let j = 0; j <= bands; j++) {
      let lon = (j * 2 * Math.PI) / bands;
      let x = R * Math.cos(lat) * Math.cos(lon);
      let y = R * Math.sin(lat);
      let z = R * Math.cos(lat) * Math.sin(lon);

      points.push(x, y, z, 1.0);
      colors.push(0.3, 0.5, 1.0, 0.4); // Blu trasparente

      // Normali = vettore dal centro verso il vertice (per sfera)
      let nx = x / R,
        ny = y / R,
        nz = z / R;
      normals.push(nx, ny, nz);
    }
  }
  sphereCount = points.length / 4 - sphereStart;

  // PIANO DI PROIEZIONE (Y = -R)
  planeStart = points.length / 4;
  let size = 8.0;
  let lines = 8;
  for (let i = -lines; i <= lines; i++) {
    let c = (i / lines) * size;
    points.push(-size, -R, c, 1.0, size, -R, c, 1.0);
    points.push(c, -R, -size, 1.0, c, -R, size, 1.0);
    for (let k = 0; k < 4; k++) {
      colors.push(0.3, 0.3, 0.3, 1.0); // Grigio
      normals.push(0, 1, 0); // Normale verso l'alto
    }
  }
  planeCount = points.length / 4 - planeStart;

  // RAGGIO LUMINOSO
  rayStart = points.length / 4;
  points.push(0.0, R, 0.0, 1.0);
  points.push(0.0, 0.0, 0.0, 1.0);
  points.push(0.0, -R, 0.0, 1.0);
  for (let k = 0; k < 3; k++) {
    colors.push(1.0, 0.0, 1.0, 1.0); // Fucsia
    normals.push(0, 0, 1); // Dummy normal
  }
  rayCount = 3;

  // MARKER LUMINOSO (piccola sfera sul punto di proiezione)
  markerStart = points.length / 4;
  let markerRadius = 0.15;
  let markerBands = 8;
  for (let i = 0; i <= markerBands; i++) {
    let lat = (i * Math.PI) / markerBands - Math.PI / 2;
    for (let j = 0; j <= markerBands; j++) {
      let lon = (j * 2 * Math.PI) / markerBands;
      let x = markerRadius * Math.cos(lat) * Math.cos(lon);
      let y = markerRadius * Math.sin(lat);
      let z = markerRadius * Math.cos(lat) * Math.sin(lon);

      points.push(x, y + -R, z, 1.0); // Inizialmente al piano
      colors.push(1.0, 1.0, 0.0, 0.8); // Giallo brillante
      normals.push(x / markerRadius, y / markerRadius, z / markerRadius);
    }
  }
  markerCount = points.length / 4 - markerStart;

  // CERCHIO D'OMBRA (traccia circolare sul piano)
  shadowCircleStart = points.length / 4;
  let shadowRadius = 2.0;
  let shadowSegments = 32;
  for (let i = 0; i <= shadowSegments; i++) {
    let angle = (i / shadowSegments) * Math.PI * 2;
    let x = shadowRadius * Math.cos(angle);
    let z = shadowRadius * Math.sin(angle);

    points.push(x, -R + 0.01, z, 1.0); // Leggermente sopra il piano
    colors.push(0.5, 0.0, 0.5, 0.3); // Viola semitrasparente
    normals.push(0, 1, 0);
  }
  shadowCircleCount = shadowSegments + 1;

  // TRAIL (traccia storica) - PIÙ VISIBILE
  trailStart = points.length / 4;
  // Pre-alloca spazio per il trail
  for (let i = 0; i < MAX_TRAIL_LENGTH; i++) {
    points.push(0.0, -R, 0.0, 1.0);
    // Colore graduale da giallo brillante a arancione (più visibile)
    let alpha = 0.2 + (i / MAX_TRAIL_LENGTH) * 0.7; // Alpha 0.2-0.9
    let hue = i / MAX_TRAIL_LENGTH; // 0 a 1
    let r = 1.0;
    let g = 1.0 - hue * 0.5; // Giallo -> Arancione
    let b = 0.0;
    colors.push(r, g, b, alpha); // Giallo-Arancione
    normals.push(0, 1, 0);
  }
  trailCount = MAX_TRAIL_LENGTH;
}

function render() {
  gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

  if (isRunning) {
    time += 0.015 * params.animationSpeed;
  }

  // CAMERA basata su preset
  updateCameraPreset();

  // Matrici
  let aspect = canvas.width / canvas.height;
  projectionMatrix = m4.perspective((45 * Math.PI) / 180, aspect, 0.1, 100.0);

  let cameraMatrix = m4.lookAt(cameraPos, cameraTarget, [0.0, 1.0, 0.0]);
  viewMatrix = m4.inverse(cameraMatrix);

  let viewProjectionMatrix = m4.multiply(projectionMatrix, viewMatrix);

  // PROIEZIONE STEREOGRAFICA
  let theta = Math.sin(time + params.rayRotation) * 0.4 + Math.PI / 2.5;
  let phi = time * 1.2 + params.rayRotation * 2.0;

  let x_sph = R * Math.sin(theta) * Math.cos(phi);
  let y_sph = R * Math.cos(theta);
  let z_sph = R * Math.sin(theta) * Math.sin(phi);

  // Proiezione sul piano Y = -R
  let t = (2 * R) / (R - y_sph);
  let x_plane = t * x_sph;
  let z_plane = t * z_sph;
  let y_plane = -R;

  // Salva statistiche
  stats.spherePoint = [x_sph, y_sph, z_sph];
  stats.projectionPoint = [x_plane, y_plane, z_plane];
  stats.distance = Math.sqrt(x_sph * x_sph + y_sph * y_sph + z_sph * z_sph);
  stats.distanceFactor = t;

  // Aggiorna raggio nel buffer
  let idx1 = (rayStart + 1) * 4;
  points[idx1] = x_sph;
  points[idx1 + 1] = y_sph;
  points[idx1 + 2] = z_sph;

  let idx2 = (rayStart + 2) * 4;
  points[idx2] = x_plane;
  points[idx2 + 1] = y_plane;
  points[idx2 + 2] = z_plane;

  // AGGIORNA MARKER (sposta la sfera piccola al punto di proiezione)
  let markerMarginY = 0.05; // Leggermente sopra il piano
  let markerOffset = markerStart * 4;
  for (let i = 0; i < markerCount * 4; i += 4) {
    // Relative position della marker
    let relX = points[markerOffset + i];
    let relY = points[markerOffset + i + 1] + R; // Rimuovi l'offset iniziale
    let relZ = points[markerOffset + i + 2];

    // Nuovo centro marker
    points[markerOffset + i] = x_plane + relX;
    points[markerOffset + i + 1] = -R + markerMarginY + relY;
    points[markerOffset + i + 2] = z_plane + relZ;
  }

  // AGGIORNA CERCHIO D'OMBRA (scala dinamica in base a t)
  let shadowRadius = Math.min(3.0, Math.abs(t) * 0.5); // Scala con il fattore di proiezione
  let shadowOffset = shadowCircleStart * 4;
  for (let i = 0; i < shadowCircleCount; i++) {
    let angle = (i / shadowCircleCount) * Math.PI * 2;
    let sx = shadowRadius * Math.cos(angle);
    let sz = shadowRadius * Math.sin(angle);

    points[shadowOffset + i * 4] = x_plane + sx;
    points[shadowOffset + i * 4 + 1] = -R + 0.02;
    points[shadowOffset + i * 4 + 2] = z_plane + sz;
  }

  // AGGIORNA TRAIL (traccia storica del movimento)
  if (isRunning) {
    trailPoints.unshift([x_plane, -R + 0.03, z_plane]);
    if (trailPoints.length > MAX_TRAIL_LENGTH) {
      trailPoints.pop();
    }
    trailBufferDirty = true;
  }

  if (trailBufferDirty) {
    let trailOffset = trailStart * 4;
    for (let i = 0; i < trailPoints.length; i++) {
      let pt = trailPoints[i];
      points[trailOffset + i * 4] = pt[0];
      points[trailOffset + i * 4 + 1] = pt[1];
      points[trailOffset + i * 4 + 2] = pt[2];
    }
    // Riempie il resto con il punto corrente
    for (let i = trailPoints.length; i < MAX_TRAIL_LENGTH; i++) {
      points[trailOffset + i * 4] = x_plane;
      points[trailOffset + i * 4 + 1] = -R + 0.03;
      points[trailOffset + i * 4 + 2] = z_plane;
    }
    trailBufferDirty = false;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Float32Array(points));

  // ILLUMINAZIONE
  let useLightingLoc = gl.getUniformLocation(program, "u_useLighting");
  let lightPosLoc = gl.getUniformLocation(program, "u_lightPos");
  let viewPosLoc = gl.getUniformLocation(program, "u_viewPos");
  let lightColorLoc = gl.getUniformLocation(program, "u_lightColor");

  gl.uniform1i(useLightingLoc, params.useLighting);
  gl.uniform3f(lightPosLoc, lightPos[0], lightPos[1], lightPos[2]);
  gl.uniform3f(viewPosLoc, cameraPos[0], cameraPos[1], cameraPos[2]);

  let lightIntensity = params.useLighting ? params.lightIntensity : 1.0;
  gl.uniform3f(lightColorLoc, lightIntensity, lightIntensity, lightIntensity);

  // Matrici uniformi
  gl.uniformMatrix4fv(matrixLocation, false, viewProjectionMatrix);
  gl.uniformMatrix4fv(viewMatrixLoc, false, viewMatrix);

  // Normal matrix (inversa-trasposta della matrice vista-modello)
  let normalMat = m4.transpose(m4.inverse(viewMatrix));
  gl.uniformMatrix4fv(normalMatrixLoc, false, normalMat);

  // DISEGNO
  // Sfera
  gl.drawArrays(gl.LINE_STRIP, sphereStart, sphereCount);

  // Piano con ombra
  if (params.showShadow) {
    gl.drawArrays(gl.LINES, planeStart, planeCount);
  }

  // Raggio
  gl.drawArrays(gl.LINE_STRIP, rayStart, rayCount);

  // Marker luminoso (palla gialla sul punto di proiezione)
  if (params.showProjectionPoint) {
    gl.drawArrays(gl.LINE_STRIP, markerStart, markerCount);
  }

  // Cerchio d'ombra
  if (params.showShadow) {
    gl.drawArrays(gl.LINE_LOOP, shadowCircleStart, shadowCircleCount);
  }

  // Trail (traccia del movimento) - sempre visibile se statistiche abilitate
  if (trailPoints.length > 1) {
    gl.drawArrays(
      gl.LINE_STRIP,
      trailStart,
      Math.min(trailPoints.length, trailCount),
    );
  }

  // Mostra statistiche nel console / overlay
  if (params.showStatistics) {
    updateStatsDisplay();
  }

  rafId = requestAnimationFrame(render);
}

// Helper nativo per compilare gli shader senza utility esterne
function createProgram(gl, vs, fs) {
  let vShader = gl.createShader(gl.VERTEX_SHADER);
  gl.shaderSource(vShader, vs);
  gl.compileShader(vShader);

  if (!gl.getShaderParameter(vShader, gl.COMPILE_STATUS)) {
    console.error("Vertex Shader Error:", gl.getShaderInfoLog(vShader));
  }

  let fShader = gl.createShader(gl.FRAGMENT_SHADER);
  gl.shaderSource(fShader, fs);
  gl.compileShader(fShader);

  if (!gl.getShaderParameter(fShader, gl.COMPILE_STATUS)) {
    console.error("Fragment Shader Error:", gl.getShaderInfoLog(fShader));
  }

  let prog = gl.createProgram();
  gl.attachShader(prog, vShader);
  gl.attachShader(prog, fShader);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("Program Link Error:", gl.getProgramInfoLog(prog));
  }

  return prog;
}

function resizeCanvas() {
  const targetWidth = window.innerWidth;
  const targetHeight = window.innerHeight;
  const targetAspect = targetWidth / targetHeight;
  const canvasAspect = 4 / 3; // Aspect ratio preferito (800/600)

  let newWidth, newHeight;

  if (targetAspect > canvasAspect) {
    // Finestra più larga, scaling limitato dall'altezza
    newHeight = targetHeight;
    newWidth = newHeight * canvasAspect;
  } else {
    // Finestra più stretta, scaling limitato dalla larghezza
    newWidth = targetWidth;
    newHeight = newWidth / canvasAspect;
  }

  canvas.width = Math.round(newWidth);
  canvas.height = Math.round(newHeight);

  canvas.style.position = "absolute";
  canvas.style.left = (targetWidth - canvas.width) / 2 + "px";
  canvas.style.top = (targetHeight - canvas.height) / 2 + "px";

  if (gl) {
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
}

function updateStatsDisplay() {
  // Crea/aggiorna div statistiche (in alto a destra)
  let statsDiv = document.getElementById("stats-display");
  if (!statsDiv) {
    statsDiv = document.createElement("div");
    statsDiv.id = "stats-display";
    statsDiv.style.cssText = `
            position: fixed;
            bottom: 20px;
            right: 20px;
            background: rgba(20, 20, 40, 0.9);
            color: #64f264;
            font-family: monospace;
            font-size: 12px;
            padding: 15px;
            border: 1px solid #64a4ff;
            border-radius: 8px;
            z-index: 100;
            pointer-events: none;
            white-space: pre-wrap;
            max-width: 250px;
        `;
    document.body.appendChild(statsDiv);
  }
  if (params.showStatistics) {
    statsDiv.style.display = "block";
  }
  let content = "STATISTICHE LIVE\n";
  content += "═════════════════\n";
  content += `Sfera (X,Y,Z):\n`;
  content += `  ${stats.spherePoint[0].toFixed(3)}\n`;
  content += `  ${stats.spherePoint[1].toFixed(3)}\n`;
  content += `  ${stats.spherePoint[2].toFixed(3)}\n`;
  content += `\nProiezione (X,Y,Z):\n`;
  content += `  ${stats.projectionPoint[0].toFixed(3)}\n`;
  content += `  ${stats.projectionPoint[1].toFixed(3)}\n`;
  content += `  ${stats.projectionPoint[2].toFixed(3)}\n`;
  content += `\nFattore scala: ${stats.distanceFactor.toFixed(3)}\n`;
  content += `Tempo: ${time.toFixed(2)}s`;

  statsDiv.textContent = content;
}

function setupControlPanel() {
  // Gestori per i pulsanti della camera
  document.querySelectorAll(".camera-btn").forEach((btn) => {
    btn.addEventListener("click", function () {
      params.cameraPreset = this.dataset.preset;
      document
        .querySelectorAll(".camera-btn")
        .forEach((b) => b.classList.remove("active"));
      this.classList.add("active");
    });
  });
  // Aggiungi active al primo
  document.querySelector('[data-preset="default"]').classList.add("active");

  // Slider intensità luce
  const intensitySlider = document.getElementById("intensity-slider");
  const intensityValue = document.getElementById("intensity-value");
  intensitySlider.addEventListener("input", function () {
    params.lightIntensity = parseFloat(this.value);
    intensityValue.textContent = params.lightIntensity.toFixed(1);
  });

  // Slider zoom (distanza fotocamera)
  const zoomSlider = document.getElementById("zoom-slider");
  const zoomValue = document.getElementById("zoom-value");
  if (zoomSlider) {
    zoomSlider.addEventListener("input", function () {
      cameraDistance = parseFloat(this.value);
      zoomValue.textContent = cameraDistance.toFixed(1);
      params.cameraPreset = "none"; // Disattiva preset quando regoli zoom
      updateCameraFromSpherical();
    });
  }

  // Slider rotazione asticella
  const rotationSlider = document.getElementById("rotation-slider");
  const rotationValue = document.getElementById("rotation-value");
  rotationSlider.addEventListener("input", function () {
    params.rayRotation = parseFloat(this.value);
    rotationValue.textContent = (params.rayRotation / Math.PI).toFixed(2) + "π";
  });

  // Toggle illuminazione
  document
    .getElementById("lighting-toggle")
    .addEventListener("change", function () {
      params.useLighting = this.checked;
    });

  // Toggle piano
  document
    .getElementById("shadow-toggle")
    .addEventListener("change", function () {
      params.showShadow = this.checked;
    });

  // Toggle marker
  document
    .getElementById("marker-toggle")
    .addEventListener("change", function () {
      params.showProjectionPoint = this.checked;
    });

  // Toggle statistiche
  document
    .getElementById("stats-toggle")
    .addEventListener("change", function () {
      params.showStatistics = this.checked;
    });

  // Pulsanti animazione
  document.getElementById("play-btn").addEventListener("click", function () {
    isRunning = true;
  });

  document.getElementById("pause-btn").addEventListener("click", function () {
    isRunning = false;
  });

  document.getElementById("reset-btn").addEventListener("click", function () {
    time = 0;
    params.rayRotation = 0;
    trailPoints = [];
    document.getElementById("rotation-slider").value = 0;
    rotationValue.textContent = "0.00π";
  });

  // Pulsanti chiudi pannello
  document
    .getElementById("panel-close-btn")
    .addEventListener("click", function () {
      document.getElementById("control-panel").classList.add("hidden");
      document.getElementById("panel-open-btn").classList.add("show");
    });

  // Pulsante apri pannello
  document
    .getElementById("panel-open-btn")
    .addEventListener("click", function () {
      document.getElementById("control-panel").classList.remove("hidden");
      this.classList.remove("show");
    });

  // Controllo camera con mouse drag
  const canvas = document.getElementById("gl-canvas");

  canvas.addEventListener("mousedown", function (e) {
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    params.cameraPreset = "none"; // Disattiva preset quando usi mouse
    canvas.style.cursor = "grabbing"; // Feedback visivo drag
  });

  canvas.addEventListener("mousemove", function (e) {
    if (!isDragging) return;

    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;

    // Aggiorna angoli sferici in base al movimento mouse
    cameraAzimuth -= deltaX * MOUSE_SENSITIVITY;
    cameraElevation += deltaY * MOUSE_SENSITIVITY;

    // Limita elevazione tra -89° e +89°
    const maxElev = Math.PI / 2.2;
    cameraElevation = Math.max(-maxElev, Math.min(maxElev, cameraElevation));

    updateCameraFromSpherical();

    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
  });

  canvas.addEventListener("mouseup", function () {
    isDragging = false;
    canvas.style.cursor = "grab"; // Torna al cursore grab
  });

  canvas.addEventListener("mouseleave", function () {
    isDragging = false;
    canvas.style.cursor = "grab";
  });

  // Zoom con rotella del mouse
  canvas.addEventListener(
    "wheel",
    function (e) {
      e.preventDefault();
      const zoomSpeed = 1.08; // Velocità zoom
      const scrollDelta = e.deltaY > 0 ? 1 / zoomSpeed : zoomSpeed; // Zoom out con scorrimento giù
      cameraDistance = Math.max(
        minCameraDistance,
        Math.min(maxCameraDistance, cameraDistance * scrollDelta),
      );
      // Aggiorna lo slider zoom
      const zoomSliderElement = document.getElementById("zoom-slider");
      const zoomValueElement = document.getElementById("zoom-value");
      if (zoomSliderElement) {
        zoomSliderElement.value = cameraDistance.toFixed(1);
      }
      if (zoomValueElement) {
        zoomValueElement.textContent = cameraDistance.toFixed(1);
      }
      params.cameraPreset = "none"; // Disattiva preset
      updateCameraFromSpherical();
    },
    { passive: false },
  );

  /* =========================================================================
     CORRETTO: Logica pulsanti Viste Separate con Iniezione Proiezione 3D GeoGebra
     ========================================================================= */
  (function setupGeoGebraView() {
    let ggbIframeInjected = false;
    const geogebraBtn = document.getElementById("geogebra-btn");
    const viewGeo = document.getElementById("view-geogebra");
    const viewWeb = document.getElementById("view-webgl");
    const backBtn = document.getElementById("btn-back-to-webgl");

    function pauseAnimation() {
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = null;
      }
    }

    function resumeAnimation() {
      if (!rafId) rafId = requestAnimationFrame(render);
    }

    function openGeo() {
      if (!viewGeo || !viewWeb) return;
      viewWeb.classList.add("hidden"); // Nasconde la schermata principale WebGL
      viewGeo.classList.remove("hidden"); // Mostra la schermata GeoGebra
      pauseAnimation(); // Ferma WebGL

      // === FIX STATISTICHE VERDI ===
      // Nasconde il riquadro verde delle statistiche quando siamo su GeoGebra
      const statsDiv = document.getElementById("stats-display");
      if (statsDiv) {
        statsDiv.style.display = "none";
      }
      // ==============================

      if (!ggbIframeInjected) {
        const ggbElement = document.getElementById("ggb-element");
        if (ggbElement) {
          ggbElement.innerHTML = "";
          const iframe = document.createElement("iframe");
          iframe.src = "https://www.geogebra.org/material/iframe/id/ng4yaapq/width/800/height/600/ai/false/smb/false/stb/false/b/false/v/false/asb/false/sri/true/rc/false";
          iframe.className = "geogebra-iframe";
          iframe.allowFullscreen = true;
          iframe.loading = "lazy";
          ggbElement.appendChild(iframe);
          ggbIframeInjected = true;
        }
      }
    }

    function closeGeo() {
      if (!viewGeo || !viewWeb) return;
      viewGeo.classList.add("hidden"); // Nasconde lo schermo intero GeoGebra
      viewWeb.classList.remove("hidden"); // Ripristina la pagina principale WebGL

      // === FIX STATISTICHE VERDI ===
      // Se la checkbox delle statistiche nel pannello è attiva, mostra di nuovo il riquadro verde
      const statsToggle = document.getElementById("stats-toggle");
      const statsDiv = document.getElementById("stats-display");
      if (statsDiv && statsToggle && statsToggle.checked) {
        statsDiv.style.display = "block";
      }
      // ==============================

      resumeAnimation(); // Fa ripartire il ciclo di render
    }

    if (geogebraBtn) {
      geogebraBtn.addEventListener("click", openGeo);
    }
    if (backBtn) {
      backBtn.addEventListener("click", closeGeo);
    }
  })();
}

function updateCameraFromSpherical() {
  // Converte coordinate sferiche in cartesiane
  const cosElev = Math.cos(cameraElevation);
  cameraPos[0] =
    cameraTarget[0] + cameraDistance * Math.cos(cameraAzimuth) * cosElev;
  cameraPos[1] = cameraTarget[1] + cameraDistance * Math.sin(cameraElevation);
  cameraPos[2] =
    cameraTarget[2] + cameraDistance * Math.sin(cameraAzimuth) * cosElev;
}

function updateCameraPreset() {
  switch (params.cameraPreset) {
    case "top":
      cameraPos = [0.0, 8.0, 0.5];
      cameraTarget = [0.0, -0.5, 0.0];
      break;
    case "side":
      cameraPos = [7.0, 2.0, 2.0];
      cameraTarget = [0.0, 0.0, 0.0];
      break;
    case "front":
      cameraPos = [0.0, 2.0, 8.0];
      cameraTarget = [0.0, -0.5, 0.0];
      break;
    case "isometric":
      cameraPos = [4.0, 4.0, 4.0];
      cameraTarget = [0.0, 0.0, 0.0];
      break;

    // === Se l'utente usa il mouse, non resettare cameraPos ===
    case "none":
      break;
    // ===============================================================

    case "default":
    default:
      cameraPos = [0.0, 3.5, 5.5];
      cameraTarget = [0.0, -0.5, 0.0];
  }
}
