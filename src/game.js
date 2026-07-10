import * as THREE from "three";
import { FARE } from "./config.js";
import { Marker } from "./markers.js";

const PICKUP_RADIUS = 3.2;
const MIN_TRIP_DISTANCE = 18;

export class GameManager {
  constructor(scene, spawnZones, plazaCenter, onEvent) {
    this.points = spawnZones.flatMap((z) => z.points.map((p) => ({ ...p, zone: z.name })));
    this.plazaCenter = plazaCenter;
    this.onEvent = onEvent || (() => {});

    this.pickupMarker = new Marker(scene, "pickup");
    this.dropoffMarker = new Marker(scene, "dropoff");

    this.money = 0;
    this.phase = "toPickup"; // "toPickup" | "toDropoff"
    this.activePoint = null;
    this.pickupPoint = null;
    this.tripDistance = 0;
    this.timeLimit = 0;
    this.timeRemaining = 0;

    this._startFirstTrip();
  }

  _randomPoint(excludeNear) {
    let candidates = this.points;
    if (excludeNear) {
      const filtered = candidates.filter((p) => dist(p, excludeNear) > MIN_TRIP_DISTANCE);
      if (filtered.length > 0) candidates = filtered;
    }
    return candidates[Math.floor(Math.random() * candidates.length)];
  }

  _startFirstTrip() {
    const pickup = this._randomPoint(this.plazaCenter);
    this.activePoint = pickup;
    this.phase = "toPickup";
    this.pickupMarker.show(pickup.x, pickup.z);
    this.dropoffMarker.hide();
    this.onEvent({ type: "newObjective", phase: "toPickup" });
  }

  _beginDropoff() {
    const pickup = this.activePoint;
    const dropoff = this._randomPoint(pickup);
    this.pickupPoint = pickup;
    this.activePoint = dropoff;
    this.phase = "toDropoff";

    this.tripDistance = dist(pickup, dropoff);
    this.timeLimit = Math.max(FARE.minTime, this.tripDistance * FARE.baseTimeSecPerUnit);
    this.timeRemaining = this.timeLimit;

    this.pickupMarker.hide();
    this.dropoffMarker.show(dropoff.x, dropoff.z);
    this.onEvent({ type: "newObjective", phase: "toDropoff", timeLimit: this.timeLimit });
  }

  _completeTrip() {
    const elapsed = this.timeLimit - this.timeRemaining;
    const thirdOfTime = this.timeLimit / 3;
    let bonusRatio = 0;
    if (elapsed <= thirdOfTime) {
      bonusRatio = FARE.speedBonusMax * (1 - elapsed / thirdOfTime);
    }
    const base = this.tripDistance * FARE.ratePerUnit;
    const fare = Math.round(base * (1 + bonusRatio));
    this.money += fare;

    this.onEvent({ type: "fareEarned", fare, bonusRatio, money: this.money });

    this.dropoffMarker.hide();
    const nextPickup = this._randomPoint(this.activePoint);
    this.activePoint = nextPickup;
    this.phase = "toPickup";
    this.pickupMarker.show(nextPickup.x, nextPickup.z);
    this.onEvent({ type: "newObjective", phase: "toPickup" });
  }

  _cancelTrip() {
    this.onEvent({ type: "tripExpired" });
    this.dropoffMarker.hide();
    const nextPickup = this._randomPoint(this.activePoint);
    this.activePoint = nextPickup;
    this.phase = "toPickup";
    this.pickupMarker.show(nextPickup.x, nextPickup.z);
    this.onEvent({ type: "newObjective", phase: "toPickup" });
  }

  update(dt, taxiPosition) {
    this.pickupMarker.update(dt);
    this.dropoffMarker.update(dt);

    const target = this.activePoint;
    const d = Math.hypot(taxiPosition.x - target.x, taxiPosition.z - target.z);

    if (this.phase === "toPickup") {
      if (d < PICKUP_RADIUS) {
        this._beginDropoff();
      }
    } else if (this.phase === "toDropoff") {
      this.timeRemaining -= dt;
      this.onEvent({ type: "timerTick", remaining: Math.max(0, this.timeRemaining), limit: this.timeLimit });
      if (d < PICKUP_RADIUS) {
        this._completeTrip();
      } else if (this.timeRemaining <= 0) {
        this._cancelTrip();
      }
    }
  }

  getObjective() {
    return { phase: this.phase, point: this.activePoint };
  }
}

function dist(a, b) {
  return Math.hypot(a.x - b.x, a.z - b.z);
}
