import * as T from "three";
import { CONFIG, QUALITY } from "./config";
import type {
  SceneController,
  SceneNotice,
  SceneOptions,
  SceneSnapshot,
} from "./types";
import { createContext } from "./core/context";
import { createRenderer } from "./core/renderer";
import { createCamera } from "./core/camera";
import { ResourceTracker } from "./core/resourceTracker";
import { SimulationClock } from "./core/simulationClock";
import { createWorld } from "./objects/createWorld";
import { updateAmbient } from "./systems/ambient";
import { createDayNight } from "./systems/dayNight";
import { AirshipFlight } from "./systems/airshipFlight";
import { createLetterDelivery } from "./systems/letterDelivery";
import { WindSystem } from "./systems/wind";
import { QualityController } from "./systems/quality";
import { SeasonClock } from "./systems/season";
import { createInteractions, type HotspotId } from "./systems/interactions";
import {
  EVENT_NOTICES,
  EventScheduler,
  createEventDirector,
} from "./systems/events";
import {
  ReplyLedger,
  STAMPS,
  StampBook,
  createPostcardFlight,
} from "./systems/postcards";
import { Ambience, type SoundName } from "./systems/ambience";
import { soundCues, type SoundState } from "./systems/soundCues";
import { updateFestival } from "./systems/festival";

