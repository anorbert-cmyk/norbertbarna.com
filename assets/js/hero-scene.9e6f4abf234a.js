/**
 * Portfolio chevron — original beveled geometry and refractive WebGL glass.
 * No imported model, rendering library, scroll interception or remote asset.
 */
(function () {
  "use strict";
  var host = document.querySelector(".home-mast-sculpture");
  var canvas = host && host.querySelector(".home-mast-canvas");
  if (!host || !canvas) return;
  var mast = host.closest(".home-mast") || host;
  var reducedQuery = matchMedia("(prefers-reduced-motion: reduce)");
  var fineQuery = matchMedia("(hover: hover) and (pointer: fine)");
  var listeners = new AbortController();
  var gl, program, texture, backdropTexture, backdropCanvas, finalTexture;
  var fragments = [], uniforms = {}, attributes = {};
  var frame = 0, previousTime = 0, destroyed = false, suspended = false, intersecting = true;
  var lost = false, initialized = false, assemblyStart = null, arrivalStarted = false;
  var pointer = { x: 0, y: 0, inside: false, tiltX: 0, tiltY: 0, targetX: 0, targetY: 0 };
  var drag = { active: false, x: 0, angle: 0, velocity: 0 };
  var width = 1, height = 1, cameraZ = 3.7, aspect = 1, sceneScale = 1;
  var morphProgress = 0, morphPose = { x: 0, y: 0, scale: 1 }, finalAspect = 1, finalOrientation;
  var finalArtwork = null, finalTimer = 0, readyDeadline = 0, cancelFinalLoad;
  var observer, resizeObserver, consentObserver, layoutDirty = false, resolveReady, reflectionArtwork = null, reflectionTimer = 0;
  var DEG = Math.PI / 180;
  var api = window.PortfolioHeroScene = {
    status: "loading",
    ready: new Promise(function (resolve) { resolveReady = resolve; }),
    start: start,
    finish: finish,
    setMorphProgress: setMorphProgress,
    destroy: destroy,
  };

  function reduced() {
    return reducedQuery.matches || document.documentElement.classList.contains("no-motion") ||
      Boolean(window.PortfolioMedia && window.PortfolioMedia.isReduced());
  }
  function clamp(value, low, high) { return Math.max(low, Math.min(high, value)); }
  function normalize(v) {
    var length = Math.hypot(v[0], v[1], v[2]) || 1;
    return [v[0] / length, v[1] / length, v[2] / length];
  }
  function identity() { return new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); }
  function multiply(a, b) {
    var out = new Float32Array(16);
    for (var column = 0; column < 4; column++) {
      for (var row = 0; row < 4; row++) {
        for (var k = 0; k < 4; k++) out[column * 4 + row] += a[k * 4 + row] * b[column * 4 + k];
      }
    }
    return out;
  }
  function compose(x, y, z, rx, ry, rz, scale) {
    var cx = Math.cos(rx), sx = Math.sin(rx), cy = Math.cos(ry), sy = Math.sin(ry);
    var cz = Math.cos(rz), sz = Math.sin(rz);
    var mx = new Float32Array([1, 0, 0, 0, 0, cx, sx, 0, 0, -sx, cx, 0, 0, 0, 0, 1]);
    var my = new Float32Array([cy, 0, -sy, 0, 0, 1, 0, 0, sy, 0, cy, 0, 0, 0, 0, 1]);
    var mz = new Float32Array([cz, sz, 0, 0, -sz, cz, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);
    var out = multiply(mz, multiply(my, mx));
    for (var i = 0; i < 12; i++) out[i] *= scale;
    out[12] = x; out[13] = y; out[14] = z;
    return out;
  }
  function perspective() {
    var near = .1, far = 30, f = 1 / Math.tan(75 * DEG / 2), matrix = new Float32Array(16);
    matrix[0] = f / aspect; matrix[5] = f;
    matrix[10] = (far + near) / (near - far); matrix[11] = -1;
    matrix[14] = 2 * far * near / (near - far);
    return matrix;
  }
  function transformPoint(matrix, point) {
    return [matrix[0] * point[0] + matrix[4] * point[1] + matrix[8] * point[2] + matrix[12],
      matrix[1] * point[0] + matrix[5] * point[1] + matrix[9] * point[2] + matrix[13],
      matrix[2] * point[0] + matrix[6] * point[1] + matrix[10] * point[2] + matrix[14]];
  }
  function project(point) {
    var f = 1 / Math.tan(75 * DEG / 2), depth = cameraZ - point[2];
    return { x: (point[0] * f / aspect / depth * .5 + .5) * width,
      y: (.5 - point[1] * f / depth * .5) * height };
  }

  // The original front surface becomes seven adjoining strips of one image
  // plane. Their shared UVs also define the target positions, so the artwork
  // cannot fan into unrelated triangles or double its silhouette at the end.
  function gateVertices(data, center) {
    var out = new Float32Array(data.length / 6 * 12);
    var inset = .062, extent = 1.7 - inset;
    var innerInset = inset * Math.hypot(1, 1.29 / 1.7);
    var outerInset = inset * Math.hypot(1, 1.32 / 1.7);
    for (var triangle = 0; triangle < data.length; triangle += 18) {
      var front = data[triangle + 5] > .999 && data[triangle + 11] > .999 && data[triangle + 17] > .999;
      for (var vertex = 0; vertex < 3; vertex++) {
        var source = triangle + vertex * 6, destination = source / 6 * 12;
        var x = data[source] + center[0], y = data[source + 1] + center[1];
        var reach = Math.abs(y) / 1.7;
        var inner = .33 - 1.29 * reach + innerInset;
        var outer = 1.36 - 1.32 * reach - outerInset;
        var u = clamp((x - inner) / (outer - inner), 0, 1);
        var join = -1.7 + Math.round((y + 1.7) / (3.4 / 7)) * (3.4 / 7);
        if (Math.abs(y - join) < .0015 && Math.abs(join) < 1.69) y = join;
        var v = clamp((y / extent + 1) / 2, 0, 1);
        out.set(data.subarray(source, source + 6), destination);
        out.set([u * 2 - 1, v * 2 - 1, 0, u, v, front ? 1 : 0], destination + 6);
      }
    }
    return out;
  }
  function gateRotation() {
    return multiply(compose(0, 0, 0, 20 * DEG, (innerWidth < 600 ? 12 : -8) * DEG, 0, 1), compose(0, 0, 0, 0, 0, Math.PI / 2, 1));
  }
  function fitGate() {
    var compact = innerWidth < 600;
    var box = { left: width * (compact ? .42 : .36), right: width * (compact ? 1.02 : .98),
      top: height * (compact ? .125 : .06), bottom: height * (compact ? .42 : .84) };
    var fittedWidth = Math.min(box.right - box.left, (box.bottom - box.top) * finalAspect);
    var fittedHeight = fittedWidth / finalAspect;
    var viewportHeight = 2 * cameraZ * Math.tan(75 * DEG / 2);
    morphPose = {
      x: ((box.left + box.right) / width - 1) * viewportHeight * aspect / 2,
      y: (1 - (box.top + box.bottom) / height) * viewportHeight / 2,
      scale: fittedHeight / height * viewportHeight / 2
    };
    // Cancel only the endpoint orientation. The existing 3D root rotation
    // remains live throughout the scroll; p1 is a front-facing exact artwork.
    var rotation = gateRotation(); finalOrientation = identity();
    for (var column = 0; column < 3; column++) {
      for (var row = 0; row < 3; row++) finalOrientation[column * 4 + row] = rotation[row * 4 + column];
    }
  }

  // Sutherland–Hodgman clipping makes independent horizontal slices of one >.
  function clipY(polygon, limit, keepAbove) {
    var out = [];
    polygon.forEach(function (p, i) {
      var q = polygon[(i + 1) % polygon.length];
      var insideP = keepAbove ? p[1] >= limit : p[1] <= limit;
      var insideQ = keepAbove ? q[1] >= limit : q[1] <= limit;
      if (insideP) out.push(p);
      if (insideP !== insideQ) {
        var t = (limit - p[1]) / (q[1] - p[1]);
        out.push([p[0] + (q[0] - p[0]) * t, limit]);
      }
    });
    return out;
  }
  function signedArea(polygon) {
    return polygon.reduce(function (sum, p, i) {
      var q = polygon[(i + 1) % polygon.length]; return sum + p[0] * q[1] - q[0] * p[1];
    }, 0) / 2;
  }
  function insetPolygon(polygon, distance) {
    return polygon.map(function (p, i) {
      var prev = polygon[(i + polygon.length - 1) % polygon.length], next = polygon[(i + 1) % polygon.length];
      var a = normalize([p[0] - prev[0], p[1] - prev[1], 0]);
      var b = normalize([next[0] - p[0], next[1] - p[1], 0]);
      // Internal cut lines meet flush. Only the silhouette carries a bevel.
      var da = Math.abs(prev[1] - p[1]) < .00001 && Math.abs(p[1]) < 1.69 ? 0 : distance;
      var db = Math.abs(next[1] - p[1]) < .00001 && Math.abs(p[1]) < 1.69 ? 0 : distance;
      var n1 = [-a[1], a[0]], n2 = [-b[1], b[0]];
      var determinant = n1[0] * n2[1] - n1[1] * n2[0];
      if (Math.abs(determinant) < .00001) return [p[0] + n1[0] * da, p[1] + n1[1] * da];
      return [p[0] + clamp((da * n2[1] - db * n1[1]) / determinant, -.18, .18),
        p[1] + clamp((n1[0] * db - n2[0] * da) / determinant, -.18, .18)];
    });
  }
  function cross(a, b, c) { return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]); }
  function triangulate(polygon) {
    var indices = polygon.map(function (_, i) { return i; }), triangles = [], budget = 100;
    while (indices.length > 3 && budget-- > 0) {
      var found = false;
      for (var i = 0; i < indices.length; i++) {
        var a = indices[(i + indices.length - 1) % indices.length], b = indices[i], c = indices[(i + 1) % indices.length];
        if (cross(polygon[a], polygon[b], polygon[c]) <= .000001) continue;
        var contains = indices.some(function (j) {
          return j !== a && j !== b && j !== c && cross(polygon[a], polygon[b], polygon[j]) >= 0 &&
            cross(polygon[b], polygon[c], polygon[j]) >= 0 && cross(polygon[c], polygon[a], polygon[j]) >= 0;
        });
        if (contains) continue;
        triangles.push([a, b, c]); indices.splice(i, 1); found = true; break;
      }
      if (!found) break;
    }
    if (indices.length === 3) triangles.push(indices.slice());
    return triangles;
  }
  function fragmentGeometry(polygon, center) {
    var vertices = [], rings = [], bevel = .062, halfDepth = .21;
    var vertexNormals = polygon.map(function (p, i) {
      var prev = polygon[(i + polygon.length - 1) % polygon.length], next = polygon[(i + 1) % polygon.length];
      var a = normalize([p[1] - prev[1], prev[0] - p[0], 0]);
      var b = normalize([next[1] - p[1], p[0] - next[0], 0]);
      return normalize([a[0] + b[0], a[1] + b[1], 0]);
    });
    function ring(theta, side) {
      var outline = insetPolygon(polygon, bevel * (1 - Math.sin(theta)));
      return outline.map(function (p, i) {
        return { p: [p[0] - center[0], p[1] - center[1], side * (halfDepth + bevel * Math.cos(theta))],
          n: [vertexNormals[i][0] * Math.sin(theta), vertexNormals[i][1] * Math.sin(theta), side * Math.cos(theta)] };
      });
    }
    [0, .32, .68, 1.06, Math.PI / 2].forEach(function (theta) { rings.push(ring(theta, 1)); });
    [Math.PI / 2, 1.06, .68, .32, 0].forEach(function (theta) { rings.push(ring(theta, -1)); });
    function vertex(v) { vertices.push(v.p[0], v.p[1], v.p[2], v.n[0], v.n[1], v.n[2]); }
    function triangle(a, b, c) { vertex(a); vertex(b); vertex(c); }
    for (var r = 0; r < rings.length - 1; r++) {
      for (var i = 0; i < polygon.length; i++) {
        var j = (i + 1) % polygon.length;
        triangle(rings[r][i], rings[r + 1][i], rings[r][j]);
        triangle(rings[r][j], rings[r + 1][i], rings[r + 1][j]);
      }
    }
    var face = insetPolygon(polygon, bevel);
    triangulate(face).forEach(function (t) {
      triangle(rings[0][t[0]], rings[0][t[1]], rings[0][t[2]]);
      var back = rings[rings.length - 1]; triangle(back[t[2]], back[t[1]], back[t[0]]);
    });
    return new Float32Array(vertices);
  }
  function makeFragments() {
    var outline = [[-.96, 1.7], [.04, 1.7], [1.36, 0], [.04, -1.7], [-.96, -1.7], [.33, 0]];
    if (signedArea(outline) < 0) outline.reverse();
    var count = 7;
    return Array.from({ length: count }, function (_, i) {
      var bottom = -1.7 + i * 3.4 / count, top = -1.7 + (i + 1) * 3.4 / count;
      var polygon = clipY(clipY(outline, bottom + (i ? .001 : 0), true), top - (i < count - 1 ? .001 : 0), false);
      var center = polygon.reduce(function (sum, p) { return [sum[0] + p[0] / polygon.length, sum[1] + p[1] / polygon.length, 0]; }, [0, 0, 0]);
      return { data: gateVertices(fragmentGeometry(polygon, center), center), center: center,
        offset: [(i % 2 ? 1 : -1) * (.65 + i * .08), (i - 3) * .23, (i % 3 - 1) * .78],
        spin: [(i % 3 - 1) * .56, (i % 2 ? 1 : -1) * .78, (i - 3) * .13],
        delay: (i * 3 % count) * 38, hoverX: 0, hoverY: 0, hoverZ: 0 };
    });
  }

  var vertexSource = "attribute vec3 aPosition;attribute vec3 aNormal;attribute vec3 aGatePosition;attribute vec3 aFinalData;uniform float uMorph;uniform float uFinalAspect;uniform vec3 uFragmentCenter;uniform mat4 uFinalOrientation;uniform mat4 uModel;uniform mat4 uViewProjection;varying vec3 vPosition;varying vec3 vNormal;varying vec2 vArtworkUV;varying float vFinalFace;void main(){vec3 target=(uFinalOrientation*vec4(aGatePosition.x*uFinalAspect,aGatePosition.y,0.0,0.0)).xyz-uFragmentCenter;vec3 origin=aPosition;float sourceY=aGatePosition.y*1.638;float reach=abs(sourceY)/1.7;float innerEdge=.33-1.29*reach+.062*length(vec2(1.0,1.29/1.7));float outerEdge=1.36-1.32*reach-.062*length(vec2(1.0,1.32/1.7));vec3 joined=vec3(mix(innerEdge,outerEdge,aFinalData.x),sourceY,.272)-uFragmentCenter;if(aFinalData.z>.5)origin=mix(origin,joined,smoothstep(0.0,.06,uMorph));vec3 position=mix(origin,target,smoothstep(0.0,.65,uMorph));vec3 targetNormal=mat3(uFinalOrientation)*vec3(0.0,0.0,1.0);vec3 blendedNormal=mix(aNormal,targetNormal,uMorph);vec3 normal=length(blendedNormal)>.00001?normalize(blendedNormal):aNormal;vec4 world=uModel*vec4(position,1.0);vPosition=world.xyz;vNormal=normalize(mat3(uModel)*normal);vArtworkUV=aFinalData.xy;vFinalFace=aFinalData.z;gl_Position=uViewProjection*world;}";
  var fragmentSource = [
    "precision highp float;",
    "uniform sampler2D uEnvironment;uniform sampler2D uBackdrop;uniform sampler2D uFinalArtwork;uniform vec2 uResolution;",
    "uniform mat4 uViewProjection;uniform vec3 uCamera;uniform float uMorph;varying vec3 vPosition;varying vec3 vNormal;varying vec2 vArtworkUV;varying float vFinalFace;",
    "const float PI=3.14159265359;",
    "vec3 environment(vec3 r){",
    " vec2 uv=vec2(atan(r.x,r.z)/(2.0*PI)+.5,asin(clamp(r.y,-1.0,1.0))/PI+.5);",
    " vec3 env=texture2D(uEnvironment,uv).rgb;",
    " float strip=pow(max(0.0,dot(r,normalize(vec3(-.45,.72,.65)))),45.0);",
    " float edge=pow(max(0.0,dot(r,normalize(vec3(.8,.1,-.45)))),70.0);",
    " return env+vec3(.839,.831,.929)*strip*1.6+vec3(.741,.706,.078)*edge*.8;}",
    "void main(){",
    " if(vFinalFace<.5&&uMorph>=.16)discard;vec4 artwork=texture2D(uFinalArtwork,vArtworkUV);if(uMorph>=.45){gl_FragColor=artwork;return;}vec3 n=normalize(vNormal);if(!gl_FrontFacing)n=-n;vec3 v=normalize(uCamera-vPosition);",
    " float nv=max(dot(n,v),.001);vec3 r=reflect(-v,n);",
    // An IOR of two bends the camera ray through a virtual thickness behind the
    // front face. The backdrop contains the actual DOM lettering, not an env-map
    // imitation of it, so the character entering a bevel visibly changes shape.
    " vec3 ray=refract(-v,n,.5);float travel=.85/max(.22,-ray.z);",
    " vec4 projected=uViewProjection*vec4(vPosition+ray*travel,1.0);",
    " vec2 screen=gl_FragCoord.xy/uResolution;vec2 refracted=projected.xy/projected.w*.5+.5;",
    " vec2 displacement=clamp(refracted-screen,vec2(-.16),vec2(.16));",
    " vec2 uv=clamp(screen+displacement,vec2(.001),vec2(.999));",
    " vec3 transmitted=texture2D(uBackdrop,uv).rgb;",
    // Beer–Lambert absorption keeps the user's olive/forest palette in the glass
    // while transmitting the navy strokes and lilac background at full detail.
    " float path=.58/max(nv,.24);vec3 absorption=vec3(.22,.17,1.08);",
    " transmitted*=exp(-absorption*path);",
    " float fresnel=.111111+.888889*pow(1.0-nv,5.0);",
    " vec3 color=mix(transmitted,environment(r)*.65,fresnel);",
    " vec3 light=normalize(vec3(-.5,.85,1.0));vec3 h=normalize(light+v);",
    " float nh=max(dot(n,h),0.0);float nl=max(dot(n,light),0.0);",
    " float a=.045;float d=a*a/(PI*pow(max(.001,nh*nh*(a*a-1.0)+1.0),2.0));",
    " float spec=d*nl/(4.0*max(.2,nv));color+=vec3(.839,.831,.929)*min(spec,.9)*.45;",
    // Material interpolation occurs on this one surface, never on two DOM
    // silhouettes. The alpha artwork owns all endpoint light and shadow.
    " float reveal=smoothstep(.02,.45,uMorph);",
    " float alpha=1.0;if(vFinalFace>.5){color=mix(color,artwork.rgb,reveal);alpha=mix(1.0,artwork.a,smoothstep(.001,.16,uMorph));}else{alpha=1.0-smoothstep(.001,.16,uMorph);}",
    " gl_FragColor=vec4(clamp(color,0.0,1.0),alpha);}",
  ].join("\n");

  function compile(type, source) {
    var shader = gl.createShader(type); gl.shaderSource(shader, source); gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      var message = gl.getShaderInfoLog(shader); gl.deleteShader(shader); throw new Error(message || "Hero shader unavailable");
    }
    return shader;
  }
  function loadFinalArtwork() {
    readyDeadline = performance.now() + 1800;
    return new Promise(function (resolve, reject) {
      var artwork = new Image(), settled = false;
      function complete(error) {
        if (settled) return;
        settled = true; clearTimeout(finalTimer); cancelFinalLoad = null;
        if (error || !artwork.naturalWidth || !artwork.naturalHeight) { reject(error || new Error("Hero artwork unavailable")); return; }
        finalArtwork = artwork; finalAspect = artwork.naturalWidth / artwork.naturalHeight; resolve();
      }
      cancelFinalLoad = function () { complete(new Error("Hero artwork load cancelled")); };
      on(artwork, "load", function () {
        var decoded = artwork.decode ? artwork.decode() : Promise.resolve();
        decoded.then(function () { complete(); }, complete);
      }, { once: true });
      on(artwork, "error", function () { complete(new Error("Hero artwork unavailable")); }, { once: true });
      finalTimer = setTimeout(function () { complete(new Error("Hero artwork decode timed out")); }, 1800);
      artwork.src = new URL("assets/images/hero-final.webp", document.baseURI).href;
    });
  }
  function paintFinalArtwork() {
    if (!finalArtwork) throw new Error("Hero artwork unavailable");
    var limit = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    if (finalArtwork.naturalWidth > limit || finalArtwork.naturalHeight > limit) throw new Error("Hero artwork exceeds texture size");
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, finalTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, finalArtwork);
    // NPOT artwork is valid in WebGL1 with clamp/linear sampling. No oversized
    // resampling canvas or repeated uploads are needed for viewport changes.
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  function paintEnvironment() {
    var image = document.createElement("canvas"); image.width = 2048; image.height = 1024;
    var context = image.getContext("2d");
    if (!context) throw new Error("Reflection texture unavailable");
    var wash = context.createLinearGradient(0, 0, 0, 1024);
    wash.addColorStop(0, "#0A1628"); wash.addColorStop(.22, "#1B3A32"); wash.addColorStop(.40, "#D6D4ED");
    wash.addColorStop(.73, "#D6D4ED"); wash.addColorStop(.88, "#BDB414"); wash.addColorStop(1, "#0A1628");
    context.fillStyle = wash; context.fillRect(0, 0, 2048, 1024);
    context.fillStyle = "#0A1628"; context.textAlign = "center"; context.textBaseline = "middle";
    if (reflectionArtwork) {
      context.drawImage(reflectionArtwork, 270, 215, 1508, 814);
    } else {
      context.font = "700 174px Inter, Arial, sans-serif";
      ["PRODUCT", "WITH", "PURPOSE"].forEach(function (text, i) { context.fillText(text, 1024, 415 + i * 145); });
    }
    // Broad studio softboxes give the bevel a clear reflected light-dark edge.
    context.fillStyle = "#D6D4ED"; context.fillRect(82, 230, 80, 540); context.fillRect(1792, 180, 115, 580);
    context.fillStyle = "#0A1628"; context.fillRect(1755, 160, 24, 630);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  function paintBackdrop() {
    if (!backdropTexture || destroyed || lost) return;
    if (!backdropCanvas) backdropCanvas = document.createElement("canvas");
    // Power-of-two dimensions permit mipmaps in WebGL 1. Each side is capped;
    // reusing the canvas avoids allocating a new full-page image on every resize.
    var cap = Math.min(2048, gl.getParameter(gl.MAX_TEXTURE_SIZE));
    function dimension(value) { return Math.min(cap, Math.pow(2, Math.ceil(Math.log2(Math.max(2, value))))); }
    var density = Math.min(devicePixelRatio || 1, 1.5);
    var targetWidth = dimension(width * density), targetHeight = dimension(height * density);
    if (backdropCanvas.width !== targetWidth) backdropCanvas.width = targetWidth;
    if (backdropCanvas.height !== targetHeight) backdropCanvas.height = targetHeight;
    var context = backdropCanvas.getContext("2d");
    if (!context) throw new Error("Glass backdrop unavailable");
    context.setTransform(targetWidth / width, 0, 0, targetHeight / height, 0, 0);
    context.fillStyle = "#D6D4ED"; context.fillRect(0, 0, width, height);
    var artwork = document.querySelector(".home-mast-lettering img, img.home-mast-lettering");
    if (artwork && artwork.complete && artwork.naturalWidth) {
      var box = canvas.getBoundingClientRect(), lettering = artwork.getBoundingClientRect();
      var scaleX = width / Math.max(1, box.width), scaleY = height / Math.max(1, box.height);
      // The source SVG's default xMidYMid meet keeps its viewBox proportional
      // inside the tall mobile <img>. Match that painted area, not its empty box.
      var imageRatio = Number(artwork.getAttribute("width")) / Number(artwork.getAttribute("height")) || artwork.naturalWidth / artwork.naturalHeight;
      var paintedWidth = Math.min(lettering.width, lettering.height * imageRatio);
      var paintedHeight = paintedWidth / imageRatio;
      var left = lettering.left + (lettering.width - paintedWidth) / 2;
      var top = lettering.top + (lettering.height - paintedHeight) / 2;
      context.drawImage(artwork, (left - box.left) * scaleX, (top - box.top) * scaleY, paintedWidth * scaleX, paintedHeight * scaleY);
    }
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, backdropTexture);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, backdropCanvas);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }
  function initialize() {
    gl = canvas.getContext("webgl", { alpha: true, antialias: true, premultipliedAlpha: false, powerPreference: "low-power" });
    if (!gl) throw new Error("WebGL unavailable");
    var precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    var vertex = compile(gl.VERTEX_SHADER, vertexSource);
    var fragment = compile(gl.FRAGMENT_SHADER, precision && precision.precision ? fragmentSource : fragmentSource.replace("highp", "mediump"));
    program = gl.createProgram(); gl.attachShader(program, vertex); gl.attachShader(program, fragment); gl.linkProgram(program);
    gl.deleteShader(vertex); gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error("Hero material unavailable");
    gl.useProgram(program);
    ["uModel", "uViewProjection", "uEnvironment", "uBackdrop", "uFinalArtwork", "uFinalAspect", "uFinalOrientation", "uFragmentCenter", "uResolution", "uCamera", "uMorph"].forEach(function (name) { uniforms[name] = gl.getUniformLocation(program, name); });
    attributes.position = gl.getAttribLocation(program, "aPosition"); attributes.normal = gl.getAttribLocation(program, "aNormal");
    attributes.gatePosition = gl.getAttribLocation(program, "aGatePosition"); attributes.finalData = gl.getAttribLocation(program, "aFinalData");
    fragments = makeFragments();
    fragments.forEach(function (fragment) {
      fragment.buffer = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, fragment.buffer);
      gl.bufferData(gl.ARRAY_BUFFER, fragment.data, gl.STATIC_DRAW);
    });
    texture = gl.createTexture(); backdropTexture = gl.createTexture(); finalTexture = gl.createTexture(); paintEnvironment(); paintFinalArtwork();
    gl.enable(gl.DEPTH_TEST); gl.depthFunc(gl.LEQUAL);
    gl.clearColor(0, 0, 0, 0); initialized = true; lost = false;
    resize();
    if (!initialized) throw new Error("Glass backdrop unavailable");
    stop(); render(performance.now());
    if (gl.getError() !== gl.NO_ERROR) throw new Error("Hero renderer unavailable");
    api.status = "ready"; host.dataset.heroScene = "ready";
    loadReflection();
  }
  function loadReflection() {
    var artwork = document.querySelector(".home-mast-lettering img, img.home-mast-lettering");
    var settled = false;
    function complete() {
      if (settled || destroyed || lost) return;
      settled = true; clearTimeout(reflectionTimer);
      if (artwork && artwork.complete && artwork.naturalWidth) {
        reflectionArtwork = artwork;
        try { paintEnvironment(); paintBackdrop(); requestRender(); } catch (error) { reflectionArtwork = null; fallback(); return; }
      }
      resolveReady({ status: "ready" });
      window.dispatchEvent(new CustomEvent("portfolio:heroready", { detail: { status: "ready" } }));
    }
    if (!artwork || (artwork.complete && artwork.naturalWidth)) { complete(); return; }
    on(artwork, "load", function () {
      if (!settled) { complete(); return; }
      if (destroyed || lost || !initialized || !artwork.naturalWidth) return;
      // A readiness deadline must not prevent a later real lettering image
      // from replacing the temporary reflection after it finally decodes.
      reflectionArtwork = artwork;
      try { paintEnvironment(); paintBackdrop(); requestRender(); } catch (error) { fallback(); }
    }, { once: true });
    on(artwork, "error", complete, { once: true });
    // The artwork and late lettering share one initial readiness budget.
    reflectionTimer = setTimeout(complete, Math.max(0, Math.min(1400, readyDeadline - performance.now())));
  }

  function fallback() {
    stop(); initialized = false; api.status = "fallback"; host.dataset.heroScene = "fallback";
    resolveReady({ status: "fallback" });
    window.dispatchEvent(new CustomEvent("portfolio:heroready", { detail: { status: "fallback" } }));
  }
  function resize() {
    if (destroyed || lost) return;
    updateLayout();
    requestRender();
  }
  function updateLayout() {
    layoutDirty = false;
    var box = host.getBoundingClientRect(); width = Math.max(1, box.width); height = Math.max(1, box.height); aspect = width / height;
    cameraZ = innerWidth <= 991 ? 3.9 : 3.7;
    // The 60vh sculpture remains inside very narrow/landscape drawing surfaces.
    sceneScale = Math.min(1, aspect * 2.25);
    var dpr = Math.min(devicePixelRatio || 1, innerWidth <= 991 ? 1.6 : 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    if (gl) gl.viewport(0, 0, canvas.width, canvas.height);
    fitGate();
    if (initialized) {
      try { paintBackdrop(); } catch (error) { fallback(); return; }
    }
  }
  function start() {
    if (destroyed || api.status === "fallback" || assemblyStart !== null) return;
    arrivalStarted = true;
    assemblyStart = reduced() ? -Infinity : performance.now() + 200;
    requestRender();
  }
  function finish() {
    assemblyStart = -Infinity;
    pointer.targetX = pointer.targetY = pointer.tiltX = pointer.tiltY = 0;
    pointer.inside = false; drag.active = false; drag.velocity = 0; drag.angle = 0;
    fragments.forEach(function (fragment) { fragment.hoverX = fragment.hoverY = fragment.hoverZ = 0; });
    requestRender();
  }
  function setMorphProgress(value) {
    if (destroyed || !Number.isFinite(value)) return;
    var next = clamp(value, 0, 1);
    if (Math.abs(next - morphProgress) < .00001) return;
    morphProgress = next;
    // Scrolling may interrupt arrival. Complete the assembly once instead of
    // mixing dispersed fragments with a destination shape that is already read.
    if (next > .001 && assemblyStart !== -Infinity) finish();
    requestRender();
  }
  function stop() { if (frame) cancelAnimationFrame(frame); frame = 0; previousTime = 0; }
  function requestRender() {
    if (!frame && initialized && !lost && !destroyed && !suspended && intersecting && !document.hidden) frame = requestAnimationFrame(render);
  }
  function render(now) {
    frame = 0;
    if (!initialized || destroyed || lost || suspended || !intersecting || document.hidden) return;
    if (layoutDirty) { updateLayout(); if (!initialized) return; }
    var dt = previousTime ? Math.min(.05, (now - previousTime) / 1000) : 1 / 60; previousTime = now;
    var quiet = reduced(), easing = 1 - Math.exp(-dt / .4), hovering = false;
    if (quiet) { pointer.targetX = pointer.targetY = pointer.tiltX = pointer.tiltY = 0; drag.angle = 0; drag.velocity = 0; }
    pointer.tiltX += (pointer.targetX - pointer.tiltX) * easing; pointer.tiltY += (pointer.targetY - pointer.tiltY) * easing;
    if (!drag.active && !quiet) { drag.angle += drag.velocity * dt * 60; drag.velocity *= Math.pow(.91, dt * 60); }
    var interaction = 1 - clamp(morphProgress / .35, 0, 1);
    var rootMatrix = multiply(compose(-.16 + (morphPose.x + .16) * morphProgress, morphPose.y * morphProgress, 0,
      pointer.tiltX * interaction + 20 * DEG * morphProgress,
      (-27 + (innerWidth < 600 ? 39 : 19) * morphProgress) * DEG + (pointer.tiltY + drag.angle) * interaction, 0,
      sceneScale + (morphPose.scale - sceneScale) * morphProgress),
      compose(0, 0, 0, 0, 0, Math.PI / 2 * morphProgress, 1));
    var view = identity(); view[14] = -cameraZ;
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT); gl.useProgram(program);
    gl.uniformMatrix4fv(uniforms.uViewProjection, false, multiply(perspective(), view));
    gl.uniform3f(uniforms.uCamera, 0, 0, cameraZ);
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texture); gl.uniform1i(uniforms.uEnvironment, 0);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, backdropTexture); gl.uniform1i(uniforms.uBackdrop, 1);
    gl.uniform2f(uniforms.uResolution, canvas.width, canvas.height);
    gl.uniform1f(uniforms.uMorph, morphProgress);
    gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, finalTexture); gl.uniform1i(uniforms.uFinalArtwork, 2);
    gl.uniform1f(uniforms.uFinalAspect, finalAspect); gl.uniformMatrix4fv(uniforms.uFinalOrientation, false, finalOrientation);
    var assembling = false;
    fragments.forEach(function (fragment) {
      var progress = quiet || assemblyStart === null ? 1 : clamp((now - assemblyStart - fragment.delay) / (2300 - fragment.delay), 0, 1);
      var scatter = 1 - Math.sqrt(1 - Math.pow(progress - 1, 2));
      if (progress < 1) assembling = true;
      var targetX = 0, targetY = 0, targetZ = 0;
      if (pointer.inside && !quiet && progress === 1 && !drag.active && morphProgress < .001) {
        var projected = project(transformPoint(rootMatrix, fragment.center));
        var dx = projected.x - pointer.x, dy = projected.y - pointer.y, distance = Math.hypot(dx, dy);
        var weight = Math.max(0, 1 - distance / 105);
        targetX = dx / 105 * weight * .22; targetY = -dy / 105 * weight * .22; targetZ = weight * .12;
      }
      var spring = 1 - Math.exp(-dt / .3);
      fragment.hoverX += (targetX - fragment.hoverX) * spring;
      fragment.hoverY += (targetY - fragment.hoverY) * spring;
      fragment.hoverZ += (targetZ - fragment.hoverZ) * spring;
      if (Math.abs(fragment.hoverX - targetX) + Math.abs(fragment.hoverY - targetY) + Math.abs(fragment.hoverZ - targetZ) > .0001) hovering = true;
      var matrix = compose(fragment.center[0] + fragment.offset[0] * scatter + fragment.hoverX,
        fragment.center[1] + fragment.offset[1] * scatter + fragment.hoverY, fragment.offset[2] * scatter + fragment.hoverZ,
        fragment.spin[0] * scatter, fragment.spin[1] * scatter, fragment.spin[2] * scatter, 1);
      gl.uniformMatrix4fv(uniforms.uModel, false, multiply(rootMatrix, matrix));
      gl.uniform3fv(uniforms.uFragmentCenter, fragment.center);
      gl.bindBuffer(gl.ARRAY_BUFFER, fragment.buffer);
      gl.enableVertexAttribArray(attributes.position); gl.vertexAttribPointer(attributes.position, 3, gl.FLOAT, false, 48, 0);
      gl.enableVertexAttribArray(attributes.normal); gl.vertexAttribPointer(attributes.normal, 3, gl.FLOAT, false, 48, 12);
      gl.enableVertexAttribArray(attributes.gatePosition); gl.vertexAttribPointer(attributes.gatePosition, 3, gl.FLOAT, false, 48, 24);
      gl.enableVertexAttribArray(attributes.finalData); gl.vertexAttribPointer(attributes.finalData, 3, gl.FLOAT, false, 48, 36);
      gl.drawArrays(gl.TRIANGLES, 0, fragment.data.length / 12);
    });
    var moving = Math.abs(pointer.targetX - pointer.tiltX) + Math.abs(pointer.targetY - pointer.tiltY) > .0001 || Math.abs(drag.velocity) > .00001;
    if (!quiet && (assembling || moving || hovering || drag.active)) requestRender();
  }
  function pointerMove(event) {
    if (reduced() || morphProgress > .001 || !fineQuery.matches || event.pointerType === "touch") return;
    var box = host.getBoundingClientRect();
    pointer.x = (event.clientX - box.left) * width / Math.max(1, box.width);
    pointer.y = (event.clientY - box.top) * height / Math.max(1, box.height);
    pointer.inside = pointer.x >= 0 && pointer.x <= width && pointer.y >= 0 && pointer.y <= height;
    if (pointer.inside) {
      pointer.targetY = clamp((pointer.x / width - .5) * 2, -1, 1) * 14.4 * DEG;
      pointer.targetX = clamp((pointer.y / height - .5) * 2, -1, 1) * 14.4 * DEG;
    }
    if (drag.active) {
      var delta = event.clientX - drag.x; drag.x = event.clientX;
      drag.velocity = delta * .2 * DEG; drag.angle += drag.velocity;
    }
    requestRender();
  }
  function pointerLeave() { pointer.inside = false; pointer.targetX = pointer.targetY = 0; requestRender(); }
  function on(target, type, callback, options) {
    target.addEventListener(type, callback, Object.assign({ signal: listeners.signal }, options || {}));
  }
  on(mast, "pointermove", pointerMove, { passive: true });
  on(mast, "pointerleave", pointerLeave, { passive: true });
  on(mast, "pointerdown", function (event) {
    if (reduced() || morphProgress > .001 || !fineQuery.matches || event.button !== 0 || event.target.closest("a,button,input,textarea,select")) return;
    var box = host.getBoundingClientRect();
    var localX = (event.clientX - box.left) * width / Math.max(1, box.width);
    var localY = (event.clientY - box.top) * height / Math.max(1, box.height);
    if (Math.abs(localX - width / 2) > Math.min(width * .30, height * .24) || Math.abs(localY - height / 2) > height * .34) return;
    drag.active = true; drag.x = event.clientX; drag.velocity = 0; requestRender();
  }, { passive: true });
  on(window, "pointermove", function (event) { if (drag.active && !mast.contains(event.target)) pointerMove(event); }, { passive: true });
  on(window, "pointerup", function () { drag.active = false; requestRender(); }, { passive: true });
  on(window, "pointercancel", function () { drag.active = false; drag.velocity = 0; requestRender(); }, { passive: true });
  on(window, "portfolio:arrivalstart", start);
  on(window, "portfolio:arrivalend", function () { if (!arrivalStarted) start(); });
  on(window, "portfolio:motionchange", function () { if (reduced()) finish(); else requestRender(); });
  on(reducedQuery, "change", function () { if (reduced()) finish(); else requestRender(); });
  on(document, "visibilitychange", function () { if (document.hidden) stop(); else requestRender(); });
  on(window, "pagehide", function () { suspended = true; stop(); });
  on(window, "pageshow", function () { suspended = false; requestRender(); });
  on(canvas, "webglcontextlost", function (event) { event.preventDefault(); lost = true; fallback(); });
  on(canvas, "webglcontextrestored", function () { if (!destroyed) { try { initialize(); finish(); } catch (error) { fallback(); } } });
  on(window, "resize", resize, { passive: true });
  var stage = host.closest(".home-mast-scene");
  if (stage && typeof MutationObserver === "function") {
    function consentLayoutKey() {
      return stage.style.getPropertyValue("--consent-cover") + "/" + stage.style.getPropertyValue("--stage-safe-scale");
    }
    var consentLayout = consentLayoutKey();
    // Consent transforms are synchronous and do not resize the content box.
    // Read their final batched values on the existing render frame; when hidden
    // or offscreen, keep the dirty layout until that same loop resumes.
    consentObserver = new MutationObserver(function () {
      var next = consentLayoutKey();
      if (next === consentLayout) return;
      consentLayout = next; layoutDirty = true; requestRender();
    });
    consentObserver.observe(stage, { attributes: true, attributeFilter: ["style"] });
  }
  if (typeof ResizeObserver === "function") {
    resizeObserver = new ResizeObserver(resize); resizeObserver.observe(host);
    var lettering = document.querySelector(".home-mast-lettering img, img.home-mast-lettering");
    if (lettering) resizeObserver.observe(lettering);
  }
  if (typeof IntersectionObserver === "function") {
    observer = new IntersectionObserver(function (entries) {
      intersecting = entries.some(function (entry) { return entry.isIntersecting; });
      if (intersecting) requestRender(); else stop();
    }); observer.observe(host);
  }
  function destroy() {
    if (destroyed) return;
    destroyed = true; stop(); clearTimeout(reflectionTimer); clearTimeout(finalTimer);
    if (cancelFinalLoad) cancelFinalLoad(); listeners.abort();
    if (observer) observer.disconnect(); if (resizeObserver) resizeObserver.disconnect(); if (consentObserver) consentObserver.disconnect();
    if (gl && !lost) {
      fragments.forEach(function (fragment) { gl.deleteBuffer(fragment.buffer); });
      if (texture) gl.deleteTexture(texture); if (backdropTexture) gl.deleteTexture(backdropTexture); if (finalTexture) gl.deleteTexture(finalTexture);
      if (program) gl.deleteProgram(program);
    }
    if (backdropCanvas) { backdropCanvas.width = backdropCanvas.height = 1; backdropCanvas = null; }
    fragments = []; finalArtwork = null; finalOrientation = null;
    resolveReady({ status: "fallback" }); api.status = "destroyed"; host.dataset.heroScene = "fallback";
  }
  loadFinalArtwork().then(function () {
    if (destroyed) return;
    try { initialize(); automaticStart(); } catch (error) { fallback(); }
  }, function () { if (!destroyed) fallback(); });
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(function () {
    if (!destroyed && initialized && !lost && api.status === "ready") { paintEnvironment(); paintBackdrop(); requestRender(); }
  }).catch(function () {});
  function automaticStart() {
    requestAnimationFrame(function () {
      if (initialized && !arrivalStarted && !document.querySelector(".site-arrival") && !document.documentElement.classList.contains("arrival-active")) start();
    });
  }
  if (document.readyState === "loading") on(document, "DOMContentLoaded", automaticStart, { once: true });
  else automaticStart();
})();
