import { HALF_SPAN } from "./config.js";

export class Hud {
  constructor() {
    this.moneyValue = document.getElementById("money-value");
    this.fareBanner = document.getElementById("fare-banner");
    this.fareText = document.getElementById("fare-text");
    this.timerWrap = document.getElementById("timer-wrap");
    this.timerFill = document.getElementById("timer-bar-fill");
    this.objectiveHint = document.getElementById("objective-hint");
    this.objectiveText = document.getElementById("objective-text");
    this.directionArrow = document.getElementById("direction-arrow");
    this.minimap = document.getElementById("minimap");
    this.ctx = this.minimap.getContext("2d");

    this._fareTimeout = null;
  }

  setMoney(amount) {
    this.moneyValue.textContent = `${Math.round(amount).toLocaleString("fr-FR")} Ar`;
  }

  showFare(fare, bonusRatio) {
    const bonusTxt = bonusRatio > 0.02 ? ` (bonus rapidité +${Math.round(bonusRatio * 100)}%)` : "";
    this.fareText.textContent = `+ ${fare.toLocaleString("fr-FR")} Ar${bonusTxt}`;
    this.fareBanner.classList.remove("hidden");
    this.fareBanner.style.animation = "none";
    // restart animation
    void this.fareBanner.offsetWidth;
    this.fareBanner.style.animation = "";
    clearTimeout(this._fareTimeout);
    this._fareTimeout = setTimeout(() => this.fareBanner.classList.add("hidden"), 1600);
  }

  setObjective(phase) {
    this.objectiveHint.classList.remove("hidden");
    this.objectiveText.textContent = phase === "toPickup" ? "Direction : passager" : "Direction : dépose";
    this.timerWrap.classList.toggle("hidden", phase !== "toDropoff");
  }

  setTimer(remaining, limit) {
    const ratio = limit > 0 ? Math.max(0, remaining / limit) : 0;
    this.timerFill.style.width = `${ratio * 100}%`;
  }

  setDirectionArrow(carPos, carHeading, targetPos) {
    const dx = targetPos.x - carPos.x;
    const dz = targetPos.z - carPos.z;
    const worldAngle = Math.atan2(dx, dz);
    let rel = worldAngle - carHeading;
    rel = Math.atan2(Math.sin(rel), Math.cos(rel));
    this.directionArrow.style.transform = `rotate(${rel}rad)`;
  }

  drawMinimap(carPos, carHeading, targetPos, targetKind) {
    const ctx = this.ctx;
    const size = this.minimap.width;
    ctx.clearRect(0, 0, size, size);

    ctx.fillStyle = "rgba(15,30,40,0.35)";
    ctx.fillRect(0, 0, size, size);

    const span = HALF_SPAN * 2.3;
    const scale = size / span;
    const toMap = (x, z) => ({
      mx: size / 2 + (x - carPos.x) * scale,
      my: size / 2 + (z - carPos.z) * scale,
    });

    // grid
    ctx.strokeStyle = "rgba(245,240,230,0.15)";
    ctx.lineWidth = 1;
    for (let i = -4; i <= 4; i++) {
      const gx = size / 2 + i * 22 * scale - ((carPos.x * scale) % (22 * scale));
      ctx.beginPath();
      ctx.moveTo(gx, 0);
      ctx.lineTo(gx, size);
      ctx.stroke();
    }

    // target (clamped to the minimap edge when out of range, radar-style)
    const t = toMap(targetPos.x, targetPos.z);
    const margin = 12;
    const cx = size / 2;
    const cy = size / 2;
    let dx = t.mx - cx;
    let dy = t.my - cy;
    const maxR = size / 2 - margin;
    const r = Math.hypot(dx, dy);
    let clamped = false;
    if (r > maxR) {
      dx = (dx / r) * maxR;
      dy = (dy / r) * maxR;
      clamped = true;
    }
    ctx.fillStyle = targetKind === "toPickup" ? "#4ade5c" : "#e8453c";
    ctx.beginPath();
    ctx.arc(cx + dx, cy + dy, clamped ? 5 : 6, 0, Math.PI * 2);
    ctx.fill();
    if (clamped) {
      ctx.strokeStyle = ctx.fillStyle;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx + dx, cy + dy, 8, 0, Math.PI * 2);
      ctx.stroke();
    }

    // player (triangle pointing heading)
    ctx.save();
    ctx.translate(size / 2, size / 2);
    ctx.rotate(carHeading);
    ctx.fillStyle = "#f4c430";
    ctx.beginPath();
    ctx.moveTo(0, -8);
    ctx.lineTo(5, 7);
    ctx.lineTo(-5, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();

    ctx.strokeStyle = "rgba(245,240,230,0.8)";
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, size, size);
  }
}