const SEASON_NOTICES = {
  spring: "春天回来了，樱花又开了。",
  summer: "入夏了。夜里会有很多萤火虫。",
  autumn: "秋天到了，枫叶一夜之间红透。",
  winter: "冬天来了，雪落在每一座岛上。",
} as const;
export function createScene(
  canvas: HTMLCanvasElement,
  options: SceneOptions,
): SceneController {
  const ctx = createContext(),
    tracker = new ResourceTracker();
  tracker.trackGeometry(ctx.cube);
  const cleanups: (() => void)[] = [];
  let disposed = false,
    failed = false,
    frameID = 0;
  let render: ReturnType<typeof createRenderer> | undefined;
  const listeners = new Set<(snapshot: SceneSnapshot) => void>();
  const noticeListeners = new Set<(notice: SceneNotice) => void>();
  const ambience = new Ambience();
  let captions = false;
  const lastCue = new Map<string, number>();
  const soundLabels: Record<SoundName, string> = {
    send: "呼，信封飞向飞艇",
    chime: "叮，远方传来一声轻响",
    bell: "叮，邮局的门铃",
    splash: "哗啦，水池溅起涟漪",
    rustle: "沙沙，树叶轻轻摇晃",
    pop: "啵，岛上的朋友回应了",
    stamp: "咚，一枚邮戳落下",
    whale: "远处传来云鲸的歌声",
  };
  function emitSound(key: string, label: string) {
    if (!captions) return;
    const now = performance.now();
    if (now - (lastCue.get(key) ?? -Infinity) < 8000) return;
    lastCue.set(key, now);
    notify({ type: "sound", text: label });
  }
  ambience.onCue = (name) => emitSound(name, soundLabels[name]);
  function dispose() {
    if (disposed) return;
    disposed = true;
    cancelAnimationFrame(frameID);
    for (const cleanup of cleanups.reverse()) cleanup();
    tracker.track(ctx.scene);
    tracker.trackMaterial(ctx.matte);
    tracker.trackMaterial(ctx.rockMat);
    tracker.trackMaterial(ctx.lampMat);
    tracker.dispose();
    ctx.scene.clear();
    listeners.clear();
    noticeListeners.clear();
    ambience.dispose();
    render?.dispose();
    delete canvas.dataset.diagnostics;
  }
  function notify(notice: SceneNotice) {
    noticeListeners.forEach((l) => l(notice));
  }
  try {
    const pipeline = createRenderer(canvas);
    render = pipeline; // Created first so unavailable WebGL fails quickly.
    // Geometry ownership stays at the scene level until all systems are detached.
    const objects = createWorld(ctx);
    const interactions = createInteractions(ctx, objects);
    cleanups.push(() => interactions.dispose());
    const stamps = new StampBook(),
      ledger = new ReplyLedger(),
      postcard = createPostcardFlight(objects);
    stamps.from(options.initial?.stamps);
    ledger.restore(options.initial?.replies);
    const camera = createCamera<HotspotId>(
      canvas,
      interactions.hits,
      (id) => tap(id),
      // A light nudge on hover; the tree gets less so petals stay calm.
      (id) => interactions.impulses[id].hit(id === "tree" ? 0.05 : 0.12),
    );
    cleanups.push(() => camera.dispose());
    if (!options.skipArrival) camera.arrive();
    const clock = new SimulationClock(),
      seasons = new SeasonClock(),
      windSystem = new WindSystem(),
      flight = new AirshipFlight(),
      scheduler = new EventScheduler(
        Math.random,
        options.initial?.eventWeights,
      ),
      director = createEventDirector(objects, ctx.U);
    let festival = options.initial?.festival ?? null,
      limitedStamp = options.initial?.limitedStamp ?? null;
    const delivery = createLetterDelivery(ctx, () => {
      flight.depart();
      ledger.deliver();
    });
    cleanups.push(() => delivery.dispose());
    const dayNight = createDayNight(ctx, objects);
    const media = matchMedia("(prefers-reduced-motion: reduce)");
    let reducedMotion = media.matches;
    const quality = new QualityController(
      matchMedia("(pointer: coarse)").matches,
    );
    const events = new AbortController();
    cleanups.push(() => events.abort());
    media.addEventListener(
      "change",
      () => {
        reducedMotion = media.matches;
        camera.interact();
      },
      { signal: events.signal },
    );
    let snapshot: SceneSnapshot = {
      ready: false,
      hour: clock.hour,
      speed: 1,
      night: 0,
      wind: 0,
      journey: "飞艇正在等一封信。",
      sentCount: 0,
      deliveredCount: 0,
      lettersInFlight: 0,
      quality: "auto",
      actualQuality: quality.level,
      fps: 0,
      drawCalls: 0,
      instances: 0,
      resolution: "",
      simTime: 0,
      geometries: 0,
      textures: 0,
      autoOrbit: false,
      orbited: false,
      season: seasons.name,
      seasonProgress: seasons.year % 1,
      riding: false,
      event: null,
      rain: 0,
      repliesWaiting: 0,
      stamps: [],
      sound: false,
      festival,
    };
    stamps.onEarn((id) => {
      const stamp = STAMPS.find((s) => s.id === id)!;
      ambience.play("stamp");
      notify({ type: "stamp", id, text: `集到一枚「${stamp.title}」。` });
      emit();
    });
    stamps.season(seasons.name);
    function tap(id: HotspotId) {
      if (id === "mailbox") {
        options.onMailbox();
        return;
      }
      interactions.tap(id);
      stamps.touch(id);
      ambience.play(
        id === "bell"
          ? "bell"
          : id === "pool"
            ? "splash"
            : id === "tree"
              ? "rustle"
              : id === "lantern" || id === "lighthouse"
                ? "chime"
                : "pop",
      );
    }
    interactions.onTap((id, text) => {
      if (text) notify({ type: "tap", id, text });
    });
    let baseInstances = 0;
    ctx.scene.traverse((o) => {
      if (o instanceof T.InstancedMesh) baseInstances += o.count;
    });
    function emit() {
      snapshot = {
        ...snapshot,
        hour: clock.hour,
        speed: clock.speed,
        wind: windSystem.value,
        simTime: clock.time,
        sentCount: delivery.sentCount,
        deliveredCount: delivery.deliveredCount,
        lettersInFlight: delivery.count,
        quality: quality.mode,
        actualQuality: quality.level,
        autoOrbit: camera.autoOrbit,
        orbited: camera.orbited,
        season: seasons.name,
        seasonProgress: seasons.year % 1,
        riding: camera.following,
        event: scheduler.active?.kind ?? null,
        rain: director.rain,
        repliesWaiting: ledger.owed,
        stamps: [...stamps.earned],
        sound: ambience.enabled,
        festival,
      };
      listeners.forEach((listener) => listener(snapshot));
      // Non-sensitive diagnostics only. Never include letters or personal text here.
      if (
        import.meta.env.DEV ||
        new URLSearchParams(location.search).get("debug") === "1"
      )
        canvas.dataset.diagnostics = JSON.stringify({
          ...snapshot,
          three: T.REVISION,
          seed: CONFIG.seed,
          flightTime: flight.time,
          year: seasons.year,
          camera: camera.camera.position.toArray(),
        });
    }
    function resize() {
      pipeline.resize(camera.camera, quality.level);
      snapshot.resolution = pipeline.resolution;
    }
    function applyQuality() {
      const profile = QUALITY[quality.level];
      objects.petals.count = profile.petals;
      objects.sunLight.shadow.mapSize.set(profile.shadows, profile.shadows);
      objects.sunLight.shadow.map?.dispose();
      objects.sunLight.shadow.map = null;
      // Far-island decoration is the first thing to go on slow devices.
      objects.farDetail.forEach((g) => (g.visible = profile.farDetail));
      resize();
    }
    applyQuality();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    cleanups.push(() => observer.disconnect());
    let last = performance.now(),
      statsAt = last,
      uiAt = last,
      frames = 0,
      petalTime = 0,
      lastSeason = seasons.index,
      wasMoored = true,
      rodeStamp = false;
    let previousSound: SoundState = {
      rain: 0,
      night: 0,
      season: seasons.weights,
    };
    const pointerTarget = new T.Vector4(),
      pointer = ctx.U.uPointer.value;
    ctx.seasonal.apply(seasons.weights, true);
    ctx.U.uSeason.value.fromArray(seasons.weights);
    function fail(error: unknown) {
      if (failed || disposed) return;
      failed = true;
      cancelAnimationFrame(frameID);
      options.onError(
        error instanceof Error
          ? error.message
          : "画面暂时未能启程，请重新试一次。",
      );
    }
    function animate(now: number) {
      if (disposed || failed || document.hidden) return;
      try {
        const realDt = Math.min(Math.max((now - last) / 1000, 0), 0.05);
        last = now;
        const dt = clock.advance(realDt),
          wind = windSystem.update(dt, reducedMotion ? 0.35 : 1);
        const motionWind = reducedMotion ? wind * 0.35 : wind;
        petalTime += dt * (1 + motionWind * 0.62);
        ctx.U.uTime.value = clock.time;
        ctx.U.uWind.value = motionWind;
        ctx.U.uCloudTravel.value = windSystem.cloudTravel;
        ctx.U.uPetalTime.value = petalTime;
        // Seasons drift with the simulation clock; colours only rewrite when the blend moves.
        seasons.advance(dt);
        const weights = seasons.weights;
        ctx.U.uSeason.value.fromArray(weights);
        ctx.seasonal.apply(weights);
        if (seasons.index !== lastSeason) {
          lastSeason = seasons.index;
          stamps.season(seasons.name);
          notify({
            type: "season",
            season: seasons.name,
            text: SEASON_NOTICES[seasons.name],
          });
          emit();
        }
        // Occasional surprises.
        const started = scheduler.update(dt, {
          night: snapshot.night,
          season: weights,
          hour: clock.hour,
          festival,
        });
        if (started) {
          notify({
            type: "event",
            kind: started,
            text: EVENT_NOTICES[started],
          });
          if (started === "whale") ambience.play("whale");
          if (started === "shower") stamps.award("rain");
          if (started === "shootingStar") stamps.award("star");
          if (started === "whale") stamps.award("whale");
          emit();
        }
        director.update(scheduler, dt, clock.time);
        snapshot.night = dayNight(clock.hour, weights, director.rain);
        updateFestival(objects, festival, snapshot.night);
        const nextSound: SoundState = {
          rain: director.rain,
          night: snapshot.night,
          season: weights,
        };
        for (const cue of soundCues(previousSound, nextSound))
          emitSound(cue, cue);
        previousSound = nextSound;
        const route = flight.update(objects, dt, clock.time, motionWind);
        snapshot.journey = camera.following
          ? `你正跟着飞艇。${route.journey}`
          : route.journey;
        ctx.U.uShip.value.copy(objects.airship.position);
        updateAmbient(objects, clock.time, motionWind, route.phase, windSystem);
        interactions.update(dt, clock.time);
        delivery.update(dt, objects.airship);
        // Replies ride back with the ship and land when it moors at home.
        const moored = route.phase < CONFIG.dockDuration;
        if (moored && !wasMoored && ledger.owed > 0 && !postcard.flying) {
          postcard.launch();
          interactions.moments.reply.hit();
        }
        wasMoored = moored;
        if (postcard.update(dt)) {
          const reply = ledger.arrive(seasons.name, clock.time, festival);
          if (reply) {
            ambience.play("chime");
            notify({ type: "reply", text: reply.text, season: reply.season });
            stamps.award("beacon");
            emit();
          }
        }
        if (camera.following && !rodeStamp && camera.followTime > 20) {
          rodeStamp = true;
          stamps.award("ride");
        }
        // Pointer influence on petals eases in and out.
        if (camera.pointerActive && !reducedMotion)
          pointerTarget.set(
            camera.pointerWorld.x,
            camera.pointerWorld.y,
            camera.pointerWorld.z,
            1,
          );
        else pointerTarget.w = 0;
        pointer.lerp(pointerTarget, 1 - Math.exp(-realDt * 6));
        ambience.update(motionWind, snapshot.night, director.rain, weights);
        camera.update(realDt, now, clock.speed !== 0, reducedMotion);
        // Portrait framing pulls the camera back: keep sky coverage and atmospheric contrast.
        const portrait = camera.camera.aspect < 1;
        objects.sky.position
          .copy(camera.camera.position)
          .multiplyScalar(portrait ? 1 : 0);
        if (ctx.scene.fog instanceof T.FogExp2)
          ctx.scene.fog.density =
            (CONFIG.fogDensity / Math.max(1, 1.3 / camera.camera.aspect)) *
            (1 + director.rain * 0.6 + weights[3] * 0.15);
        pipeline.render(ctx.scene, camera.camera);
        frames++;
        if (!snapshot.ready) {
          snapshot.ready = true;
          emit();
        }
        if (now - statsAt >= CONFIG.statsInterval) {
          const seconds = (now - statsAt) / 1000;
          const info = pipeline.renderer.info;
          snapshot = {
            ...snapshot,
            fps: Math.round(frames / seconds),
            drawCalls: info.render.calls,
            instances:
              baseInstances -
              CONFIG.petals +
              objects.petals.count +
              delivery.count * 4,
            geometries: info.memory.geometries,
            textures: info.memory.textures,
            resolution: pipeline.resolution,
          };
          if (quality.sample(snapshot.fps, seconds)) applyQuality();
          frames = 0;
          statsAt = now;
        }
        if (now - uiAt >= CONFIG.uiInterval) {
          emit();
          uiAt = now;
        }
        frameID = requestAnimationFrame(animate);
      } catch (error) {
        fail(error);
      }
    }
    document.addEventListener(
      "visibilitychange",
      () => {
        cancelAnimationFrame(frameID);
        camera.resetInput();
        windSystem.active = false;
        if (!document.hidden && !disposed && !failed) {
          last = statsAt = uiAt = performance.now();
          frames = 0;
          frameID = requestAnimationFrame(animate);
        }
      },
      { signal: events.signal },
    );
    canvas.addEventListener(
      "webglcontextlost",
      (event) => {
        event.preventDefault();
        fail(
          new Error("WebGL 画面连接已中断。请点击「重新启程」重新创建场景。"),
        );
      },
      { signal: events.signal },
    );
    frameID = requestAnimationFrame(animate);
    return {
      setSpeed(speed) {
        if (![0, 1, 4, 12].includes(speed)) return;
        clock.speed = speed;
        camera.interact();
        emit();
      },
      setTimeOfDay(hour) {
        clock.setHour(hour);
        snapshot.night = dayNight(clock.hour, seasons.weights, director.rain);
        camera.interact();
        emit();
      },
      setSeason(index) {
        seasons.set(index);
        lastSeason = seasons.index;
        stamps.season(seasons.name);
        ctx.U.uSeason.value.fromArray(seasons.weights);
        ctx.seasonal.apply(seasons.weights, true);
        snapshot.night = dayNight(clock.hour, seasons.weights, director.rain);
        camera.interact();
        emit();
      },
      setWind(active) {
        windSystem.active = active;
        camera.interact();
      },
      setCameraPreset(preset) {
        if (preset === "ride") {
          camera.follow(objects.airship);
          rodeStamp = false;
        } else camera.preset(preset);
        emit();
      },
      setInteractionBlocked(blocked) {
        camera.setBlocked(blocked);
        if (blocked) windSystem.active = false;
      },
      setQuality(mode) {
        quality.select(mode);
        applyQuality();
        camera.interact();
        emit();
      },
      setSound(on) {
        ambience.enable(on);
        emit();
      },
      resetOrbitFlag() {
        camera.resetOrbitFlag();
        emit();
      },
      nudge(id, amount, pop = false) {
        interactions.impulses[id].hit(amount);
        if (pop) ambience.play("pop");
      },
      setCaptions(on) {
        captions = on;
      },
      setSoundVolume(volume) {
        ambience.setVolume(volume);
      },
      clearCollection() {
        stamps.clear();
        ledger.received = [];
        emit();
      },
      visitDays(days) {
        stamps.visitDays(days);
        emit();
      },
      setCalendarContext(kind, stamp) {
        festival = kind;
        limitedStamp = stamp;
        snapshot.festival = kind;
        emit();
      },
      sendLetter(message) {
        const sent = delivery.send(message);
        if (sent) {
          interactions.moments.send.hit();
          ambience.play("send");
          stamps.award("sakura");
          if (limitedStamp) stamps.award(limitedStamp);
        }
        emit();
        return sent;
      },
      poke(id) {
        tap(id);
      },
      triggerEvent(kind) {
        const started = scheduler.start(kind);
        notify({ type: "event", kind: started, text: EVENT_NOTICES[started] });
        emit();
      },
      subscribe(listener) {
        listeners.add(listener);
        listener(snapshot);
        return () => listeners.delete(listener);
      },
      onNotice(listener) {
        noticeListeners.add(listener);
        return () => noticeListeners.delete(listener);
      },
      dispose,
    };
  } catch (error) {
    dispose();
    throw error;
  }
}
